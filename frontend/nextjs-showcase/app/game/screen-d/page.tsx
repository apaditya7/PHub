"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTimer } from '../context/TimerContext';
import Timer from '../components/Timer';

export default function ScreenD() {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [showSecondPopup, setShowSecondPopup] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { addMisclick } = useTimer();

  useEffect(() => {
    // Show popup after a short delay
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPopup) {
        e.preventDefault();
        addMisclick();
        setShowSecondPopup(true);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showPopup, addMisclick]);

  const handleXClick = () => {
    addMisclick();
    // X button is disabled - does nothing
  };

  const handleCloseButton = () => {
    addMisclick();
    setIsLocked(true);
    // Locks the popup
  };

  const handleInvisibleButton = () => {
    router.push('/screen-e');
  };

  const handleSecondPopupClose = () => {
    setShowSecondPopup(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-8">
      <Timer position="top-4 right-1/2 translate-x-1/2" color="text-green-700" />

      <div className="max-w-2xl bg-white p-12 rounded-xl shadow-xl text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Please Wait
        </h2>
        <p className="text-gray-600 mb-8">
          We're setting up your profile. This should only take a moment...
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '75%' }} />
        </div>
      </div>

      {/* Main Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md relative">
            {/* X button (disabled) */}
            <button
              onClick={handleXClick}
              className="absolute top-4 right-4 text-gray-300 hover:text-gray-300 text-2xl cursor-not-allowed"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-red-600 mb-4">
                ⏰ Hurry Up!
              </h3>
              <p className="text-gray-700">
                Time is ticking! Complete your registration before the timer runs out!
              </p>
            </div>

            <button
              onClick={handleCloseButton}
              className={`w-full py-3 px-6 rounded-lg font-semibold ${
                isLocked
                  ? 'bg-red-200 text-red-800 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              disabled={isLocked}
            >
              {isLocked ? 'Popup Locked' : 'Close'}
            </button>

            {isLocked && (
              <p className="text-sm text-red-600 mt-4 text-center">
                Oops! The popup is now locked. Try finding another way...
              </p>
            )}

            {/* Invisible button in bottom-left corner (6px) */}
            <div
              onClick={handleInvisibleButton}
              className="absolute bottom-2 left-2 w-[6px] h-[6px] cursor-pointer hover:bg-gray-100"
              title=""
            />
          </div>
        </div>
      )}

      {/* Second Popup (from pressing ESC) */}
      {showSecondPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Nice Try!
            </h3>
            <p className="text-gray-600 mb-6">
              ESC won't help you here. Keep looking for the way out...
            </p>
            <button
              onClick={handleSecondPopupClose}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 px-6 rounded-lg font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
