'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './AuthProvider';
import { useState } from 'react';

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-lg border border-[#333] group-hover:border-[#ff9900] transition-colors">
             <Image 
               src="/prohub_logo.jpeg" 
               alt="ProHub Logo" 
               fill
               className="object-cover"
             />
          </div>
          <div className="flex items-center tracking-tighter">
            <span className="text-2xl font-black text-white">PRO</span>
            <span className="text-2xl font-black text-[#ff9900]">HUB</span>
          </div>
        </Link>
        
        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">HOME</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">DASHBOARD</Link>
            <Link href="/gamehub" className="hover:text-[#ff9900] transition-colors">GAMES</Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {loading ? (
          <div className="w-5 h-5 border-2 border-[#ff9900] border-t-transparent rounded-full animate-spin" />
        ) : user ? (
          <div className="relative">
            <button 
              onClick={() => setOpen(!open)} 
              className="px-4 py-2 text-sm font-bold bg-[#ff9900] text-black rounded-full hover:bg-[#e68a00] transition-colors"
            >
              {user.email?.split('@')[0] || 'PROFILE'}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl overflow-hidden">
                <div className="px-4 py-3 text-sm font-bold text-gray-300 border-b border-[#333] bg-[#222]">
                  {user.email}
                </div>
                <Link 
                  href="/profile" 
                  className="block px-4 py-2 text-sm font-bold text-gray-400 hover:bg-[#ff9900] hover:text-black transition-colors"
                  onClick={() => setOpen(false)}
                >
                  PROFILE
                </Link>
                <button 
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }} 
                  className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-900/20 transition-colors"
                >
                  SIGN OUT
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login" className="text-sm font-bold text-gray-400 hover:text-[#ff9900] transition-colors">
              LOGIN
            </Link>
            <Link 
              href="/register" 
              className="bg-[#ff9900] text-black text-sm font-bold px-4 py-2 rounded-full hover:bg-[#e68a00] transition-colors"
            >
              SIGN UP
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

