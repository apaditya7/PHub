import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useStore } from '../store'
import './WebcamCaptcha.css'

const GRID_SIZE = 4
const TILE_COUNT = GRID_SIZE * GRID_SIZE
const CANVAS_SIZE = 480 // 480x480 square for simplicity
const TILE_SIZE = CANVAS_SIZE / GRID_SIZE

export function WebcamCaptcha() {
  // const setVerified = useStore((state) => state.setVerified) // Disabled for standalone mode
  const [isLoading, setIsLoading] = useState(true)
  const [isSolved, setIsSolved] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Game State Refs (Mutable to avoid re-renders)
  const tilesRef = useRef<number[]>([]) // Index i contains the Piece ID at that position
  const draggingRef = useRef<{ pieceId: number, startIdx: number, x: number, y: number } | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const initializingRef = useRef(false)
  const lastPinchRef = useRef<boolean>(false)

  // Initialize
  useEffect(() => {
    // 1. Initialize Tiles
    const solved = Array.from({ length: TILE_COUNT }, (_, i) => i)
    // Shuffle
    const shuffled = [...solved].sort(() => Math.random() - 0.5)
    tilesRef.current = shuffled

    // 2. Setup MediaPipe & Camera
    const init = async () => {
      if (initializingRef.current || handLandmarkerRef.current) return
      initializingRef.current = true

      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        )
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        })

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 } 
                })
                if (videoRef.current) {
                  videoRef.current.srcObject = stream
                  videoRef.current.onloadeddata = () => {
                    console.log('Video loaded data', videoRef.current?.videoWidth, videoRef.current?.videoHeight)
                    videoRef.current?.play().catch(console.error)
                    setIsLoading(false)
                    requestAnimationFrame(loop)
                  }
                }
              }
      } catch (error) {
        console.error("Initialization error:", error)
      } finally {
        initializingRef.current = false
      }
    }

    init()

    return () => {
      // Cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close()
        handLandmarkerRef.current = null
      }
      initializingRef.current = false
    }
  }, [])

  const checkWin = () => {
    const solved = tilesRef.current.every((val, idx) => val === idx)
    if (solved) {
        // Delay slightly to show the completed image
        setTimeout(() => {
            setIsSolved(true)
            // setVerified(true) // Unrelated components
        }, 500)
    }
  }

  const loop = () => {
    if (!canvasRef.current || !videoRef.current) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const video = videoRef.current
    if (video.readyState < 2) {
        requestAnimationFrame(loop)
        return
    }

    const startTimeMs = performance.now()
    
    // 1. Detect Hands
    let result = null
    if (handLandmarkerRef.current) {
        result = handLandmarkerRef.current.detectForVideo(video, startTimeMs)
    }
    
    // 2. Process Interaction
    let handX = -1
    let handY = -1
    let isPinching = false

    if (result && result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]
        const indexTip = landmarks[8]
        const thumbTip = landmarks[4]

        // Map to Canvas Coords (Mirror X)
        handX = (1 - indexTip.x) * CANVAS_SIZE
        handY = indexTip.y * CANVAS_SIZE

        // Pinch Detection (Distance in normalized coords)
        const dx = indexTip.x - thumbTip.x
        const dy = indexTip.y - thumbTip.y
        const distance = Math.sqrt(dx*dx + dy*dy)
        
        isPinching = distance < 0.05 // Threshold
    }

    // Logic: Drag & Drop
    if (isPinching && !lastPinchRef.current) {
        // Pinch Started -> Grab
        const col = Math.floor(handX / TILE_SIZE)
        const row = Math.floor(handY / TILE_SIZE)
        const idx = row * GRID_SIZE + col
        
        if (idx >= 0 && idx < TILE_COUNT) {
            draggingRef.current = {
                pieceId: tilesRef.current[idx],
                startIdx: idx,
                x: handX,
                y: handY
            }
        }
    } else if (!isPinching && lastPinchRef.current) {
        // Pinch Ended -> Drop
        if (draggingRef.current) {
            const col = Math.floor(handX / TILE_SIZE)
            const row = Math.floor(handY / TILE_SIZE)
            const targetIdx = row * GRID_SIZE + col

            if (targetIdx >= 0 && targetIdx < TILE_COUNT) {
                // Swap
                const startIdx = draggingRef.current.startIdx
                // Swap logic: put the piece we were holding into the target slot
                // and put whatever was in the target slot into the start slot
                const targetPiece = tilesRef.current[targetIdx]
                const draggedPiece = draggingRef.current.pieceId
                
                tilesRef.current[startIdx] = targetPiece
                tilesRef.current[targetIdx] = draggedPiece
                
                checkWin()
            }
            draggingRef.current = null
        }
    } else if (isPinching && draggingRef.current) {
        // Continuing to Drag
        draggingRef.current.x = handX
        draggingRef.current.y = handY
    }

    lastPinchRef.current = isPinching

    // 3. Render
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    
    // Draw Tiles
    tilesRef.current.forEach((pieceId, gridIdx) => {
        // If this is the piece being dragged, skip drawing it in the grid
        if (draggingRef.current && draggingRef.current.startIdx === gridIdx) {
            // Draw a "hole" or the piece that is currently under the cursor?
            // Standard puzzle logic: we swap on drop. So for now, draw the hole (or nothing).
            // Let's draw a semi-transparent placeholder
            ctx.fillStyle = '#ddd'
            ctx.fillRect((gridIdx % GRID_SIZE) * TILE_SIZE, Math.floor(gridIdx / GRID_SIZE) * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            return
        }

        // Source Coords (from video) based on Piece ID
        // The Piece ID corresponds to the original video position
        // Since video is 640x480, we need to center crop to 480x480
        const videoSize = Math.min(video.videoWidth, video.videoHeight)
        if (videoSize === 0) return

        const sourceTileSize = videoSize / GRID_SIZE
        const offsetX = (video.videoWidth - videoSize) / 2
        
        const srcCol = pieceId % GRID_SIZE
        const srcRow = Math.floor(pieceId / GRID_SIZE)
        const srcX = offsetX + srcCol * sourceTileSize
        const srcY = srcRow * sourceTileSize

        // Dest Coords (Grid)
        const dstCol = gridIdx % GRID_SIZE
        const dstRow = Math.floor(gridIdx / GRID_SIZE)
        const dstX = dstCol * TILE_SIZE
        const dstY = dstRow * TILE_SIZE

        // Draw Image (Mirroring is tricky here because we are drawing tiles. 
        // We mirrored the hand coords. We should mirror the source draw?
        // Easiest is to draw normally, but since user sees mirrored video usually...
        // Let's just draw straightforward first.)
        ctx.drawImage(
            video, 
            srcX, srcY, sourceTileSize, sourceTileSize,
            dstX, dstY, TILE_SIZE - 2, TILE_SIZE - 2 // -2 for gap
        )
    })

    // Draw Dragged Piece
    if (draggingRef.current) {
        const pieceId = draggingRef.current.pieceId
        const videoSize = Math.min(video.videoWidth, video.videoHeight)
        const sourceTileSize = videoSize / GRID_SIZE
        const offsetX = (video.videoWidth - videoSize) / 2
        
        const srcCol = pieceId % GRID_SIZE
        const srcRow = Math.floor(pieceId / GRID_SIZE)
        const srcX = offsetX + srcCol * sourceTileSize
        const srcY = srcRow * sourceTileSize

        ctx.shadowColor = "rgba(0,0,0,0.5)"
        ctx.shadowBlur = 10
        ctx.drawImage(
            video,
            srcX, srcY, sourceTileSize, sourceTileSize,
            draggingRef.current.x - TILE_SIZE/2, draggingRef.current.y - TILE_SIZE/2, 
            TILE_SIZE, TILE_SIZE
        )
        ctx.shadowBlur = 0
    }

    // Draw Hand Cursor
    if (handX >= 0) {
        ctx.beginPath()
        ctx.arc(handX, handY, 10, 0, 2 * Math.PI)
        ctx.fillStyle = isPinching ? 'cyan' : 'rgba(0, 255, 255, 0.5)'
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()
    }

    requestAnimationFrame(loop)
  }

  return (
    <div className="captcha-container">
        <div className="captcha-box">
            <div className="captcha-header">
                <h2>Put Your Webcam Back In Order</h2>
                <p>Verify you are human by unscrambling your face.</p>
            </div>
            
            <div className="captcha-body">
                <div style={{ position: 'relative', width: CANVAS_SIZE, height: CANVAS_SIZE }}>
                    <canvas 
                        ref={canvasRef} 
                        width={CANVAS_SIZE} 
                        height={CANVAS_SIZE} 
                        className="captcha-canvas"
                    />
                    {isLoading && (
                        <div className="loading-overlay">
                            Initializing Vision...
                        </div>
                    )}
                </div>
                {/* Hidden Video Source */}
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ display: 'none' }}
                />
            </div>

            <div className="captcha-footer">
                <div className="info-text">
                    {isSolved ? (
                        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓ HUMAN DETECTED</span>
                    ) : (
                        <span>Pinch to move tiles. Solve the puzzle.</span>
                    )}
                </div>
                <div className="recaptcha-branding">
                    <div className="recaptcha-logo"></div>
                    <span>reCAPTCHA</span>
                </div>
            </div>
        </div>
    </div>
  )
}
