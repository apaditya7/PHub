import { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import './NoseMiner.css'
import marioIconUrl from '../assets/mario-icon.png'
import { marioMusic } from './MarioMusic'

const GRID_COLS = 40
const GRID_ROWS = 30
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 480
const CELL_WIDTH = CANVAS_WIDTH / GRID_COLS
const CELL_HEIGHT = CANVAS_HEIGHT / GRID_ROWS

// Grid Types
const TILE_EMPTY = 0
const TILE_SAND = 1
const TILE_ROCK = 2

const MARIO_SIZE = 40 // Reduced from 60
const BORDER_SIZE = 20 // Red brick wall thickness

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    color: string
    size: number
}

export function NoseMiner({ onBack }: { onBack: () => void }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isWon, setIsWon] = useState(false)
  const [showWinModal, setShowWinModal] = useState(false)
  const [score, setScore] = useState(0)
  const [timer, setTimer] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
  const gridRef = useRef<number[]>(new Array(GRID_COLS * GRID_ROWS).fill(TILE_EMPTY))
  const particlesRef = useRef<Particle[]>([])
  const coinPosRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>(0)
  const marioImgRef = useRef<HTMLImageElement | null>(null)
  const isDiggingRef = useRef(false)
  const isWonRef = useRef(false)
  const lastBumpTimeRef = useRef(0)
  const startTimeRef = useRef<number>(0)
  
  // Nose cursor position
  const cursorRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 })

  // Init & Load Assets
  useEffect(() => {
    resetGrid() // Initialize grid correctly on mount
    
    // Load Mario Image
    const img = new Image()
    img.src = marioIconUrl
    img.onload = () => {
        marioImgRef.current = img
    }

    // Play Music
    marioMusic.playTheme()
    
    // Timer Interval
    const timerInterval = setInterval(() => {
        if (!isWonRef.current && startTimeRef.current > 0) {
            setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
    }, 1000)
    
    return () => {
        marioMusic.stop()
        clearInterval(timerInterval)
    }
  }, []) // Remove isWon dependency to prevent resetGrid triggering on win

  const resetCoin = (newGrid: number[]) => {
      // Define the inner sand block area (must match resetGrid logic)
      const MARGIN_X = 6 // cells
      const MARGIN_Y = 4 // cells
      
      const minX = MARGIN_X * CELL_WIDTH
      const maxX = (GRID_COLS - MARGIN_X) * CELL_WIDTH
      const minY = MARGIN_Y * CELL_HEIGHT
      const maxY = (GRID_ROWS - MARGIN_Y) * CELL_HEIGHT

      // Try finding a valid spot (not inside a rock)
      let attempts = 0
      let valid = false
      let x = 0, y = 0
      
      while (!valid && attempts < 100) {
          const buffer = 20
          x = Math.random() * (maxX - minX - buffer * 2) + minX + buffer
          y = Math.random() * (maxY - minY - buffer * 2) + minY + buffer
          
          // Check if this position is inside a rock
          const col = Math.floor(x / CELL_WIDTH)
          const row = Math.floor(y / CELL_HEIGHT)
          const idx = row * GRID_COLS + col
          
          // Check neighbors too to ensure coin isn't clipped by rock
          let hitsRock = false
          for(let r=-1; r<=1; r++) {
              for(let c=-1; c<=1; c++) {
                  const checkIdx = (row+r) * GRID_COLS + (col+c)
                  if (checkIdx >= 0 && checkIdx < newGrid.length && newGrid[checkIdx] === TILE_ROCK) {
                      hitsRock = true
                  }
              }
          }
          
          if (!hitsRock) valid = true
          attempts++
      }
      
      // Safety: Ensure the final position is definitely not a rock
      // This guarantees the coin is reachable/collectible
      const finalCol = Math.floor(x / CELL_WIDTH)
      const finalRow = Math.floor(y / CELL_HEIGHT)
      const finalIdx = finalRow * GRID_COLS + finalCol
      if (newGrid[finalIdx] === TILE_ROCK) {
          newGrid[finalIdx] = TILE_SAND
      }
      
      coinPosRef.current = { x, y }
      setIsWon(false)
      isWonRef.current = false
      setShowWinModal(false)
      setScore(0)
      setTimer(0)
      startTimeRef.current = Date.now()
   }

  const resetGrid = () => {
    // Initialize grid with a centered block of sand
    const newGrid = new Array(GRID_COLS * GRID_ROWS).fill(TILE_EMPTY)
    
    // Define margins to create the "floating block" look
    const MARGIN_X = 6
    const MARGIN_Y = 4
    
    for (let r = MARGIN_Y; r < GRID_ROWS - MARGIN_Y; r++) {
        for (let c = MARGIN_X; c < GRID_COLS - MARGIN_X; c++) {
            const idx = r * GRID_COLS + c
            
            // 10% chance of rock, but not on edges (keep edges clean for look)
            // Also keep center somewhat clear? Nah, random is fun.
            // Reduced to 6% to make it less crowded
            if (Math.random() < 0.06) {
                newGrid[idx] = TILE_ROCK
            } else {
                newGrid[idx] = TILE_SAND
            }
        }
    }
    
    gridRef.current = newGrid
    particlesRef.current = [] // Clear particles
    resetCoin(newGrid)
    marioMusic.playAha()
  }

  useEffect(() => {
    let stream: MediaStream | null = null

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        )
        
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        })

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
           stream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: 640, height: 480 } 
           })
           
           if (videoRef.current) {
             videoRef.current.srcObject = stream
             videoRef.current.onloadeddata = () => {
               setIsLoading(false)
               videoRef.current?.play().catch(console.error)
               loop()
             }
           }
        }
      } catch (error) {
        console.error("NoseMiner Init Error:", error)
      }
    }

    init()

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
         tracks.forEach(track => track.stop())
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close()
      }
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const spawnParticles = (x: number, y: number, color: string) => {
      for(let i=0; i<5; i++) {
          particlesRef.current.push({
              x: x + Math.random() * CELL_WIDTH,
              y: y + Math.random() * CELL_HEIGHT,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 1) * 4, // Upward tendency
              life: 1.0,
              color: color,
              size: Math.random() * 4 + 2
          })
      }
  }

  const loop = () => {
    if (!canvasRef.current || !videoRef.current || !faceLandmarkerRef.current) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const video = videoRef.current
    if (video.readyState < 2) {
        animationRef.current = requestAnimationFrame(loop)
        return
    }

    const startTimeMs = performance.now()
    const result = faceLandmarkerRef.current.detectForVideo(video, startTimeMs)

    // 1. Process Input
    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0]
        const nose = landmarks[1] // Tip of nose
        
        // --- 1. SENSITIVITY MAPPING & SMOOTHING ---
        // Normal range for nose.x is roughly 0.3 to 0.7
        const sensitivity = 1.75 // Adjusted to 1.75 per user request (between 1.5 and 2.0)
        
        // Center-relative calculation
        let normX = (1 - nose.x - 0.5) * sensitivity + 0.5
        let normY = (nose.y - 0.5) * sensitivity + 0.5
        
        // Clamp to 0-1 range
        normX = Math.max(0, Math.min(1, normX))
        normY = Math.max(0, Math.min(1, normY))

        const rawTargetX = normX * CANVAS_WIDTH
        const rawTargetY = normY * CANVAS_HEIGHT
        
        // Smooth movement (Lerp) to remove jitter/teleporting
        const lerpFactor = 0.15 
        let targetX = cursorRef.current.x + (rawTargetX - cursorRef.current.x) * lerpFactor
        let targetY = cursorRef.current.y + (rawTargetY - cursorRef.current.y) * lerpFactor
        
        let hitRockPhysics = false

        // --- 1.5 BORDER CONSTRAINT (Red Brick Walls) ---
        // Clamp to keep Mario inside the walls
        const halfSize = MARIO_SIZE / 2
        
        if (targetX < BORDER_SIZE + halfSize) { 
            targetX = BORDER_SIZE + halfSize 
            hitRockPhysics = true
        } else if (targetX > CANVAS_WIDTH - BORDER_SIZE - halfSize) { 
            targetX = CANVAS_WIDTH - BORDER_SIZE - halfSize
            hitRockPhysics = true
        }

        if (targetY < BORDER_SIZE + halfSize) { 
            targetY = BORDER_SIZE + halfSize
            hitRockPhysics = true
        } else if (targetY > CANVAS_HEIGHT - BORDER_SIZE - halfSize) { 
            targetY = CANVAS_HEIGHT - BORDER_SIZE - halfSize
            hitRockPhysics = true
        }
 
        // --- 2. COLLISION CHECK (Solid Rocks) ---
        // We check if moving to (targetX, targetY) hits a rock.
        // If it does, we try to slide along axes.
        
        const checkCollision = (cx: number, cy: number) => {
            // AABB Collision with Grid
             // Use a smaller hitbox than the visual size to allow sliding past rocks
             const collisionSize = 14 // Reduced to 14 (from 16) to allow passing through 1-cell gaps
             const half = collisionSize / 2
             
             // Use a tiny epsilon to avoid edge-case collisions when exactly touching
             const epsilon = 0.01
             const startCol = Math.floor((cx - half + epsilon) / CELL_WIDTH)
             const endCol = Math.floor((cx + half - epsilon) / CELL_WIDTH)
             const startRow = Math.floor((cy - half + epsilon) / CELL_HEIGHT)
             const endRow = Math.floor((cy + half - epsilon) / CELL_HEIGHT)

            for(let r = startRow; r <= endRow; r++) {
                for(let c = startCol; c <= endCol; c++) {
                    if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
                        const idx = r * GRID_COLS + c
                        if (gridRef.current[idx] === TILE_ROCK) {
                            return true // Collision detected
                        }
                    }
                }
            }
            return false
        }

        let newX = cursorRef.current.x
        let newY = cursorRef.current.y
        // hitRockPhysics initialized above

        // Try moving X first
        if (!checkCollision(targetX, cursorRef.current.y)) {
            newX = targetX
        } else {
            hitRockPhysics = true
        }

        // Try moving Y independently (allows sliding)
        if (!checkCollision(newX, targetY)) {
            newY = targetY
        } else {
            // If Y is also blocked, we might be stuck in a corner or hitting rock directly
            // Check if Y was blocked even without X change (pure Y move)
             if (checkCollision(cursorRef.current.x, targetY)) {
                 hitRockPhysics = true
             }
        }
        
        // Update position only if valid (or sliding)
        cursorRef.current = { x: newX, y: newY }

        // Dig Logic uses current cursor position
        const x = cursorRef.current.x
        const y = cursorRef.current.y
        const col = Math.floor(x / CELL_WIDTH)
        const row = Math.floor(y / CELL_HEIGHT)
        
        const radius = 1 // Matched to smaller Mario size (40px)
        let dugSomething = false
        let hitRock = false
        
        if (!isWonRef.current) {
            for (let r = -radius; r <= radius; r++) {
                for (let c = -radius; c <= radius; c++) {
                    const targetCol = col + c
                    const targetRow = row + r
                    if (targetCol >= 0 && targetCol < GRID_COLS && targetRow >= 0 && targetRow < GRID_ROWS) {
                        const idx = targetRow * GRID_COLS + targetCol
                        const tile = gridRef.current[idx]
                        
                        if (tile === TILE_SAND) {
                            gridRef.current[idx] = TILE_EMPTY
                            dugSomething = true
                            setScore(s => s + 10) // Score for digging
                            spawnParticles(targetCol * CELL_WIDTH, targetRow * CELL_HEIGHT, '#d48e25')
                        } else if (tile === TILE_ROCK) {
                            hitRock = true
                            // Visual feedback for rock hit? Maybe shake cursor?
                        }
                    }
                }
            }
        
            if (dugSomething && !isDiggingRef.current) {
                 if (Math.random() < 0.5) { // Increased from 0.3
                     marioMusic.playYahoo()
                 }
            }
            
            if (hitRock && !dugSomething) {
                // Audio is handled by physics collision below
            }
            
            isDiggingRef.current = dugSomething || hitRock
        }

        // Sound for hitting solid rock (physics)
        if (hitRockPhysics) {
             const now = Date.now()
             if (now - lastBumpTimeRef.current > 300) {
                 marioMusic.playBump()
                 lastBumpTimeRef.current = now
             }
        }

        // Check Win Condition (Hit Coin)
        const dist = Math.hypot(x - coinPosRef.current.x, y - coinPosRef.current.y)
        if (dist < 30) { 
            if (!isWonRef.current) {
                isWonRef.current = true
                setIsWon(true)
                marioMusic.playWin()
                setScore(s => s + 1000) // Win bonus
                
                // Spawn big particle explosion
                for(let i=0; i<10; i++) {
                    spawnParticles(coinPosRef.current.x, coinPosRef.current.y, '#FFD700') // Gold
                    spawnParticles(coinPosRef.current.x, coinPosRef.current.y, '#FFFFFF') // Sparkles
                }
                
                setShowWinModal(true)
                // Instant flash for 1 second then go (reset)
                setTimeout(() => {
                    resetGrid() // Full reset (refills sand)
                }, 1000)
            }
        }
    }

    // 2. Render
    
    // Background -> Black
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw Coin (Behind Sand)
    const coinX = coinPosRef.current.x
    const coinY = coinPosRef.current.y
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(coinX, coinY, 15, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#FFA500'
    ctx.lineWidth = 2
    ctx.stroke()
    // Shine Animation
    const shineOffset = (Date.now() / 200) % 20 - 10
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.beginPath()
    ctx.arc(coinX - 5 + shineOffset, coinY - 5, 4, 0, 2 * Math.PI)
    ctx.fill()

    // Draw Grid (Sand & Rocks)
    const sandColor = '#E69D2C' 
    const rockColor = '#5a5a5a'
    
    // Draw Border (Bricks)
    // BORDER_SIZE is defined globally
    ctx.fillStyle = '#b85c38' // Brick color
    ctx.fillRect(0, 0, CANVAS_WIDTH, BORDER_SIZE) // Top
    ctx.fillRect(0, CANVAS_HEIGHT - BORDER_SIZE, CANVAS_WIDTH, BORDER_SIZE) // Bottom
    ctx.fillRect(0, 0, BORDER_SIZE, CANVAS_HEIGHT) // Left
    ctx.fillRect(CANVAS_WIDTH - BORDER_SIZE, 0, BORDER_SIZE, CANVAS_HEIGHT) // Right

    // Brick Pattern
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    for(let y=0; y<=BORDER_SIZE; y+=10) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT-y); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT-y); ctx.stroke();
    }
    for(let x=0; x<=CANVAS_WIDTH; x+=20) {
         ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, BORDER_SIZE); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(x, CANVAS_HEIGHT-BORDER_SIZE); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
     for(let y=0; y<=CANVAS_HEIGHT; y+=10) {
         ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(BORDER_SIZE, y); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH-BORDER_SIZE, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
     }

    // Render Tiles
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const idx = r * GRID_COLS + c
            const tile = gridRef.current[idx]
            
            if (tile !== TILE_EMPTY) {
                const y = r * CELL_HEIGHT
                const x = c * CELL_WIDTH
                
                if (tile === TILE_SAND) {
                    ctx.fillStyle = sandColor
                    ctx.fillRect(x, y, CELL_WIDTH + 1, CELL_HEIGHT + 1)
                    // Texture
                    if ((c + r) % 2 === 0) {
                        ctx.fillStyle = '#d48e25'
                        ctx.fillRect(x + 2, y + 2, 2, 2)
                    }
                } else if (tile === TILE_ROCK) {
                    ctx.fillStyle = rockColor
                    ctx.fillRect(x, y, CELL_WIDTH + 1, CELL_HEIGHT + 1)
                    // Rock Detail (Crack)
                    ctx.strokeStyle = '#333'
                    ctx.lineWidth = 1
                    ctx.beginPath()
                    ctx.moveTo(x + 4, y + 4)
                    ctx.lineTo(x + CELL_WIDTH - 4, y + CELL_HEIGHT - 4)
                    ctx.stroke()
                    
                    // Highlight
                    ctx.fillStyle = '#777'
                    ctx.fillRect(x+2, y+2, 4, 4)
                }
            }
        }
    }
    
    // Update & Draw Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2 // Gravity
        p.life -= 0.05
        
        if (p.life <= 0) {
            particlesRef.current.splice(i, 1)
        } else {
            ctx.fillStyle = p.color
            ctx.globalAlpha = p.life
            ctx.fillRect(p.x, p.y, p.size, p.size)
            ctx.globalAlpha = 1.0
        }
    }

    // Draw Cursor (Mario)
    if (marioImgRef.current) {
        const size = MARIO_SIZE
        
        ctx.save()
        ctx.translate(cursorRef.current.x, cursorRef.current.y)
        
        if (isDiggingRef.current) {
            const wiggle = Math.sin(Date.now() / 50) * 0.2
            ctx.rotate(wiggle)
        }
        
        ctx.drawImage(marioImgRef.current, -size/2, -size/2, size, size)
        ctx.restore()
    } else {
        ctx.fillStyle = '#ff0000'
        ctx.beginPath()
        ctx.arc(cursorRef.current.x, cursorRef.current.y, 8, 0, 2 * Math.PI)
        ctx.fill()
    }

    animationRef.current = requestAnimationFrame(loop)
  }

  return (
    <div className="nose-miner-container">
        <div className="game-header">
            <button className="back-btn" onClick={onBack}>← Back</button>
            <div style={{ textAlign: 'center' }}>
                <h1>Nose Miner</h1>
                <div style={{ fontSize: '14px', color: '#FFD700', marginTop: '5px' }}>
                    TIME: {timer}s | SCORE: {score}
                </div>
            </div>
            <button className="reset-btn" onClick={resetGrid}>Reset</button>
        </div>
        
        <div className="game-area">
            {isLoading && <div className="loading">Loading Face Tracking...</div>}
            {showWinModal && (
                <div className="win-overlay">
                    <h2>🎉 YOU FOUND THE COIN! 🎉</h2>
                    <div style={{ fontSize: '18px', marginBottom: '20px', color: '#fff' }}>
                        Time: {timer}s <br/> Score: {score}
                    </div>
                    <button className="reset-btn" onClick={resetGrid}>Play Again</button>
                </div>
            )}
            <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT}
                className="game-canvas"
            />
            <video ref={videoRef} style={{ display: 'none' }} playsInline muted autoPlay />
        </div>
        
        <div className="instructions">
            Dig the SAND. Avoid ROCKS. Find the COIN! 🪙
        </div>
    </div>
  )
}
