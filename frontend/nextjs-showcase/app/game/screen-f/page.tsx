"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTimer } from '../context/TimerContext';
import Timer from '../components/Timer';

const OPTIONS = [
  "Option 1", "Option 2", "Option 3", "Option 4", "Option 5",
  "Option 6", "Option 7", "Option 8", "Option 9", "Option 10",
  "Option 11", "Option 12", "Option 13", "Option 14", "Option 15",
  "Option 16", "Option 17", "Option 18", "Option 19", "Option 20",
  "Option 21", "Option 22", "Option 23", "Option 24", "Option 25",
  "Option 26", "Option 27", "Option 28", "Option 29", "Option 30",
  "Option 31", "Option 32", "Option 33", "Option 34", "Option 35",
  "Option 36", "Option 37", "Option 38", "Option 39", "Option 40",
];

export default function ScreenF() {
  const router = useRouter();
  const { resetTimer, addMisclick } = useTimer();
  const [selected, setSelected] = useState<Set<number>>(new Set(OPTIONS.map((_, i) => i)));
  const [error, setError] = useState('');

  const handleToggle = (index: number) => {
    const newSelected = new Set(selected);

    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
      // If selecting 6th option, silently clear all
      if (newSelected.size === 6) {
        addMisclick();
        setSelected(new Set());
        setError('Selection cleared! Try again.');
        setTimeout(() => setError(''), 2000);
        return;
      }
    }

    setSelected(newSelected);
    setError('');
  };

  const handleDeselectAll = () => {
    addMisclick();
    resetTimer();
    setSelected(new Set());
    setError('Timer reset!');
    setTimeout(() => setError(''), 2000);
  };

  const handleSubmit = () => {
    if (selected.size !== 5) {
      addMisclick();
      setError(`You must select exactly 5 options. Currently selected: ${selected.size}`);
      return;
    }
    router.push('/game/screen-g');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 to-cyan-100 p-8">
      <Timer position="bottom-4 left-4" color="text-teal-700" />

      <div className="max-w-4xl mx-auto bg-white p-10 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Select Your Preferences
        </h2>

        <p className="text-center text-gray-600 mb-2">
          Select <span className="font-bold text-red-600">exactly 5</span> options to continue
        </p>

        <p className="text-center text-sm text-blue-600 mb-6">
          Currently selected: {selected.size} / 5
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <div className="mb-6 text-center">
          <button
            onClick={handleDeselectAll}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Deselect All
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {OPTIONS.map((option, index) => (
            <label
              key={index}
              className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => handleToggle(index)}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
