'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

// Floating card component
const FloatingCard = ({
  emoji,
  text,
  rotation,
  position
}: {
  emoji: string;
  text: string;
  rotation: number;
  position: { x: string; y: string }
}) => {
  return (
    <motion.div
      className="absolute bg-white rounded-xl p-4 shadow-xl hover:shadow-2xl transition-shadow cursor-default"
      style={{
        left: position.x,
        top: position.y,
        rotate: rotation,
        width: '200px',
      }}
      animate={{
        y: [0, -12, 0],
        rotate: [rotation, rotation + 3, rotation],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{
        scale: 1.05,
        rotate: 0,
        transition: { duration: 0.3 }
      }}
    >
      <div className="flex items-start gap-2">
        <div className="text-2xl text-orange-500 flex-shrink-0">{emoji}</div>
        <p className="text-gray-700 text-xs leading-relaxed pt-1">{text}</p>
      </div>
    </motion.div>
  );
};

export default function LandingPage() {
  const gameCards = [
    { emoji: "🧠", text: "Play games using only your head movements", rotation: -8, position: { x: "8%", y: "15%" } },
    { emoji: "👃", text: "Control everything with your nose - no hands needed", rotation: 5, position: { x: "75%", y: "18%" } },
    { emoji: "💻", text: "Master the hinge input challenge", rotation: -12, position: { x: "10%", y: "65%" } },
    { emoji: "🎲", text: "Singapore university-themed Monopoly", rotation: 7, position: { x: "78%", y: "68%" } },
    { emoji: "🏎️", text: "Race through neon streets with motion controls", rotation: -5, position: { x: "12%", y: "40%" } },
    { emoji: "🧱", text: "Tetris but make it unnecessarily difficult", rotation: 10, position: { x: "80%", y: "43%" } },
    { emoji: "🎨", text: "The most frustrating UI you'll ever experience", rotation: -15, position: { x: "5%", y: "85%" } },
  ];

  return (
    <div className="h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Floating game cards */}
      {gameCards.map((card, index) => (
        <FloatingCard
          key={index}
          emoji={card.emoji}
          text={card.text}
          rotation={card.rotation}
          position={card.position}
        />
      ))}

      {/* Main content - centered logo and CTA */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6">
        {/* Logo - centered in the middle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <Image
            src="/prohub_logo.jpeg"
            alt="ProHub Logo"
            width={600}
            height={300}
            className="max-w-2xl w-full h-auto"
            priority
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-xl md:text-2xl text-gray-400 mb-12 text-center max-w-2xl leading-relaxed"
        >
          Lowkey games for university students.
          <br />
          <span className="text-orange-400">Procrastinate properly.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col gap-4 items-center"
        >
          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center px-12 py-5 text-2xl font-bold text-black bg-gradient-to-r from-orange-400 to-orange-600 rounded-full overflow-hidden shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105"
          >
            <span className="relative z-10">Enter PHub</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-700"
              initial={{ x: "100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />
          </Link>

          {/* Hinge Games button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="text-gray-500 hover:text-orange-400 text-sm transition-colors italic"
          >
            Hinge Games...no not that hinge!!!
          </motion.button>
        </motion.div>
      </div>

      {/* Ambient glow effects */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
