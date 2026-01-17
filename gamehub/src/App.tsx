import { Canvas } from '@react-three/fiber'
import { BodyTracker } from './BodyTracker'
import { audioManager } from './Audio'
import { NeonRacerScene, NeonRacerUI } from './NeonRacer'
import { useStore } from './store'
import { WebcamCaptcha } from './WebcamCaptcha/WebcamCaptcha'
import { NoseMiner } from './NoseMiner/NoseMiner'
import { useState } from 'react'

function GameHub() {
  const setActiveGame = useStore((state) => state.setActiveGame)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: '#111',
      color: 'white',
      gap: '2rem'
    }}>
      <h1>Select a Game</h1>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <button 
          onClick={() => setActiveGame('neon-racer')}
          style={{ 
            padding: '20px 40px', 
            fontSize: '18px', 
            cursor: 'pointer', 
            background: 'linear-gradient(45deg, #00f, #009)', 
            border: '2px solid cyan', 
            color: 'white', 
            borderRadius: '8px',
            fontFamily: 'Orbitron, sans-serif',
            boxShadow: '0 0 15px blue'
          }}
        >
          🏎️ Neon Racer
        </button>
        <button 
          onClick={() => setActiveGame('nose-miner')}
          style={{ 
            padding: '20px 40px', 
            fontSize: '18px', 
            cursor: 'pointer', 
            background: '#e6a85c', 
            border: '4px solid #8b0000', 
            color: 'black', 
            fontFamily: '"Press Start 2P", cursive, monospace',
            boxShadow: '4px 4px 0px #000'
          }}
        >
          👃 Nose Miner
        </button>
        <button 
          onClick={() => setActiveGame('webcam-captcha')}
          style={{ 
            padding: '20px 40px', 
            fontSize: '18px', 
            cursor: 'pointer', 
            background: '#fff', 
            border: '1px solid #ccc', 
            color: '#444', 
            borderRadius: '4px',
            fontFamily: 'Roboto, sans-serif',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          🧩 Captcha
        </button>
      </div>
    </div>
  )
}

function App() {
  const activeGame = useStore((state) => state.activeGame)
  const setActiveGame = useStore((state) => state.setActiveGame)

  if (activeGame === 'neon-racer') {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000' }} onClick={() => audioManager.init()}>
        <button 
          onClick={(e) => { e.stopPropagation(); setActiveGame('hub') }}
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
        <BodyTracker />
        <NeonRacerUI />
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
          <NeonRacerScene />
        </Canvas>
      </div>
    )
  }

  if (activeGame === 'nose-miner') {
    return <NoseMiner onBack={() => setActiveGame('hub')} />
  }

  if (activeGame === 'webcam-captcha') {
    return (
      <div style={{ position: 'relative' }}>
         <button 
          onClick={() => setActiveGame('hub')}
          style={{ 
            position: 'absolute', 
            top: 20, 
            left: 20, 
            zIndex: 2000, 
            padding: '10px 20px', 
            background: 'white', 
            color: '#555', 
            border: '1px solid #ddd', 
            borderRadius: '2px', 
            cursor: 'pointer',
            fontFamily: 'Roboto, sans-serif',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        >
          ← Back to Hub
        </button>
        <WebcamCaptcha />
      </div>
    )
  }

  return <GameHub />
}

export default App
