"use strict";
"client";

import React, { useRef, Suspense, useEffect, useState, memo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Stars, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- SHADER DEFINITION (Copied from Scene3D for consistency) ---
const HeroAuroraMaterial = shaderMaterial(
    { uTime: 0, uColor1: new THREE.Color('#FF0000'), uColor2: new THREE.Color('#FFFFFF'), uColor3: new THREE.Color('#8B0000'), uOpacity: 0.5 },
    // Vertex
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    // Fragment
    `
    uniform float uTime;
    uniform vec3 uColor1; // Red
    uniform vec3 uColor2; // White
    uniform vec3 uColor3; // Dark Red
    uniform float uOpacity;
    varying vec2 vUv;

    // Simple noise function
    float random (in vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // Value noise
    float noise (in vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.5; // Slower for background
      
      // Distort UVs to create "curtains"
      float n = noise(vec2(uv.x * 5.0 + t, uv.y * 2.0)); 
      
      // Calculate vertical bands
      float aurora = sin(uv.y * 2.0 + n * 3.0);
      aurora += sin(uv.x * 3.0 + t * 0.3) * 0.5;
      
      // Sharpness
      aurora = smoothstep(-0.2, 1.0, aurora);
      
      // Top/Bottom fade
      float fade = smoothstep(0.0, 0.2, uv.y) * (1.0 - smoothstep(0.8, 1.0, uv.y));
      
      // Dynamic Color Mixing
      float mixVal = sin(uv.x * 2.0 + t) * 0.5 + 0.5;
      vec3 c1 = mix(uColor1, uColor2, mixVal);
      vec3 finalColor = mix(c1, uColor3, sin(uv.y * 4.0 + t) * 0.5 + 0.5);
      
      gl_FragColor = vec4(finalColor, uOpacity * aurora * fade * 0.5); 
    }
  `
);

extend({ HeroAuroraMaterial });

const AuroraPlane = () => {
    const materialRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uTime = state.clock.elapsedTime;
        }
    });

    return (
        // Positioned slightly behind stars, scaled to cover screen
        <mesh position={[0, 0, -10]} scale={[40, 20, 1]}>
            <planeGeometry args={[1, 1, 32, 32]} />
            {/* @ts-ignore */}
            <heroAuroraMaterial ref={materialRef} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
    );
};

const CosmicScene = () => {
    const starsRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (starsRef.current) {
            starsRef.current.rotation.y += delta * 0.02; // Slow rotation
            starsRef.current.rotation.x += delta * 0.01;
        }
    });

    return (
        <group>
            <group ref={starsRef}>
                <Stars radius={80} depth={40} count={500} factor={6} saturation={0} fade speed={1} />
            </group>
            <AuroraPlane />
        </group>
    );
};

interface CosmicBackgroundProps {
    children?: React.ReactNode;
}

function CosmicBackground({ children }: CosmicBackgroundProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return <div className="min-h-screen bg-black">{children}</div>;

    return (
        <>
            <div className="fixed inset-0 z-0 bg-black w-full h-full pointer-events-none">
                <Suspense fallback={<div className="w-full h-full bg-black" />}>
                    <Canvas
                        camera={{ position: [0, 0, 5], fov: 60 }}
                        gl={{
                            antialias: false,
                            alpha: true,
                            powerPreference: 'low-power'
                        }}
                        dpr={[1, 2]}
                    >
                        <color attach="background" args={['#000000']} />
                        <CosmicScene />
                    </Canvas>
                </Suspense>
            </div>
            <div className="relative z-10 w-full min-h-screen">
                {children}
            </div>
        </>
    );
}

export default memo(CosmicBackground);
