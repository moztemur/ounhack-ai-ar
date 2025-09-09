import * as THREE from "three";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

const contours = faceLandmarksDetection.util.getKeypointIndexByContour(
  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
);


const LEFT_EYE_BOTTOM = contours.leftEye.slice(0, 8);
const LEFT_EYE_TOP = contours.leftEye.slice(9, 16).reverse();
const LEFT_EYE = [...LEFT_EYE_BOTTOM, ...LEFT_EYE_TOP];
const RIGHT_EYE_BOTTOM = contours.rightEye.slice(0, 8);
const RIGHT_EYE_TOP = contours.rightEye.slice(9, 16).reverse();
const RIGHT_EYE = [...RIGHT_EYE_BOTTOM, ...RIGHT_EYE_TOP];


// --- Mask tuning parameters ---
const SMOOTH_ALPHA = 0.45;                 // EMA for landmark smoothing
const SPLINE_SAMPLES = 100;                // subpixel smooth edges
const EYELINER_WIDTH_PX = 5;               // thickness of eyeliner band in px (screen space)

// Track smoothed landmark positions for used indices only
const USED_INDICES = new Set([
    ...LEFT_EYE, ...RIGHT_EYE,
]);
const smoothMap = new Map(); // key: index -> {x,y}



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

function splinePointsPxToOrtho(pointsPx: THREE.Vector2[], samples = SPLINE_SAMPLES, video: HTMLVideoElement) {
  // Build a closed spline and sample dense points, then map to ortho coords
  const v2 = [];
  for (let i = 0; i < pointsPx.length; i++) v2.push(new THREE.Vector2(pointsPx[i].x, pointsPx[i].y));
  const curve = new THREE.SplineCurve(v2);
  // @ts-ignore
  curve.closed = true;
  const pts = curve.getPoints(samples);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
      const [x, y] = uvToOrtho(toUV(pts[i].x, pts[i].y, video));
      out[i] = [x, y];
  }
  return out;
}

function splinePointsPxToOrthoVectors(pointsPx: THREE.Vector2[], samples = SPLINE_SAMPLES, video: HTMLVideoElement) {
  const v2 = [];
  for (let i = 0; i < pointsPx.length; i++) v2.push(new THREE.Vector2(pointsPx[i].x, pointsPx[i].y));
  const curve = new THREE.SplineCurve(v2);
  // @ts-ignore
  curve.closed = true;
  const pts = curve.getPoints(samples);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) out[i] = new THREE.Vector2(...uvToOrtho(toUV(pts[i].x, pts[i].y, video)));
  return out;
}

// Open-spline variant (does not connect endpoints)
function splineOpenPointsPxToOrthoVectors(pointsPx: THREE.Vector2[], samples = SPLINE_SAMPLES, video: HTMLVideoElement) {
  const v2 = [];
  for (let i = 0; i < pointsPx.length; i++) v2.push(new THREE.Vector2(pointsPx[i].x, pointsPx[i].y));
  const curve = new THREE.SplineCurve(v2);
  // @ts-ignore
  curve.closed = false;
  const pts = curve.getPoints(samples);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) out[i] = new THREE.Vector2(...uvToOrtho(toUV(pts[i].x, pts[i].y, video)));
  return out;
}


