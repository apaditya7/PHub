"use client";

import { useRouter } from 'next/navigation';
import { useTimer } from '../context/TimerContext';
import Timer from '../components/Timer';

export default function ScreenB() {
  const router = useRouter();
  const { resetTimer, addMisclick } = useTimer();

  const handleConfirm = () => {
    // This is the correct button (grey one)
    router.push('/game/screen-c');
  };

  const handleCancel = () => {
    addMisclick();
    // Green cancel button does nothing
  };

  const handleContinue = () => {
    addMisclick();
    // Continue button with hover effect does nothing
  };

  const handleBack = () => {
    addMisclick();
    resetTimer();
    // Resets timer - punishment
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-8">
      <Timer position="top-8 left-8" color="text-purple-600" />

      <div className="max-w-2xl bg-white p-12 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Confirm Your Selection
        </h2>

        <p className="text-gray-600 mb-12">
          Please choose how you would like to proceed with your registration.
        </p>

        <div className="space-y-4">
          {/* Confirm - Grey (looks disabled but works) */}
          <button
            onClick={handleConfirm}
            className="w-full bg-gray-400 text-gray-600 font-semibold py-4 px-6 rounded-lg"
          >
            Confirm
          </button>

          {/* Cancel - Green (wrong color) */}
          <button
            onClick={handleCancel}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>

          {/* Continue - Has hover but does nothing */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-500 hover:bg-blue-600 hover:shadow-lg text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-105"
          >
            Continue
          </button>

          {/* Back - Looks like text but resets timer */}
          <div className="text-center pt-4">
            <span
              onClick={handleBack}
              className="text-gray-500 text-sm cursor-pointer hover:text-gray-600"
            >
              ← Back
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
