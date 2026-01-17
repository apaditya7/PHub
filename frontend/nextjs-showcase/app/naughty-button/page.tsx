'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import Link from 'next/link';

// Utility functions (from common/utils in Vue source)
function getVectorLength(vector: { x: number; y: number }): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

function getUnitVector(vector: { x: number; y: number }): { x: number; y: number } {
  const length = getVectorLength(vector);
  if (length === 0) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

// Throttle function (lodash-es equivalent)
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { trailing?: boolean } = {}
): T {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: any[]) {
    const now = Date.now();
    if (!previous && options.trailing === false) previous = now;
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(() => {
        previous = options.trailing === false ? 0 : Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  } as T;
}

interface BtnNaughtyProps {
  label?: string;
  disabled?: boolean;
  zIndex?: number | string;
  maxDistanceMultiple?: number;
  tabIndex?: number;
  onClick?: () => void;
  onRun?: () => void;
  onBack?: () => void;
  children?: ReactNode;
  rubbing?: ReactNode;
}

function BtnNaughty({
  label = '',
  disabled = false,
  zIndex,
  maxDistanceMultiple = 3,
  tabIndex = 0,
  onClick,
  onRun,
  onBack,
  children,
  rubbing,
}: BtnNaughtyProps) {
  const carrierRef = useRef<HTMLDivElement>(null);
  const [carrierOffset, setCarrierOffset] = useState({ x: 0, y: 0 });
  const [counter, setCounter] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // useMouseInElement equivalent with throttling
  const [elementX, setElementX] = useState(0);
  const [elementY, setElementY] = useState(0);
  const [elementWidth, setElementWidth] = useState(0);
  const [elementHeight, setElementHeight] = useState(0);
  const [isOutside, setIsOutside] = useState(true);

  const lastMouseMoveTime = useRef(0);
  const THROTTLE_MS = 35;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now();
    if (now - lastMouseMoveTime.current < THROTTLE_MS) return;
    lastMouseMoveTime.current = now;

    if (!carrierRef.current) return;
    const rect = carrierRef.current.getBoundingClientRect();

    setElementX(e.clientX - rect.left);
    setElementY(e.clientY - rect.top);
    setElementWidth(rect.width);
    setElementHeight(rect.height);

    const outside = e.clientX < rect.left || e.clientX > rect.right ||
                   e.clientY < rect.top || e.clientY > rect.bottom;
    setIsOutside(outside);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Update element dimensions on mount and resize
  useEffect(() => {
    if (!carrierRef.current) return;
    const updateDimensions = () => {
      if (!carrierRef.current) return;
      const rect = carrierRef.current.getBoundingClientRect();
      setElementWidth(rect.width);
      setElementHeight(rect.height);
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const back = useCallback(() => {
    setCarrierOffset({ x: 0, y: 0 });
    setCounter(0);
    onBack?.();
  }, [onBack]);

  const run = useCallback(() => {
    setIsRunning(true);

    // Calculate unit vector from mouse to button center
    const direction = getUnitVector({
      x: elementWidth / 2 - elementX,
      y: elementHeight / 2 - elementY,
    });

    // Move away from mouse
    setCarrierOffset(prev => ({
      x: prev.x + direction.x * elementWidth,
      y: prev.y + direction.y * elementHeight,
    }));

    setCounter(prev => prev + 1);
    carrierRef.current?.blur();

    // Check if out of range
    const maxDistance = getVectorLength({
      x: elementWidth * Number(maxDistanceMultiple),
      y: elementHeight * Number(maxDistanceMultiple),
    });

    setCarrierOffset(current => {
      const distance = getVectorLength(current);

      if (distance > maxDistance) {
        back();
        return { x: 0, y: 0 };
      } else {
        onRun?.();
        return current;
      }
    });
  }, [elementWidth, elementHeight, elementX, elementY, maxDistanceMultiple, back, onRun]);

  // Watch disabled prop
  useEffect(() => {
    if (!disabled) {
      back();
    }
  }, [disabled, back]);

  // Watch isOutside
  useEffect(() => {
    if (!isOutside && disabled) {
      run();
    }
  }, [isOutside, disabled, run]);

  // Intersection Observer for occlusion detection
  useEffect(() => {
    if (!carrierRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) {
        back();
      }
    });

    observer.observe(carrierRef.current);
    return () => observer.disconnect();
  }, [back]);

  const handleClick = () => {
    onClick?.();
    if (disabled) {
      run();
    }
  };

  const handleTrigger = () => {
    if (disabled) {
      run();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrigger();
    }
  };

  const handleTransitionEnd = () => {
    setIsRunning(false);
  };

  const carrierStyle = {
    transform: `translate(${carrierOffset.x}px, ${carrierOffset.y}px)`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transitionDuration: '0.6s',
    transitionTimingFunction: 'cubic-bezier(0.040, 0.430, 0.025, 1.070)',
    zIndex,
  };

  const bounceStyle = {
    animationPlayState: counter === 0 ? 'paused' : 'running',
  } as React.CSSProperties;

  return (
    <>
      <style jsx>{`
        .jelly-bounce {
          animation: jelly-bounce 0.6s forwards;
        }

        @keyframes jelly-bounce {
          0%, 100% {
            transform: scale(1, 1);
          }
          50% {
            transform: scale(1.2, 0.8);
          }
          80% {
            transform: scale(0.9, 1.1);
          }
        }

        .btn-rubbing {
          border: 1px dashed rgba(0, 0, 0, 0.2);
        }

        .btn {
          border: 1px solid #777;
          background-color: #FEFEFE;
          transition-duration: 0.2s;
        }

        .btn:active {
          transition-duration: 0.1s;
          transform: scale(0.98);
        }

        @media (prefers-color-scheme: dark) {
          .btn {
            border-color: #AAA;
            background-color: #333;
          }
        }
      `}</style>

      <div className="relative">
        {/* Rubbing container */}
        <div className="pointer-events-none absolute inset-0">
          {rubbing || <div className="btn-rubbing h-full w-full rounded" />}
        </div>

        {/* Button carrier container */}
        <div
          ref={carrierRef}
          className="content relative"
          style={carrierStyle}
          tabIndex={tabIndex}
          onTransitionEnd={handleTransitionEnd}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={handleTrigger}
        >
          {/* Bounce container */}
          <div
            key={counter}
            style={bounceStyle}
            className="jelly-bounce"
          >
            {children || (
              <button className="btn select-none rounded p-3 px-6">
                {label}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Demo page
export default function NaughtyButtonPage() {
  const [disabled, setDisabled] = useState(true);
  const [text, setText] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center overflow-hidden">
      <Link href="/" className="absolute top-8 left-8 text-purple-600 hover:text-purple-800 underline z-50">
        ← Back to Home
      </Link>

      <div className="w-full max-w-2xl flex flex-col gap-8 p-8">
        <div className="flex flex-col gap-4 border border-gray-200 rounded-xl p-6 bg-white shadow-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="disable-btn"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="disable-btn" className="text-sm font-medium">
              Disable Button
            </label>
          </div>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Click here and use Tab to focus the button, then press Enter to see"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex justify-center">
          <BtnNaughty
            label="Naughty Button"
            disabled={disabled}
            zIndex={30}
            onClick={() => alert('You caught me! 🎉')}
          />
        </div>

        <div className="text-center text-gray-600">
          <p className="text-lg">Try to click the button when disabled!</p>
          <p className="text-sm mt-2">Hint: It runs away from your cursor 😈</p>
        </div>
      </div>
    </div>
  );
}
