import * as THREE from "three";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

// --- Cheek landmark groups (MediaPipe indices) ---
const CHEEKS = {
  // Subject’s LEFT cheek (camera-right)
  left: [205, 36, 101, 118, 123, 147, 187],
  // Subject’s RIGHT cheek (camera-left)
  right: [330, 347, 352, 376, 411, 425, 266],
};

// Blush tuning
const BLUSH_BASE_DILATE_PX = 0;        // tiny outward push for core polygon

// --- Mask tuning parameters ---
const SMOOTH_ALPHA = 0.45;                 // EMA for landmark smoothing
const SPLINE_SAMPLES = 100;                // subpixel smooth edges

// Track smoothed landmark positions for used indices only
const USED_INDICES = new Set([
  ...CHEEKS.left, ...CHEEKS.right,
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


function buildFillShapePx(pointsPx: THREE.Vector2[], samples = SPLINE_SAMPLES, video: HTMLVideoElement) {
  const ortho = splinePointsPxToOrtho(pointsPx, samples, video);
  const shape = new THREE.Shape();
  shape.moveTo(ortho[0][0], ortho[0][1]);
  for (let i = 1; i < ortho.length; i++) shape.lineTo(ortho[i][0], ortho[i][1]);
  shape.closePath();
  return shape;
}



function updateLeftBlush(pts: any, leftBlushMesh: THREE.Mesh, video: HTMLVideoElement) {
  // LEFT cheek
  let lCore = collectSmoothedPointsPx(CHEEKS.left, pts);
  if (lCore.length >= 5) {
    // Core fill
    const lCoreDil = dilatePointsPx(lCore, BLUSH_BASE_DILATE_PX);
    const lCoreShape = buildFillShapePx(lCoreDil, SPLINE_SAMPLES, video);
    if (leftBlushMesh.geometry) leftBlushMesh.geometry.dispose();
    leftBlushMesh.geometry = new THREE.ShapeGeometry(lCoreShape);
    leftBlushMesh.visible = true;
  } else {
    if (leftBlushMesh) leftBlushMesh.visible = false;
  }
}

function updateRightBlush(pts: any, rightBlushMesh: THREE.Mesh, video: HTMLVideoElement) {
  // LEFT cheek


  // RIGHT cheek
  let rCore = collectSmoothedPointsPx(CHEEKS.right, pts);
  if (rCore.length >= 5) {
    const rCoreDil = dilatePointsPx(rCore, BLUSH_BASE_DILATE_PX);
    const rCoreShape = buildFillShapePx(rCoreDil, SPLINE_SAMPLES, video);
    if (rightBlushMesh.geometry) rightBlushMesh.geometry.dispose();
    rightBlushMesh.geometry = new THREE.ShapeGeometry(rCoreShape);
    rightBlushMesh.visible = true;

  } else {
    if (rightBlushMesh) rightBlushMesh.visible = false;
  }
}



export function updateBlushGeometry(
  pts: any,
  video: HTMLVideoElement,
  rightEyeEyelinerMesh: THREE.Mesh,
  leftEyelinerMesh: THREE.Mesh
) {

  updateRightBlush(pts, rightEyeEyelinerMesh, video);
  updateLeftBlush(pts, leftEyelinerMesh, video);
}
