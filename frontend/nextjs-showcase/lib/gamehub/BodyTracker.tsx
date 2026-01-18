'use client'

import { useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useStore } from './store'

export function BodyTracker() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const setTilt = useStore((state) => state.setTilt)
  const setLean = useStore((state) => state.setLean)

  useEffect(() => {
    let faceLandmarker: FaceLandmarker | null = null
    let animationFrameId: number
    let stream: MediaStream | null = null
    let lastTilt = 0
    let lastLean = 0

    const startTracking = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      )
      
      // Initialize Face Landmarker (Always needed for tilt/dodge)
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      })

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.addEventListener('loadeddata', predictWebcam)
        }
      }
    }

    const predictWebcam = () => {
      if (videoRef.current && faceLandmarker) {
        const startTimeMs = performance.now()

        // 1. Face Tracking (Dodge/Tilt)
        const faceResults = faceLandmarker.detectForVideo(videoRef.current, startTimeMs)

        if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
            const nose = faceResults.faceLandmarks[0][1]
            const leftCheek = faceResults.faceLandmarks[0][234]
            const rightCheek = faceResults.faceLandmarks[0][454]

            // Tilt (Roll)
            const tiltRaw = (leftCheek.y - rightCheek.y) * 5
            const tiltClamped = Math.max(-1, Math.min(1, tiltRaw))

            // Lean/Turn (Yaw/X-pos)
            const leanRaw = (nose.x - 0.5) * -5
            const leanClamped = Math.max(-1, Math.min(1, leanRaw))

            if (Math.abs(tiltClamped - lastTilt) > 0.02) {
                setTilt(tiltClamped)
                lastTilt = tiltClamped
            }
            if (Math.abs(leanClamped - lastLean) > 0.02) {
                setLean(leanClamped)
                lastLean = leanClamped
            }
        }

        animationFrameId = requestAnimationFrame(predictWebcam)
      }
    }

    startTracking()

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      faceLandmarker?.close()
    }
  }, [setTilt, setLean])

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, opacity: 0.5 }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '160px', borderRadius: '10px', transform: 'scaleX(-1)' }} />
    </div>
  )
}
