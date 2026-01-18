'use client';

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
  RocketIcon,
  MixIcon,
  ComponentInstanceIcon,
  CubeIcon
} from "@radix-ui/react-icons";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [yesScale, setYesScale] = useState(1);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleNoClick = () => {
    setYesScale(prev => prev + 0.2);
  };

  const handleYesClick = () => {
    router.push('/nsfw');
  };

  const features = [
    {
      Icon: RocketIcon,
      name: "Department of HUB",
      description: "Your central hub for all procrastination needs",
      href: "/gamehub",
      cta: "Enter Hub",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/40 to-gray-900/20" />
      ),
      className: "col-span-3 lg:col-span-2",
    },
    {
      Icon: MixIcon,
      name: "Fingerless Arcade",
      description: "Motion-controlled games using webcam tracking",
      href: "/gamehub",
      cta: "Play Games",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/40 to-gray-900/20" />
      ),
      className: "col-span-3 lg:col-span-1",
    },
    {
      Icon: ComponentInstanceIcon,
      name: "Bad UI Challenge",
      description: "The most frustrating interfaces ever created",
      href: "/game",
      cta: "Start Challenge",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/40 to-gray-900/20" />
      ),
      className: "col-span-3 lg:col-span-1",
    },
    {
      Icon: CubeIcon,
      name: "University Monopoly",
      description: "Singapore university-themed multiplayer Monopoly",
      href: "/monopoly",
      cta: "Play Monopoly",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/40 to-gray-900/20" />
      ),
      className: "col-span-3 lg:col-span-2",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with user menu */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-sm text-gray-400">Signed in as</p>
                  <p className="text-sm text-white truncate">{user?.email}</p>
                </div>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-6 py-8">
        {/* Bento Grid */}
        <div className="mb-12">
          <BentoGrid className="lg:grid-cols-3">
            {features.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>

        {/* Do you trust us section */}
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-8">
            Do you trust us?
          </h2>

          <div className="flex gap-6 justify-center items-center">
            <button
              onClick={handleNoClick}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition-all duration-300"
            >
              No
            </button>

            <button
              onClick={handleYesClick}
              style={{ transform: `scale(${yesScale})` }}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-all duration-300"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
