'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Camera,
  Color3,
  Color4,
  Effect,
  Engine,
  Mesh,
  MeshBuilder,
  PostProcess,
  Scene,
  ShadowGenerator,
  SpotLight,
  StandardMaterial,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';

interface ElementBounding {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

interface RealDarkStore {
  staticMap: Record<string, ElementBounding>;
  put: (id: string, bounding: ElementBounding) => void;
  remove: (id: string) => void;
}

// Store for managing element boundings (similar to utilRealDarkStore)
const createStore = (): RealDarkStore => ({
  staticMap: {},
  put(id: string, bounding: ElementBounding) {
    this.staticMap[id] = {
      top: bounding.top,
      left: bounding.left,
      width: bounding.width,
      height: bounding.height,
      radius: bounding.radius,
    };
  },
  remove(id: string) {
    delete this.staticMap[id];
  },
});

const store = createStore();

export default function RealDark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [opacity] = useState(0.9);

  // Props (matching Vue component)
  const disabled = !enabled;
  const ease = 0.05;
  const offsetStrength = 1.2;
  const size = 300;
  const lightColor = '#FEE470';

  // Refs for Babylon.js objects
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<UniversalCamera | null>(null);
  const spotlightRef = useRef<SpotLight | null>(null);
  const wallRef = useRef<Mesh | null>(null);
  const shadowGeneratorRef = useRef<ShadowGenerator | null>(null);
  const boxMapRef = useRef<Map<string, Mesh>>(new Map());

  // Mouse tracking
  const mouseRef = useRef({ x: 0, y: 0, elementX: 0, elementY: 0, isOutside: false });
  const pMouseRef = useRef({ x: 0, y: 0 });
  const pressedRef = useRef(false);
  const pressedAnchorRef = useRef(new Vector3());

  // Animation lerp values
  const posLerp = 0.15;
  const dirLerp = 0.25;

