'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

export default function Scene() {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate the entire group based on scroll
      const r1 = scroll.range(0, 1 / 4);
      const r2 = scroll.range(1 / 4, 1 / 4);
      const r3 = scroll.range(2 / 4, 1 / 4);
      
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        (-scroll.offset * Math.PI * 2),
        4,
        delta
      );
    }
  });

  return (
    <group ref={groupRef}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[2, 0, 0]} scale={0.5}>
          <torusKnotGeometry args={[1, 0.3, 128, 16]} />
          <meshStandardMaterial color="#4f46e5" roughness={0.1} metalness={0.8} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh position={[-2, -1, -1]} scale={0.3}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#ec4899" roughness={0.1} metalness={0.8} />
        </mesh>
      </Float>

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, -10, -10]} intensity={0.5} />
    </group>
  );
}
