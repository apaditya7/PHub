"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTimer } from '../context/TimerContext';
import Timer from '../components/Timer';

export default function ScreenE() {
  const router = useRouter();
  const { addMisclick } = useTimer();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    username: '',
    email: '',
  });
  const [agreeChecked, setAgreeChecked] = useState(true); // Pre-checked
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    // Validation
    if (formData.password.length < 8) {
      newErrors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(formData.password)) {
      newErrors.push('Password must contain an uppercase letter');
    }
    if (!/[0-9]/.test(formData.password)) {
      newErrors.push('Password must contain a number');
    }
    if (!/[!@#$%^&*]/.test(formData.password)) {
      newErrors.push('Password must contain a special character');
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.push('Passwords do not match');
    }
    if (!formData.username) {
      newErrors.push('Username is required');
    }
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.push('Valid email is required');
    }
    if (agreeChecked) {
      newErrors.push('You must NOT agree to proceed');
    }

    if (newErrors.length > 0) {
      addMisclick();
      setErrors(newErrors);
      return;
    }

    router.push('/game/screen-f');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center p-8">
      <Timer position="top-8 left-1/2 -translate-x-1/2" color="text-red-600" />

      <div className="max-w-lg bg-white p-10 rounded-xl shadow-xl w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Create Your Account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Password FIRST (wrong order) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent relative z-10"
              />
              <div className="absolute inset-0 px-4 py-3 pointer-events-none text-gray-800 z-0">
                Enter password
              </div>
            </div>
          </div>

          {/* Confirm Password SECOND */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent relative z-10"
              />
              <div className="absolute inset-0 px-4 py-3 pointer-events-none text-gray-800 z-0">
                Confirm password
              </div>
            </div>
          </div>

          {/* Username THIRD (should be first) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent relative z-10"
              />
              <div className="absolute inset-0 px-4 py-3 pointer-events-none text-gray-800 z-0">
                Choose a username
              </div>
            </div>
          </div>

          {/* Email FOURTH (should be second) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent relative z-10"
              />
              <div className="absolute inset-0 px-4 py-3 pointer-events-none text-gray-800 z-0">
                your.email@example.com
              </div>
            </div>
          </div>

          {/* Checkbox with NOT agree */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={agreeChecked}
              onChange={(e) => setAgreeChecked(e.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <label className="text-sm text-gray-700">
              I do <span className="font-bold">NOT</span> agree to the terms and conditions
            </label>
          </div>

          {/* Password rules at the BOTTOM */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold mb-2">Password Requirements:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains one uppercase letter</li>
              <li>• Contains one number</li>
              <li>• Contains one special character (!@#$%^&*)</li>
            </ul>
          </div>

          {/* Error messages appear after submit */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-800 mb-2">Please fix the following errors:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
