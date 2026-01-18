'use client'

import Link from 'next/link'
import { useState } from 'react'

// SVG Icons to replace emojis
const CarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
)

const FaceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
)

const HandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
)

const BirdIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <path d="M16 7h.01" />
    <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
    <path d="m20 7 2 .5-2 .5" />
    <path d="M10 18v3" />
    <path d="M14 17.75V21" />
    <path d="M7 18a6 6 0 0 0 3.84-10.61" />
  </svg>
)

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const BlockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const games = [
  {
    id: 'neon-racer',
    title: 'Neon Racer',
    href: '/gamehub/neon-racer',
    category: 'Motion',
    players: '1.2k playing',
    author: 'Trae Studios',
    Icon: CarIcon,
    description: 'Tilt your head to drive through the neon city.',
    color: 'from-blue-600 to-purple-600'
  },
  {
    id: 'nose-miner',
    title: 'Nose Miner',
    href: '/gamehub/nose-miner',
    category: 'Face Track',
    players: '890 playing',
    author: 'FaceTrack Inc.',
    Icon: FaceIcon,
    description: 'Use your nose to mine resources and avoid rocks.',
    color: 'from-yellow-600 to-red-600'
  },
  {
    id: 'webcam-captcha',
    title: 'Webcam Captcha',
    href: '/gamehub/webcam-captcha',
    category: 'Security',
    players: '3.5k playing',
    author: 'Security Team',
    Icon: HandIcon,
    description: 'Solve puzzles using your hand gestures.',
    color: 'from-gray-600 to-gray-800'
  },
  {
    id: 'drift-city',
    title: 'Drift City',
    href: '/gamehub/drift-city',
    category: 'Driving',
    players: 'New!',
    author: 'Trae Studios',
    Icon: CarIcon,
    description: 'Realistic car physics with drifting mechanics.',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'hinge-bird',
    title: 'Hinge Bird',
    href: '/gamehub/hinge-bird',
    category: 'Hinge',
    players: 'New!',
    author: 'Trae Studios',
    Icon: BirdIcon,
    description: 'Flap your wings to avoid pipes.',
    color: 'from-green-500 to-emerald-700'
  },
  {
    id: 'tetris',
    title: 'Tetris',
    href: '/gamehub/tetris',
    category: 'Puzzle',
    players: 'Classic',
    author: 'Nintendo',
    Icon: BlockIcon,
    description: 'The classic block-stacking puzzle game.',
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'void-travel',
    title: 'Void Travel',
    href: '/gamehub/void-travel',
    category: 'Visual',
    players: 'New!',
    author: 'Trae Studios',
    Icon: BirdIcon,
    description: 'Explore surreal floating islands in the void.',
    color: 'from-indigo-500 to-purple-800'
  },
  {
    id: 'car-show',
    title: 'Car Show',
    href: '/gamehub/car-show',
    category: 'Showcase',
    players: 'New!',
    author: 'Trae Studios',
    Icon: StarIcon,
    description: 'A cinematic car showcase with post-processing effects.',
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'tetris',
    title: 'Neon Tetris',
    href: '/gamehub/tetris',
    category: 'Puzzle',
    players: 'Classic',
    author: 'Trae Studios',
    Icon: StarIcon,
    description: 'Modern, high-performance Tetris port.',
    color: 'from-cyan-500 to-blue-600'
  },
]

export default function GameHub() {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 font-sans selection:bg-[#ff9900] selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
        <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1 group">
              <div className="flex items-center tracking-tighter">
                <span className="text-2xl font-black text-white">GAME</span>
                <span className="text-2xl font-black text-[#ff9900]">HUB</span>
              </div>
            </Link>
            
            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-400">
                <Link href="/" className="hover:text-white transition-colors">HOME</Link>
                <span className="text-[#ff9900] cursor-pointer">GAMES</span>
                <span className="hover:text-white transition-colors cursor-pointer">COMMUNITY</span>
            </nav>
        </div>

        {/* Search / User */}
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-[#1a1a1a] border border-[#333] rounded-full overflow-hidden w-64 transition-colors focus-within:border-[#ff9900]">
                <input 
                    type="text" 
                    placeholder="Search" 
                    className="bg-transparent text-gray-300 px-4 py-2 outline-none w-full text-sm placeholder:text-gray-600"
                />
                <button className="px-4 py-2 text-gray-500 hover:text-[#ff9900] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </button>
            </div>
            <button className="text-sm font-bold hover:text-[#ff9900] transition-colors">
                LOGIN
            </button>
            <button className="bg-[#ff9900] text-black text-sm font-bold px-4 py-2 rounded-full hover:bg-[#e68a00] transition-colors">
                SIGN UP
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Categories */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
            {['All Games', 'Motion', 'Face Track', 'Hinge', 'Trending'].map((cat, i) => (
                <button 
                    key={cat}
                    className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                        i === 0 
                        ? 'bg-white text-black border-white' 
                        : 'bg-[#1a1a1a] text-gray-400 border-[#333] hover:border-[#ff9900] hover:text-white'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-2 h-6 bg-[#ff9900] rounded-sm"></span>
                Featured Games
            </h2>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {games.map((game) => (
                <Link 
                    href={game.href} 
                    key={game.id}
                    className="group flex flex-col bg-[#1a1a1a] rounded-xl overflow-hidden hover:transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-[#ff9900]/10"
                    onMouseEnter={() => setHoveredGame(game.id)}
                    onMouseLeave={() => setHoveredGame(null)}
                >
                    {/* Thumbnail Container */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#222]">
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-40 group-hover:opacity-50 transition-opacity`} />
                        
                        {/* Icon */}
                        <div className="absolute inset-0 flex items-center justify-center text-white/80 group-hover:text-white group-hover:scale-110 transition-transform duration-500">
                            <game.Icon />
                        </div>
                        
                        {/* Category Badge */}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[#ff9900] text-xs font-bold px-2 py-1 rounded-md border border-[#ff9900]/20">
                            {game.category}
                        </div>

                        {/* Play Overlay */}
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                            <div className="w-14 h-14 rounded-full bg-[#ff9900] flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75 shadow-lg shadow-[#ff9900]/20">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-1">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <h3 className="text-white font-bold text-lg leading-tight group-hover:text-[#ff9900] transition-colors">
                                {game.title}
                            </h3>
                        </div>
                        
                        <p className="text-gray-400 text-xs line-clamp-2 min-h-[2.5em]">
                            {game.description}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#333]">
                             <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-2 h-2 rounded-full bg-[#ff9900] animate-pulse" />
                                {game.players}
                             </div>
                             <span className="text-xs font-bold text-gray-600 group-hover:text-white transition-colors">
                                PLAY NOW
                             </span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[#2a2a2a] py-12 bg-[#0f0f0f] text-center">
         <div className="flex justify-center items-center gap-1 mb-6 opacity-50 hover:opacity-100 transition-opacity">
            <span className="text-xl font-black text-white">GAME</span>
            <span className="text-xl font-black text-[#ff9900]">HUB</span>
         </div>
         <p className="text-gray-600 text-sm mb-6">
            The best place to waste time productively.
         </p>
         <div className="flex justify-center gap-8 text-sm font-bold text-gray-500">
             <span className="hover:text-[#ff9900] cursor-pointer transition-colors">TERMS</span>
             <span className="hover:text-[#ff9900] cursor-pointer transition-colors">PRIVACY</span>
             <span className="hover:text-[#ff9900] cursor-pointer transition-colors">CONTACT</span>
         </div>
      </footer>
    </div>
  )
}
