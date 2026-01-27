import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Loading() {
    return (
        <LoadingSpinner variant="fullscreen" message="Entering the Galaxy..." />
    );
}
