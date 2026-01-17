import { create } from 'zustand'

interface GameState {
  tilt: number // -1 (left) to 1 (right)
  lean: number // -1 (back) to 1 (forward)
  setTilt: (value: number) => void
  setLean: (value: number) => void
  
  gameMode: string
  setGameMode: (mode: string) => void

  activeGame: 'hub' | 'neon-racer' | 'nose-miner' | 'webcam-captcha'
  setActiveGame: (game: 'hub' | 'neon-racer' | 'nose-miner' | 'webcam-captcha') => void

  isVerified: boolean
  setVerified: (verified: boolean) => void

  gameStarted: boolean
  gameOver: boolean
  score: number
  highScore: number
  speed: number
  
  startGame: () => void
  setGameOver: (value: boolean) => void
  increaseScore: (amount: number) => void
  increaseSpeed: (amount: number) => void
  resetGame: () => void
}

export const useStore = create<GameState>((set) => ({
  tilt: 0,
  lean: 0,
  setTilt: (value) => set({ tilt: value }),
  setLean: (value) => set({ lean: value }),
  
  gameMode: 'menu',
  setGameMode: (mode) => set({ gameMode: mode }),

  activeGame: 'hub',
  setActiveGame: (game) => set({ activeGame: game }),

  isVerified: false,
  setVerified: (verified) => set({ isVerified: verified }),

  gameStarted: false,
  gameOver: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('highScore') || '0'),
  speed: 25, // Initial speed
  
  startGame: () => set({ gameStarted: true, gameOver: false, score: 0, speed: 25 }),
  
  setGameOver: (value) => set((state) => {
    if (value && state.score > state.highScore) {
      localStorage.setItem('highScore', state.score.toString())
      return { gameOver: value, highScore: state.score }
    }
    return { gameOver: value }
  }),
  
  increaseScore: (amount) => set((state) => ({ score: state.score + amount })),
  increaseSpeed: (amount) => set((state) => ({ speed: state.speed + amount })),
  resetGame: () => set({ gameStarted: false, gameOver: false, score: 0, speed: 25 }),
}))
