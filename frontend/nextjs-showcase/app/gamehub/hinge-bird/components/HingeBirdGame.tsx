// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useHingeSensor } from '../hooks/useHingeSensor';
import GameCanvas from './GameCanvas';

export default function HingeBirdGame() {
    const { angle, angleRef, hz, isConnected, connectionMode, connectHID, connectBridge, downloadBridgeScript, error, deviceInfo, debugInfo } = useHingeSensor();
    
    const [gameState, setGameState] = useState('start'); // start, playing, gameover
    const [score, setScore] = useState(0);
    const [coins, setCoins] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [neutralAngle, setNeutralAngle] = useState(110);
    
    // Load high score
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hingeBirdHighScore');
            if (saved) setHighScore(parseInt(saved));
        }
    }, []);

    const startGame = () => {
        setScore(0);
        setCoins(0);
        setNeutralAngle(angleRef.current || 110); // Calibrate neutral on start
        setGameState('playing');
    };

    const handleGameOver = (finalScore, finalCoins) => {
        setGameState('gameover');
        if (finalScore > highScore) {
            setHighScore(finalScore);
            if (typeof window !== 'undefined') {
                localStorage.setItem('hingeBirdHighScore', finalScore);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] font-sans text-white">
            
            {/* --- Header --- */}
            <div className="absolute top-4 left-4 z-10 flex gap-4">
                <div className="bg-black/50 p-2 rounded border border-purple-500 backdrop-blur-sm">
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 neon-text">
                        HINGE BIRD
                    </h1>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2 text-xs font-mono">
                <div className={`px-2 py-1 rounded border ${isConnected ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                    STATUS: {isConnected ? 'ONLINE' : 'OFFLINE'}
                </div>
                {isConnected && (
                    <div className="bg-black/50 px-2 py-1 rounded border border-gray-700">
                        {connectionMode === 'bridge' ? 'BRIDGE MODE (60Hz)' : 'WEB-HID MODE (2Hz)'}
                    </div>
                )}
                <div className="bg-black/50 px-2 py-1 rounded border border-gray-700">
                    ANGLE: {angle.toFixed(1)}°
                </div>
                <div className="bg-black/50 px-2 py-1 rounded border border-gray-700">
                    RATE: {hz} Hz
                </div>
            </div>

            {/* --- Main Game Area --- */}
            <div className="relative w-full max-w-4xl aspect-[4/3] group">
                
                <GameCanvas 
                    angleRef={angleRef} 
                    gameState={gameState} 
                    neutralAngle={neutralAngle}
                    onScore={setScore}
                    onCoin={setCoins}
                    onGameOver={handleGameOver}
                />

                {/* --- Overlays --- */}
                {gameState === 'start' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 rounded-lg p-8">
                        <img src="/hinge-bird/logo.png" alt="Logo" className="w-32 mb-4 opacity-80" onError={(e) => e.target.style.display='none'} />
                        <h2 className="text-5xl font-black text-white mb-2 neon-text tracking-tighter">HINGE BIRD</h2>
                        <p className="text-gray-400 mb-8 font-mono text-sm tracking-widest uppercase">MacBook Hinge Controller</p>
                        
                        {!isConnected ? (
                            <div className="flex flex-col gap-4 items-center w-full max-w-sm">
                                {/* Step 1: Client */}
                                <div className="w-full bg-gray-900/80 p-4 rounded-lg border border-gray-800 flex items-center justify-between group hover:border-purple-500/50 transition-colors">
                                    <div>
                                        <div className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                                            <span className="bg-purple-600 text-xs px-1.5 py-0.5 rounded-full">1</span>
                                            Launch Game Client
                                        </div>
                                        <div className="text-gray-500 text-xs">Start the app to enable motion control</div>
                                    </div>
                                    <a 
                                        href="/hinge-bird/HingeBridge.zip"
                                        download="HingeBridge.zip"
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition-all shadow-lg shadow-purple-900/20"
                                    >
                                        DOWNLOAD APP
                                    </a>
                                </div>

                                {/* Step 2: Connect */}
                                <div className="w-full bg-gray-900/80 p-4 rounded-lg border border-gray-800 flex items-center justify-between group hover:border-green-500/50 transition-colors">
                                    <div>
                                        <div className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                                            <span className="bg-green-600 text-xs px-1.5 py-0.5 rounded-full">2</span>
                                            Connect
                                        </div>
                                        <div className="text-gray-500 text-xs">Click here once client is running</div>
                                    </div>
                                    <button 
                                        onClick={connectBridge}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold transition-all shadow-lg shadow-green-900/20"
                                    >
                                        CONNECT
                                    </button>
                                </div>

                                {error && (
                                    <div className="mt-2 text-red-400 font-mono text-xs bg-red-900/10 border border-red-900/30 p-2 rounded w-full text-center">
                                        {error}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 animate-fade-in">
                                <div className="text-xl text-green-400 font-mono mb-4">SENSOR CONNECTED</div>
                                <div className="text-sm text-gray-400 mb-2">Move lid to calibrate center...</div>
                                <button 
                                    onClick={startGame}
                                    className="px-12 py-4 bg-cyan-500 hover:bg-cyan-400 text-black text-xl font-black rounded shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse"
                                >
                                    START GAME
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 rounded-lg">
                        <h2 className="text-6xl font-bold text-red-500 mb-2 neon-text">CRASHED!</h2>
                        <div className="text-2xl text-white mb-8 font-mono">
                            SCORE: <span className="text-yellow-400">{score}</span>
                        </div>
                        <div className="flex gap-8 text-sm text-gray-400 font-mono mb-8">
                            <div>BEST: {highScore}</div>
                            <div>COINS: {coins}</div>
                        </div>
                        <button 
                            onClick={startGame}
                            className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
                        >
                            TRY AGAIN
                        </button>
                    </div>
                )}

                {/* --- HUD (In Game) --- */}
                {gameState === 'playing' && (
                    <div className="absolute top-4 left-0 w-full flex justify-center pointer-events-none">
                        <div className="text-6xl font-black text-white/20 select-none drop-shadow-lg">
                            {score}
                        </div>
                    </div>
                )}
            </div>

            {/* --- Footer / Debug --- */}
            <div className="mt-4 text-xs text-gray-600 font-mono text-center max-w-2xl">
                <div>DEBUG: {debugInfo}</div>
                <div>DEVICE: {deviceInfo || "None"}</div>
            </div>
        </div>
    );
}
