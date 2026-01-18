'use client';

import { Canvas } from "@react-three/fiber";
import { SceneContainer } from "./components/SceneContainer";

export default function VoidTravelPage() {
  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <SceneContainer />
      </Canvas>

      <div className="absolute top-4 left-4 bg-black/50 text-white p-4 rounded-lg backdrop-blur-sm pointer-events-none select-none font-mono">
        <h1 className="text-xl font-bold mb-2 text-purple-400">VOID TRAVEL</h1>
        <div className="space-y-1 text-sm opacity-80">
          <p>Drag to rotate view</p>
          <p>Scroll to zoom</p>
          <p>Explore the floating islands</p>
        </div>
      </div>
    </div>
  );
}
