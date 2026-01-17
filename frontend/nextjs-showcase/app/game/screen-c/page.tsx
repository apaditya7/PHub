"use client";

import { useRouter } from 'next/navigation';
import { useTimer } from '../context/TimerContext';
import Timer from '../components/Timer';

export default function ScreenC() {
  const router = useRouter();
  const { addMisclick } = useTimer();

  const handleThisOption = () => {
    router.push('/screen-d');
  };

  const handleContinueButton = () => {
    addMisclick();
    // Does nothing despite animation
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addMisclick();
      // Does nothing
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-8" onKeyDown={handleEnter}>
      <Timer position="bottom-8 right-8" color="text-orange-600" />

      <div className="max-w-3xl bg-white p-16 rounded-xl shadow-xl text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">
          Almost There!
        </h2>

        <div className="text-xl text-gray-700 leading-relaxed mb-12 space-y-6">
          <p>
            To proceed, press <span className="font-bold bg-gray-200 px-3 py-1 rounded">Enter</span>,
            click <span className="font-bold text-blue-600">Continue</span>, or
            select{' '}
            <span
              onClick={handleThisOption}
              className="text-gray-700 cursor-pointer"
              style={{ textDecoration: 'none' }}
            >
              this option
            </span>.
          </p>
        </div>

        <button
          onClick={handleContinueButton}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-12 rounded-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105"
        >
          Continue
        </button>

        <p className="text-sm text-gray-400 mt-8">
          Having trouble? Make sure you follow the instructions carefully.
        </p>
      </div>
    </div>
  );
}
