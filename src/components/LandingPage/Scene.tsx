'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Stars } from '@react-three/drei';
import * as THREE from 'three';

export default function Scene() {
  const scroll = useScroll();
  const { height } = useThree((state) => state.viewport);
  const starsRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const offset = scroll.offset;

    // Subtle mouse interaction
    const mouseX = state.pointer.x;
    const mouseY = state.pointer.y;

    if (starsRef.current) {
      // Scroll effect: Move stars up as we scroll down
      starsRef.current.position.y = -offset * height * 0.5;

      // Continuous subtle rotation
      starsRef.current.rotation.y += delta * 0.02;
      starsRef.current.rotation.x += delta * 0.01;

      // Mouse parallax effect (very subtle)
      starsRef.current.rotation.x += mouseY * delta * 0.05;
      starsRef.current.rotation.y += mouseX * delta * 0.05;
    }
  });

  return (
    <group ref={starsRef}>
      <Stars
        radius={100}
        depth={50}
        count={1500}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
    </group>
  );
}
