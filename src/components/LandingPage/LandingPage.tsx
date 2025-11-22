'use client';

import React, { Suspense } from 'react';
import ScrollStarfield from '@/components/ScrollStarfield';
import HeroSection from './HeroSection';
import FeatureSection from './FeatureSection';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LandingPage() {
  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden">
      <Suspense fallback={<LoadingSpinner message="Loading 3D Experience..." />}>
        <ScrollStarfield />
        <div className="relative z-10">
          <HeroSection />
          <FeatureSection />
        </div>
      </Suspense>
    </div>
  );
}
