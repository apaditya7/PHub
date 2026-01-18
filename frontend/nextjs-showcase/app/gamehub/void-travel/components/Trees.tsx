'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function Trees() {
  const gltf = useLoader(GLTFLoader, "/games/void-travel/models/trees.glb");

  useEffect(() => {
    if(!gltf) return;

    let mesh = gltf.scene.children[0] as any;
    mesh.material.envMapIntensity = 2.5;
  }, [gltf]);

  return (
    <primitive object={gltf.scene} />
  )
}
