"use client";

import { useRouter } from 'next/navigation';
import { useTimer, formatTime } from '../context/TimerContext';
import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  name: string;
  time: number;
  misclicks: number;
  resets: number;
  date: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const { elapsed, misclicks, resets } = useTimer();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Load leaderboard from localStorage
    const stored = localStorage.getItem('uxNightmaresLeaderboard');
    if (stored) {
      setLeaderboard(JSON.parse(stored));
    }

    // Trigger confetti after a delay
    setTimeout(() => {
      setShowConfetti(true);
    }, 1000);
  }, []);

  const penaltyTime = misclicks * 2000 + resets * 10000;
  const totalTime = elapsed + penaltyTime;

  const handleSaveScore = () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    const newEntry: LeaderboardEntry = {
      name: name.trim(),
      time: totalTime,
      misclicks,
      resets,
      date: new Date().toISOString(),
    };

    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => a.time - b.time)
      .slice(0, 10); // Keep top 10

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('uxNightmaresLeaderboard', JSON.stringify(updatedLeaderboard));
    setSaved(true);
  };

  const handlePlayAgain = () => {
    router.push('/');
  };

  const getRank = () => {
    if (!saved) return null;
    const rank = leaderboard.findIndex(entry =>
      entry.name === name.trim() &&
      entry.time === totalTime
    );
    return rank >= 0 ? rank + 1 : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 p-8 relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute text-3xl animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${4 + Math.random() * 3}s`,
              }}
            >
              {['🎉', '🎊', '✨', '🌟'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-12 mb-8">
          <h1 className="text-5xl font-bold text-center text-gray-800 mb-6">
            Challenge Complete!
          </h1>

          <p className="text-xl text-center text-gray-600 mb-12 italic">
            "You didn't fail.<br />The interface did."
          </p>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Base Time</p>
              <p className="text-3xl font-bold text-blue-600">{formatTime(elapsed)}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Total Time (with penalties)</p>
              <p className="text-3xl font-bold text-purple-600">{formatTime(totalTime)}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Misclicks</p>
              <p className="text-3xl font-bold text-red-600">{misclicks}</p>
              <p className="text-xs text-gray-500 mt-1">+{formatTime(misclicks * 2000)} penalty</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Timer Resets</p>
              <p className="text-3xl font-bold text-orange-600">{resets}</p>
              <p className="text-xs text-gray-500 mt-1">+{formatTime(resets * 10000)} penalty</p>
            </div>
          </div>

          {!saved ? (
            <div className="bg-gray-50 p-6 rounded-xl mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Save Your Score to Leaderboard
              </h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={20}
                />
                <button
                  onClick={handleSaveScore}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  Save Score
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-green-300 p-6 rounded-xl mb-6 text-center">
              <p className="text-xl font-bold text-green-800">
                Score Saved! You ranked #{getRank()} on the leaderboard!
              </p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handlePlayAgain}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-12 py-4 rounded-lg text-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
              🏆 Leaderboard
            </h2>
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400'
                      : index === 2
                      ? 'bg-gradient-to-r from-orange-100 to-orange-200 border-2 border-orange-400'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-700 w-8">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">{entry.name}</p>
                      <p className="text-sm text-gray-500">
                        {entry.misclicks} misclicks, {entry.resets} resets
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">{formatTime(entry.time)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
