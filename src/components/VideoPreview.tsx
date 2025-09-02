import React, { useEffect, useRef } from 'react'
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgpu'
import '@tensorflow/tfjs-backend-webgl'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import { drawLipstick } from '../helpers/tfdrawers/lipstick'

type Props = {
  isActive: boolean
  className?: string
}

export default function VideoPreview({ isActive, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const start = async () => {
      if (!isActive) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
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
      } catch (e) {
        console.error('getUserMedia failed', e)
      }
    }
    start()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [isActive])

  if (!isActive) return null
  return (
    <div ref={containerRef} className={`videoContainer ${className || ''}`}>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
    </div>
  )
}
