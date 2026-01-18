'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';

// Bad UI Login Component
function BadUILogin({
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
  useEffect(() => {
    const fallingDivs: HTMLDivElement[] = [];

    const attachTrash = (
      inputEl: HTMLInputElement,
      onValueChange?: (v: string) => void
    ) => {
      const spawnY = () => inputEl.getBoundingClientRect().top + 10;
      const spawnX = () => inputEl.getBoundingClientRect().left + Math.min(150, inputEl.clientWidth - 10);

      const handleInput = () => {
        while (inputEl.scrollWidth > inputEl.clientWidth) {
          const fallingChar = inputEl.value.substr(-1);
          inputEl.value = inputEl.value.slice(0, -1);
          onValueChange?.(inputEl.value);

          const fallingDiv = document.createElement('div');
          fallingDiv.innerText = fallingChar;
          fallingDiv.classList.add('fallingDiv');
          fallingDiv.style.top = spawnY() + 'px';
          fallingDiv.style.left = spawnX() + 'px';
          fallingDiv.style.transform = 'rotate(0deg)';
          document.body.appendChild(fallingDiv);
          fallingDivs.push(fallingDiv);
        }
      };

      inputEl.addEventListener('input', handleInput);
      return () => inputEl.removeEventListener('input', handleInput);
    };

    const emailInput = document.getElementById('userNameInput') as HTMLInputElement | null;
    const passwordInput = document.getElementById('passwordInput') as HTMLInputElement | null;
    const cleanups: (() => void)[] = [];
    if (emailInput) cleanups.push(attachTrash(emailInput, (v) => setEmail(v)));
    if (passwordInput) cleanups.push(attachTrash(passwordInput, (v) => setPassword(v)));

    const interval = setInterval(() => {
      const bin = document.getElementById('bin');
      if (!bin) return;
      const binTop = bin.getBoundingClientRect().top + 10;
      fallingDivs.forEach((fallingDiv) => {
        const currentTop = Number(fallingDiv.style.top.replace('px', '')) || 0;
        if (currentTop < binTop) {
          fallingDiv.style.top = currentTop + 5 + 'px';
          const match = /rotate\(([-\d.]+)/.exec(fallingDiv.style.transform);
          const deg = match ? Number(match[1]) : 0;
          fallingDiv.style.transform = `rotate(${deg + 5}deg)`;
        }
      });
    }, 40);

    return () => {
      cleanups.forEach((fn) => fn());
      clearInterval(interval);
      fallingDivs.forEach((el) => el.remove());
    };
  }, [setEmail, setPassword]);

  return (
    <>
      <form onSubmit={onSubmit} className="p-6 bg-black/40">
        <div id="main" className="relative min-h-[400px]">
          <div className="itemDiv flex w-60 mx-auto justify-center">
            <input id="userNameInput" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div className="itemDiv flex w-60 mx-auto justify-center mt-3">
            <input id="passwordInput" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <img id="bin" src="/bin.png" alt="trash bin" className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[150px] h-[180px]" style={{zIndex: 10000}} />
          <div className="itemDiv flex w-60 mx-auto justify-center mt-4">
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-400 font-semibold text-center">{error}</p>}
      </form>

      <style jsx global>{`
        input {
          height: 28px;
          width: 90px;
          outline: 0;
          border: 2px solid #f97316;
          border-radius: 14px;
          margin-left: 10px;
          padding: 0 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 1px 3px rgba(249, 115, 22, 0.3);
        }
        input::placeholder {
          color: #9ca3af;
          font-size: 11px;
        }
        input:focus {
          border-color: #fb923c;
          background: rgba(255, 255, 255, 0.15);
        }
        #userNameInput { border-right: 0; border-bottom-right-radius: 0; border-top-right-radius: 0; padding-right: 0; }
        button {
          width: 110px;
          height: 38px;
          border-radius: 19px;
          cursor: pointer;
          background: linear-gradient(to right, #f97316, #ea580c);
          color: #000;
          font-weight: 600;
          font-size: 14px;
          border: none;
          box-shadow: 0 2px 6px rgba(249, 115, 22, 0.5);
          transition: all 0.2s;
        }
        button:hover:not(:disabled) {
          background: linear-gradient(to right, #ea580c, #c2410c);
          transform: scale(1.05);
        }
        button:disabled { opacity: .5; cursor: not-allowed; }
        .fallingDiv {
          position: absolute;
          height: 20px;
          font-size: 14px;
          font-weight: 600;
          color: #f97316;
          transform: rotate(0deg);
          z-index: 9999;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}

// Normal Login Component
function NormalLogin({
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
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border-2 border-orange-500/30 bg-black/20 rounded-lg focus:border-orange-500 focus:outline-none text-white transition-colors placeholder-gray-500"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black rounded-lg font-semibold text-base hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      {error && <p className="text-sm text-red-400 font-semibold text-center">{error}</p>}
    </form>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useNormalUI, setUseNormalUI] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image
              src="/phub-logo.png"
              alt="PHub"
              width={200}
              height={100}
              className="h-20 w-auto cursor-pointer"
            />
          </Link>
        </div>

        {/* Login card */}
        <div className="bg-white/5 backdrop-blur-lg border-2 border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4 border-b-2 border-orange-500/30 flex items-center justify-between bg-gradient-to-r from-orange-500/20 to-orange-600/20">
            <h1 className="font-bold text-white text-lg">
              Login {useNormalUI ? '' : '(Trash Can Edition)'}
            </h1>
            <Link href="/register" className="text-sm text-orange-400 hover:text-orange-300 font-semibold transition-colors">
              Register
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
            <NormalLogin
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSubmit={onSubmit}
              loading={loading}
              error={error}
            />
          ) : (
            <BadUILogin
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