  // Window size tracking
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        elementX: e.clientX - rect.left,
        elementY: e.clientY - rect.top,
        isOutside: false,
      };
    };

    const handleMouseDown = () => {
      pressedRef.current = true;
      if (spotlightRef.current) {
        pressedAnchorRef.current.copyFrom(spotlightRef.current.position);
      }
    };

    const handleMouseUp = () => {
      pressedRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Helper function to build rounded rect shape
  const buildRoundedRectShape = useCallback((
    width: number,
    height: number,
    radius: number,
    segments = 12
  ) => {
    const hw = width / 2;
    const hh = height / 2;
    const r = Math.max(0, Math.min(radius, hw, hh));

    if (r === 0) {
      return [
        new Vector3(hw, hh, 0),
        new Vector3(-hw, hh, 0),
        new Vector3(-hw, -hh, 0),
        new Vector3(hw, -hh, 0),
      ];
    }

    const pts: Vector3[] = [];

    const addArc = (cx: number, cy: number, a0: number, a1: number, includeEnd = true) => {
      const endI = includeEnd ? segments : (segments - 1);
      for (let i = 1; i <= endI; i++) {
        const t = i / segments;
        const a = a0 + (a1 - a0) * t;
        pts.push(new Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
      }
    };

    pts.push(new Vector3(hw - r, hh, 0));
    pts.push(new Vector3(-hw + r, hh, 0));
    addArc(-hw + r, hh - r, Math.PI / 2, Math.PI);
    pts.push(new Vector3(-hw, -hh + r, 0));
    addArc(-hw + r, -hh + r, Math.PI, (Math.PI * 3) / 2);
    pts.push(new Vector3(hw - r, -hh, 0));
    addArc(hw - r, -hh + r, (Math.PI * 3) / 2, Math.PI * 2);
    pts.push(new Vector3(hw, hh - r, 0));
    addArc(hw - r, hh - r, 0, Math.PI / 2, false);

    return pts;
  }, []);

  // Initialize Babylon.js scene
  useEffect(() => {
    if (!canvasRef.current || windowSize.width === 0) return;

    const canvas = canvasRef.current;

    // Create engine
    const engine = new Engine(canvas, false, {
      premultipliedAlpha: false,
    });
    engineRef.current = engine;

    // Create scene
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    scene.lights = [];
    sceneRef.current = scene;

    // Create camera
    const camera = new UniversalCamera(
      'camera',
      new Vector3(0, 0, -Math.max(windowSize.width, windowSize.height)),
      scene
    );
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    cameraRef.current = camera;

    // Custom shader for white to alpha conversion
    Effect.ShadersStore.whiteToAlphaFragmentShader = `
      varying vec2 vUV;
      uniform sampler2D textureSampler;

      void main(void) {
        vec4 color = texture2D(textureSampler, vUV);

        // Convert to grayscale and set alpha
        float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float alpha = 1.0 - lum;
        if (alpha < 0.05) {
          alpha = 0.0;
        }

        gl_FragColor = vec4(color.rgb, alpha);
      }
    `;

    const whiteToAlphaPipeline = new PostProcess(
      'whiteToAlpha',
      'whiteToAlpha',
      [],
      [],
      1.0,
      camera
    );

    // Create wall (receiving plane)
    const wall = MeshBuilder.CreatePlane('wall', {
      width: windowSize.width,
      height: windowSize.height,
    }, scene);
    wall.receiveShadows = true;
    wall.position = new Vector3(0, 0, 0);
    wall.rotation = new Vector3(0, 0, 0);

    const material = new StandardMaterial('wallMat', scene);
    material.specularColor = new Color3(0, 0, 0);
    wall.material = material;
    wallRef.current = wall;

    // Create spotlight
    const spotlight = new SpotLight(
      'spot',
      new Vector3(0, 0, -size),
      new Vector3(0, 0, 1),
      Math.PI / 2,
      100,
      scene
    );
    spotlight.intensity = 10;
    spotlight.diffuse = Color3.FromHexString(lightColor);
    spotlight.specular = Color3.FromHexString(lightColor);
    spotlightRef.current = spotlight;

    // Create shadow generator
    const shadowGenerator = new ShadowGenerator(2048, spotlight);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadowGenerator.setDarkness(0.1);
    shadowGeneratorRef.current = shadowGenerator;

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [windowSize.width, windowSize.height, size, lightColor, buildRoundedRectShape]);

  // Handle pointer movement (animation loop)
  useEffect(() => {
    let animationFrameId: number;

    const handlePointerMove = () => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const spotlight = spotlightRef.current;
      const wall = wallRef.current;

      if (!scene || !spotlight || !camera || !canvasRef.current || disabled) {
        animationFrameId = requestAnimationFrame(handlePointerMove);
        return;
      }

      const x = mouseRef.current.elementX;
      const y = mouseRef.current.elementY;

      if (!x || !y) {
        animationFrameId = requestAnimationFrame(handlePointerMove);
        return;
      }

      pMouseRef.current.x += (x - pMouseRef.current.x) * ease;
      pMouseRef.current.y += (y - pMouseRef.current.y) * ease;

      // Pick at mouse position
      const pickResult = scene.pick(mouseRef.current.elementX, mouseRef.current.elementY, (mesh) => mesh === wall);

      if (pickResult?.hit && pickResult.pickedPoint) {
        const hitPoint = pickResult.pickedPoint;

        const basePos = hitPoint.add(new Vector3(0, 0, -size));

        const dx = pMouseRef.current.x - x;
        const dy = pMouseRef.current.y - y;

        const followPos = basePos.add(new Vector3(
          dx * offsetStrength,
          -dy * offsetStrength,
          0
        ));

        // Direction from light to hit point
        const dirFromFollow = hitPoint.subtract(followPos).normalize();

        // Retreat direction
        const retreatDir = dirFromFollow.scale(10000);
        retreatDir.z = 0;

        const targetPos = pressedRef.current
          ? pressedAnchorRef.current.subtract(hitPoint)
          : followPos;

        const targetDir = hitPoint.subtract(targetPos).normalize();

        Vector3.LerpToRef(spotlight.position, targetPos, posLerp, spotlight.position);
        Vector3.LerpToRef(spotlight.direction, targetDir, dirLerp, spotlight.direction);
      }

      animationFrameId = requestAnimationFrame(handlePointerMove);
    };

    animationFrameId = requestAnimationFrame(handlePointerMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [disabled, ease, offsetStrength, size]);

  // Helpers to manage 3D boxes for tracked elements
  const upsertBox = useCallback((id: string, bounding: ElementBounding) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existing = boxMapRef.current.get(id);
    const pos = new Vector3(
      bounding.left - windowSize.width / 2 + bounding.width / 2,
      -bounding.top + windowSize.height / 2 - bounding.height / 2,
      0,
    );

    if (existing) {
      existing.position.copyFrom(pos);
      return;
    }

    const material = new StandardMaterial('boxMat', scene);

    const shape = buildRoundedRectShape(
      bounding.width,
      bounding.height,
      Math.max(0, Math.min(bounding.radius, bounding.width / 2, bounding.height / 2)),
      6,
    );

    const thickness = 50;
    const path = [
      new Vector3(0, 0, -thickness / 2),
      new Vector3(0, 0, thickness / 2),
    ];

    const mesh = MeshBuilder.ExtrudeShape(`box-${id}`,
      { shape, path, cap: Mesh.CAP_ALL, closeShape: true },
      scene,
    );
    mesh.position.copyFrom(pos);
    mesh.material = material;
    shadowGeneratorRef.current?.addShadowCaster(mesh);
    boxMapRef.current.set(id, mesh);
  }, [buildRoundedRectShape, windowSize.width, windowSize.height]);

  const removeBox = useCallback((id: string) => {
    const mesh = boxMapRef.current.get(id);
    if (mesh) {
      mesh.dispose();
      boxMapRef.current.delete(id);
    }
  }, []);

  // Track DOM elements (similar to v-util-real-dark directive)
  useEffect(() => {
    const trackedElements = new Map<HTMLElement, string>();
    let idCounter = 0;

    const trackElement = (element: HTMLElement) => {
      const id = `element-${idCounter++}`;
      trackedElements.set(element, id);
      element.setAttribute('data-util-real-dark-id', id);

      const updateBounding = () => {
        const rect = element.getBoundingClientRect();
        const computedStyle = getComputedStyle(element);
        const radiusStr = computedStyle.borderRadius;
        const radius = parseFloat(radiusStr.replace('px', '')) || 0;

        const bounding = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          radius,
        };
        store.put(id, bounding);
        upsertBox(id, bounding);
      };

      updateBounding();

      const resizeObserver = new ResizeObserver(updateBounding);
      resizeObserver.observe(element);

      return () => {
        resizeObserver.disconnect();
        store.remove(id);
        removeBox(id);
        trackedElements.delete(element);
      };
    };

    // Track all elements with data-real-dark attribute
    const elements = document.querySelectorAll('[data-real-dark]');
    const cleanupFunctions: (() => void)[] = [];

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        cleanupFunctions.push(trackElement(element));
      }
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);


  return (
    <div className="min-h-screen bg-white relative">
      <Link href="/" className="absolute top-8 left-8 text-gray-800 hover:text-gray-600 underline z-50">
        ← Back to Home
      </Link>

      <div className="relative z-10 p-16">
        <div className="max-w-4xl mx-auto">
          <div className="w-full border border-gray-200 rounded-xl p-4">
            <div
              data-real-dark
              className="w-full border border-gray-200 rounded-xl"
            >
              <label className="p-4 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-lg">Enable Real Dark Mode</span>
              </label>
            </div>

            <div className="w-full py-4">
              <div className="mb-3 text-2xl font-bold">
                What is Dark Mode?
              </div>

              <div className="text-base leading-relaxed space-y-3">
                <p>
                  Dark Mode is a display mode that darkens the interface background and brightens the text.
                </p>

                <p>
                  The main purpose is to reduce the bright brightness of the screen in low light environments,
                  reduce visual fatigue, and save a little electricity on some devices.
                </p>

                <p>
                  Another benefit is that when you can't sleep at night and want to sing your mood in the dark,
                  avoid the phone turning into a flash grenade when you slide it open.
                </p>

                <p>
                  After enabling the dark mode, you will find:
                </p>

                <ul className="list-disc list-inside space-y-1">
                  <li>Look more professional, but still can't leave early</li>
                  <li>Less eye strain when scrolling social media, but still get blinded by the flash</li>
                </ul>

                <p>
                  Above, now you know what black is (⌐■_■)✧
                </p>
              </div>

              {/* tags */}
              <div className="mt-4 flex gap-2">
                <span
                  data-real-dark
                  className="border border-gray-200 rounded-full p-2 px-4 text-sm text-gray-500"
                >
                  #Canvas
                </span>
                <span
                  data-real-dark
                  className="border border-gray-200 rounded-full p-2 px-4 text-sm text-gray-500"
                >
                  #Shader
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Dark Canvas Overlay */}
      <div className="pointer-events-none fixed left-0 top-0 z-[100] h-full w-full">
        <canvas
          ref={canvasRef}
          className="h-full w-full duration-500"
          style={{ opacity: disabled ? 0 : opacity }}
        />
      </div>
    </div>
  );
}
