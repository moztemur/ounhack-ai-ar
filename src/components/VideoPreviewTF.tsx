import { useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as THREE from "three";

type Props = {
  isActive: boolean;
  className?: string;
  product?: { category: string[]; color?: { name: string; hex: string } };
  variant?: { color?: { name: string; hex: string } };
};

const contours = faceLandmarksDetection.util.getKeypointIndexByContour(
  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
);

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

function lineIntersection(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }
  return null;
}

// Calculate lip corner points by finding intersections
function calculateLipCorners(pts: any) {
  // Get points near the corners for both upper and lower lips
  const leftUpperPoint1 = pts[LIPS_TOP_OUTER[0]];
  const leftUpperPoint2 = pts[LIPS_TOP_OUTER[1]];
  const leftLowerPoint1 = pts[LIPS_BOTTOM_OUTER[0]];
  const leftLowerPoint2 = pts[LIPS_BOTTOM_OUTER[LIPS_BOTTOM_OUTER.length - 1]];

  const rightUpperPoint1 = pts[LIPS_TOP_OUTER[LIPS_TOP_OUTER.length - 2]];
  const rightUpperPoint2 = pts[LIPS_TOP_OUTER[LIPS_TOP_OUTER.length - 1]];
  const rightLowerPoint1 = pts[LIPS_BOTTOM_OUTER[4]];
  const rightLowerPoint2 = pts[LIPS_BOTTOM_OUTER[5]];

  // Calculate intersections
  const leftCorner =
    lineIntersection(
      leftUpperPoint1.x,
      leftUpperPoint1.y,
      leftUpperPoint2.x,
      leftUpperPoint2.y,
      leftLowerPoint1.x,
      leftLowerPoint1.y,
      leftLowerPoint2.x,
      leftLowerPoint2.y
    ) || leftUpperPoint1;

  const rightCorner =
    lineIntersection(
      rightUpperPoint1.x,
      rightUpperPoint1.y,
      rightUpperPoint2.x,
      rightUpperPoint2.y,
      rightLowerPoint1.x,
      rightLowerPoint1.y,
      rightLowerPoint2.x,
      rightLowerPoint2.y
    ) || rightUpperPoint2;

  return { leftCorner, rightCorner };
}

const LIPS_BOTTOM_OUTER = contours.lips.slice(0, 10);
const LIPS_BOTTOM_INNER = contours.lips.slice(21, 30).reverse();
const LIPS_TOP_OUTER = contours.lips.slice(11, 20);
const LIPS_TOP_INNER = contours.lips.slice(31, 40).reverse();

function updateBottomLipGeometry(pts: any, video: HTMLVideoElement, mesh: THREE.Mesh) {
  const { leftCorner, rightCorner } = calculateLipCorners(pts);

  // Build THREE.Shape from outer ring; add inner ring as a hole
  const shapeBottom = new THREE.Shape();

  // Start from the left corner
  const [startX, startY] = uvToOrtho(toUV(leftCorner.x, leftCorner.y, video));
  shapeBottom.moveTo(startX, startY);

  // Draw bottom lip outer contour
  for (let i = 1; i < LIPS_BOTTOM_OUTER.length - 1; i++) {
    const p = pts[LIPS_BOTTOM_OUTER[i]];
    const [x, y] = uvToOrtho(toUV(p.x, p.y, video));
    shapeBottom.lineTo(x, y);
  }

  // Connect to right corner
  const [endX, endY] = uvToOrtho(toUV(rightCorner.x, rightCorner.y, video));
  shapeBottom.lineTo(endX, endY);

  // Draw inner contour
  const firstBottomInner = uvToOrtho(
    toUV(pts[LIPS_BOTTOM_INNER[0]].x, pts[LIPS_BOTTOM_INNER[0]].y, video)
  );
  shapeBottom.moveTo(firstBottomInner[0], firstBottomInner[1]);
  for (let i = 1; i < LIPS_BOTTOM_INNER.length; i++) {
    const p = pts[LIPS_BOTTOM_INNER[i]];
    const [x, y] = uvToOrtho(toUV(p.x, p.y, video));
    shapeBottom.lineTo(x, y);
  }
  shapeBottom.closePath();

  // Replace mesh geometry
  mesh.geometry.dispose();
  mesh.geometry = new THREE.ShapeGeometry(shapeBottom);
}

