import React, { useEffect, useRef } from 'react'
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgpu'
import '@tensorflow/tfjs-backend-webgl'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import { drawLipstick } from '../helpers/tfdrawers/lipstick'
import { MediaPipeFaceMeshMediaPipeModelConfig } from '@tensorflow-models/face-landmarks-detection'

type Props = {
  isActive: boolean
  className?: string
  product?: { category: string[]; color?: { name: string; hex: string } }
  variant?: { color?: { name: string; hex: string } }
  lipOpacity?: number
}

// indices moved to drawer implementation

export default function VideoPreviewTF({ isActive, className, product, variant, lipOpacity = 0.55 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null)

  const ensureSize = () => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    const vw = v.videoWidth || v.clientWidth
    const vh = v.videoHeight || v.clientHeight
    if (!vw || !vh) return
    if (c.width !== vw || c.height !== vh) {
      c.width = vw
      c.height = vh
    }
  }

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      if (!isActive) return

      try {
        // Camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (cancelled) return
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          v.playsInline = true
          v.muted = true
          const updateAspect = () => {
            const el = containerRef.current
            if (!el || !v.videoWidth || !v.videoHeight) return
            el.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`
          }
          v.addEventListener('loadedmetadata', updateAspect, { once: true })
          await v.play()
          updateAspect()
        }

        // TFJS backend
        try {
          await tf.setBackend('webgpu')
        } catch { }
        if (tf.getBackend() !== 'webgpu') {
          try { await tf.setBackend('webgl') } catch { }
        }
        await tf.ready()

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
        const detectorConfig = {
          runtime: 'mediapipe', // or 'tfjs'
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
          refineLandmarks: true,
        }
        // const detectorConfig =  { runtime: 'tfjs', refineLandmarks: true, maxFaces: 1 }

        const detector = await faceLandmarksDetection.createDetector(
          model,
          detectorConfig as MediaPipeFaceMeshMediaPipeModelConfig
        )


        if (cancelled) { detector.dispose(); return }
        detectorRef.current = detector

        const loop = async () => {
          if (cancelled) return
          const v = videoRef.current
          const c = canvasRef.current
          const d = detectorRef.current
          if (!v || !c || !d) {
            rafRef.current = requestAnimationFrame(loop)
            return
          }
          ensureSize()
          let faces: faceLandmarksDetection.Face[] = []
          try {
            faces = await d.estimateFaces(v as HTMLVideoElement)
          } catch { }

          const ctx = c.getContext('2d')!
          ctx.clearRect(0, 0, c.width, c.height)
          if (faces && faces.length > 0) {
            const kps = faces[0].keypoints as unknown as { x: number; y: number }[]
            const cat = product?.category || []
            const primary = (variant?.color?.hex || product?.color?.hex || '#ff3366')
            // Simple router: if category matches makeup lips lipstick, draw lips
            if (cat[0] === 'Makeup' && cat[1] === 'Lips' && cat[2] === 'Lipstick') {
              drawLipstick(ctx, kps, c.width, c.height, primary, lipOpacity)
            }
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e) {
        console.error('VideoPreview start error', e)
      }
    }

    start()
    return () => {
      cancelled = true
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      const d = detectorRef.current
      detectorRef.current = null
      d?.dispose?.()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      const c = canvasRef.current
      if (c) {
        const ctx = c.getContext('2d')
        ctx?.clearRect(0, 0, c.width, c.height)
      }
    }
  }, [isActive, product, variant, lipOpacity])

  if (!isActive) return null
  return (
    <div ref={containerRef} className={`videoContainer ${className || ''}`}>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
    </div>
  )
}
