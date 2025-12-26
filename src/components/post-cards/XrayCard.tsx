'use client';

import React, { useRef, useEffect, useState } from 'react';

import PostActionMenu from '@/components/PostActionMenu';

type XrayCardProps = {
    xray: {
        id: string;
        topLayerUrl: string;
        bottomLayerUrl: string;
        topLayerType: string;
        bottomLayerType: string;
    };
    currentUserId?: string;
    onPostHidden?: () => void;
    onRefresh?: () => void;
};

export default function XrayCard({ xray, currentUserId, onPostHidden, onRefresh }: XrayCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScratching, setIsScratching] = useState(false);
    const [revealPercent, setRevealPercent] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Load top layer image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = xray.topLayerUrl;
    }, [xray.topLayerUrl]);

    const scratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isScratching) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="relative aspect-video bg-black">
                {/* Bottom layer */}
                {xray.bottomLayerType === 'VIDEO' ? (
                    <video
                        src={xray.bottomLayerUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        controls
                    />
                ) : (
                    <img
                        src={xray.bottomLayerUrl}
                        alt="Hidden layer"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                {/* Scratch canvas */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-pointer"
                    onMouseDown={() => setIsScratching(true)}
                    onMouseUp={() => setIsScratching(false)}
                    onMouseLeave={() => setIsScratching(false)}
                    onMouseMove={scratch}
                    onTouchStart={() => setIsScratching(true)}
                    onTouchEnd={() => setIsScratching(false)}
                    onTouchMove={scratch}
                />

                <div className="absolute top-2 left-2 px-3 py-1 bg-black/70 rounded-full text-xs pointer-events-none">
                    🔍 Scratch to reveal
                </div>

                <div className="absolute top-2 right-2 z-20">
                    <PostActionMenu
                        post={{ id: xray.id }} // Xray might not have full post attached easily here unless passed. For now just ID for hiding.
                        currentUserId={currentUserId}
                        onPostHidden={onPostHidden}
                        onRefresh={onRefresh}
                    />
                </div>
            </div>
        </div>
    );
}
