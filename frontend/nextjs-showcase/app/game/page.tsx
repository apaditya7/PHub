"use client";

import { useRouter } from 'next/navigation';
import { useTimer } from './context/TimerContext';
import { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const { startTimer } = useTimer();

  useEffect(() => {
    const handleInteraction = () => {
      startTimer();
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [startTimer]);

  const handleFakeButton = () => {
    // Does nothing - this is intentional bad UX
  };

  const handleRealNavigation = () => {
    router.push('/game/screen-a');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">
          UX Nightmares
        </h1>

        <p className="text-xl text-gray-600 leading-relaxed">
          Welcome to the world's most frustrating interface! Your goal is simple:
          complete a basic registration flow as fast as you can.
          Compete for the best time on the leaderboard!
        </p>

        <div className="mt-12">
          <button
            onClick={handleFakeButton}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-16 rounded-lg text-2xl shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Start Challenge
          </button>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-300">
          <p className="text-xs text-gray-400 leading-loose">
            By clicking continue you acknowledge that this interface will test your patience.
            Timer starts on first interaction.{' '}
            <span
              onClick={handleRealNavigation}
              className="text-gray-400 underline cursor-pointer hover:text-gray-500"
              style={{ fontSize: '10px', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              Continue to challenge
            </span>
            {' '}or review our terms of service which you definitely read in full.
          </p>
        </div>
      </div>
    </div>
  );
}
