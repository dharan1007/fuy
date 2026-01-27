import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import CosmicBackground from '@/components/CosmicBackground';

export default function Loading() {
    return (
        <CosmicBackground>
            <LoadingSpinner variant="fullscreen" message="Entering the Galaxy..." />
        </CosmicBackground>
    );
}
