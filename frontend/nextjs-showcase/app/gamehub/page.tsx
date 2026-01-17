'use client'

import Link from 'next/link'

export default function GameHub() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: '#111',
      color: 'white',
      gap: '2rem',
      padding: '2rem'
    }}>
      <h1 style={{
        fontSize: '3rem',
        fontFamily: 'Orbitron, sans-serif',
        textShadow: '0 0 20px cyan',
        marginBottom: '1rem'
      }}>
        GameHub
      </h1>
      <p style={{
        fontSize: '1.2rem',
        color: '#aaa',
        textAlign: 'center',
        maxWidth: '600px',
        marginBottom: '2rem'
      }}>
        Motion-controlled games using webcam tracking. Select a game to start playing!
      </p>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/gamehub/neon-racer">
          <button
            style={{
              padding: '20px 40px',
              fontSize: '18px',
              cursor: 'pointer',
              background: 'linear-gradient(45deg, #00f, #009)',
              border: '2px solid cyan',
              color: 'white',
              borderRadius: '8px',
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 15px blue',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🏎️ Neon Racer
          </button>
        </Link>
        <Link href="/gamehub/nose-miner">
          <button
            style={{
              padding: '20px 40px',
              fontSize: '18px',
              cursor: 'pointer',
              background: '#e6a85c',
              border: '4px solid #8b0000',
              color: 'black',
              fontFamily: '"Press Start 2P", cursive, monospace',
              boxShadow: '4px 4px 0px #000',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            👃 Nose Miner
          </button>
        </Link>
        <Link href="/gamehub/webcam-captcha">
          <button
            style={{
              padding: '20px 40px',
              fontSize: '18px',
              cursor: 'pointer',
              background: '#fff',
              border: '1px solid #ccc',
              color: '#444',
              borderRadius: '4px',
              fontFamily: 'Roboto, sans-serif',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🧩 Captcha
          </button>
        </Link>
      </div>
      <Link href="/">
        <button style={{
          marginTop: '3rem',
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          ← Back to Home
        </button>
      </Link>
    </div>
  )
}
