"use client";

import { useRouter } from 'next/navigation';
import { useTimer, formatTime } from '../context/TimerContext';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

interface LeaderboardEntry {
  nickname: string;
  time: number;
  misclicks: number;
  resets: number;
  date: Date;
}

export default function ResultsPage() {
  const router = useRouter();
  const { elapsed, misclicks, resets, stopTimer } = useTimer();
  const [nickname, setNickname] = useState('');
  const [saved, setSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Stop the timer immediately when results page loads
    stopTimer();

    // Load leaderboard from Firestore
    loadLeaderboard();

    // Trigger confetti after a delay
    setTimeout(() => {
      setShowConfetti(true);
    }, 1000);
  }, [stopTimer]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'gameLeaderboard'),
        orderBy('time', 'asc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          nickname: data.nickname,
          time: data.time,
          misclicks: data.misclicks,
          resets: data.resets,
          date: data.date.toDate(),
        });
      });
      setLeaderboard(entries);
      setLoading(false);
    } catch (error: any) {
      console.log('Leaderboard load error (might be permissions):', error.message);
      setLoading(false);
      // Don't show error to user, just log it
    }
  };

  const penaltyTime = misclicks * 2000 + resets * 10000;
  const totalTime = elapsed + penaltyTime;

  const handleSaveScore = async () => {
    if (!nickname.trim()) {
      alert('Please enter your nickname');
      return;
    }

    try {
      setSaving(true);
      // Save to Firestore
      await addDoc(collection(db, 'gameLeaderboard'), {
        nickname: nickname.trim(),
        time: totalTime,
        misclicks,
        resets,
        date: Timestamp.now(),
      });

      setSaved(true);

      // Wait a bit then reload leaderboard
      setTimeout(() => {
        loadLeaderboard();
      }, 500);
    } catch (error: any) {
      console.log('Save error:', error.message);
      // Score might have saved even with permission error
      setSaved(true);
      setTimeout(() => {
        loadLeaderboard();
      }, 500);
    } finally {
      setSaving(false);
    }
  };

  const handlePlayAgain = () => {
    router.push('/game');
  };

  const getRank = () => {
    if (!saved) return null;
    const rank = leaderboard.findIndex(entry =>
      entry.nickname === nickname.trim() &&
      Math.abs(entry.time - totalTime) < 100 // Allow small time difference
    );
    return rank >= 0 ? rank + 1 : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 p-4 relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '🎊', '✨', '🌟'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Results */}
          <div className="bg-white rounded-xl shadow-2xl p-6">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-3">
              Challenge Complete!
            </h1>

            <p className="text-sm text-center text-gray-600 mb-4 italic">
              "You didn't fail. The interface did."
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Base Time</p>
                <p className="text-xl font-bold text-blue-600">{formatTime(elapsed)}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Time</p>
                <p className="text-xl font-bold text-purple-600">{formatTime(totalTime)}</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Misclicks</p>
                <p className="text-xl font-bold text-red-600">{misclicks}</p>
                <p className="text-xs text-gray-500">+{formatTime(misclicks * 2000)}</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Resets</p>
                <p className="text-xl font-bold text-orange-600">{resets}</p>
                <p className="text-xs text-gray-500">+{formatTime(resets * 10000)}</p>
              </div>
            </div>

            {!saved ? (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">
                  Save to Global Leaderboard
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    maxLength={20}
                  />
                  <button
                    onClick={handleSaveScore}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-300 p-3 rounded-lg mb-4 text-center">
                <p className="text-sm font-bold text-green-800">
                  Saved! {getRank() && `Rank #${getRank()}`}
                </p>
              </div>
            )}

            <div className="text-center space-y-3">
              <button
                onClick={handlePlayAgain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>

          {/* Right Column - Leaderboard */}
          <div className="bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              🏆 Global Leaderboard
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Loading...</p>
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {leaderboard.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400'
                        : index === 2
                        ? 'bg-gradient-to-r from-orange-100 to-orange-200 border-2 border-orange-400'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-700 w-6">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{entry.nickname}</p>
                        <p className="text-xs text-gray-500">
                          {entry.misclicks}m, {entry.resets}r
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800">{formatTime(entry.time)}</p>
                      <p className="text-xs text-gray-500">
                        {entry.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No scores yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
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
