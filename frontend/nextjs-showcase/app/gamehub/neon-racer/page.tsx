'use client'

import { useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, PerspectiveCamera, useGLTF, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore } from '@/lib/gamehub/store'
import { audioManager } from '@/lib/gamehub/Audio'
import { BodyTracker } from '@/lib/gamehub/BodyTracker'
import Link from 'next/link'

// Preload models
if (typeof window !== 'undefined') {
  useGLTF.preload('/spaceship.glb')
  useGLTF.preload('/magic_crystal_game_ready.glb')
}

// Game Constants
const LANES = [-8, -4, 0, 4, 8]
const PLAYER_Z = 0

function Player({ playerPosRef }: { playerPosRef: React.MutableRefObject<THREE.Vector3> }) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/spaceship.glb')
  const shipModel = useMemo(() => scene.clone(), [scene])

  const gameOver = useStore(state => state.gameOver)
  const gameStarted = useStore(state => state.gameStarted)

  useFrame((state, delta) => {
    if (groupRef.current && !gameOver && gameStarted) {
      const { tilt } = useStore.getState()
      const targetX = tilt * 12 // Increased range
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, delta * 10) // Snappier movement

      const targetRotZ = -tilt * 0.8
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, delta * 8)

      // Floating animation
      groupRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2 // Raised base height to 1.5

      // Update shared ref for collision detection
      playerPosRef.current.copy(groupRef.current.position)
    }
  })

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {shipModel ? (
        // Reduced scale to 0.35 (smaller as requested)
        <primitive object={shipModel} scale={0.35} rotation={[0, Math.PI, 0]} />
      ) : (
        // Fallback: A simple cone to represent the ship
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.35, 1.5, 8]} />
          <meshStandardMaterial color="cyan" emissive="blue" emissiveIntensity={2} />
        </mesh>
      )}
      <pointLight position={[0, 0.5, 2]} color="cyan" intensity={5} distance={5} />

      {/* Engine Thruster Particles */}
      <Sparkles count={20} scale={[0.35, 0.35, 2]} position={[0, 0, 1.5]} speed={5} color="cyan" />
    </group>
  )
}

function RetroSun() {
    return (
        <mesh position={[0, 10, -100]}>
            <circleGeometry args={[20, 32]} />
            <meshBasicMaterial color="#ff00aa" fog={false} />
        </mesh>
    )
}

function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const gameOver = useStore(state => state.gameOver)
  const gameStarted = useStore(state => state.gameStarted)
  const speed = useStore(state => state.speed)

  useFrame((_, delta) => {
    if (meshRef.current && !gameOver && gameStarted) {
      // Move terrain towards camera
      meshRef.current.position.z += speed * delta
      if (meshRef.current.position.z > 20) {
        meshRef.current.position.z = -20
      }
    }
  })

  return (
    <group>
        {/* Infinite Grid Floor - Tron Style */}
        <gridHelper args={[200, 40, "cyan", "blue"]} position={[0, -2, 0]} />

        {/* Moving Floor for speed sensation */}
        <mesh ref={meshRef} position={[0, -2.1, -20]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#000020" emissive="#000020" />
        </mesh>
    </group>
  )
}

