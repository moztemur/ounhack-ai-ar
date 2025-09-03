import React, { useEffect, useRef } from 'react'
type Props = {
  isActive: boolean
  className?: string
}

export default function VideoPreview({ isActive, className }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
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
          await v.play()
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
  return <video className={className} ref={videoRef}></video>
}
