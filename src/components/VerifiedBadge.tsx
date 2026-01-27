'use client';

import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
    size?: number;
    show?: boolean;
    className?: string;
}

/**
 * Verified Badge - Red circle with white tick
 * Shown next to verified users' names
 */
export function VerifiedBadge({ size = 16, show = true, className = '' }: VerifiedBadgeProps) {
    if (!show) return null;

    const iconSize = size * 0.65;

    return (
        <div
            className={`inline-flex items-center justify-center rounded-full ml-1 ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: '#DC2626' // Red-600
            }}
        >
            <Check color="#FFFFFF" size={iconSize} strokeWidth={3} />
        </div>
    );
}

export default VerifiedBadge;
