import "./index.css";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { Physics } from "@react-three/cannon";
import { Legend } from "./Legend";

createRoot(document.getElementById("root")).render(
  <>
    <Canvas shadows>
      <Physics broadphase="SAP" gravity={[0, -2.6, 0]}>
        <Scene />
      </Physics>
    </Canvas>
    <Legend />
  </>
);