// Build a non-closed strip between 2 open curves (no wrap-around at ends)
function buildStripGeometryFromOrthoLoops(outerLoop: THREE.Vector2[], innerLoop: THREE.Vector2[]) {
  const n = Math.min(outerLoop.length, innerLoop.length);
  if (n < 2) return new THREE.BufferGeometry();
  const segments = n - 1;
  const positions = new Float32Array(segments * 6 * 3);
  let ptr = 0;
  for (let i = 0; i < segments; i++) {
      const o0 = outerLoop[i], o1 = outerLoop[i + 1];
      const i0 = innerLoop[i], i1 = innerLoop[i + 1];
      // Triangle A: o0, i0, o1
      positions[ptr++] = o0.x; positions[ptr++] = o0.y; positions[ptr++] = 0;
      positions[ptr++] = i0.x; positions[ptr++] = i0.y; positions[ptr++] = 0;
      positions[ptr++] = o1.x; positions[ptr++] = o1.y; positions[ptr++] = 0;
      // Triangle B: o1, i0, i1
      positions[ptr++] = o1.x; positions[ptr++] = o1.y; positions[ptr++] = 0;
      positions[ptr++] = i0.x; positions[ptr++] = i0.y; positions[ptr++] = 0;
      positions[ptr++] = i1.x; positions[ptr++] = i1.y; positions[ptr++] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geom;
}



function setLineLoopFromOrthoVectors(line: THREE.LineLoop, vectors: THREE.Vector2[]) {
  const n = vectors.length;
  const positions = new Float32Array(n * 3);
  let ptr = 0;
  for (let i = 0; i < n; i++) {
      positions[ptr++] = vectors[i].x;
      positions[ptr++] = vectors[i].y;
      positions[ptr++] = 0;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (line.geometry) line.geometry.dispose();
  line.geometry = geom;
}





function updateRightEyeliner(pts: any, rightEyelinerMesh: THREE.Mesh, video: HTMLVideoElement) {
  // Build thin open strip along upper eyelids; do not connect corners
 
  // RIGHT EYE
  const rightTopAll = collectSmoothedPointsPx(RIGHT_EYE_TOP, pts);
 // const rightTopAll = collectSmoothedPointsPx([...LEFT_EYE_TOP.slice(1, LEFT_EYE_TOP.length - 1)], pts);
  const rightTopPx = rightTopAll;
  if (rightTopPx.length >= 3) {
      const rightOuterPx = dilatePointsPx(rightTopPx, EYELINER_WIDTH_PX);
      // @ts-ignore
      const innerOrtho = splineOpenPointsPxToOrthoVectors(rightTopPx, SPLINE_SAMPLES, video);
      const outerOrtho = splineOpenPointsPxToOrthoVectors(rightOuterPx, SPLINE_SAMPLES, video);
      const geom = buildStripGeometryFromOrthoLoops(outerOrtho, innerOrtho);
      if (rightEyelinerMesh.geometry) rightEyelinerMesh.geometry.dispose();
      rightEyelinerMesh.geometry = geom;
      rightEyelinerMesh.visible = true;
  } else if (rightEyelinerMesh) {
      rightEyelinerMesh.visible = false;
  }
}

function updateLeftEyeliner(pts: any, leftEyelinerMesh: THREE.Mesh, video: HTMLVideoElement) {
  // Build thin open strip along upper eyelids; do not connect corners
 
  // RIGHT EYE
  //const rightTopAll = collectSmoothedPointsPx([...RIGHT_EYE_TOP.slice(1, RIGHT_EYE_TOP.length - 1), 161, 246], pts);
 const leftTopAll = collectSmoothedPointsPx(LEFT_EYE_TOP, pts);
  const leftTopPx = leftTopAll;
  if (leftTopPx.length >= 3) {
      const leftOuterPx = dilatePointsPx(leftTopPx, EYELINER_WIDTH_PX);
      // @ts-ignore
      const innerOrtho = splineOpenPointsPxToOrthoVectors(leftTopPx, SPLINE_SAMPLES, video);
      const outerOrtho = splineOpenPointsPxToOrthoVectors(leftOuterPx, SPLINE_SAMPLES, video);
      const geom = buildStripGeometryFromOrthoLoops(outerOrtho, innerOrtho);
      if (leftEyelinerMesh.geometry) leftEyelinerMesh.geometry.dispose();
      leftEyelinerMesh.geometry = geom;
      leftEyelinerMesh.visible = true;
  } else if (leftEyelinerMesh) {
      leftEyelinerMesh.visible = false;
  }
}



export function updateEyelinerGeometry(
  pts: any,
  video: HTMLVideoElement,
  rightEyeEyelinerMesh: THREE.Mesh,
  leftEyelinerMesh: THREE.Mesh
) {
 
  updateRightEyeliner(pts, rightEyeEyelinerMesh, video);
  updateLeftEyeliner(pts, leftEyelinerMesh, video);
}
