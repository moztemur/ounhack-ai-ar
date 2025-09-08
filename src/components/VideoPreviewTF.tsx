import { useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as THREE from "three";
import { updateLipGeometry } from "../helpers/tfdrawers/lipstickDrawer";

type Props = {
  isActive: boolean;
  className?: string;
  product?: { category: string[]; color?: { name: string; hex: string } };
  variant?: { color?: { name: string; hex: string } };
};


export default function VideoPreviewTF(props: Props) {
  const { isActive, className, product, variant } = props;
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef =
    useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const lipMeshRef = useRef<THREE.Mesh | null>(null);
  const initRef = useRef<boolean>(false);


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
        color: variant?.color?.hex,
        transparent: true,
        opacity: 0.35,
        depthTest: false,
        depthWrite: false,
      });

      lipMeshRef.current = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape()), matFill);
      sceneRef.current.add(lipMeshRef.current);

      /**
       * if you need to use feather effect you should change the following code as reference by using react.useRef 
       * then pass it them to the updateLipGeometry method
       **/ 

      // const matFeather1 = new THREE.MeshBasicMaterial({ color: 0x800080, transparent: true, opacity: 0.18, depthTest: false, depthWrite: false });
      // const matFeather2 = new THREE.MeshBasicMaterial({ color: 0x800080, transparent: true, opacity: 0.09, depthTest: false, depthWrite: false });
      // lipFeather1Mesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape()), matFeather1);
      // lipFeather2Mesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape()), matFeather2);
      // scene.add(lipFeather1Mesh);
      // scene.add(lipFeather2Mesh);

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
      if (!initRef.current) {
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      containerRef.current?.removeChild(rendererRef.current!.domElement);
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
      lipMeshRef.current = null;
    };

    const loop = async () => {
      rafRef.current = requestAnimationFrame(loop);
      const faces = await detectorRef.current!.estimateFaces(videoRef.current!);
      if (faces && faces[0]) {
        const [face] = faces;
        updateLipGeometry(face.keypoints, videoRef.current!, lipMeshRef.current!);
      }

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
    };

    const init = async () => {
      initThree();
      await loadDetector();
      await startCamera();
      loop();
      initRef.current = true;
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
      initRef.current = false;
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
