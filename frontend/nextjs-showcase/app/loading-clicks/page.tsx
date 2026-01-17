'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function LoadingClicks() {
  const [progress, setProgress] = useState(0);
  const [clicks, setClicks] = useState(0);
  const decRef = useRef<number | null>(null);

  useEffect(() => {
    // Slowly decay if user stops clicking
    decRef.current = window.setInterval(() => {
      setProgress((p) => Math.max(0, p - 0.5));
    }, 600);
    return () => { if (decRef.current) clearInterval(decRef.current); };
  }, []);

  const handleClick = () => {
    setClicks((c) => c + 1);
    setProgress((p) => Math.min(100, p + 1));
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-blue-300 hover:text-blue-100 underline z-50">
        ← Back to Home
      </Link>

      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold">Loading will complete in exactly 100 clicks</h1>
        <div className="w-full h-3 bg-white/10 rounded overflow-hidden">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-white/70">Clicks: {clicks} / 100</p>
        <button
          onClick={handleClick}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded border border-white/20"
        >
          Click to Load
        </button>
        <p className="text-xs text-white/50">Stops clicking? Progress decays slowly.</p>
      </div>
    </div>
  );
}

