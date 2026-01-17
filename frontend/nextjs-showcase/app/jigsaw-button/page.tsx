'use client';

import { useState, useRef, useEffect, useId, useCallback, forwardRef, useImperativeHandle, ReactNode } from 'react';
import { animate as anime } from 'animejs';
import Link from 'next/link';

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

// Utility functions
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
      <button className="btn w-full select-none rounded p-3 px-6 bg-blue-600 text-white border-2 border-blue-900 hover:bg-blue-700">
        {label}
      </button>
    );

    return (
      <>
        <style jsx>{`
          .btn {
            border: 2px solid #1e40af; /* blue-900 */
            background-color: #2563eb; /* blue-600 */
            color: #ffffff;
            transition-duration: 0.2s;
          }
          .btn:hover {
            background-color: #1d4ed8; /* blue-700 */
          }
          .btn:active {
            transition-duration: 0.1s;
            transform: scale(0.98);
          }
          @media (prefers-color-scheme: dark) {
            .btn {
              border-color: #60a5fa; /* blue-300 */
              background-color: #1d4ed8; /* blue-700 */
            }
            .btn:hover {
              background-color: #1e40af; /* blue-800 */
            }
          }
        `}</style>

        <div ref={containerRef} className="relative" onClick={handleClick} style={{ zIndex }}>
          {/* Puzzle pieces */}
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

          {/* SVG clip paths */}
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

          {/* Full button (shown when completed) */}
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

// Demo page
export default function JigsawButtonPage() {
  const jigsawRef = useRef<BtnJigsawPuzzleRef>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-blue-600 hover:text-blue-800 underline z-50">
        ← Back to Home
      </Link>

      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Jigsaw Puzzle Button</h1>
          <p className="text-gray-600">Solve the puzzle to click the button!</p>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => jigsawRef.current?.scatter()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Scatter
          </button>
          <button
            onClick={() => jigsawRef.current?.autoComplete()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Auto Complete
          </button>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          <BtnJigsawPuzzle
            ref={jigsawRef}
            label="Click Me!"
            rowCount={2}
            colCount={2}
            onClick={() => alert('Puzzle solved! 🎉')}
            onCompleted={() => console.log('Completed!')}
          />
        </div>
      </div>
    </div>
  );
}
