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
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-red-600/20 opacity-50 transition-opacity group-hover:opacity-80" />
      ),
      className: "col-span-3 lg:col-span-2 bg-[#1a1a1a] border-[#333] hover:border-[#ff9900]/50 text-gray-100",
    },
    {
      Icon: MixIcon,
      name: "Fingerless Arcade",
      description: "Motion-controlled games using webcam tracking",
      href: "/gamehub",
      cta: "Play Games",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-50 transition-opacity group-hover:opacity-80" />
      ),
      className: "col-span-3 lg:col-span-1 bg-[#1a1a1a] border-[#333] hover:border-[#ff9900]/50 text-gray-100",
    },
    {
      Icon: ComponentInstanceIcon,
      name: "Bad UI Challenge",
      description: "The most frustrating interfaces ever created",
      href: "/game",
      cta: "Start Challenge",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 opacity-50 transition-opacity group-hover:opacity-80" />
      ),
      className: "col-span-3 lg:col-span-1 bg-[#1a1a1a] border-[#333] hover:border-[#ff9900]/50 text-gray-100",
    },
    {
      Icon: CubeIcon,
      name: "University Monopoly",
      description: "Singapore university-themed multiplayer Monopoly",
      href: "/monopoly",
      cta: "Play Monopoly",
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/20 opacity-50 transition-opacity group-hover:opacity-80" />
      ),
      className: "col-span-3 lg:col-span-2 bg-[#1a1a1a] border-[#333] hover:border-[#ff9900]/50 text-gray-100",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 font-sans selection:bg-[#ff9900] selection:text-black">
      
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
