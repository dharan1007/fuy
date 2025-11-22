'use client';

import React, { Suspense } from 'react';
import ScrollStarfield from '@/components/ScrollStarfield';
import HeroSection from './HeroSection';
import FeatureSection from './FeatureSection';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LandingPage() {
  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden">
      <ScrollStarfield variant="landing">
        <HeroSection />
        <FeatureSection />
      </ScrollStarfield>
    </div>
  );
}
