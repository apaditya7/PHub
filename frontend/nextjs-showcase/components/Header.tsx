'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useState } from 'react';

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-purple-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700">
          PHub
        </Link>
        <nav className="flex items-center gap-3">
          {loading ? (
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : user ? (
            <div className="relative">
              <button onClick={() => setOpen(!open)} className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-purple-700">
                {user.email?.split('@')[0] || 'Profile'}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-gray-300 rounded-lg shadow-xl">
                  <div className="px-4 py-3 text-sm font-semibold text-gray-800 border-b-2 border-gray-200 bg-gray-50">{user.email}</div>
                  <Link href="/profile" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700">Profile</Link>
                  <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-purple-600 px-3 py-2">Login</Link>
              <Link href="/register" className="text-sm font-semibold px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-purple-700">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

