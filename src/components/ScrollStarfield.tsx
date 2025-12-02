'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, ScrollControls, Scroll, useScroll } from '@react-three/drei';
import * as THREE from 'three';

function StarfieldScene() {
    const starsRef = useRef<THREE.Group>(null);
    const scroll = useScroll();

    useFrame((state, delta) => {
        if (starsRef.current) {
            const offset = scroll?.offset ?? 0;

            if (scroll) {
                // Landing mode: Scroll-driven with more dynamic movement
                starsRef.current.rotation.x = offset * Math.PI * 0.6;
                starsRef.current.rotation.y = offset * Math.PI * 0.3;
                starsRef.current.position.z = offset * 25;
            } else {
                // Default mode: Auto-rotation
                starsRef.current.rotation.y += delta * 0.05;
                starsRef.current.rotation.x += delta * 0.02;
            }

            // Continuous rotation
            starsRef.current.rotation.z += delta * 0.03;
        }
    });

    return (
        <group ref={starsRef}>
            <Stars
                radius={100}
                depth={50}
                count={8000}
                factor={4}
                saturation={0}
                fade
                speed={1}
            />
        </group>
    );
}

interface ScrollStarfieldProps {
    children?: React.ReactNode;
    variant?: 'default' | 'landing';
}

export default function ScrollStarfield({ children, variant = 'default' }: ScrollStarfieldProps) {
    if (variant === 'landing') {
        return (
            <div className="w-full h-screen bg-black">
                <Suspense fallback={<div className="w-full h-full bg-black" />}>
                    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ powerPreference: "high-performance", failIfMajorPerformanceCaveat: true }}>
                        <color attach="background" args={['#000000']} />
                        <ScrollControls pages={5} damping={0.2}>
                            <Scroll>
                                <StarfieldScene />
                            </Scroll>
                            <Scroll html style={{ width: '100%' }}>
                                {children}
                            </Scroll>
                        </ScrollControls>
                    </Canvas>
                </Suspense>
            </div>
        );
    }

    // Default fixed background for Home, Login, Signup
    return (
        <>
            <div className="fixed inset-0 z-[-1] bg-black pointer-events-none">
                <Suspense fallback={<div className="w-full h-full bg-black" />}>
                    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ powerPreference: "high-performance", failIfMajorPerformanceCaveat: true }}>
                        <color attach="background" args={['#000000']} />
                        <StarfieldScene />
                    </Canvas>
                </Suspense>
            </div>
            {children}
        </>
    );
}
