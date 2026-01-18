'use client';

import React from 'react';

export default function TetrisPage() {
  return (
    <div className="w-full h-screen overflow-hidden bg-black flex items-center justify-center">
      <div className="w-full h-full" style={{ transform: 'scale(0.8)', transformOrigin: 'center top' }}>
        <iframe
          src="/games/tetris-og/index.html"
          className="w-full h-full border-0"
          title="Tetris Legacy"
          allow="autoplay"
        />
      </div>
    </div>
  );
}