function Obstacles({ playerPosRef }: { playerPosRef: React.MutableRefObject<THREE.Vector3> }) {
  const { scene } = useGLTF('/magic_crystal_game_ready.glb')
  const obstacleModel = useMemo(() => scene.clone(), [scene])

  const gameOver = useStore(state => state.gameOver)
  const setGameOver = useStore(state => state.setGameOver)
  const increaseScore = useStore(state => state.increaseScore)
  const increaseSpeed = useStore(state => state.increaseSpeed)
  const gameStarted = useStore(state => state.gameStarted)
  const speed = useStore(state => state.speed)

  // Initial spawn
  const obstacles = useRef(new Array(20).fill(0).map((_, i) => ({
      x: LANES[Math.floor(Math.random() * LANES.length)],
      z: -50 - (i * 15), // Spaced out initially
      scale: 0.6 + Math.random() * 0.4, // Keep them large and visible
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
      active: true,
      type: Math.random() > 0.8 ? 'large' : 'normal' // 20% chance of large obstacle
  })))

  // Reset obstacles when game restarts
  useEffect(() => {
      if (!gameOver && gameStarted) {
          obstacles.current.forEach((obs, i) => {
              obs.z = -50 - (i * 15)
              obs.x = LANES[Math.floor(Math.random() * LANES.length)]
              obs.active = true
              obs.type = Math.random() > 0.8 ? 'large' : 'normal'
          })
      }
  }, [gameOver, gameStarted])

  const groupRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (groupRef.current && !gameOver && gameStarted) {
        groupRef.current.children.forEach((child, i) => {
            const obs = obstacles.current[i]

            // Move obstacle
            obs.z += speed * delta
            child.position.z = obs.z
            child.position.x = obs.x

            // Rotate
            child.rotation.x += delta
            child.rotation.y += delta

            // Collision Detection
            // Adjusted hit distance for new scale (0.35)
            const hitDistance = obs.type === 'large' ? 1.0 : 0.8
            if (obs.active && Math.abs(obs.z - PLAYER_Z) < 1.0) { // Check Z depth (tighter)
                // Check X distance (allow some graze)
                if (Math.abs(obs.x - playerPosRef.current.x) < hitDistance) {
                    console.log("CRASH!", obs.x, playerPosRef.current.x)
                    audioManager.playCrash()
                    setGameOver(true)
                }
            }

            // Reset if passed
            if (obs.z > 10) {
                obs.z = -200 - Math.random() * 50
                obs.x = LANES[Math.floor(Math.random() * LANES.length)]
                obs.active = true
                obs.type = Math.random() > 0.8 ? 'large' : 'normal'
                increaseScore(10)
                audioManager.playScore()
                increaseSpeed(0.5) // Progressive difficulty
            }
        })
    }
  })

  return (
      <group ref={groupRef}>
          {obstacles.current.map((data, i) => (
              <group key={i} position={[data.x, 1.5, data.z]}>
                  {obstacleModel ? (
                      <primitive
                          object={obstacleModel.clone()}
                          scale={data.type === 'large' ? data.scale * 2 : data.scale}
                          rotation={data.rotation as [number, number, number]}
                      />
                  ) : (
                      <mesh scale={data.type === 'large' ? data.scale * 2 : data.scale} rotation={data.rotation as [number, number, number]}>
                          <boxGeometry args={[1, 1, 1]} />
                          <meshStandardMaterial color={data.type === 'large' ? "red" : "hotpink"} emissive={data.type === 'large' ? "darkred" : "purple"} emissiveIntensity={2} />
                      </mesh>
                  )}
              </group>
          ))}
      </group>
  )
}

function SpeedLines() {
    return (
        <Sparkles
            count={200}
            scale={[20, 20, 50]}
            size={4}
            speed={4}
            opacity={0.5}
            color="white"
            position={[0, 0, -20]}
        />
    )
}

function Explosion({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
       {/* Fireball */}
       <mesh>
         <sphereGeometry args={[2, 32, 32]} />
         <meshBasicMaterial color="orange" transparent opacity={0.8} />
       </mesh>
       {/* Debris */}
       <Sparkles count={100} scale={10} size={20} speed={10} color="red" />
       <Sparkles count={100} scale={10} size={10} speed={5} color="yellow" />
    </group>
  )
}

