'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Stars, Float, Sparkles, Cloud, MeshTransmissionMaterial, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

export default function Scene() {
  const scroll = useScroll();
  const { width, height } = useThree((state) => state.viewport);

  // Refs for each element group
  const spaceRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Group>(null);
  const fireRef = useRef<THREE.Group>(null);
  const airRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const r1 = scroll.range(0 / 5, 1 / 5); // Space
    const r2 = scroll.range(1 / 5, 1 / 5); // Earth
    const r3 = scroll.range(2 / 5, 1 / 5); // Water
    const r4 = scroll.range(3 / 5, 1 / 5); // Fire
    const r5 = scroll.range(4 / 5, 1 / 5); // Air

    // Space Animation
    if (spaceRef.current) {
      spaceRef.current.position.y = (1 - r1) * height * 2; // Move up as we scroll
      spaceRef.current.rotation.y += delta * 0.05;
    }

    // Earth Animation
    if (earthRef.current) {
      // Moves from bottom to center, then up
      earthRef.current.position.y = (r2 - 0.5) * height * 0.5 + (scroll.visible(1 / 5, 1 / 5) ? 0 : -height * 2);
      // Fine-tune visibility logic: it should be visible around scroll offset 1/5
      // A simpler approach for linear scrolling:
      const offset = scroll.offset;
      // Space: 0 - 0.2
      // Earth: 0.2 - 0.4
      // Water: 0.4 - 0.6
      // Fire: 0.6 - 0.8
      // Air: 0.8 - 1.0

      // We'll manually position based on total scroll offset for smoother transitions

      // Space (Always visible initially, fades out/moves up)
      spaceRef.current!.position.y = -offset * height * 2;

      // Earth (Enters at 0.1, centers at 0.2, exits at 0.3)
      earthRef.current!.position.y = (offset - 0.2) * -height * 2.5;
      earthRef.current!.rotation.y += delta * 0.1;

      // Water (Enters at 0.3, centers at 0.4, exits at 0.5)
      waterRef.current!.position.y = (offset - 0.4) * -height * 2.5;
      waterRef.current!.rotation.x += delta * 0.1;
      waterRef.current!.rotation.y += delta * 0.15;

      // Fire (Enters at 0.5, centers at 0.6, exits at 0.7)
      fireRef.current!.position.y = (offset - 0.6) * -height * 2.5;
      fireRef.current!.rotation.z += delta * 0.2;

      // Air (Enters at 0.7, centers at 0.8, stays)
      airRef.current!.position.y = (offset - 0.8) * -height * 2.5;
    }
  });

  return (
    <>
      {/* SPACE - The Void */}
      <group ref={spaceRef}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
          <mesh position={[2, 1, -2]}>
            <icosahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#4338ca" wireframe />
          </mesh>
        </Float>
        <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5}>
          <mesh position={[-2, -1, -3]}>
            <octahedronGeometry args={[0.6, 0]} />
            <meshStandardMaterial color="#6b21a8" wireframe />
          </mesh>
        </Float>
      </group>

      {/* EARTH - Grounded Structure */}
      <group ref={earthRef} position={[0, -height, 0]}>
        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh scale={1.5}>
            <icosahedronGeometry args={[1, 1]} />
            {/* Low poly look with flat shading */}
            <meshStandardMaterial
              color="#064e3b"
              flatShading
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>
          {/* Floating rocks */}
          <mesh position={[1.5, 0.5, 0.5]} scale={0.3}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#3f6212" flatShading />
          </mesh>
          <mesh position={[-1.2, -0.8, -0.5]} scale={0.2}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#14532d" flatShading />
          </mesh>
        </Float>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#a3e635" />
      </group>

      {/* WATER - Fluidity */}
      <group ref={waterRef} position={[0, -height * 2, 0]}>
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
          <mesh scale={1.6}>
            <sphereGeometry args={[1, 64, 64]} />
            {/* Distorted water-like material */}
            <MeshDistortMaterial
              color="#0ea5e9"
              envMapIntensity={1}
              clearcoat={1}
              clearcoatRoughness={0}
              metalness={0.1}
              distort={0.4}
              speed={2}
            />
          </mesh>
          {/* Bubbles */}
          <Sparkles count={50} scale={4} size={4} speed={0.4} opacity={0.5} color="#bae6fd" />
        </Float>
        <pointLight position={[-5, 5, 5]} intensity={2} color="#38bdf8" />
      </group>

      {/* FIRE - Passion */}
      <group ref={fireRef} position={[0, -height * 3, 0]}>
        <Float speed={3} rotationIntensity={2} floatIntensity={1}>
          <mesh scale={1.6}>
            <octahedronGeometry args={[1, 4]} />
            {/* Wobbling fire-like material */}
            <MeshWobbleMaterial
              factor={0.6}
              speed={2}
              color="#ef4444"
              emissive="#b91c1c"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          <Sparkles count={80} scale={5} size={6} speed={1} opacity={0.8} color="#fca5a5" noise={1} />
        </Float>
        <pointLight position={[0, 0, 0]} intensity={3} color="#f87171" distance={5} />
      </group>

      {/* AIR - Freedom */}
      <group ref={airRef} position={[0, -height * 4, 0]}>
        <Float speed={1} rotationIntensity={0.2} floatIntensity={3}>
          <Cloud opacity={0.5} speed={0.4} bounds={[10, 2, 2]} />
          <Cloud opacity={0.3} speed={0.2} bounds={[5, 2, 2]} position={[0, 2, -2]} color="#e0f2fe" />

          {/* Abstract floating geometric forms representing clarity */}
          <mesh position={[0, 0, 0]} scale={1.2}>
            <torusGeometry args={[1, 0.02, 16, 100]} />
            <MeshTransmissionMaterial
              backside
              backsideThickness={5}
              thickness={2}
              chromaticAberration={0.05}
              anisotropy={0.1}
              distortion={0}
              distortionScale={0}
              temporalDistortion={0}
              ior={1.5}
              color="#ffffff"
              background={new THREE.Color('#ffffff')}
            />
          </mesh>
        </Float>
        <ambientLight intensity={1} />
        <pointLight position={[0, 10, 0]} intensity={2} color="#ffffff" />
      </group>
    </>
  );
}
