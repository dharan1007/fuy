import React from 'react';
import BondingDashboard from '@/components/bonding/BondingDashboard';
import { SpaceBackground } from '@/components/SpaceBackground';

export default function BondingPage() {
  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', position: 'relative' }}>
      <SpaceBackground />
      <BondingDashboard />
    </div>
  );
}
