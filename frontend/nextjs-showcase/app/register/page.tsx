'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';

function MiniHingeInput({ id, placeholder, value, onChange, side, baseTop, containerHeight, maxTilt = 45, paddingHorizontal = 15, enableFallingText = false }: { id?: string; placeholder: string; value: string; onChange: (v: string)=>void; side: 'left'|'right'; baseTop: number; containerHeight: number; maxTilt?: number; paddingHorizontal?: number; enableFallingText?: boolean; }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const direction = side === 'right' ? -1 : 1;
  const [charAnimations, setCharAnimations] = useState<{char: string; id: number; isFalling: boolean}[]>([]);
  const nextIdRef = useRef(0);

  // Rotation: -1 deg per char up to -20, then -90 at 20+
  const rotation = useMemo(() => {
    if (!value.length) return 0;
    if (value.length < 10) return -(value.length) * direction;
    if (value.length < 20) return -20 * direction;
    return -maxTilt * direction; // default 90 for password
  }, [value.length, direction, maxTilt]);

  // Horizontal slide for right hinge, over 3s, from 0 → (containerWidth - textContentWidth - padding*2)
  const [containerWidth, setContainerWidth] = useState(0);
  const [textContentWidth, setTextContentWidth] = useState(0);
  const [slide, setSlide] = useState(0); // 0..1

  useEffect(() => {
    const measure = () => {
      if (wrapRef.current) setContainerWidth(wrapRef.current.clientWidth);
      if (textMeasureRef.current) setTextContentWidth(textMeasureRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (textMeasureRef.current) ro.observe(textMeasureRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Measure text content width whenever value changes
  useEffect(() => {
    if (textMeasureRef.current) {
      setTextContentWidth(textMeasureRef.current.clientWidth);
    }
  }, [value]);

  useEffect(() => {
    if (side === 'right' && value.length > 0) {
      // trigger slide
      setSlide(1);
    } else {
      setSlide(0);
    }
  }, [value.length, side]);

  // Handle falling text animation
  useEffect(() => {
    if (!enableFallingText) return;

    setCharAnimations(prev => {
      const chars = value.split('').map((char, idx) => {
        const existing = prev[idx];
        if (existing && existing.char === char) return existing;
        return { char, id: nextIdRef.current++, isFalling: true };
      });
      return chars;
    });

    // Trigger fall animation after a tick
    const timer = setTimeout(() => {
      setCharAnimations(prev => prev.map(c => ({ ...c, isFalling: false })));
    }, 10);

    return () => clearTimeout(timer);
  }, [value, enableFallingText]);

  const translateX = Math.max(0, containerWidth - textContentWidth - paddingHorizontal * 2) * (side === 'right' ? slide : 0);
  const transformOrigin = side === 'right' ? '100% 50%' : '0% 50%';

  return (
    <div
      ref={wrapRef}
      className="absolute left-1/2 -translate-x-1/2 w-full flex justify-center"
      style={{ top: baseTop, paddingLeft: paddingHorizontal, paddingRight: paddingHorizontal }}
    >
      <div
        className="relative"
        style={{ transformOrigin, transform: `rotate(${rotation}deg)` }}
      >
        <input
          id={id}
          ref={inputRef}
          className="block w-[28rem] h-12 rounded-lg border-2 border-blue-300 bg-white px-3 text-base font-medium text-gray-800 placeholder-gray-400 transition-transform duration-[3000ms] ease-linear focus:border-blue-500 focus:outline-none shadow-sm"
          style={{
            transform: `translateX(${translateX}px)`,
            color: enableFallingText ? 'transparent' : '#1f2937',
            caretColor: enableFallingText ? '#1f2937' : 'auto'
          }}
          placeholder={placeholder}
          value={value}
          onChange={(e)=>onChange(e.target.value)}
        />
        {/* Hidden span to measure actual text content width */}
        <span
          ref={textMeasureRef}
          className="absolute invisible whitespace-pre text-base px-3"
          style={{ font: 'inherit' }}
        >
          {value || placeholder}
        </span>
        {/* Falling text overlay */}
        {enableFallingText && (
          <div className="absolute inset-0 flex items-center px-3 pointer-events-none overflow-hidden">
            <div className="flex">
              {charAnimations.map((item) => (
                <span
                  key={item.id}
                  className="inline-block text-base font-medium text-gray-800 transition-transform duration-700 ease-out"
                  style={{
                    transform: item.isFalling ? 'translateY(-48px)' : 'translateY(0)',
                  }}
                >
                  {item.char}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const formContainerRef = useRef<HTMLDivElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg border-2 border-gray-300 rounded-lg shadow-xl">
        <div className="p-4 border-b-2 border-gray-300 flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600">
          <h1 className="font-bold text-white text-lg">Register (Hinge Inputs)</h1>
          <Link href="/login" className="text-sm text-white hover:underline font-semibold">Login</Link>
        </div>
        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4 items-center bg-gray-50">
          <div ref={formContainerRef} className="relative w-full max-w-2xl h-[520px]">
            <MiniHingeInput placeholder="Email" value={email} onChange={setEmail} side="left" baseTop={20} containerHeight={520} maxTilt={20} />
            <MiniHingeInput id="regPassword" placeholder="Password" value={password} onChange={setPassword} side="right" baseTop={100} containerHeight={520} maxTilt={90} enableFallingText={true} />
          </div>
          <button type="submit" disabled={loading} className="mt-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-base font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 shadow-md">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
        </form>
      </div>
    </div>
  );
}
