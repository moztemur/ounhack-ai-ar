import * as THREE from "three";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

const contours = faceLandmarksDetection.util.getKeypointIndexByContour(
  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
);

const LIPS_BOTTOM_OUTER = contours.lips.slice(0, 10);
const LIPS_BOTTOM_INNER = contours.lips.slice(21, 30).reverse();
const LIPS_TOP_OUTER = contours.lips.slice(11, 20);
const LIPS_TOP_INNER = contours.lips.slice(31, 40).reverse();
const LIPS_OUTER_ALL = [...LIPS_BOTTOM_OUTER, ...LIPS_TOP_OUTER.reverse()];
const LIPS_INNER_ALL = [...LIPS_BOTTOM_INNER, ...LIPS_TOP_INNER.reverse()];
const FACE_OVAL = contours.faceOval || contours.faceOval0 || [];
const LEFT_EYE = contours.leftEye || [];
const RIGHT_EYE = contours.rightEye || [];

// --- Mask tuning parameters ---
const SMOOTH_ALPHA = 0.45; // EMA for landmark smoothing
const BASE_OUTER_DILATE_PX = 2; // cover corner gaps
const INNER_MOUTH_EXPAND_PX = 1; // ensure teeth/tongue stay clear
const FEATHER_WIDTHS_PX = [3, 6]; // two feather rings outward
const SPLINE_SAMPLES = 100; // subpixel smooth edges

const USED_INDICES = new Set([
  ...LIPS_OUTER_ALL,
  ...LIPS_INNER_ALL,
  ...FACE_OVAL,
  ...LEFT_EYE,
  ...RIGHT_EYE,
]);

const smoothMap = new Map();

// Utility: map pixel -> UV (0..1). Mirror if checkbox checked.
function toUV(x: number, y: number, video: HTMLVideoElement) {
  const u = x / video.videoWidth;
  const v = y / video.videoHeight;
  return [u, v];
}

// Map UV to ortho space [-1..1] (Three's OrthographicCamera)
function uvToOrtho(uv: number[]) {
  const [u, v] = uv;
  const x = u * 2 - 1;
  const y = 1 - v * 2; // invert Y so up is positive
  return [x, y];
}

// --- Helpers: smoothing, dilation, spline, shape building ---

/*
  Landmarks jump around frame to frame (jitter). That makes your mask edges “vibrate”.
  Temporal smoothing = average points over time:
  EMA (Exponential Moving Average): p_smooth = 0.7 * prev + 0.3 * current.
  One-Euro filter: a smarter adaptive filter that smooths noise but keeps fast motion responsive.
  This makes the mask stable — lips don’t flicker even if the detector jitters.
*/
function smoothPoint(
  index: number,
  x: number,
  y: number,
  alpha = SMOOTH_ALPHA
) {
  if (!USED_INDICES.has(index)) return { x, y };
  const prev = smoothMap.get(index);
  if (!prev) {
    const cur = { x, y };
    smoothMap.set(index, cur);
    return cur;
  }
  const nx = prev.x * (1 - alpha) + x * alpha;
  const ny = prev.y * (1 - alpha) + y * alpha;
  const cur = { x: nx, y: ny };
  smoothMap.set(index, cur);
  return cur;
}

function collectSmoothedPointsPx(indices: number[], pts: any) {
  const arr = [];
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const kp = pts[idx];
    const s = smoothPoint(idx, kp.x, kp.y);
    arr.push({ x: s.x, y: s.y });
  }
  return arr;
}

function centroidPx(points: any) {
  let sx = 0,
    sy = 0;
  for (let i = 0; i < points.length; i++) {
    sx += points[i].x;
    sy += points[i].y;
  }
  const n = Math.max(1, points.length);
  return { x: sx / n, y: sy / n };
}

/*
  Sometimes landmarks miss the very corner of the lips, so your mask leaves a tiny gap.
  Dilation = expand the mask outward by a pixel or two before feathering.
  This ensures full coverage without little “holes” at the lip corners.
*/
function dilatePointsPx(points: any, amountPx: number) {
  if (amountPx === 0) return points.slice();
  const c = centroidPx(points);
  const out = new Array(points.length);
  for (let i = 0; i < points.length; i++) {
    const vx = points[i].x - c.x;
    const vy = points[i].y - c.y;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len,
      uy = vy / len;
    out[i] = { x: points[i].x + ux * amountPx, y: points[i].y + uy * amountPx };
  }
  return out;
}

function splinePointsPxToOrtho(
  pointsPx: any,
  video: HTMLVideoElement,
  samples = SPLINE_SAMPLES
) {
  // Build a closed spline and sample dense points, then map to ortho coords
  const v2 = [];
  for (let i = 0; i < pointsPx.length; i++) {
    v2.push(new THREE.Vector2(pointsPx[i].x, pointsPx[i].y));
  }

  const curve = new THREE.SplineCurve(v2);
  // curve.isClosed = true;
  const pts = curve.getPoints(samples);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = uvToOrtho(toUV(pts[i].x, pts[i].y, video));
    out[i] = [x, y];
  }
  return out;
}

