"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTimer } from '../context/TimerContext';
import Timer from '../components/Timer';

// Simple emoji-based "images" for the CAPTCHA
// ✓ = actual chairs that should be selected
const IMAGES = [
  { emoji: "🪑", isChair: true, label: "Chair 1" },
  { emoji: "🪑", isChair: true, label: "Chair 2" },
  { emoji: "🛋️", isChair: true, label: "Couch (armchair?)" },
  { emoji: "💺", isChair: true, label: "Seat" },
  { emoji: "🎪", isChair: false, label: "Tent" },
  { emoji: "🏠", isChair: false, label: "House" },
  { emoji: "🧍", isChair: false, label: "Person standing" },
  { emoji: "🧘", isChair: false, label: "Person sitting" }, // Ambiguous!
  { emoji: "🪵", isChair: false, label: "Wood/stool?" }, // Ambiguous!
];

export default function ScreenG() {
  const router = useRouter();
  const { addMisclick } = useTimer();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleToggle = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
    setError('');
  };

  const handleSubmit = () => {
    // Check if user selected all the chairs
    const correctAnswers = new Set([0, 1, 2, 3]);
    const isCorrect =
      selected.size === correctAnswers.size &&
      [...selected].every(i => correctAnswers.has(i));

    if (isCorrect) {
      router.push('/game/results');
    } else {
      addMisclick();
      setAttempts(prev => prev + 1);

      if (attempts >= 2) {
        // After 3 attempts, just let them through
        router.push('/game/results');
      } else {
        setError('Incorrect selection. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-8">
      <Timer position="top-1/2 right-4 -translate-y-1/2" color="text-indigo-700" />

      <div className="max-w-3xl mx-auto bg-white p-10 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Security Verification
        </h2>

        <p className="text-center text-lg text-gray-700 mb-8">
          Select all images containing <span className="font-bold text-blue-600">chairs</span>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Misaligned grid with large vertical gaps */}
        <div className="space-y-8 mb-8">
          {/* Row 1 - offset */}
          <div className="flex justify-start gap-6 ml-8">
            {IMAGES.slice(0, 3).map((img, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center text-5xl mb-6">
                  {img.emoji}
                </div>
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => handleToggle(idx)}
                  className="h-5 w-5"
                />
              </div>
            ))}
          </div>

          {/* Row 2 - different offset */}
          <div className="flex justify-center gap-8">
            {IMAGES.slice(3, 6).map((img, idx) => {
              const actualIdx = idx + 3;
              return (
                <div key={actualIdx} className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center text-5xl mb-4">
                    {img.emoji}
                  </div>
                  <input
                    type="checkbox"
                    checked={selected.has(actualIdx)}
                    onChange={() => handleToggle(actualIdx)}
                    className="h-5 w-5"
                  />
                </div>
              );
            })}
          </div>

          {/* Row 3 - another offset */}
          <div className="flex justify-end gap-4 mr-12">
            {IMAGES.slice(6, 9).map((img, idx) => {
              const actualIdx = idx + 6;
              return (
                <div key={actualIdx} className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center text-5xl mb-8">
                    {img.emoji}
                  </div>
                  <input
                    type="checkbox"
                    checked={selected.has(actualIdx)}
                    onChange={() => handleToggle(actualIdx)}
                    className="h-5 w-5"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          Verify
        </button>

        {attempts > 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Attempts: {attempts + 1} / 3
          </p>
        )}
      </div>
    </div>
  );
}
