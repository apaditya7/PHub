'use client';

import { Physics } from "@react-three/cannon";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./components/Scene";

export default function DriftCityPage() {
  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas dpr={[1, 1.5]} gl={{ powerPreference: "high-performance" }}>
        <Physics
          broadphase="SAP"
          gravity={[0, -2.6, 0]}
        >
          <Scene />
        </Physics>
      </Canvas>

      <div className="absolute top-4 left-4 bg-black/50 text-white p-4 rounded-lg backdrop-blur-sm pointer-events-none select-none font-mono">
        <h1 className="text-xl font-bold mb-2 text-cyan-400">DRIFT CITY</h1>
        <div className="space-y-1 text-sm opacity-80">
          <p><span className="font-bold text-yellow-400">W A S D</span> to drive</p>
          <p><span className="font-bold text-yellow-400">K</span> to swap camera</p>
          <p><span className="font-bold text-yellow-400">R</span> to reset car</p>
          <p><span className="font-bold text-yellow-400">ARROWS</span> for flips</p>
        </div>
      </div>
    </div>
  );
}
