'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Preload } from '@react-three/drei';
import Scene from './Scene';
import HeroSection from './HeroSection';
import FeatureSection from './FeatureSection';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LandingPage() {
  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden">
      <Suspense fallback={<LoadingSpinner message="Loading 3D Experience..." />}>
        <Canvas shadows camera={{ position: [0, 0, 5], fov: 30 }}>
          <color attach="background" args={['#000000']} />
          <ScrollControls pages={4} damping={0.3}>
            <Scroll>
              <Scene />
            </Scroll>
            <Scroll html style={{ width: '100%', height: '100%' }}>
              <HeroSection />
              <FeatureSection />
            </Scroll>
          </ScrollControls>
          <Preload all />
        </Canvas>
      </Suspense>
    </div>
  );
}
