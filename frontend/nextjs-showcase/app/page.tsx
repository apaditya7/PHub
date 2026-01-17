'use client';

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../components/AuthProvider";

export default function Home() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    setGenerating(true);
    setError(null);
    setImageUrl(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      setImageUrl(data.dataUrl);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
            PHub Dashboard
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Choose your adventure: Browse terrible UI, play a frustrating game, or... trust us?
          </p>
        </header>

        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Main Menu Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/components"
              className="group relative bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30 hover:border-purple-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
            >
              <div className="text-center space-y-4">
                <div className="text-6xl">🎨</div>
                <h2 className="text-3xl font-bold text-white">Bad UI Components</h2>
                <p className="text-purple-200">
                  Explore our collection of intentionally terrible, creative, and frustrating user interfaces
                </p>
                <div className="text-purple-300 font-semibold">
                  Browse Gallery →
                </div>
              </div>
            </Link>

            <Link
              href="/game"
              className="group relative bg-gradient-to-br from-pink-500/20 to-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-pink-400/30 hover:border-pink-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50"
            >
              <div className="text-center space-y-4">
                <div className="text-6xl">🎮</div>
                <h2 className="text-3xl font-bold text-white">UX Nightmares</h2>
                <p className="text-purple-200">
                  Complete a registration flow in the world's most frustrating interface. Beat the clock!
                </p>
                <div className="text-pink-300 font-semibold">
                  Play Game →
                </div>
              </div>
            </Link>

            <Link
              href="/gamehub"
              className="group relative bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-8 border border-cyan-400/30 hover:border-cyan-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/50"
            >
              <div className="text-center space-y-4">
                <div className="text-6xl">🎯</div>
                <h2 className="text-3xl font-bold text-white">GameHub</h2>
                <p className="text-purple-200">
                  Motion-controlled games using webcam tracking. Tilt your head, move your nose, pinch with your hands!
                </p>
                <div className="text-cyan-300 font-semibold">
                  Play Games →
                </div>
              </div>
            </Link>

            <Link
              href="/monopoly"
              className="group relative bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-lg rounded-2xl p-8 border border-orange-400/30 hover:border-orange-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50"
            >
              <div className="text-center space-y-4">
                <div className="text-6xl">🎲</div>
                <h2 className="text-3xl font-bold text-white">Monopoly</h2>
                <p className="text-purple-200">
                  Multiplayer Monopoly with a university theme. Create or join rooms and compete with friends online!
                </p>
                <div className="text-orange-300 font-semibold">
                  Play Monopoly →
                </div>
              </div>
            </Link>
          </div>

          {/* Trust Section */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg rounded-2xl p-8 border border-green-400/30">
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-white">Do You Trust Us?</h2>
              <p className="text-purple-200 max-w-xl mx-auto">
                Click the button below to generate a totally safe, work-friendly image. What could possibly go wrong?
              </p>

              <button
                onClick={generateImage}
                disabled={generating}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {generating ? 'Generating...' : 'Generate NSFW Image'}
              </button>

              {imageUrl && (
                <div className="mt-6 bg-white/10 rounded-lg p-4 border border-white/20">
                  <img src={imageUrl} alt="Generated" className="max-w-full mx-auto rounded-lg shadow-xl" />
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-400 rounded-lg">
                  <p className="text-red-200 font-semibold">{error}</p>
                </div>
              )}

              <p className="text-xs text-purple-300 italic">
                NSFW = National Servicemen Fulltime Working (obviously)
              </p>
            </div>
          </div>
        </div>

        <footer className="text-center mt-16 text-purple-300">
          <p className="text-sm">
            All components are for educational and entertainment purposes
          </p>
          {user && (
            <p className="text-xs mt-2 text-purple-400">
              Logged in as {user.email}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
