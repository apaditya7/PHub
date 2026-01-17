'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
          document.body.appendChild(fallingDiv); // attach to body to ensure viewport coords
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
      // Cleanup stray divs
      fallingDivs.forEach((el) => el.remove());
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md border-2 border-gray-300 rounded-lg shadow-xl">
        <div className="p-4 border-b-2 border-gray-300 flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600">
          <h1 className="font-bold text-white text-lg">Login (Trash Can Edition)</h1>
          <Link href="/register" className="text-sm text-white hover:underline font-semibold">Register</Link>
        </div>
        <form onSubmit={onSubmit} className="p-6 bg-gray-50">
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
          {error && <p className="mt-4 text-sm text-red-600 font-semibold text-center">{error}</p>}
        </form>
      </div>

      <style jsx global>{`
        input {
          height: 28px;
          width: 90px;
          outline: 0;
          border: 2px solid #93c5fd;
          border-radius: 14px;
          margin-left: 10px;
          padding: 0 8px;
          background: white;
          color: #1f2937;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        input::placeholder {
          color: #9ca3af;
          font-size: 11px;
        }
        input:focus {
          border-color: #3b82f6;
        }
        #userNameInput { border-right: 0; border-bottom-right-radius: 0; border-top-right-radius: 0; padding-right: 0; }
        button {
          width: 110px;
          height: 38px;
          border-radius: 19px;
          cursor: pointer;
          background: linear-gradient(to right, #3b82f6, #9333ea);
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.2s;
        }
        button:hover:not(:disabled) {
          background: linear-gradient(to right, #2563eb, #7c3aed);
        }
        button:disabled { opacity: .5; cursor: not-allowed; }
        .fallingDiv {
          position: absolute;
          height: 20px;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          transform: rotate(0deg);
          z-index: 9999;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
