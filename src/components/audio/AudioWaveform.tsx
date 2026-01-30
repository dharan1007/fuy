'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface AudioWaveformProps {
    waveformData: number[];
    duration: number;
    currentTime?: number;
    isPlaying?: boolean;
    onSeek?: (time: number) => void;
    height?: number;
    barWidth?: number;
    barGap?: number;
    activeColor?: string;
    inactiveColor?: string;
    className?: string;
}

export default function AudioWaveform({
    waveformData,
    duration,
    currentTime = 0,
    isPlaying = false,
    onSeek,
    height = 64,
    barWidth = 3,
    barGap = 1,
    activeColor = '#fff',
    inactiveColor = 'rgba(255,255,255,0.3)',
    className = '',
}: AudioWaveformProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const progress = duration > 0 ? currentTime / duration : 0;
    const activeBarCount = Math.floor(waveformData.length * progress);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const position = Math.max(0, Math.min(1, x / rect.width));
            setHoveredPosition(position);

            if (isDragging && onSeek) {
                onSeek(position * duration);
            }
        },
        [isDragging, duration, onSeek]
    );

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!containerRef.current || !onSeek) return;
            setIsDragging(true);
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const position = Math.max(0, Math.min(1, x / rect.width));
            onSeek(position * duration);
        },
        [duration, onSeek]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoveredPosition(null);
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging, handleMouseUp]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`relative ${className}`}>
            {/* Time display */}
            {hoveredPosition !== null && (
                <div
                    className="absolute -top-6 text-xs text-white/70 transform -translate-x-1/2 pointer-events-none"
                    style={{ left: `${hoveredPosition * 100}%` }}
                >
                    {formatTime(hoveredPosition * duration)}
                </div>
            )}

            {/* Waveform container */}
            <div
                ref={containerRef}
                className="relative flex items-center gap-px cursor-pointer"
                style={{ height }}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
            >
                {waveformData.map((amplitude, index) => {
                    const isActive = index < activeBarCount;
                    const isHovered = hoveredPosition !== null && index < waveformData.length * hoveredPosition;
                    const barHeight = Math.max(4, amplitude * height);

                    return (
                        <div
                            key={index}
                            className="transition-colors duration-100"
                            style={{
                                width: barWidth,
                                height: barHeight,
                                backgroundColor: isActive
                                    ? activeColor
                                    : isHovered
                                        ? 'rgba(255,255,255,0.5)'
                                        : inactiveColor,
                                marginRight: barGap,
                                borderRadius: barWidth / 2,
                            }}
                        />
                    );
                })}

                {/* Progress indicator line */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg shadow-white/30 pointer-events-none"
                    style={{
                        left: `${progress * 100}%`,
                        opacity: isPlaying ? 1 : 0.7,
                    }}
                />
            </div>

            {/* Time labels */}
            <div className="flex justify-between mt-1 text-xs text-white/50">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
}
