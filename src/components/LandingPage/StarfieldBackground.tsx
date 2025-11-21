'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

export default function StarfieldBackground() {
    return (
        <div className="fixed inset-0 z-0">
            <Suspense fallback={<div className="w-full h-full bg-black" />}>
                <Canvas camera={{ position: [0, 0, 5], fov: 30 }}>
                    <color attach="background" args={['#000000']} />
                    <Stars
                        radius={100}
                        depth={50}
                        count={5000}
                        factor={4}
                        saturation={0}
                        fade
                        speed={0.5}
                    />
                </Canvas>
            </Suspense>
        </div>
    );
}
