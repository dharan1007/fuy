'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Stars, Float, Sparkles, Cloud } from '@react-three/drei';
import * as THREE from 'three';

export default function Scene() {
  const scroll = useScroll();
  const { height } = useThree((state) => state.viewport);

  // Refs for each element group
  const spaceRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Group>(null);
  const fireRef = useRef<THREE.Group>(null);
  const airRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const offset = scroll.offset;

    // Space (Always visible initially, fades out/moves up)
    if (spaceRef.current) {
      spaceRef.current.position.y = -offset * height * 2;
      spaceRef.current.rotation.y += delta * 0.02;
    }

    // Earth (Enters at 0.1, centers at 0.2, exits at 0.3)
    if (earthRef.current) {
      earthRef.current.position.y = (offset - 0.2) * -height * 2.5;
      earthRef.current.rotation.y += delta * 0.05;
    }

    // Water (Enters at 0.3, centers at 0.4, exits at 0.5)
    if (waterRef.current) {
      waterRef.current.position.y = (offset - 0.4) * -height * 2.5;
      waterRef.current.rotation.x += delta * 0.05;
    }

    // Fire (Enters at 0.5, centers at 0.6, exits at 0.7)
    if (fireRef.current) {
      fireRef.current.position.y = (offset - 0.6) * -height * 2.5;
    }

    // Air (Enters at 0.7, centers at 0.8, stays)
    if (airRef.current) {
      airRef.current.position.y = (offset - 0.8) * -height * 2.5;
    }
  });

  return (
    <>
      {/* SPACE - The Void */}
      <group ref={spaceRef}>
        <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={200} scale={10} size={2} speed={0.2} opacity={0.5} color="#ffffff" />
      </group>

      {/* EARTH - Grounded Structure */}
      <group ref={earthRef} position={[0, -height, 0]}>
        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
          {/* Floating "Spores" or "Life Particles" */}
          <Sparkles
            count={300}
            scale={8}
            size={4}
            speed={0.4}
            opacity={0.8}
            color="#a3e635" // Lime green
            noise={0.5}
          />
          <Sparkles
            count={100}
            scale={6}
            size={6}
            speed={0.2}
            opacity={0.6}
            color="#15803d" // Dark green
            noise={0.2}
          />
        </Float>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#a3e635" />
      </group>

      {/* WATER - Fluidity */}
      <group ref={waterRef} position={[0, -height * 2, 0]}>
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
          {/* Rising Bubbles */}
          <Sparkles
            count={400}
            scale={7}
            size={5}
            speed={1.5} // Faster upward movement
            opacity={0.7}
            color="#38bdf8" // Light blue
            noise={0.1}
          />
          <Sparkles
            count={100}
            scale={5}
            size={8}
            speed={1}
            opacity={0.4}
            color="#0ea5e9" // Sky blue
          />
        </Float>
        <pointLight position={[-5, 5, 5]} intensity={2} color="#38bdf8" />
      </group>

      {/* FIRE - Passion */}
      <group ref={fireRef} position={[0, -height * 3, 0]}>
        <Float speed={3} rotationIntensity={2} floatIntensity={1}>
          {/* Rising Embers */}
          <Sparkles
            count={500}
            scale={6}
            size={6}
            speed={3} // Very fast upward movement
            opacity={0.9}
            color="#ef4444" // Red
            noise={1} // Chaotic movement
          />
          <Sparkles
            count={200}
            scale={5}
            size={4}
            speed={4}
            opacity={0.8}
            color="#f59e0b" // Amber/Orange
            noise={0.5}
          />
        </Float>
        <pointLight position={[0, 0, 0]} intensity={3} color="#f87171" distance={5} />
      </group>

      {/* AIR - Freedom */}
      <group ref={airRef} position={[0, -height * 4, 0]}>
        <Float speed={1} rotationIntensity={0.2} floatIntensity={3}>
          <Cloud opacity={0.4} speed={0.2} bounds={[10, 2, 2]} color="#f0f9ff" />
          <Cloud opacity={0.2} speed={0.1} bounds={[8, 2, 2]} position={[0, 2, -2]} color="#ffffff" />

          {/* Ethereal Dust */}
          <Sparkles
            count={150}
            scale={10}
            size={2}
            speed={0.5}
            opacity={0.3}
            color="#ffffff"
          />
        </Float>
        <ambientLight intensity={1} />
        <pointLight position={[0, 10, 0]} intensity={2} color="#ffffff" />
      </group>
    </>
  );
}
