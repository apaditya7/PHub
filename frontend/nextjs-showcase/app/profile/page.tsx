'use client';

import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle, ReactNode, useId } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Camera,
  Color3,
  Color4,
  Effect,
  Engine,
  Mesh,
  MeshBuilder,
  PostProcess,
  Scene,
  ShadowGenerator,
  SpotLight,
  StandardMaterial,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';
import { animate as anime } from 'animejs';

// Jigsaw Puzzle Component
interface Piece {
  id: number;
  clipId: string;
  d: string;
  cx: number;
  cy: number;
  isDragging: boolean;
  isCompleted: boolean;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
}

function random(min: number, max: number, round: boolean = false): number {
  const value = Math.random() * (max - min) + min;
  return round ? Math.round(value) : value;
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

function generateQuadPaths(
  width: number,
  height: number,
  rows: number,
  cols: number,
  jitterRatio = 0.3
) {
  rows = Math.max(1, Math.floor(rows));
  cols = Math.max(1, Math.floor(cols));

  const cellW = width / cols;
  const cellH = height / rows;

  const grid: { x: number; y: number }[][] = [];

  for (let row = 0; row <= rows; row++) {
    grid[row] = [];
    for (let col = 0; col <= cols; col++) {
      const baseX = col * cellW;
      const baseY = row * cellH;

      const isBorder = row === 0 || col === 0 || row === rows || col === cols;

      let dx = 0;
      let dy = 0;

      if (!isBorder && jitterRatio > 0) {
        const maxDX = cellW * jitterRatio;
        const maxDY = cellH * jitterRatio;
        dx = (Math.random() * 2 - 1) * maxDX;
        dy = (Math.random() * 2 - 1) * maxDY;
      }

      grid[row]![col] = { x: baseX + dx, y: baseY + dy };
    }
  }

  const paths: { d: string; cx: number; cy: number }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const p00 = grid[row]![col]!;
      const p10 = grid[row]![col + 1]!;
      const p11 = grid[row + 1]![col + 1]!;
      const p01 = grid[row + 1]![col]!;

      const cx = (p00.x + p10.x + p11.x + p01.x) / 4;
      const cy = (p00.y + p10.y + p11.y + p01.y) / 4;

      paths.push({
        d: `M${p00.x} ${p00.y} L${p10.x} ${p10.y} L${p11.x} ${p11.y} L${p01.x} ${p01.y} Z`,
        cx,
        cy,
      });
    }
  }

  return paths;
}

function getRandomPosition(width: number, height: number) {
  return {
    x: random(width * 0.1, width * 0.3, true),
    y: random(height * 0.8, height, true),
  };
}

interface BtnJigsawPuzzleProps {
  label?: string;
  disabled?: boolean;
  zIndex?: number | string;
  tabIndex?: number;
  rowCount?: number;
  colCount?: number;
  onDragStart?: (piece: Piece, evt: PointerEvent) => void;
  onDragging?: (piece: Piece, evt: PointerEvent) => void;
  onDragStop?: (piece: Piece, evt: PointerEvent) => void;
  onCompleted?: () => void;
  onClick?: () => void;
  children?: (props: { isAllCompleted: boolean }) => ReactNode;
}

export interface BtnJigsawPuzzleRef {
  scatter: () => void;
  autoComplete: () => void;
}

