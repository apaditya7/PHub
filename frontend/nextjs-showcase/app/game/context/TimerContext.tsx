"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TimerContextType {
  startTime: number | null;
  elapsed: number;
  startTimer: () => void;
  resetTimer: () => void;
  misclicks: number;
  addMisclick: () => void;
  resets: number;
  addReset: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [misclicks, setMisclicks] = useState(0);
  const [resets, setResets] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsed(performance.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  const startTimer = () => {
    if (!startTime) {
      setStartTime(performance.now());
    }
  };

  const resetTimer = () => {
    setStartTime(performance.now());
    setElapsed(0);
    setResets(prev => prev + 1);
  };

  const addMisclick = () => {
    setMisclicks(prev => prev + 1);
  };

  const addReset = () => {
    setResets(prev => prev + 1);
  };

  return (
    <TimerContext.Provider value={{
      startTime,
      elapsed,
      startTimer,
      resetTimer,
      misclicks,
      addMisclick,
      resets,
      addReset
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

export function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const deciseconds = Math.floor((totalSeconds % 1) * 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
}