function NeonRacerUI() {
    const score = useStore(state => state.score)
    const highScore = useStore(state => state.highScore)
    const gameOver = useStore(state => state.gameOver)
    const gameStarted = useStore(state => state.gameStarted)
    const startGame = useStore(state => state.startGame)
    const resetGame = useStore(state => state.resetGame)

    useEffect(() => {
        return () => {
            audioManager.stopMusic()
        }
    }, [])

    return (
        <>
            {!gameStarted && !gameOver && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <h1 style={{ fontSize: '4rem', margin: 0, color: 'cyan', textShadow: '0 0 20px cyan', fontFamily: 'Orbitron, sans-serif' }}>NEON RACER</h1>
                    <p style={{ fontSize: '1.5rem', color: 'white', marginTop: 20 }}>TILT HEAD TO STEER</p>
                    <button
                        onClick={() => {
                            audioManager.init();
                            startGame();
                        }}
                        style={{
                            marginTop: 40,
                            padding: '20px 40px',
                            fontSize: '1.5rem',
                            background: 'transparent',
                            color: 'cyan',
                            border: '2px solid cyan',
                            fontFamily: 'Orbitron, sans-serif',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px cyan'
                        }}
                    >
                        START MISSION
                    </button>
                    <Link href="/gamehub">
                        <button
                            style={{
                                marginTop: 20,
                                padding: '10px 20px',
                                fontSize: '1rem',
                                background: 'transparent',
                                color: '#aaa',
                                border: '1px solid #aaa',
                                fontFamily: 'Orbitron, sans-serif',
                                cursor: 'pointer'
                            }}
                        >
                            BACK TO MENU
                        </button>
                    </Link>
                </div>
            )}

            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                color: 'cyan',
                fontSize: '1.2rem'
            }}>
                SCORE: {score}
                <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: 5 }}>HI: {highScore}</div>
            </div>

            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                color: 'cyan',
                fontSize: '1.2rem'
            }}>
                SPEED: {Math.floor(score / 100) + 1}X
            </div>

            <div style={{
                position: 'absolute',
                top: 40,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#fff',
                fontSize: '3rem',
                fontWeight: '900',
                letterSpacing: '4px',
                width: '100%',
                textAlign: 'center'
            }}>
                NEON RACER
            </div>

            {gameOver && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <h1 style={{ fontSize: '5rem', margin: 0, color: 'red', textShadow: '0 0 20px red', fontFamily: 'Orbitron, sans-serif' }}>GAME OVER</h1>
                    <p style={{ fontSize: '2rem', color: 'white', marginTop: 20 }}>FINAL SCORE: {score}</p>
                    <button
                        onClick={resetGame}
                        style={{
                            marginTop: 40,
                            padding: '20px 40px',
                            fontSize: '1.5rem',
                            background: 'transparent',
                            color: 'cyan',
                            border: '2px solid cyan',
                            fontFamily: 'Orbitron, sans-serif',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px cyan'
                        }}
                    >
                        RESTART MISSION
                    </button>
                    <Link href="/gamehub">
                        <button
                            style={{
                                marginTop: 20,
                                padding: '10px 20px',
                                fontSize: '1rem',
                                background: 'transparent',
                                color: '#aaa',
                                border: '1px solid #aaa',
                                fontFamily: 'Orbitron, sans-serif',
                                cursor: 'pointer'
                            }}
                        >
                            BACK TO MENU
                        </button>
                    </Link>
                </div>
            )}
        </>
    )
}

function NeonRacerScene() {
  const playerPosRef = useRef(new THREE.Vector3())
  const gameOver = useStore(state => state.gameOver)

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[0, 10, 5]} intensity={2} color="cyan" />

      {/* World */}
      <fog attach="fog" args={['#000', 10, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <RetroSun />
      <SpeedLines />

      <Suspense fallback={null}>
        <Player playerPosRef={playerPosRef} />
        <Obstacles playerPosRef={playerPosRef} />
      </Suspense>

      {gameOver && <Explosion position={playerPosRef.current} />}

      <Terrain />

      {/* Post Processing */}
      <EffectComposer enableNormalPass={false}>
        {/* Reduced bloom radius for sharper look, removed chromatic aberration and vignette for clarity */}
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.0} radius={0.3} />
      </EffectComposer>
    </>
  )
}

export default function NeonRacerPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }} onClick={() => audioManager.init()}>
      <Link href="/gamehub">
        <button
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 2000,
            padding: '10px 20px',
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'cyan',
            border: '1px solid cyan',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'Orbitron, sans-serif',
            backdropFilter: 'blur(5px)'
          }}
        >
          ← ABORT MISSION
        </button>
      </Link>
      <BodyTracker />
      <NeonRacerUI />
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
        <NeonRacerScene />
      </Canvas>
    </div>
  )
}