const BtnJigsawPuzzle = forwardRef<BtnJigsawPuzzleRef, BtnJigsawPuzzleProps>(
  (
    {
      label = '',
      disabled = false,
      zIndex,
      tabIndex = 0,
      rowCount = 2,
      colCount = 2,
      onDragStart,
      onDragging,
      onDragStop,
      onCompleted,
      onClick,
      children,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [pieceData, setPieceData] = useState<Piece[]>([]);
    const [, setForceUpdate] = useState(0);
    const [pointerType, setPointerType] = useState<string>('mouse');
    const id = useId();

    const triggerPieceData = useCallback(
      throttle(() => {
        setForceUpdate(prev => prev + 1);
      }, 10),
      []
    );

    const isAllCompleted = pieceData.every(p => p.isCompleted);

    useEffect(() => {
      if (isAllCompleted && pieceData.length > 0) {
        onCompleted?.();
      }
    }, [isAllCompleted, onCompleted, pieceData.length]);

    const generatePieces = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { width, height } = rect;

      const paths = generateQuadPaths(width, height, rowCount, colCount);

      setPieceData(
        paths.map(({ d, cx, cy }, index) => ({
          id: index,
          clipId: `clip-piece-${id}-${index}`,
          d,
          cx,
          cy,
          isDragging: false,
          ...getRandomPosition(width, height),
          offsetX: 0,
          offsetY: 0,
          isCompleted: false,
          rotate: random(10, 90, true),
        }))
      );
    }, [rowCount, colCount, id]);

    useEffect(() => {
      const updateSize = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      };

      updateSize();
      generatePieces();

      const resizeObserver = new ResizeObserver(updateSize);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => resizeObserver.disconnect();
    }, [generatePieces]);

    useEffect(() => {
      const handlePointerMove = (e: PointerEvent) => {
        setPointerType(e.pointerType);
      };
      window.addEventListener('pointermove', handlePointerMove);
      return () => window.removeEventListener('pointermove', handlePointerMove);
    }, []);

    const getClientCoordinates = (evt: PointerEvent) => {
      return { clientX: evt.clientX, clientY: evt.clientY };
    };

    const handleDragStart = (piece: Piece, evt: React.PointerEvent) => {
      onDragStart?.(piece, evt.nativeEvent);

      const target = evt.currentTarget;
      if (target instanceof HTMLElement) {
        target.setPointerCapture(evt.pointerId);
      }

      evt.preventDefault();
      piece.isDragging = true;

      const touchYOffset = pointerType !== 'mouse' ? 40 : 0;

      const { clientX, clientY } = getClientCoordinates(evt.nativeEvent);
      piece.offsetX = clientX - piece.x;
      piece.offsetY = clientY - piece.y + touchYOffset;

      anime(piece, {
        rotate: 0,
        duration: 200,
        ease: 'outBack',
        onUpdate: () => triggerPieceData(),
      });

      triggerPieceData();
    };

    const handleDragging = (piece: Piece, evt: React.PointerEvent) => {
      if (!piece.isDragging || piece.isCompleted) return;
      onDragging?.(piece, evt.nativeEvent);
      evt.preventDefault();

      const { clientX, clientY } = getClientCoordinates(evt.nativeEvent);

      piece.x = clientX - piece.offsetX;
      piece.y = clientY - piece.offsetY;

      triggerPieceData();
    };

    const handleDragStop = async (piece: Piece, evt: React.PointerEvent) => {
      onDragStop?.(piece, evt.nativeEvent);

      const target = evt.currentTarget;
      if (target instanceof HTMLElement && target.hasPointerCapture(evt.pointerId)) {
        target.releasePointerCapture(evt.pointerId);
      }

      piece.isDragging = false;

      if (Math.abs(piece.x) < 5 && Math.abs(piece.y) < 5) {
        piece.isCompleted = true;

        anime(piece, {
          x: 0,
          y: 0,
          rotate: 0,
          duration: 100,
          ease: 'outBack',
          onUpdate: () => triggerPieceData(),
        });
      } else {
        anime(piece, {
          rotate: random(10, 90, true),
          duration: 200,
          ease: 'outBack',
          onUpdate: () => triggerPieceData(),
        });
      }

      await nextFrame();
      triggerPieceData();
    };

    const handleClick = async () => {
      if (isAllCompleted) {
        onClick?.();
      }
    };

    const scatter = useCallback(() => {
      pieceData.forEach((piece, i) => {
        anime(piece, {
          ...getRandomPosition(containerSize.width, containerSize.height),
          rotate: random(10, 90, true),
          duration: 400,
          delay: i * 50,
          ease: 'outBack',
          onUpdate: () => triggerPieceData(),
          onComplete: () => {
            piece.isDragging = false;
            piece.isCompleted = false;
            triggerPieceData();
          },
        });

        piece.isDragging = false;
        piece.isCompleted = false;
      });
      triggerPieceData();
    }, [pieceData, containerSize, triggerPieceData]);

    const autoComplete = useCallback(() => {
      pieceData.forEach((piece, i) => {
        anime(piece, {
          x: 0,
          y: 0,
          rotate: 0,
          duration: 400,
          delay: i * 50,
          ease: 'outBack',
          onUpdate: () => triggerPieceData(),
          onComplete: () => {
            piece.isCompleted = true;
            triggerPieceData();
          },
        });
      });
    }, [pieceData, triggerPieceData]);

    useImperativeHandle(ref, () => ({
      scatter,
      autoComplete,
    }));

    const pieceList = pieceData.map(piece => {
      let classes = '';
      if (isAllCompleted) {
        classes = '!opacity-0 !pointer-events-none';
      } else if (piece.isCompleted) {
        classes = '';
      } else if (piece.isDragging) {
        classes = 'cursor-grabbing';
      } else {
        classes = 'opacity-50 cursor-grab';
      }

      return {
        piece,
        classes,
        style: {
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          clipPath: `url(#${piece.clipId})`,
          transform: `translate(${piece.x}px, ${piece.y}px) rotate(${piece.rotate}deg)`,
          transformOrigin: `${piece.cx}px ${piece.cy}px`,
        },
      };
    });

    const defaultButton = (
      <button className="btn w-full select-none rounded p-3 px-6 bg-green-600 text-white border-2 border-green-900 hover:bg-green-700">
        {label}
      </button>
    );

    return (
      <>
        <style jsx>{`
          .btn {
            border: 2px solid #14532d;
            background-color: #16a34a;
            color: #ffffff;
            transition-duration: 0.2s;
          }
          .btn:hover {
            background-color: #15803d;
          }
          .btn:active {
            transition-duration: 0.1s;
            transform: scale(0.98);
          }
        `}</style>

        <div ref={containerRef} className="relative" onClick={handleClick} style={{ zIndex }}>
          {pieceList.map(({ piece, classes, style }) => (
            <div
              key={piece.id}
              className={`absolute touch-none transition-opacity [&>*]:!pointer-events-none ${classes}`}
              style={style}
              onPointerDown={evt => handleDragStart(piece, evt)}
              onPointerMove={evt => handleDragging(piece, evt)}
              onPointerUp={evt => handleDragStop(piece, evt)}
            >
              {children ? children({ isAllCompleted }) : defaultButton}
            </div>
          ))}

          <svg width="0" height="0" aria-hidden="true">
            <defs>
              {pieceData.map(piece => (
                <clipPath
                  key={piece.id}
                  id={piece.clipId}
                  clipPathUnits="userSpaceOnUse"
                >
                  <path d={piece.d} />
                </clipPath>
              ))}
            </defs>
          </svg>

          <div
            className={`w-full ${!isAllCompleted ? '!opacity-30 pointer-events-none' : ''}`}
            tabIndex={tabIndex}
          >
            {children ? children({ isAllCompleted }) : defaultButton}
          </div>
        </div>
      </>
    );
  }
);

