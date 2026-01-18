'use client';

import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function Rocks() {
  const gltf = useLoader(GLTFLoader, "/games/void-travel/models/rocks.glb");

  return (
    <primitive object={gltf.scene} />
  )
}
