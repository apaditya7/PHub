'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';

// Hinge input component for bad UI
function MiniHingeInput({ id, placeholder, value, onChange, side, baseTop, containerHeight, maxTilt = 45, paddingHorizontal = 15, enableFallingText = false }: { id?: string; placeholder: string; value: string; onChange: (v: string)=>void; side: 'left'|'right'; baseTop: number; containerHeight: number; maxTilt?: number; paddingHorizontal?: number; enableFallingText?: boolean; }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const direction = side === 'right' ? -1 : 1;
  const [charAnimations, setCharAnimations] = useState<{char: string; id: number; isFalling: boolean}[]>([]);
  const nextIdRef = useRef(0);

  const rotation = useMemo(() => {
    if (!value.length) return 0;
    if (value.length < 10) return -(value.length) * direction;
    if (value.length < 20) return -20 * direction;
    return -maxTilt * direction;
  }, [value.length, direction, maxTilt]);

  const [containerWidth, setContainerWidth] = useState(0);
  const [textContentWidth, setTextContentWidth] = useState(0);
  const [slide, setSlide] = useState(0);

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

  useEffect(() => {
    if (textMeasureRef.current) {
      setTextContentWidth(textMeasureRef.current.clientWidth);
    }
  }, [value]);

  useEffect(() => {
    if (side === 'right' && value.length > 0) {
      setSlide(1);
    } else {
      setSlide(0);
    }
  }, [value.length, side]);

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
          className="block w-[28rem] h-12 rounded-lg border-2 border-orange-500 bg-black/20 px-3 text-base font-medium text-white placeholder-gray-500 transition-transform duration-[3000ms] ease-linear focus:border-orange-400 focus:outline-none shadow-sm"
          style={{
            transform: `translateX(${translateX}px)`,
            color: enableFallingText ? 'transparent' : 'white',
            caretColor: enableFallingText ? 'white' : 'auto'
          }}
          placeholder={placeholder}
          value={value}
          onChange={(e)=>onChange(e.target.value)}
        />
        <span
          ref={textMeasureRef}
          className="absolute invisible whitespace-pre text-base px-3"
          style={{ font: 'inherit' }}
        >
          {value || placeholder}
        </span>
        {enableFallingText && (
          <div className="absolute inset-0 flex items-center px-3 pointer-events-none overflow-hidden">
            <div className="flex">
              {charAnimations.map((item) => (
                <span
                  key={item.id}
                  className="inline-block text-base font-medium text-white transition-transform duration-700 ease-out"
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

// Bad UI Register Component
function BadUIRegister({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  loading,
  error
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) {
  const formContainerRef = useRef<HTMLDivElement>(null);

  return (
    <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4 items-center bg-black/40">
      <div ref={formContainerRef} className="relative w-full max-w-2xl h-[520px]">
        <MiniHingeInput placeholder="Email" value={email} onChange={setEmail} side="left" baseTop={20} containerHeight={520} maxTilt={20} />
        <MiniHingeInput id="regPassword" placeholder="Password" value={password} onChange={setPassword} side="right" baseTop={100} containerHeight={520} maxTilt={90} enableFallingText={true} />
      </div>
      <button type="submit" disabled={loading} className="mt-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black rounded-lg text-base font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 shadow-md transition-all hover:scale-105">
        {loading ? 'Creating…' : 'Create Account'}
      </button>
      {error && <p className="text-sm text-red-400 font-semibold">{error}</p>}
    </form>
  );
}

// Normal Register Component
function NormalRegister({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  loading,
  error
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="p-6 bg-black/40 space-y-4">
      <div>
        <label htmlFor="normalEmail" className="block text-sm font-semibold text-gray-300 mb-2">
          Email
        </label>
        <input
          id="normalEmail"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border-2 border-orange-500/30 bg-black/20 rounded-lg focus:border-orange-500 focus:outline-none text-white transition-colors placeholder-gray-500"
          required
        />
      </div>
      <div>
        <label htmlFor="normalPassword" className="block text-sm font-semibold text-gray-300 mb-2">
          Password
        </label>
        <input
          id="normalPassword"
          type="password"
          placeholder="Enter your password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border-2 border-orange-500/30 bg-black/20 rounded-lg focus:border-orange-500 focus:outline-none text-white transition-colors placeholder-gray-500"
          required
          minLength={6}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black rounded-lg font-semibold text-base hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105"
      >
        {loading ? 'Creating…' : 'Create Account'}
      </button>
      {error && <p className="text-sm text-red-400 font-semibold text-center">{error}</p>}
    </form>
  );
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useNormalUI, setUseNormalUI] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image
              src="/prohub_logo.jpeg"
              alt="ProHub"
              width={200}
              height={100}
              className="h-20 w-auto cursor-pointer"
            />
          </Link>
        </div>

        {/* Register card */}
        <div className="bg-white/5 backdrop-blur-lg border-2 border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4 border-b-2 border-orange-500/30 flex items-center justify-between bg-gradient-to-r from-orange-500/20 to-orange-600/20">
            <h1 className="font-bold text-white text-lg">
              Register {useNormalUI ? '' : '(Hinge Inputs)'}
            </h1>
            <Link href="/login" className="text-sm text-orange-400 hover:text-orange-300 font-semibold transition-colors">
              Login
            </Link>
          </div>

          {/* Toggle checkbox */}
          <div className="p-4 bg-black/20 border-b border-orange-500/20">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useNormalUI}
                onChange={(e) => setUseNormalUI(e.target.checked)}
                className="w-5 h-5 text-orange-600 border-orange-500 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-300">
                Use normal UI (boring mode)
              </span>
            </label>
          </div>

          {useNormalUI ? (
            <NormalRegister
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSubmit={onSubmit}
              loading={loading}
              error={error}
            />
          ) : (
            <BadUIRegister
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSubmit={onSubmit}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}
