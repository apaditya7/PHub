'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function LoadingTiny() {
  const [progress, setProgress] = useState(0);
  const focusRef = useRef(true);

  useEffect(() => {
    const onBlur = () => { focusRef.current = false; };
    const onFocus = () => { focusRef.current = true; };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    const id = setInterval(() => {
      // Only progresses when the window is NOT focused…
      if (!focusRef.current) setProgress((p) => Math.min(100, p + 1));
    }, 500);
    return () => { clearInterval(id); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
  }, []);

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col items-center justify-center p-8 relative">
      <Link href="/" className="absolute top-8 left-8 text-blue-300 hover:text-blue-100 underline z-50">
        ← Back to Home
      </Link>

      <div className="flex flex-col items-center gap-6">
        <div className="w-8 h-8 border-2 border-white/30 rounded-full border-t-white animate-spin" />
        <p style={{ fontSize: '8px', opacity: 0.7 }}>loading please wait</p>
        <div className="w-32 h-[2px] bg-white/10">
          <div className="h-full bg-white/70 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-white/60">Pro tip: Minimize the tab to speed up!</p>
      </div>
    </div>
  );
}

