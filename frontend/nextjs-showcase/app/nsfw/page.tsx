'use client';

import { useState } from "react";
import Link from "next/link";

export default function NSFWPage() {
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back button */}
      <Link
        href="/dashboard"
        className="absolute top-6 left-6 text-gray-400 hover:text-orange-400 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      <div className="relative z-10 max-w-2xl w-full">
        <div className="bg-white/5 backdrop-blur-lg border-2 border-green-500/30 rounded-2xl shadow-2xl p-8">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
            Generate NSFW Image
          </h1>

          <p className="text-center text-gray-400 mb-8">
            Click the button below to generate a totally safe image. Trust us.
          </p>

          {/* Generate Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={generateImage}
              disabled={generating}
              className="px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              {generating ? 'Generating...' : 'Generate Image'}
            </button>
          </div>

          {/* Image Display */}
          {imageUrl && (
            <div className="mt-8 bg-white/10 rounded-lg p-4 border border-white/20">
              <img
                src={imageUrl}
                alt="Generated"
                className="max-w-full mx-auto rounded-lg shadow-xl"
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-400 rounded-lg">
              <p className="text-red-200 font-semibold text-center">{error}</p>
            </div>
          )}

          {/* Disclaimer */}
          {!imageUrl && !error && (
            <p className="text-xs text-gray-500 text-center italic mt-8">
              What could possibly go wrong? 😏
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
