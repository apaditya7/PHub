'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function LoadingChaos() {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setProgress((p) => {
        const r = Math.random();
        if (r < 0.2) return Math.max(0, p - Math.random() * 30); // goes backwards
        if (r < 0.4) return Math.min(100, p + 0.2); // barely moves
        if (r < 0.6) return Math.max(0, Math.min(100, p + (Math.random() - 0.5) * 5)); // jitter
        if (r < 0.8) return p; // stalls
        return Math.min(100, p + Math.random() * 3);
      });
      timerRef.current = window.setTimeout(tick, 300 + Math.random() * 1000);
    };
    tick();
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1021] text-white flex flex-col items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-blue-300 hover:text-blue-100 underline z-50">
        ← Back to Home
      </Link>

      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold">Loading… Probably</h1>

        <div className="w-full h-3 bg-white/10 rounded overflow-hidden">
          <div
            className="h-full bg-pink-500 transition-all duration-[2000ms] ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-white/70">{progress.toFixed(1)}% (subject to change)</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded">
            <p className="text-xs text-white/60">Tip: Clear your cache to speed up loading.</p>
          </div>
          <div className="bg-white/5 p-4 rounded">
            <p className="text-xs text-white/60">Installing 47 optional toolbars…</p>
          </div>
          <div className="bg-white/5 p-4 rounded">
            <p className="text-xs text-white/60">Recompiling the internet (phase 3/137)…</p>
          </div>
          <div className="bg-white/5 p-4 rounded">
            <p className="text-xs text-white/60">Optimizing the optimizer…</p>
          </div>
        </div>
      </div>
    </div>
  );
}