function updateTopLipGeometry(pts: any, video: HTMLVideoElement, mesh: THREE.Mesh) {
  const { leftCorner, rightCorner } = calculateLipCorners(pts);
  
  const shapeTop = new THREE.Shape();

  // Start from the left corner
  const [startX, startY] = uvToOrtho(toUV(leftCorner.x, leftCorner.y, video));
  shapeTop.moveTo(startX, startY);

  // Draw top lip outer contour
  for (let i = 1; i < LIPS_TOP_OUTER.length - 1; i++) {
      const p = pts[LIPS_TOP_OUTER[i]];
      const [x, y] = uvToOrtho(toUV(p.x, p.y, video));
      shapeTop.lineTo(x, y);
  }

  // Connect to right corner
  const [endX, endY] = uvToOrtho(toUV(rightCorner.x, rightCorner.y, video));
  shapeTop.lineTo(endX, endY);

  // Draw inner contour
  const firstTopInner = uvToOrtho(toUV(pts[LIPS_TOP_INNER[0]].x, pts[LIPS_TOP_INNER[0]].y, video));
  shapeTop.moveTo(firstTopInner[0], firstTopInner[1]);
  for (let i = 1; i < LIPS_TOP_INNER.length; i++) {
      const p = pts[LIPS_TOP_INNER[i]];
      const [x, y] = uvToOrtho(toUV(p.x, p.y, video));
      shapeTop.lineTo(x, y);
  }
  shapeTop.closePath();

  // Replace mesh geometry
  mesh.geometry.dispose();
  mesh.geometry = new THREE.ShapeGeometry(shapeTop);
}

export default function VideoPreviewTF(props: Props) {
  const { isActive, className, product, variant } = props;
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef =
    useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const lipBottomMeshRef = useRef<THREE.Mesh | null>(null);
  const lipTopMeshRef = useRef<THREE.Mesh | null>(null);


  useEffect(() => {
    const resizeToVideo = () => {
      if (videoRef.current && rendererRef.current) {
        const w = videoRef.current.videoWidth || 640;
        const h = videoRef.current.videoHeight || 480;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        rendererRef.current.setPixelRatio(dpr);
        rendererRef.current.setSize(w, h, false);
        // Orthographic camera covers [-1,1] in both axes; no aspect updates needed
      }
    };

    const initThree = () => {
      if (rendererRef.current) {
        return;
      }

      // renderer
      rendererRef.current = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });

      rendererRef.current.setClearColor(0x000000, 0); // transparent
      rendererRef.current.domElement.className = "overlay-canvas";
      containerRef.current?.appendChild(rendererRef.current.domElement);

      // camera
      cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
      cameraRef.current.position.z = 1;

      // scene
      sceneRef.current = new THREE.Scene();

      const matFill = new THREE.MeshBasicMaterial({
        // purple
        // color: 0xff5a8c,
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthTest: false,
        depthWrite: false,
      });

      lipBottomMeshRef.current = new THREE.Mesh(
        new THREE.ShapeGeometry(new THREE.Shape()),
        matFill
      );

      lipTopMeshRef.current = new THREE.Mesh(
        new THREE.ShapeGeometry(new THREE.Shape()),
        matFill
      );

      sceneRef.current.add(lipBottomMeshRef.current);
      sceneRef.current.add(lipTopMeshRef.current);

      resizeToVideo();
    };

    const startCamera = async () => {
      if (!isActive) {
        return;
      }

      if (streamRef.current != null) {
        return;
      }

      if (videoRef.current == null) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      await new Promise((resolve) =>
        videoRef.current!.addEventListener(
          "loadedmetadata",
          () => {
            const container = containerRef.current;
            const video = videoRef.current;
            if (!container || !video?.videoWidth || !video?.videoHeight) {
              resolve(true);
              return;
            }
            resolve(true);
          },
          { once: true }
        )
      );

      await videoRef.current.play();

      streamRef.current = stream;
      resizeToVideo();
    };

    const loadDetector = async () => {
      await tf.setBackend("webgl");
      await tf.ready();

      detectorRef.current = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "mediapipe",
          maxFaces: 1,
          refineLandmarks: true,
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
        }
      );

      await detectorRef.current.estimateFaces(tf.zeros([128, 128, 3]));
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const loop = async () => {
      rafRef.current = requestAnimationFrame(loop);
      const faces = await detectorRef.current!.estimateFaces(videoRef.current!);
      if (faces && faces[0]) {
        const [face] = faces;
        updateBottomLipGeometry(face.keypoints, videoRef.current!, lipBottomMeshRef.current!);
        updateTopLipGeometry(face.keypoints, videoRef.current!, lipTopMeshRef.current!);
      }

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
    };

    const init = async () => {
      initThree();
      await loadDetector();
      await startCamera();
      loop();
    };

    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    initTimeoutRef.current = setTimeout(init, 350);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      stopCamera();
    };
  }, [isActive, product, variant]);

  if (!isActive) {
    return null;
  }

  return (
    <div ref={containerRef} className={`videoContainer ${className || ""}`}>
      <video ref={videoRef} autoPlay muted playsInline />
    </div>
  );
}
