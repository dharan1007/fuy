'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, ScrollControls, Scroll, useScroll } from '@react-three/drei';
import * as THREE from 'three';

function EnhancedStarfield() {
    const starsRef = useRef<THREE.Group>(null);
    const bigStarsRef = useRef<THREE.Points>(null);
    const scroll = useScroll();

    // Create bigger, brighter stars
    const bigStarsCount = 200;
    const bigStarsPositions = React.useMemo(() => {
        const positions = new Float32Array(bigStarsCount * 3);
        for (let i = 0; i < bigStarsCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        return positions;
    }, []);

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

        // Animate big stars with pulsing effect
        if (bigStarsRef.current) {
            const offset = scroll?.offset ?? 0;
            bigStarsRef.current.rotation.y += delta * 0.1;
            bigStarsRef.current.rotation.x += delta * 0.05;

            if (scroll) {
                bigStarsRef.current.position.z = offset * 15;
            }
        }
    });

    return (
        <group ref={starsRef}>
            {/* Regular stars */}
            <Stars
                radius={100}
                depth={50}
                count={8000}
                factor={4}
                saturation={0}
                fade
                speed={1}
            />

            {/* Bigger, brighter stars */}
            <points ref={bigStarsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={bigStarsCount}
                        args={[bigStarsPositions, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.8}
                    color="#ffffff"
                    transparent
                    opacity={0.9}
                    sizeAttenuation
                    blending={THREE.AdditiveBlending}
                />
            </points>
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
                                <EnhancedStarfield />
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
                        <EnhancedStarfield />
                    </Canvas>
                </Suspense>
            </div>
            {children}
        </>
    );
}
