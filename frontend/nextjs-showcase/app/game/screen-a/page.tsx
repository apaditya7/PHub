"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Timer from '../components/Timer';

export default function ScreenA() {
  const router = useRouter();
  const [progress, setProgress] = useState(63);

  const handleContinue = () => {
    // Progress bar goes backward on success - intentional bad UX
    setProgress(45);
    setTimeout(() => {
      router.push('/game/screen-b');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Timer />

      {/* Three conflicting progress indicators */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md p-4 z-40">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-gray-600 mb-2">Step 2 of 5</p>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sidebar progress */}
      <div className="fixed left-4 top-32 bg-white p-4 rounded-lg shadow-lg">
        <p className="text-xs text-gray-500 mb-2">Current Stage</p>
        <p className="text-3xl font-bold text-purple-600">4</p>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen pt-24">
        <div className="max-w-xl bg-white p-12 rounded-lg shadow-xl text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Getting Started
          </h2>
          <p className="text-gray-600 mb-8">
            Let's begin with some basic information. This will only take a moment.
          </p>
          <button
            onClick={handleContinue}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg"
          >
            Continue
          </button>
        </div>
      </div>

      {/* Footer with third progress indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-3 text-center">
        <p className="text-sm">Progress: <span className="font-bold">63% complete</span></p>
      </div>
    </div>
  );
}
