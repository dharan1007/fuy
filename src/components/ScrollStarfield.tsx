'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

function StarfieldScene() {
    const starsRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    // Store initial camera position
    const initialY = useRef(0);

    useFrame((state) => {
        // Get scroll position
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;

        if (starsRef.current) {
            // Move stars based on scroll
            // We move the group up/down to simulate camera movement through the field
            // or rotate it for a different effect. Let's do rotation + slight movement

            // Rotate based on scroll "frame by frame" feel
            starsRef.current.rotation.x = scrollProgress * Math.PI * 0.5; // Rotate 90 degrees over full scroll
            starsRef.current.rotation.y = scrollProgress * Math.PI * 0.2;

            // Also move slightly in Z to give depth feeling
            starsRef.current.position.z = scrollProgress * 10;

            // Mouse parallax (subtle)
            const mouseX = state.pointer.x;
            const mouseY = state.pointer.y;

            starsRef.current.rotation.x += mouseY * 0.05;
            starsRef.current.rotation.y += mouseX * 0.05;
        }
    });

    return (
        <group ref={starsRef}>
            <Stars
                radius={100}
                depth={50}
                count={7000}
                factor={4}
                saturation={0}
                fade
                speed={1}
            />
        </group>
    );
}

export default function ScrollStarfield() {
    return (
        <div className="fixed inset-0 z-[-1] bg-black pointer-events-none">
            <Suspense fallback={<div className="w-full h-full bg-black" />}>
                <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                    <color attach="background" args={['#000000']} />
                    <StarfieldScene />
                </Canvas>
            </Suspense>
        </div>
    );
}
