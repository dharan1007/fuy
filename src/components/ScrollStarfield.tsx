'use client';

import React, { useRef, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, ScrollControls, Scroll, useScroll } from '@react-three/drei';
import * as THREE from 'three';

const FixedStarfieldScene = () => {
    const starsRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (starsRef.current) {
            starsRef.current.rotation.y += delta * 0.02;
            starsRef.current.rotation.x += delta * 0.01;
        }
    });

    return (
        <group ref={starsRef}>
            <Stars radius={80} depth={40} count={10000} factor={6} saturation={0} fade speed={1} />
        </group>
    );
};

const ScrollingStarfieldScene = () => {
    const starsRef = useRef<THREE.Group>(null);
    const scroll = useScroll();

    useFrame((state, delta) => {
        if (starsRef.current && scroll) {
            const offset = scroll.offset;

            // Constant "idle" animation
            starsRef.current.rotation.x += delta * 0.01;
            starsRef.current.rotation.y += delta * 0.02;

            // Scroll-driven effects (additive to the idle motion)
            starsRef.current.position.z = offset * 20; // Fly through effect
            starsRef.current.rotation.z = offset * Math.PI * 0.5; // Twist effect on scroll
        }
    });

    return (
        <group ref={starsRef}>
            <Stars radius={80} depth={40} count={10000} factor={6} saturation={0} fade speed={1} />
        </group>
    );
};

interface ScrollStarfieldProps {
    children?: React.ReactNode;
    variant?: 'default' | 'landing';
}

export default function ScrollStarfield({ children, variant = 'default' }: ScrollStarfieldProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return <div className="min-h-screen bg-black">{children}</div>;

    const commonCanvasProps = {
        camera: { position: [0, 0, 5], fov: 60 } as any,
        gl: {
            powerPreference: "high-performance",
            antialias: false,
            stencil: false,
            depth: false,
            alpha: true
        } as any,
        dpr: [1, 2] as [number, number]
    };

    if (variant === 'landing') {
        return (
            <div className="relative w-full h-screen bg-black overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Suspense fallback={<div className="w-full h-full bg-black/90" />}>
                        <Canvas {...commonCanvasProps}>
                            <color attach="background" args={['#000000']} />
                            <ScrollControls pages={5} damping={0.2}>
                                <Scroll>
                                    <ScrollingStarfieldScene />
                                </Scroll>
                                <Scroll html style={{ width: '100%' }}>
                                    {children}
                                </Scroll>
                            </ScrollControls>
                        </Canvas>
                    </Suspense>
                </div>
            </div>
        );
    }

    // Default fixed background
    return (
        <>
            <div className="fixed inset-0 z-0 bg-black">
                <Suspense fallback={<div className="w-full h-full bg-black" />}>
                    <Canvas {...commonCanvasProps}>
                        <color attach="background" args={['#000000']} />
                        <FixedStarfieldScene />
                    </Canvas>
                </Suspense>
            </div>
            <div className="relative z-10 w-full">
                {children}
            </div>
        </>
    );
}
