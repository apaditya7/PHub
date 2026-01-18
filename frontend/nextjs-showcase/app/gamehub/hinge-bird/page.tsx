// @ts-nocheck
'use client';

import dynamic from 'next/dynamic';

// Dynamically import the game to disable SSR for the canvas logic
const HingeBirdGame = dynamic(() => import('./components/HingeBirdGame'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-black text-cyan-400 font-mono">
      LOADING HINGE BIRD...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen">
      <HingeBirdGame />
    </main>
  );
}