BtnJigsawPuzzle.displayName = 'BtnJigsawPuzzle';

// Main Profile Component
export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Bullet Hell state
  const numFormat = "+65 ==== ====";
  const numLength = 8;
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLSpanElement>(null);
  const [points, setPoints] = useState(0);
  const [playerPos, setPlayerPos] = useState(50);
  const [gameState, setGameState] = useState<'idle' | 'running' | 'paused'>('idle');
  const debounceRef = useRef(false);
  const bulletSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const bulletTrackRef = useRef<NodeJS.Timeout | null>(null);

  // Real Dark Mode state
  const [realDarkMode, setRealDarkMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<UniversalCamera | null>(null);
  const spotlightRef = useRef<SpotLight | null>(null);
  const wallRef = useRef<Mesh | null>(null);
  const shadowGeneratorRef = useRef<ShadowGenerator | null>(null);
  const boxMapRef = useRef<Map<string, Mesh>>(new Map());
  const mouseRef = useRef({ x: 0, y: 0, elementX: 0, elementY: 0, isOutside: false });
  const pMouseRef = useRef({ x: 0, y: 0 });
  const pressedRef = useRef(false);
  const pressedAnchorRef = useRef(new Vector3());
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Jigsaw ref
  const jigsawRef = useRef<BtnJigsawPuzzleRef>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Load user profile data
    const loadProfile = async () => {
      const profileRef = doc(db, 'userProfiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setDisplayName(data.displayName || '');
        if (data.dateOfBirth) {
          if (data.dateOfBirth.toDate) {
            setSelectedDate(data.dateOfBirth.toDate());
            setDateOfBirth(formatDate(data.dateOfBirth.toDate()));
          } else {
            const date = new Date(data.dateOfBirth);
            setSelectedDate(date);
            setDateOfBirth(formatDate(date));
          }
        }
        if (data.phoneNumber) {
          setPoints(parseInt(data.phoneNumber) || 0);
        }
      }
    };
    loadProfile();
  }, [user, router]);

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatNumber = (pts: number) => {
    let ptsStr = pts.toString();
    let number = numFormat;

    while (ptsStr.length < numLength) {
      ptsStr = "0" + ptsStr;
    }

    ptsStr.split("").forEach(num => {
      number = number.replace("=", num);
    });

    return number;
  };

  // Orbital Date Picker
  useEffect(() => {
    if (!showDatePicker) return;

    const earth = document.getElementById("earth") as HTMLImageElement;
    const dateDisplay = document.getElementById("dateDisplay") as HTMLDivElement;
    const datePicker = document.getElementById("datePicker") as HTMLDivElement;
    const ellipse = document.getElementById("ellipse") as unknown as SVGEllipseElement;

    if (!earth || !dateDisplay || !datePicker || !ellipse) return;

    let isPressing = false;

    const earthSize = 15;
    const horizontalRadius = 150;
    const verticalRadius = 73;
    const horizontalMargin = 25;
    const verticalMargin = 10;

    let today = new Date();
    let year = selectedDate?.getFullYear() || today.getFullYear();
    let start = new Date(year, 0, 0);
    let diff = (selectedDate || today).getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    let dayNumber = Math.floor(diff / oneDay);
    let date = dateFromDay(dayNumber);
    dateDisplay.innerHTML = formatDate(date);

    let angle = 2 * Math.asin(((dayNumber - 1) / (182.5 + (isLeapyear() ? 0.5 : 0))) - 1);
    let previousAngle = angle;
    let x = horizontalRadius * Math.cos(angle);
    let y = verticalRadius * Math.sin(angle);

    earth.setAttribute("x", String(horizontalRadius + x - earthSize / 2 + horizontalMargin));
    earth.setAttribute("y", String(verticalRadius - y - earthSize / 2 + verticalMargin));

    function mousedown(e: MouseEvent | TouchEvent) {
      isPressing = true;
      e.preventDefault();
    }

    function mousemove(e: MouseEvent | TouchEvent) {
      if (!isPressing) return;

      const { clientX, clientY } = (e as TouchEvent).touches != null ? (e as TouchEvent).touches[0] : e as MouseEvent;

      const rect = ellipse.getBoundingClientRect();
      const ellipseCenterX = rect.x + rect.width / 2;
      const ellipseCenterY = rect.y + rect.height / 2;
      angle = Math.atan2(ellipseCenterY - clientY, clientX - ellipseCenterX);

      const angleDiff = angle - previousAngle;

      if (angleDiff > Math.PI) {
        year--;
      } else if (angleDiff < -Math.PI) {
        year++;
      }

      previousAngle = angle;

      let x = horizontalRadius * Math.cos(angle);
      let y = verticalRadius * Math.sin(angle);

      earth.setAttribute("x", String(horizontalRadius + x - earthSize / 2 + horizontalMargin));
      earth.setAttribute("y", String(verticalRadius - y - earthSize / 2 + verticalMargin));

      dayNumber = ((182.5 + (isLeapyear() ? 0.5 : 0)) * (Math.sin((angle) / 2) + 1) + 1);

      date = dateFromDay(dayNumber);

      if (date.getTime() > today.getTime() || year < 1950) {
        dateDisplay.classList.add("future");
        if (year < 1950) {
          year = 1950;
          dateDisplay.innerHTML = "Can't go before 1950!";
        } else {
          dateDisplay.innerHTML = "No time travelers!";
        }
      } else {
        dateDisplay.classList.remove("future");
        dateDisplay.innerHTML = formatDate(date);
        setSelectedDate(date);
        setDateOfBirth(formatDate(date));
      }
    }

    function dateFromDay(day: number) {
      const date = new Date(year, 0);
      return new Date(date.setDate(day));
    }

    function mouseup(e: MouseEvent | TouchEvent) {
      isPressing = false;
    }

    function isLeapyear() {
      return (year % 100 === 0) ? (year % 400 === 0) : (year % 4 === 0);
    }

    earth.addEventListener("mousedown", mousedown);
    earth.addEventListener("touchstart", mousedown);
    window.addEventListener("mousemove", mousemove);
    window.addEventListener("touchmove", mousemove);
    window.addEventListener("mouseup", mouseup);
    window.addEventListener("touchend", mouseup);

    return () => {
      earth.removeEventListener("mousedown", mousedown);
      earth.removeEventListener("touchstart", mousedown);
      window.removeEventListener("mousemove", mousemove);
      window.removeEventListener("touchmove", mousemove);
      window.removeEventListener("mouseup", mouseup);
      window.removeEventListener("touchend", mouseup);
    };
  }, [showDatePicker, selectedDate]);

  // Bullet Hell Game
  useEffect(() => {
    const gameArea = gameAreaRef.current;
    const player = playerRef.current;
    if (!gameArea || !player || gameState !== 'running') {
      // Clear intervals if game is not running
      if (bulletSpawnRef.current) {
        clearInterval(bulletSpawnRef.current);
        bulletSpawnRef.current = null;
      }
      if (bulletTrackRef.current) {
        clearInterval(bulletTrackRef.current);
        bulletTrackRef.current = null;
      }
      return;
    }

    let gameAreaWidth = gameArea.getBoundingClientRect().width;
    let gameAreaTop = gameArea.getBoundingClientRect().top;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gameArea.getBoundingClientRect();
      const newPos = Math.floor(((e.clientX - rect.left) / gameAreaWidth) * 100);
      if (e.clientX - rect.left > 50) {
        setPlayerPos(newPos);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'z') {
        if (!debounceRef.current && playerPos > 5) {
          const bullet = document.createElement("span");
          bullet.className = "bullet";
          bullet.style.left = playerPos + "%";

          setTimeout(() => {
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

    const handleTouchMove = (e: TouchEvent) => {
      const rect = gameArea.getBoundingClientRect();
      const newPos = Math.floor(((e.touches.item(0)!.pageX - rect.left) / gameAreaWidth) * 100);
      setPlayerPos(newPos);

      const zEvent = new KeyboardEvent("keydown", { "key": "z" });
      document.dispatchEvent(zEvent);
    };

    const handleResize = () => {
      gameAreaWidth = gameArea.getBoundingClientRect().width;
      gameAreaTop = gameArea.getBoundingClientRect().top;
    };

    gameArea.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    gameArea.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('resize', handleResize);

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

      enemyPositions.forEach(enemy => {
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

        if (enemy.la - 10 <= playerData.la
          && enemy.la + 10 >= playerData.la
          && enemy.ta <= playerData.ta
          && enemy.ta + 20 >= playerData.ta) {
          setTimeout(() => {
            alert("Hit! Starting over.");
            setPoints(0);
          }, 100);
        }
      });
    }, 200);

    return () => {
      gameArea.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      gameArea.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      if (bulletSpawnRef.current) clearInterval(bulletSpawnRef.current);
      if (bulletTrackRef.current) clearInterval(bulletTrackRef.current);
    };
  }, [playerPos, points, gameState]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.style.left = playerPos + "%";
    }
  }, [playerPos]);

  // Real Dark Mode - Window size tracking
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Real Dark Mode - Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        elementX: e.clientX - rect.left,
        elementY: e.clientY - rect.top,
        isOutside: false,
      };
    };

    const handleMouseDown = () => {
      pressedRef.current = true;
      if (spotlightRef.current) {
        pressedAnchorRef.current.copyFrom(spotlightRef.current.position);
      }
    };

    const handleMouseUp = () => {
      pressedRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Real Dark Mode - Babylon.js scene
  const buildRoundedRectShape = useCallback((
    width: number,
    height: number,
    radius: number,
    segments = 12
  ) => {
    const hw = width / 2;
    const hh = height / 2;
    const r = Math.max(0, Math.min(radius, hw, hh));

    if (r === 0) {
      return [
        new Vector3(hw, hh, 0),
        new Vector3(-hw, hh, 0),
        new Vector3(-hw, -hh, 0),
        new Vector3(hw, -hh, 0),
      ];
    }

    const pts: Vector3[] = [];

    const addArc = (cx: number, cy: number, a0: number, a1: number, includeEnd = true) => {
      const endI = includeEnd ? segments : (segments - 1);
      for (let i = 1; i <= endI; i++) {
        const t = i / segments;
        const a = a0 + (a1 - a0) * t;
        pts.push(new Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
      }
    };

    pts.push(new Vector3(hw - r, hh, 0));
    pts.push(new Vector3(-hw + r, hh, 0));
    addArc(-hw + r, hh - r, Math.PI / 2, Math.PI);
    pts.push(new Vector3(-hw, -hh + r, 0));
    addArc(-hw + r, -hh + r, Math.PI, (Math.PI * 3) / 2);
    pts.push(new Vector3(hw - r, -hh, 0));
    addArc(hw - r, -hh + r, (Math.PI * 3) / 2, Math.PI * 2);
    pts.push(new Vector3(hw, hh - r, 0));
    addArc(hw - r, hh - r, 0, Math.PI / 2, false);

    return pts;
  }, []);

  useEffect(() => {
    if (!realDarkMode || !canvasRef.current || windowSize.width === 0) {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const engine = new Engine(canvas, false, {
      premultipliedAlpha: false,
    });
    engineRef.current = engine;

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    scene.lights = [];
    sceneRef.current = scene;

    const camera = new UniversalCamera(
      'camera',
      new Vector3(0, 0, -Math.max(windowSize.width, windowSize.height)),
      scene
    );
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    cameraRef.current = camera;

    Effect.ShadersStore.whiteToAlphaFragmentShader = `
      varying vec2 vUV;
      uniform sampler2D textureSampler;

      void main(void) {
        vec4 color = texture2D(textureSampler, vUV);

        float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float alpha = 1.0 - lum;
        if (alpha < 0.05) {
          alpha = 0.0;
        }

        gl_FragColor = vec4(color.rgb, alpha);
      }
    `;

    const whiteToAlphaPipeline = new PostProcess(
      'whiteToAlpha',
      'whiteToAlpha',
      [],
      [],
      1.0,
      camera
    );

    const wall = MeshBuilder.CreatePlane('wall', {
      width: windowSize.width,
      height: windowSize.height,
    }, scene);
    wall.receiveShadows = true;
    wall.position = new Vector3(0, 0, 0);
    wall.rotation = new Vector3(0, 0, 0);

    const material = new StandardMaterial('wallMat', scene);
    material.specularColor = new Color3(0, 0, 0);
    wall.material = material;
    wallRef.current = wall;

    const spotlight = new SpotLight(
      'spot',
      new Vector3(0, 0, -300),
      new Vector3(0, 0, 1),
      Math.PI / 2,
      100,
      scene
    );
    spotlight.intensity = 10;
    spotlight.diffuse = Color3.FromHexString('#FEE470');
    spotlight.specular = Color3.FromHexString('#FEE470');
    spotlightRef.current = spotlight;

    const shadowGenerator = new ShadowGenerator(2048, spotlight);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadowGenerator.setDarkness(0.1);
    shadowGeneratorRef.current = shadowGenerator;

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [realDarkMode, windowSize.width, windowSize.height, buildRoundedRectShape]);

  // Real Dark Mode - Pointer movement animation
  useEffect(() => {
    let animationFrameId: number;
    const ease = 0.05;
    const offsetStrength = 1.2;
    const size = 300;
    const posLerp = 0.15;
    const dirLerp = 0.25;

    const handlePointerMove = () => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const spotlight = spotlightRef.current;
      const wall = wallRef.current;

      if (!scene || !spotlight || !camera || !canvasRef.current || !realDarkMode) {
        animationFrameId = requestAnimationFrame(handlePointerMove);
        return;
      }

      const x = mouseRef.current.elementX;
      const y = mouseRef.current.elementY;

      if (!x || !y) {
        animationFrameId = requestAnimationFrame(handlePointerMove);
        return;
      }

      pMouseRef.current.x += (x - pMouseRef.current.x) * ease;
      pMouseRef.current.y += (y - pMouseRef.current.y) * ease;

      const pickResult = scene.pick(mouseRef.current.elementX, mouseRef.current.elementY, (mesh) => mesh === wall);

      if (pickResult?.hit && pickResult.pickedPoint) {
        const hitPoint = pickResult.pickedPoint;

        const basePos = hitPoint.add(new Vector3(0, 0, -size));

        const dx = pMouseRef.current.x - x;
        const dy = pMouseRef.current.y - y;

        const followPos = basePos.add(new Vector3(
          dx * offsetStrength,
          -dy * offsetStrength,
          0
        ));

        const dirFromFollow = hitPoint.subtract(followPos).normalize();

        const retreatDir = dirFromFollow.scale(10000);
        retreatDir.z = 0;

        const targetPos = pressedRef.current
          ? pressedAnchorRef.current.subtract(hitPoint)
          : followPos;

        const targetDir = hitPoint.subtract(targetPos).normalize();

        Vector3.LerpToRef(spotlight.position, targetPos, posLerp, spotlight.position);
        Vector3.LerpToRef(spotlight.direction, targetDir, dirLerp, spotlight.direction);
      }

      animationFrameId = requestAnimationFrame(handlePointerMove);
    };

    animationFrameId = requestAnimationFrame(handlePointerMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [realDarkMode]);

  // Real Dark Mode - Track DOM elements
  const upsertBox = useCallback((id: string, bounding: any) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existing = boxMapRef.current.get(id);
    const pos = new Vector3(
      bounding.left - windowSize.width / 2 + bounding.width / 2,
      -bounding.top + windowSize.height / 2 - bounding.height / 2,
      0,
    );

    if (existing) {
      existing.position.copyFrom(pos);
      return;
    }

    const material = new StandardMaterial('boxMat', scene);

    const shape = buildRoundedRectShape(
      bounding.width,
      bounding.height,
      Math.max(0, Math.min(bounding.radius, bounding.width / 2, bounding.height / 2)),
      6,
    );

    const thickness = 50;
    const path = [
      new Vector3(0, 0, -thickness / 2),
      new Vector3(0, 0, thickness / 2),
    ];

    const mesh = MeshBuilder.ExtrudeShape(`box-${id}`,
      { shape, path, cap: Mesh.CAP_ALL, closeShape: true },
      scene,
    );
    mesh.position.copyFrom(pos);
    mesh.material = material;
    shadowGeneratorRef.current?.addShadowCaster(mesh);
    boxMapRef.current.set(id, mesh);
  }, [buildRoundedRectShape, windowSize.width, windowSize.height]);

  const removeBox = useCallback((id: string) => {
    const mesh = boxMapRef.current.get(id);
    if (mesh) {
      mesh.dispose();
      boxMapRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (!realDarkMode) return;

    const trackedElements = new Map<HTMLElement, string>();
    let idCounter = 0;

    const trackElement = (element: HTMLElement) => {
      const id = `element-${idCounter++}`;
      trackedElements.set(element, id);
      element.setAttribute('data-util-real-dark-id', id);

      const updateBounding = () => {
        const rect = element.getBoundingClientRect();
        const computedStyle = getComputedStyle(element);
        const radiusStr = computedStyle.borderRadius;
        const radius = parseFloat(radiusStr.replace('px', '')) || 0;

        const bounding = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          radius,
        };
        upsertBox(id, bounding);
      };

      updateBounding();

      const resizeObserver = new ResizeObserver(updateBounding);
      resizeObserver.observe(element);

      return () => {
        resizeObserver.disconnect();
        removeBox(id);
        trackedElements.delete(element);
      };
    };

    const elements = document.querySelectorAll('[data-real-dark]');
    const cleanupFunctions: (() => void)[] = [];

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        cleanupFunctions.push(trackElement(element));
      }
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [realDarkMode, upsertBox, removeBox]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const profileRef = doc(db, 'userProfiles', user.uid);
      await setDoc(profileRef, {
        displayName,
        dateOfBirth: selectedDate ? Timestamp.fromDate(selectedDate) : null,
        phoneNumber: points.toString(),
        updatedAt: new Date()
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartGame = () => {
    setGameState('running');
  };

  const handleStopGame = () => {
    setGameState('idle');
    setPoints(0);
    // Clear all bullets
    if (gameAreaRef.current) {
      gameAreaRef.current.querySelectorAll('.bullet, .enemy_bullet').forEach(el => el.remove());
    }
  };

  const handlePauseGame = () => {
    setGameState('paused');
  };

  const handleResumeGame = () => {
    setGameState('running');
  };

  return (
    <div className={`min-h-screen ${realDarkMode ? 'bg-black' : 'bg-black'} text-white p-8`}>
      {/* Real Dark Canvas Overlay */}
      {realDarkMode && (
        <div className="pointer-events-none fixed left-0 top-0 z-[100] h-full w-full">
          <canvas
            ref={canvasRef}
            className="h-full w-full duration-500"
            style={{ opacity: 0.9 }}
          />
        </div>
      )}

      <div className={`max-w-6xl mx-auto ${realDarkMode ? 'relative z-10' : ''}`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" data-real-dark>Profile Settings</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            data-real-dark
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Profile Fields */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6 shadow-xl" data-real-dark>
              <h2 className="text-xl font-bold mb-4">Basic Information</h2>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Display Name */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                />
              </div>

              {/* Date of Birth - Orbital Picker */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Date of Birth</label>
                <div className="mt-2">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 shadow-md"
                  >
                    {dateOfBirth || 'Select Date of Birth'}
                  </button>
                </div>
                {showDatePicker && (
                  <div className="mt-4 relative">
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="relative w-full mb-4">
                        <div id="dateDisplay" className="w-full bg-white text-gray-800 rounded-lg p-3 text-center font-semibold"></div>
                        <div id="datePicker" className="w-full bg-black rounded-3xl p-4 mt-2" style={{ cursor: 'grab' }}>
                          <svg viewBox="0 0 350 166" className="w-full">
                            <ellipse id="ellipse" cx="175" cy="83" rx="150" ry="73"
                              style={{ fillOpacity: 0, stroke: 'yellow', strokeWidth: 0.5 }} />
                            <image id="earth" height="15" width="15" href="/earth.png" style={{ cursor: 'grab' }}></image>
                            <image id="sun" x="105" y="68" height="30" width="30" href="/sun.png"></image>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Real Dark Mode Toggle */}
              <div className="mt-6 flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  id="realDark"
                  checked={realDarkMode}
                  onChange={(e) => setRealDarkMode(e.target.checked)}
                  className="h-5 w-5"
                />
                <label htmlFor="realDark" className="text-sm text-gray-300">
                  Enable Real Dark Mode (Spotlight Effect)
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Bullet Hell Phone Number */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-xl" data-real-dark>
            <h2 className="text-xl font-bold mb-4">Phone Number (Bullet Hell)</h2>

            {/* Game Controls */}
            <div className="flex gap-2 mb-4">
              {gameState === 'idle' && (
                <button
                  onClick={handleStartGame}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Start Game
                </button>
              )}
              {gameState === 'running' && (
                <>
                  <button
                    onClick={handlePauseGame}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={handleStopGame}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Stop
                  </button>
                </>
              )}
              {gameState === 'paused' && (
                <>
                  <button
                    onClick={handleResumeGame}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={handleStopGame}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>

            <div className="main-game-container" style={{ position: 'relative', width: '100%', height: '500px', border: '1px solid #cbcbcb' }}>
              {gameState === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <p className="text-white text-xl font-bold">Click Start Game to begin!</p>
                </div>
              )}
              {gameState === 'paused' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                  <p className="text-white text-xl font-bold">PAUSED</p>
                </div>
              )}
              <div ref={gameAreaRef} style={{ position: 'absolute', left: 0, top: 0, width: '70%', height: '100%', borderRight: '1px solid #cbcbcb', overflow: 'hidden' }}>
                <span ref={playerRef} className="player" style={{ left: '50%' }}></span>
              </div>
              <div style={{ position: 'absolute', left: '70%', top: 0, width: '30%', height: '100%', textAlign: 'center', padding: '20px' }}>
                <h3 className="text-xl font-bold">Points</h3>
                <h3 className="text-2xl font-bold mt-4 points">{formatNumber(points)}</h3>
                <p className="mt-4 text-sm">Earn points to match your Singapore phone number (+65).</p>
                <p className="mt-4 text-xs">
                  Controls:<br />
                  Mouse - movement<br />
                  Z - Shoot
                </p>
                <p className="mt-4 text-xs text-gray-400">
                  Status: {gameState === 'idle' ? 'Not Started' : gameState === 'running' ? 'Running' : 'Paused'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Jigsaw Puzzle Save Button */}
        <div className="mt-8 bg-gray-900 rounded-xl p-8 shadow-xl" data-real-dark>
          <h2 className="text-2xl font-bold mb-6 text-center">Save Your Profile</h2>
          <p className="text-center text-gray-400 mb-6">Complete the puzzle to save your profile!</p>
          <BtnJigsawPuzzle
            ref={jigsawRef}
            label={saving ? "Saving..." : saved ? "Saved!" : "Save Profile"}
            rowCount={2}
            colCount={2}
            onClick={saveProfile}
            onCompleted={() => console.log('Puzzle completed!')}
          />
          {saved && (
            <p className="text-green-500 mt-4 text-center font-bold">
              Profile saved successfully!
            </p>
          )}
        </div>
      </div>

      <style jsx global>{`
        .future {
          color: red !important;
          font-size: 0.7rem;
        }
        #earth {
          cursor: grab;
        }
        #earth:active {
          cursor: grabbing;
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
