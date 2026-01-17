"use client";

import { useTimer, formatTime } from '../context/TimerContext';

interface TimerProps {
  position?: string;
  color?: string;
  hidden?: boolean;
}

export default function Timer({ position = 'top-4 right-4', color = 'text-gray-800', hidden = false }: TimerProps) {
  const { elapsed } = useTimer();

  if (hidden) return null;

  return (
    <div className={`fixed ${position} bg-white px-6 py-3 rounded-lg shadow-lg border-2 border-gray-300 font-mono text-2xl ${color} z-50`}>
      {formatTime(elapsed)}
    </div>
  );
}
