'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect } from 'react';
import { Color, DoubleSide } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function Grass() {
  // thanks to https://opengameart.org/content/64-billboard-grass-texture-and-mesh !
  const gltf = useLoader(GLTFLoader, "/games/void-travel/models/grass.glb");

  useEffect(() => {
    if(!gltf) return;

    const mesh = gltf.scene.children[0] as any;
    mesh.material.alphaToCoverage = true;
    mesh.material.transparent = true;
    mesh.material.map = mesh.material.emissiveMap;
    mesh.material.emissive = new Color(0.5, 0.5, 0.5);
    mesh.material.side = DoubleSide;

  }, [gltf]);

  return (
    <primitive object={gltf.scene} />
  )
}