function splinePointsPxToOrthoVectors(
  pointsPx: any,
  video: HTMLVideoElement,
  samples = SPLINE_SAMPLES
) {
  const v2 = [];
  for (let i = 0; i < pointsPx.length; i++)
    v2.push(new THREE.Vector2(pointsPx[i].x, pointsPx[i].y));
  const curve = new THREE.SplineCurve(v2);
  // curve.isClosed = true;
  const pts = curve.getPoints(samples);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++)
    out[i] = new THREE.Vector2(...uvToOrtho(toUV(pts[i].x, pts[i].y, video)));
  return out;
}

function buildRingGeometryFromOrthoLoops(outerLoop: any, innerLoop: any) {
  const n = Math.min(outerLoop.length, innerLoop.length);
  const positions = new Float32Array(n * 6 * 3); // 2 triangles per segment, 3 vertices each, xyz
  let ptr = 0;
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    const o0 = outerLoop[i],
      o1 = outerLoop[i1];
    const i0 = innerLoop[i],
      i1p = innerLoop[i1];
    // Triangle A: o0, i0, o1
    positions[ptr++] = o0.x;
    positions[ptr++] = o0.y;
    positions[ptr++] = 0;
    positions[ptr++] = i0.x;
    positions[ptr++] = i0.y;
    positions[ptr++] = 0;
    positions[ptr++] = o1.x;
    positions[ptr++] = o1.y;
    positions[ptr++] = 0;
    // Triangle B: o1, i0, i1
    positions[ptr++] = o1.x;
    positions[ptr++] = o1.y;
    positions[ptr++] = 0;
    positions[ptr++] = i0.x;
    positions[ptr++] = i0.y;
    positions[ptr++] = 0;
    positions[ptr++] = i1p.x;
    positions[ptr++] = i1p.y;
    positions[ptr++] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geom;
}

function makePathFromOrthoPoints(orthoPoints: any) {
  const path = new THREE.Path();
  const p0 = orthoPoints[0];
  path.moveTo(p0[0], p0[1]);
  for (let i = 1; i < orthoPoints.length; i++)
    path.lineTo(orthoPoints[i][0], orthoPoints[i][1]);
  path.closePath();
  return path;
}

function buildShapeWithHolesPx(
  outerPx: any,
  holePxArr: any,
  video: HTMLVideoElement
) {
  const outerOrtho = splinePointsPxToOrtho(outerPx, video, SPLINE_SAMPLES);
  const shape = new THREE.Shape();
  const p0 = outerOrtho[0];
  shape.moveTo(p0[0], p0[1]);
  for (let i = 1; i < outerOrtho.length; i++)
    shape.lineTo(outerOrtho[i][0], outerOrtho[i][1]);
  shape.closePath();

  shape.holes = [];
  for (let h = 0; h < holePxArr.length; h++) {
    const holeOrtho = splinePointsPxToOrtho(
      holePxArr[h],
      video,
      SPLINE_SAMPLES
    );
    shape.holes.push(makePathFromOrthoPoints(holeOrtho));
  }
  return shape;
}

export function updateLipGeometry(
  pts: any,
  video: HTMLVideoElement,
  mesh: THREE.Mesh
) {
  // 1) Smooth keypoints and collect loops in pixel space
  const outerPx = collectSmoothedPointsPx(LIPS_OUTER_ALL, pts);
  const innerPx = collectSmoothedPointsPx(LIPS_INNER_ALL, pts);

  // 2) Dilation & inner-hole expansion
  const outerBase = dilatePointsPx(outerPx, BASE_OUTER_DILATE_PX);
  const innerBase = dilatePointsPx(innerPx, INNER_MOUTH_EXPAND_PX);

  // 3) Build core filled lips (outer minus inner)
  const coreShape = buildShapeWithHolesPx(outerBase, [innerBase], video);
  mesh.geometry.dispose();
  mesh.geometry = new THREE.ShapeGeometry(coreShape);

  // TODO: feather addition
  // 4) Feather ring with stable geometry (annulus strip)
  // const outerF1 = dilatePointsPx(outerPx, BASE_OUTER_DILATE_PX + FEATHER_WIDTHS_PX[0]);
  // const outerF1Ortho = splinePointsPxToOrthoVectors(outerF1);
  // const outerBaseOrtho = splinePointsPxToOrthoVectors(outerBase);
  // const ring1Geom = buildRingGeometryFromOrthoLoops(outerF1Ortho, outerBaseOrtho);
  // lipFeather1Mesh.geometry.dispose();
  // lipFeather1Mesh.geometry = ring1Geom;

  // // const outerF2 = dilatePointsPx(outerPx, BASE_OUTER_DILATE_PX + FEATHER_WIDTHS_PX[1]);
  // // const ring2Shape = buildShapeWithHolesPx(outerF2, [outerF1, innerBase]);
  // // lipFeather2Mesh.geometry.dispose();
  // // lipFeather2Mesh.geometry = new THREE.ShapeGeometry(ring2Shape);
}
