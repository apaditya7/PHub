'use client';

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { AlwaysStencilFunc, DoubleSide, EquirectangularReflectionMapping, SRGBColorSpace, ReplaceStencilOp, Scene, TextureLoader, WebGLRenderTarget } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FillQuad } from "./FillQuad";

export function Portal() {
  const [target] = useState(() => new WebGLRenderTarget(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
    typeof window !== 'undefined' ? window.innerHeight : 768,
    { stencilBuffer: false }
  ));

  const [scene] = useState(() => {
    const s = new Scene();
    new TextureLoader().load(
      "/games/void-travel/textures/galaxy.jpg",
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.mapping = EquirectangularReflectionMapping;
        s.background = texture;
      }
    );
    return s;
  });

  useEffect(() => {
    const handleResize = () => {
      target.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [target]);

  // thanks to https://sketchfab.com/3d-models/portal-frame-da34b37a224e4e49b307c0b17a50af2c
  const model = useLoader(
    GLTFLoader,
    "/games/void-travel/models/portal.glb"
  );
  const mask = useLoader(
    GLTFLoader,
    "/games/void-travel/models/portal_mask.glb"
  );

  useFrame((state) => {
    state.gl.setRenderTarget(target);
    state.gl.render(scene, state.camera);
    state.gl.setRenderTarget(null);
  });

  useEffect(() => {
    if (!model) return;

    let mesh = model.scene.children[0] as any;
    mesh.material.envMapIntensity = 3.5;

    let maskMesh = mask.scene.children[0] as any;
    maskMesh.material.transparent = false;
    maskMesh.material.side = DoubleSide;
    maskMesh.material.stencilFunc = AlwaysStencilFunc;
    maskMesh.material.stencilWrite = true;
    maskMesh.material.stencilRef = 1;
    maskMesh.material.stencilZPass = ReplaceStencilOp;
  }, [model, mask]);

  return (
    <>
      <primitive object={model.scene} />
      <primitive object={mask.scene} />
      <FillQuad map={target.texture} maskId={1} />
    </>
  );
}
