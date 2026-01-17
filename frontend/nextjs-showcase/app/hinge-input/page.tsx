'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Link from 'next/link';

interface HingeInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  hingePosition: 'left' | 'right';
  startRotation?: number;
  zIndex?: number;
  onFocus?: () => void;
  paddingHorizontal?: number;
}

function HingeInput({
  placeholder,
  value,
  onChangeText,
  hingePosition,
  startRotation = 0,
  zIndex = 1,
  onFocus,
  paddingHorizontal = 12,
}: HingeInputProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [inputWidth, setInputWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const direction = hingePosition === 'right' ? -1 : 1;

  // Calculate rotation based on value length (reduced angles, starts straight)
  const getRotation = () => {
    if (value.length === 0) return startRotation;
    if (value.length < 10) {
      return -(value.length * 0.8) * direction + startRotation; // up to ~8°
    } else if (value.length < 20) {
      return -15 * direction; // cap mid tilt
    } else {
      return -35 * direction; // avoid 90°, smaller max tilt
    }
  };

  // Calculate slide for right-side input
  const getSlide = () => {
    if (hingePosition === 'right' && value.length > 0) {
      return containerWidth - inputWidth - paddingHorizontal * 2;
    }
    return 0;
  };

  const rotation = getRotation();
  const slide = getSlide();

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Update input width when value changes
  useEffect(() => {
    if (inputRef.current) {
      // Create a temporary span to measure text width
      const span = document.createElement('span');
      span.style.font = window.getComputedStyle(inputRef.current).font;
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.textContent = value || placeholder;
      document.body.appendChild(span);
      setInputWidth(span.offsetWidth);
      document.body.removeChild(span);
    }
  }, [value, placeholder]);

  // Rotation with anchor point
  const transformOrigin = hingePosition === 'right' ? '100% 50%' : '0% 50%';

  return (
    <motion.div
      ref={containerRef}
      style={{
        zIndex,
        paddingLeft: `${paddingHorizontal}px`,
        paddingRight: `${paddingHorizontal}px`,
        transformOrigin,
      }}
      className="relative flex flex-row bg-white rounded-lg my-3 mx-6 shadow-md max-w-md w-full"
      animate={{
        rotate: rotation,
      }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 15,
      }}
    >
      <motion.input
        ref={inputRef}
        type={placeholder.toLowerCase().includes('password') ? 'password' : 'text'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        onFocus={onFocus}
        className="text-base h-[44px] w-full outline-none border-none bg-transparent"
        style={{
          fontSize: '16px',
        }}
        animate={{
          x: slide,
        }}
        transition={{
          duration: 3,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}

export default function HingeInputPage() {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameZIndex, setFullNameZIndex] = useState(1);
  const [passwordZIndex, setPasswordZIndex] = useState(1);

  return (
    <div className="min-h-screen bg-[#e0e0e0] flex flex-col justify-center">
      <Link href="/" className="absolute top-8 left-8 text-blue-600 hover:text-blue-800 underline z-50">
        ← Back to Home
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Hinge Input (Broken UI)</h1>
        <p className="text-gray-600">Type to watch the inputs fall down!</p>
        <p className="text-sm text-gray-500 mt-2">
          Try typing more than 10 characters, then more than 20...
        </p>
      </div>

      <div className="flex flex-col">
        <HingeInput
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          hingePosition="left"
          startRotation={0}
          zIndex={fullNameZIndex}
          paddingHorizontal={12}
          onFocus={() => {
            setFullNameZIndex(2);
            setPasswordZIndex(1);
          }}
        />

        <HingeInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          hingePosition="right"
          startRotation={0}
          zIndex={passwordZIndex}
          paddingHorizontal={12}
          onFocus={() => {
            setPasswordZIndex(2);
            setFullNameZIndex(1);
          }}
        />

        <motion.div
          className="mt-16 h-[52px] rounded-[26px] bg-[#fc0345] mx-6 max-w-md w-full self-center flex items-center justify-center cursor-pointer hover:bg-[#d40339] transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-white text-lg">Login</span>
        </motion.div>
      </div>

      <div className="text-center mt-12 text-gray-600">
        <p className="text-sm">
          <strong>How it works:</strong>
        </p>
        <ul className="text-sm mt-2 space-y-1">
          <li>0-9 characters: Rotates 1° per character</li>
          <li>10-19 characters: Fixed at 20° rotation</li>
          <li>20+ characters: Falls completely (90° rotation)</li>
          <li>Right input also slides text as it fills</li>
        </ul>
      </div>
    </div>
  );
}
