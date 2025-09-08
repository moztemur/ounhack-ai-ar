import React, { useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import '@tensorflow/tfjs-backend-webgl'
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import { drawLipstick } from "../helpers/tfdrawers/lipstick";
import { MediaPipeFaceMeshMediaPipeModelConfig } from "@tensorflow-models/face-landmarks-detection";
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

const LIPS_BOTTOM_OUTER = contours.lips.slice(0, 10);
const LIPS_BOTTOM_INNER = contours.lips.slice(21, 30).reverse();
const LIPS_TOP_OUTER = contours.lips.slice(11, 20);
const LIPS_TOP_INNER = contours.lips.slice(31, 40).reverse();

// indices moved to drawer implementation

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

  const ensureSize = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const vw = v.videoWidth || v.clientWidth;
    const vh = v.videoHeight || v.clientHeight;
    if (!vw || !vh) return;
    if (c.width !== vw || c.height !== vh) {
      c.width = vw;
      c.height = vh;
    }
  };

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
        color: 0x800080,
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
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
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
      console.log(faces);
    };

    const init = async () => {
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
