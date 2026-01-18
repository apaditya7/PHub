// @ts-nocheck
import React, { useEffect, useRef, useCallback } from 'react';
import { goofyMusic } from '../utils/audio';

const SMOOTHING = 0.05; // 0.05 = Very Smooth (Floaty), 1.0 = Instant

export default function GameCanvas({ angleRef, gameState, neutralAngle, onScore, onCoin, onGameOver }) {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const smoothAngleRef = useRef(neutralAngle);
    const duckImgRef = useRef(null);

    // Load Duck Image
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const img = new Image();
            // In Next.js, images in public/assets/duck.png are accessed via /assets/duck.png
            img.src = '/hinge-bird/duck.png';
            duckImgRef.current = img;
        }
    }, []);

    const stateRef = useRef({
        birdY: 300,
        pipes: [],
        coins: [],
        score: 0,
        coinCount: 0,
        frame: 0,
        width: 800,
        height: 600,
        gameSpeed: 3
    });

    // Reset game when state changes to 'playing'
    useEffect(() => {
        if (gameState === 'playing') {
            goofyMusic.start();
            smoothAngleRef.current = angleRef.current || neutralAngle;
            stateRef.current = {
                birdY: 300,
                pipes: [],
                coins: [],
                score: 0,
                coinCount: 0,
                frame: 0,
                width: canvasRef.current ? canvasRef.current.width : 800,
                height: canvasRef.current ? canvasRef.current.height : 600,
                gameSpeed: 3
            };
        } else {
            goofyMusic.stop();
        }
    }, [gameState, angleRef, neutralAngle]);

    // Game Loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = stateRef.current;
        const { width, height } = state;

        // --- Logic ---
        if (gameState === 'playing') {
            // 1. Bird Movement (Mapped to Angle)
            
            // Smooth the input (Low Pass Filter)
            const rawAngle = angleRef.current;
            smoothAngleRef.current = smoothAngleRef.current + (rawAngle - smoothAngleRef.current) * SMOOTHING;

            // Neutral (e.g. 110) -> Center (300)
            const range = 35;
            const diff = smoothAngleRef.current - neutralAngle; 
            
            // Map: Angle Increases (Open) -> Up (Lower Y)
            // Angle Decreases (Close) -> Down (Higher Y)
            const normalized = (diff + range) / (range * 2); // 0.0 to 1.0
            const targetY = height - (normalized * height); 
            
            // Smooth it
            state.birdY += (targetY - state.birdY) * 0.1;
            state.birdY = Math.max(20, Math.min(height - 20, state.birdY));

            // Increase difficulty (Speed)
            const targetSpeed = 4 + (state.score * 0.2); 
            if (state.gameSpeed < targetSpeed && state.gameSpeed < 20) {
                state.gameSpeed += 0.01;
            }

            // 2. Pipes & Variability
            const lastPipe = state.pipes[state.pipes.length - 1];
            const minSpacing = 300 + (state.gameSpeed * 15);
            
            if (!lastPipe || (width - lastPipe.x) > (minSpacing + Math.random() * 150)) {
                
                const gap = Math.max(170, 220 - (state.score * 0.5)); 
                const minPipe = 50;
                const maxPipe = height - gap - minPipe;
                const topHeight = Math.floor(Math.random() * (maxPipe - minPipe + 1)) + minPipe;
                
                state.pipes.push({
                    x: width,
                    topHeight: topHeight,
                    gap: gap,
                    passed: false
                });

                // Spawn Coins
                if (Math.random() > 0.4) {
                    const count = Math.floor(Math.random() * 3) + 1;
                    const startY = topHeight + gap / 2;
                    for (let i = 0; i < count; i++) {
                        state.coins.push({
                            x: width + 50 + (i * 40),
                            y: startY + (Math.random() * 60 - 30),
                            collected: false
                        });
                    }
                } else if (Math.random() > 0.7) {
                     state.coins.push({
                        x: width + Math.random() * 100,
                        y: Math.random() * (height - 100) + 50,
                        collected: false
                     });
                }
            }

            // Move Pipes
            state.pipes.forEach(p => p.x -= state.gameSpeed);
            if (state.pipes.length > 0 && state.pipes[0].x < -60) state.pipes.shift();

            // Move Coins
            state.coins.forEach(c => c.x -= state.gameSpeed);
            state.coins = state.coins.filter(c => c.x > -50 && !c.collected);

            // Collision (Bird vs Pipe)
            const birdRadius = 12;
            const birdX = width / 4;
            
            let collision = false;
            state.pipes.forEach(p => {
                if (birdX + birdRadius > p.x && birdX - birdRadius < p.x + 60) {
                    if (state.birdY - birdRadius < p.topHeight || state.birdY + birdRadius > p.topHeight + p.gap) {
                        collision = true;
                    }
                }
                
                if (!p.passed && p.x < birdX) {
                    p.passed = true;
                    state.score++;
                    onScore(state.score);
                }
            });

            // Collision (Bird vs Coin)
            state.coins.forEach(c => {
                if (!c.collected) {
                    const dx = c.x - birdX;
                    const dy = c.y - state.birdY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 30) { 
                        c.collected = true;
                        state.coinCount++;
                        if (onCoin) onCoin(state.coinCount);
                    }
                }
            });

            if (collision) {
                onGameOver(state.score, state.coinCount);
            }

            state.frame++;
        }

        // --- Drawing ---
        ctx.fillStyle = '#1a0b2e'; // Deep Purple
        ctx.fillRect(0, 0, width, height);

        // Grid/Neon Background
        ctx.strokeStyle = '#2d1b4e';
        ctx.lineWidth = 2;
        const gridSpeed = state.frame * (state.gameSpeed * 0.5);
        for(let x=0; x<width; x+=50) {
            ctx.beginPath(); 
            ctx.moveTo(x - (gridSpeed % 50), 0); 
            ctx.lineTo(x - (gridSpeed % 50), height); 
            ctx.stroke();
        }

        // Draw Pipes
        ctx.fillStyle = '#00f3ff'; // Cyan Neon
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f3ff';
        state.pipes.forEach(p => {
            ctx.fillRect(p.x, 0, 60, p.topHeight);
            ctx.fillRect(p.x, p.topHeight + p.gap, 60, height - (p.topHeight + p.gap));
        });
        ctx.shadowBlur = 0;

        // Draw Coins
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24'; 
        ctx.fillStyle = '#fbbf24';
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        state.coins.forEach(c => {
            if (!c.collected) {
                ctx.beginPath();
                ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.fillText("$", c.x, c.y + 1);
                ctx.fillStyle = '#fbbf24';
            }
        });
        ctx.shadowBlur = 0;

        // Draw Player (Duck/Spaceship)
        const birdX = width / 4;
        ctx.save();
        ctx.translate(birdX, state.birdY);
        // Rotate based on angle (with limits)
        const rotation = Math.max(-45, Math.min(45, (state.birdY - 300) * 0.2)) * Math.PI / 180;
        ctx.rotate(rotation);

        if (duckImgRef.current && duckImgRef.current.complete && duckImgRef.current.naturalWidth !== 0) {
            // Draw sprite (centered)
            const size = 30; 
            ctx.drawImage(duckImgRef.current, -size/2, -size/2, size, size);
        } else {
            // Fallback: Triangle/Rocket shape if image fails
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-10, 10);
            ctx.lineTo(-10, -10);
            ctx.fill();
        }
        ctx.restore();

        // Draw Trail (Wind/Speed Effect)
        if (gameState === 'playing') {
            const count = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < count; i++) {
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4})`;
                const trailLength = 20 + Math.random() * 40;
                const trailWidth = 2 + Math.random() * 3;
                const trailX = birdX - 30 - Math.random() * 20;
                const trailY = state.birdY + (Math.random() * 40 - 20);
                
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(trailX - trailLength, trailY, trailLength, trailWidth, 2);
                } else {
                    ctx.rect(trailX - trailLength, trailY, trailLength, trailWidth);
                }
                ctx.fill();
            }
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [gameState, neutralAngle, onScore, onCoin, onGameOver]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    return (
        <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            className="w-full h-full object-contain rounded-lg shadow-2xl border-4 border-purple-500 neon-border bg-black" 
        />
    );
}
