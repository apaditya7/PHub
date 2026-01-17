'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function BulletHell() {
  const numFormat = "(===) ===-====";
  const numLength = 10;
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLSpanElement>(null);
  const [points, setPoints] = useState(0);
  const [playerPos, setPlayerPos] = useState(50); // %
  const debounceRef = useRef(false);
  const bulletSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const bulletTrackRef = useRef<NodeJS.Timeout | null>(null);

  const formatNumber = (pts: number) => {
    // Format points to the phone number
    let ptsStr = pts.toString();
    let number = numFormat;

    // add leading zeros
    while(ptsStr.length < numLength) {
      ptsStr = "0" + ptsStr;
    }

    // apply to numFormat
    ptsStr.split("").forEach(num => {
      number = number.replace("=", num);
    });

    return number;
  };

  useEffect(() => {
    const gameArea = gameAreaRef.current;
    const player = playerRef.current;
    if (!gameArea || !player) return;

    let gameAreaWidth = gameArea.getBoundingClientRect().width;
    let gameAreaTop = gameArea.getBoundingClientRect().top;

    // Mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = gameArea.getBoundingClientRect();
      const newPos = Math.floor(((e.clientX - rect.left) / gameAreaWidth) * 100);
      if (e.clientX - rect.left > 50) {
        setPlayerPos(newPos);
      }
    };

    // Keydown for shooting
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'z') {
        // create a bullet
        if (!debounceRef.current && playerPos > 5) {
          const bullet = document.createElement("span");
          bullet.className = "bullet";
          bullet.style.left = playerPos + "%";

          setTimeout(() => {
            // remove when the animation is done
            bullet.remove();
          }, 1850);

          gameArea.appendChild(bullet);

          debounceRef.current = true;
          setTimeout(() => {
            debounceRef.current = false;
          }, 100);
        }
      }
    };

    // Touch movement
    const handleTouchMove = (e: TouchEvent) => {
      const rect = gameArea.getBoundingClientRect();
      const newPos = Math.floor(((e.touches.item(0)!.pageX - rect.left) / gameAreaWidth) * 100);
      setPlayerPos(newPos);

      // auto-dispatch the bullet event
      const zEvent = new KeyboardEvent("keydown", {"key": "z"});
      document.dispatchEvent(zEvent);
    };

    // Double click to finish
    const handleDoubleClick = () => {
      if (confirm("Your number appears to be: " + formatNumber(points) + "\nIs that correct?")) {
        alert("Thank you!");
        if (bulletSpawnRef.current) clearInterval(bulletSpawnRef.current);
        if (bulletTrackRef.current) clearInterval(bulletTrackRef.current);
      }
    };

    // Resize adjustments
    const handleResize = () => {
      gameAreaWidth = gameArea.getBoundingClientRect().width;
      gameAreaTop = gameArea.getBoundingClientRect().top;
    };

    // Event listeners
    gameArea.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    gameArea.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('resize', handleResize);

    // Create a stream of bullets
    bulletSpawnRef.current = setInterval(() => {
      const left = Math.floor(Math.random() * 100);
      const bullet = document.createElement("span");
      bullet.className = "enemy_bullet";
      bullet.style.left = left + "%";

      gameArea.appendChild(bullet);

      setTimeout(() => {
        bullet.style.top = "100%";
      }, 100);

      setTimeout(() => {
        bullet.remove();
      }, 3250);
    }, 50);

    // Index all bullets' positions
    bulletTrackRef.current = setInterval(() => {
      if (!player || !gameArea) return;

      const enemyPositions: Array<{
        e: HTMLElement;
        t: number;
        l: number;
        ta: number;
        la: number;
      }> = [];
      const selfPositions: Array<{
        e: HTMLElement;
        t: number;
        l: number;
      }> = [];
      const playerData = {
        e: player,
        ta: player.getBoundingClientRect().top,
        la: player.getBoundingClientRect().left
      };

      // fill both arrays
      gameArea.querySelectorAll(".enemy_bullet").forEach((enb) => {
        const element = enb as HTMLElement;
        enemyPositions.push({
          e: element,
          t: element.getBoundingClientRect().top - gameAreaTop,
          l: parseInt(element.style.left),
          ta: element.getBoundingClientRect().top,
          la: element.getBoundingClientRect().left
        });
      });

      gameArea.querySelectorAll(".bullet").forEach((b) => {
        const element = b as HTMLElement;
        selfPositions.push({
          e: element,
          t: element.getBoundingClientRect().top - gameAreaTop,
          l: parseInt(element.style.left)
        });
      });

      // check if they match
      enemyPositions.forEach(enemy => {
        // touching a bullet?
        selfPositions.forEach(shot => {
          if (enemy.t - 40 <= shot.t
              && enemy.t + 40 >= shot.t
              && enemy.l - 5 <= shot.l
              && enemy.l + 5 >= shot.l) {
            shot.e.remove();
            enemy.e.remove();
            setPoints(prev => prev + 1);
          }
        });

        // touching the player?
        if (enemy.la - 10 <= playerData.la
            && enemy.la + 10 >= playerData.la
            && enemy.ta <= playerData.ta
            && enemy.ta + 20 >= playerData.ta) {
          setTimeout(() => {
            alert("Unfortunate. We may need you to start over.");
            setPoints(0);
          }, 100);
        }
      });
    }, 200);

    return () => {
      gameArea.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      gameArea.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('resize', handleResize);
      if (bulletSpawnRef.current) clearInterval(bulletSpawnRef.current);
      if (bulletTrackRef.current) clearInterval(bulletTrackRef.current);
    };
  }, [playerPos, points]);

  // Update player position
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.style.left = playerPos + "%";
    }
  }, [playerPos]);

  const handleRightSectionTouch = () => {
    // done
    const event = new Event("dblclick");
    document.dispatchEvent(event);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans select-none">
      <Link href="/" className="absolute top-4 left-4 text-blue-400 hover:text-blue-300 underline">
        ← Back to Home
      </Link>

      <div className="main">
        <div className="main-game" ref={gameAreaRef}>
          <span className="player" ref={playerRef} style={{ left: '50%' }}></span>
        </div>
        <div className="right-section" onTouchStart={handleRightSectionTouch}>
          <h1 className="text-3xl font-bold">Points</h1>
          <h1 className="text-3xl font-bold mrg-25 points">{formatNumber(points)}</h1>
          <h3 className="mrg-25 text-base">Earn the amount of points to match your phone number to continue.</h3>
          <h3 className="mrg-25 text-base">
            Controls:<br />
            Mouse - movement<br />
            Z - Shoot<br />
            Double-click when you&apos;re done.
          </h3>
          <h3 className="text-base">Or swipe left-right.</h3>
        </div>
      </div>

      <style jsx>{`
        * {
          margin: 0px 0px;
        }
        .main {
          border: 1px #cbcbcb solid;
          position: absolute;
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 10px;
          width: 80%;
          height: 80%;
        }
        .mrg-25 {
          margin-bottom: 25px;
        }

        .main-game {
          position: absolute;
          left: 0px;
          top: 0px;
          width: 70%;
          height: 100%;
          border-right: #cbcbcb 1px solid;
          overflow: hidden;
        }
        .right-section {
          position: absolute;
          left: 70%;
          top: 0px;
          width: 30%;
          height: 100%;
          text-align: center;
          overflow: hidden;
        }

        .player {
          position: absolute;
          bottom: 10px;
          transform: translateX(-50%);
          width: 30px;
          height: 30px;
          background: black;
          border: #cbcbcb 1px solid;
          z-index: 2;
          transition: background 0.2s;
        }

        :global(.bullet) {
          position: absolute;
          width: 10px;
          height: 30px;
          transform: translateX(-50%);
          background: #cbcbcb;
          animation-timing-function: linear;
          animation-duration: 2s;
          animation-name: player_bullets;
        }

        :global(.enemy_bullet) {
          position: absolute;
          top: -15px;
          transition: all 3s;
          transition-timing-function: linear;
          width: 15px;
          height: 15px;
          background: rgb(247, 150, 150);
        }

        @keyframes player_bullets {
          from {
            bottom: 10px;
          }
          to {
            bottom: 100%;
          }
        }
      `}</style>
    </div>
  );
}
