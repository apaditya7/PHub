'use client';

import { useState, useRef, useEffect, useCallback, useMemo, CSSProperties, ElementType } from 'react';
import Matter from 'matter-js';
import Link from 'next/link';

interface TextHateMouseProps {
  text: string | string[];
  tag?: ElementType;
  splitter?: RegExp | ((text: string) => string[]);
  evasionRadius?: number;
  stiffness?: number;
  damping?: number;
  debug?: boolean;
}

function TextHateMouse({
  text = '',
  tag: Tag = 'p',
  splitter = /.*?/u,
  evasionRadius = 40,
  stiffness = 0.01,
  damping = 0.05,
  debug = false,
}: TextHateMouseProps) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const charRefsMap = useRef<Map<string, HTMLSpanElement>>(new Map());
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const cursorBodyRef = useRef<Matter.Body | null>(null);
  const charBodyInitMapRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const [charStyleMap, setCharStyleMap] = useState<Map<string, CSSProperties>>(new Map());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [containerBounding, setContainerBounding] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const chars = useMemo(() => {
    const data = Array.isArray(text) ? text : (
      typeof splitter === 'function' ? splitter(text) : text.split(splitter)
    );
    return data.map((char, i) => ({ id: `char-${i}`, char }));
  }, [text, splitter]);

  const ariaLabel = useMemo(() => chars.map(({ char }) => char).join(''), [chars]);

  const isSmallEnough = (value: number) => Math.abs(value) < 0.05;

  const updateContainerBounding = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setContainerBounding({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  const createCursorBody = useCallback(() => {
    if (!engineRef.current) return null;

    const { Bodies, Composite } = Matter;
    const ball = Bodies.circle(-100, -100, evasionRadius, {
      mass: 9999,
      restitution: 0.8,
    });
    Composite.add(engineRef.current.world, ball);
    return ball;
  }, [evasionRadius]);

  const init = useCallback(() => {
    if (!containerRef.current) return;

    const { Bodies, Composite, Constraint } = Matter;

    updateContainerBounding();

    const charBodyList: (Matter.Body | Matter.Constraint)[] = [];

    chars.forEach(({ id }) => {
      const targetRef = charRefsMap.current.get(id);
      if (!targetRef) return;

      const elRect = targetRef.getBoundingClientRect();

      const x = elRect.x - containerBounding.x + elRect.width / 2;
      const y = elRect.y - containerBounding.y + elRect.height / 2;

      charBodyInitMapRef.current.set(id, { x, y });

      const radius = Math.min(elRect.width, elRect.height) / 2;
      const body = Bodies.circle(x, y, radius, {
        label: id,
        friction: 0,
      });

      const constraint = Constraint.create({
        bodyA: body,
        pointB: { x, y },
        stiffness,
        damping,
      });

      charBodyList.push(body, constraint);
    });

    if (engineRef.current) {
      Composite.add(engineRef.current.world, charBodyList);
    }

    cursorBodyRef.current = createCursorBody();

    if (debug && canvasRef.current && engineRef.current) {
      const { Render } = Matter;
      const render = Render.create({
        canvas: canvasRef.current,
        engine: engineRef.current,
        bounds: {
          min: { x: 0, y: 0 },
          max: { x: containerBounding.width, y: containerBounding.height },
        },
        options: {
          width: containerBounding.width,
          height: containerBounding.height,
          background: 'transparent',
          wireframeBackground: 'transparent',
        },
      });
      Render.run(render);
    }
  }, [chars, containerBounding, stiffness, damping, createCursorBody, debug, updateContainerBounding]);

  const start = useCallback(() => {
    if (!engineRef.current || !runnerRef.current) return;
    const { Runner } = Matter;
    Runner.run(runnerRef.current, engineRef.current);
  }, []);

  const clear = useCallback(() => {
    if (!engineRef.current || !runnerRef.current) return;
    const { Composite, Engine, Runner } = Matter;
    Composite.clear(engineRef.current.world, true);
    Engine.clear(engineRef.current);
    Runner.stop(runnerRef.current);
  }, []);

  const pauseUpdate = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  const resumeUpdate = useCallback(() => {
    if (updateIntervalRef.current) return;

    updateIntervalRef.current = setInterval(() => {
      if (!engineRef.current) return;

      const { Composite } = Matter;
      const bodyList = Composite.allBodies(engineRef.current.world);

      // Update cursor position
      if (cursorBodyRef.current) {
        cursorBodyRef.current.position = {
          x: mousePos.x - containerBounding.x - scrollPos.x,
          y: mousePos.y - containerBounding.y - scrollPos.y,
        };
      }

      // Straighten rotation
      bodyList.forEach((body) => {
        const rotate = body.angle * 180 / Math.PI;
        if (isSmallEnough(rotate)) return;
        body.angle -= body.angle * (stiffness * 2);
      });

      // Save body state
      let hasUpdate = false;
      const newStyleMap = new Map(charStyleMap);

      chars.forEach((char) => {
        const body = bodyList.find(({ label }) => label === char.id);
        const initValue = charBodyInitMapRef.current.get(char.id);
        if (body && initValue) {
          const offsetX = body.position.x - initValue.x;
          const offsetY = body.position.y - initValue.y;
          const rotate = body.angle * 180 / Math.PI;

          if (isSmallEnough(offsetX) && isSmallEnough(offsetY) && isSmallEnough(rotate)) {
            newStyleMap.delete(char.id);
            return;
          }

          newStyleMap.set(char.id, {
            transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)`,
          });

          hasUpdate = true;
        }
      });

      if (hasUpdate) {
        setCharStyleMap(newStyleMap);
      }
    }, 15);
  }, [mousePos, scrollPos, containerBounding, chars, stiffness, charStyleMap]);

  // Initialize Matter.js engine
  useEffect(() => {
    const { Engine, Runner } = Matter;
    engineRef.current = Engine.create({ gravity: { scale: 0 } });
    runnerRef.current = Runner.create();

    return () => {
      clear();
    };
  }, [clear]);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrollPos({ x: window.scrollX, y: window.scrollY });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update container bounding on resize
  useEffect(() => {
    updateContainerBounding();
    window.addEventListener('resize', updateContainerBounding);
    return () => window.removeEventListener('resize', updateContainerBounding);
  }, [updateContainerBounding]);

  // Initialize physics and start
  useEffect(() => {
    if (chars.length === 0) return;

    const timer = setTimeout(() => {
      init();
      start();
      resumeUpdate();
    }, 100);

    return () => {
      clearTimeout(timer);
      pauseUpdate();
    };
  }, [chars, init, start, resumeUpdate, pauseUpdate]);

  // Watch for text/splitter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      pauseUpdate();
      clear();
      init();
      start();
      resumeUpdate();
    }, 200);

    return () => clearTimeout(timer);
  }, [text, splitter, pauseUpdate, clear, init, start, resumeUpdate]);

  // Watch for stiffness/damping changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!engineRef.current) return;

      pauseUpdate();

      const { Composite } = Matter;
      Composite.allConstraints(engineRef.current.world).forEach((constraint) => {
        constraint.stiffness = stiffness;
        constraint.damping = damping;
      });

      resumeUpdate();
    }, 200);

    return () => clearTimeout(timer);
  }, [stiffness, damping, pauseUpdate, resumeUpdate]);

  // Watch for evasionRadius changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!engineRef.current) return;

      pauseUpdate();

      const { Composite } = Matter;
      if (cursorBodyRef.current) {
        Composite.remove(engineRef.current.world, cursorBodyRef.current);
      }

      cursorBodyRef.current = createCursorBody();

      resumeUpdate();
    }, 200);

    return () => clearTimeout(timer);
  }, [evasionRadius, pauseUpdate, createCursorBody, resumeUpdate]);

  return (
    <Tag
      ref={containerRef}
      aria-label={ariaLabel}
      className="relative whitespace-pre-wrap"
    >
      {chars.map(({ id, char }) => (
        <span
          key={id}
          id={id}
          ref={(el) => {
            if (el) charRefsMap.current.set(id, el);
          }}
          style={charStyleMap.get(id)}
          aria-hidden
          className="inline-block"
        >
          {char}
        </span>
      ))}

      {debug && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 bg-transparent"
        />
      )}
    </Tag>
  );
}

// Demo page
export default function TextHateMousePage() {
  const [evasionRadius, setEvasionRadius] = useState(40);
  const [stiffness, setStiffness] = useState(0.01);
  const [damping, setDamping] = useState(0.05);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-8">
      <Link href="/" className="fixed top-8 left-8 text-blue-600 hover:text-blue-800 underline z-50">
        ← Back to Home
      </Link>

      <div className="max-w-4xl mx-auto pt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Text Hate Mouse</h1>
          <p className="text-gray-600">Move your cursor near the text and watch it run away!</p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evasion Radius: {evasionRadius}px
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={evasionRadius}
                onChange={(e) => setEvasionRadius(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stiffness: {stiffness.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={stiffness}
                onChange={(e) => setStiffness(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Damping: {damping.toFixed(3)}
              </label>
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.001"
                value={damping}
                onChange={(e) => setDamping(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Example 1: Basic Text</h2>
            <TextHateMouse
              text="Try to touch me with your cursor!"
              tag="h3"
              evasionRadius={evasionRadius}
              stiffness={stiffness}
              damping={damping}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Example 2: Larger Text</h2>
            <TextHateMouse
              text="The quick brown fox jumps over the lazy dog. 🦊"
              tag="p"
              evasionRadius={evasionRadius}
              stiffness={stiffness}
              damping={damping}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Example 3: Multiline</h2>
            <TextHateMouse
              text={`This is a longer paragraph of text.
Each character will run away from your cursor!
Move slowly and watch the physics in action.`}
              tag="p"
              evasionRadius={evasionRadius}
              stiffness={stiffness}
              damping={damping}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
