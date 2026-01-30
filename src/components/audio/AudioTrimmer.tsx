'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import AudioWaveform from './AudioWaveform';
import { Scissors, Play, Pause, RotateCcw } from 'lucide-react';

interface AudioTrimmerProps {
    audioUrl: string;
    duration: number;
    waveformData: number[];
    initialStartTime?: number;
    initialEndTime?: number;
    maxDuration?: number;
    onTrimChange: (startTime: number, endTime: number) => void;
    className?: string;
}

export default function AudioTrimmer({
    audioUrl,
    duration,
    waveformData,
    initialStartTime = 0,
    initialEndTime,
    maxDuration,
    onTrimChange,
    className = '',
}: AudioTrimmerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState(initialEndTime || duration);
    const [currentTime, setCurrentTime] = useState(initialStartTime);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDraggingStart, setIsDraggingStart] = useState(false);
    const [isDraggingEnd, setIsDraggingEnd] = useState(false);

    // Constrain end time based on max duration
    useEffect(() => {
        if (maxDuration && endTime - startTime > maxDuration) {
            const newEndTime = startTime + maxDuration;
            setEndTime(newEndTime);
            onTrimChange(startTime, newEndTime);
        }
    }, [maxDuration, startTime, endTime, onTrimChange]);

    // Update parent when trim changes
    useEffect(() => {
        onTrimChange(startTime, endTime);
    }, [startTime, endTime, onTrimChange]);

    // Audio playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            const time = audio.currentTime;
            setCurrentTime(time);

            // Loop within trimmed region
            if (time >= endTime) {
                audio.currentTime = startTime;
                if (!isPlaying) {
                    audio.pause();
                }
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }, [startTime, endTime, isPlaying]);

    const togglePlayback = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.currentTime = startTime;
            audio.play();
            setIsPlaying(true);
        }
    }, [isPlaying, startTime]);

    const handleSeek = useCallback(
        (time: number) => {
            const audio = audioRef.current;
            if (!audio) return;

            // Constrain seek to trimmed region
            const constrainedTime = Math.max(startTime, Math.min(endTime, time));
            audio.currentTime = constrainedTime;
            setCurrentTime(constrainedTime);
        },
        [startTime, endTime]
    );

    const handleTrimHandleDrag = useCallback(
        (e: React.MouseEvent<HTMLDivElement>, handle: 'start' | 'end') => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const position = Math.max(0, Math.min(1, x / rect.width));
            const time = position * duration;

            if (handle === 'start') {
                const newStart = Math.min(time, endTime - 1);
                setStartTime(Math.max(0, newStart));
                if (currentTime < newStart) {
                    setCurrentTime(newStart);
                }
            } else {
                const newEnd = Math.max(time, startTime + 1);
                const constrainedEnd = maxDuration
                    ? Math.min(newEnd, startTime + maxDuration)
                    : newEnd;
                setEndTime(Math.min(duration, constrainedEnd));
            }
        },
        [duration, startTime, endTime, currentTime, maxDuration]
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (isDraggingStart) {
                handleTrimHandleDrag(e as any, 'start');
            } else if (isDraggingEnd) {
                handleTrimHandleDrag(e as any, 'end');
            }
        },
        [isDraggingStart, isDraggingEnd, handleTrimHandleDrag]
    );

    const handleMouseUp = useCallback(() => {
        setIsDraggingStart(false);
        setIsDraggingEnd(false);
    }, []);

    useEffect(() => {
        if (isDraggingStart || isDraggingEnd) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingStart, isDraggingEnd, handleMouseMove, handleMouseUp]);

    const resetTrim = useCallback(() => {
        setStartTime(0);
        setEndTime(maxDuration ? Math.min(duration, maxDuration) : duration);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    }, [duration, maxDuration]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const trimmedDuration = endTime - startTime;
    const startPercent = (startTime / duration) * 100;
    const endPercent = (endTime / duration) * 100;

    return (
        <div className={`space-y-4 ${className}`}>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            {/* Header with trim info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Scissors size={16} className="text-white/60" />
                    <span className="text-sm text-white/80">Trim Audio</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-white/60">
                        Duration: {formatTime(trimmedDuration)}
                        {maxDuration && (
                            <span className="ml-1 text-white/40">/ {formatTime(maxDuration)} max</span>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={resetTrim}
                        className="p-1 text-white/60 hover:text-white transition-colors"
                        title="Reset trim"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* Waveform with trim overlay */}
            <div ref={containerRef} className="relative">
                {/* Inactive regions overlay */}
                <div
                    className="absolute inset-y-0 left-0 bg-black/60 pointer-events-none z-10"
                    style={{ width: `${startPercent}%` }}
                />
                <div
                    className="absolute inset-y-0 right-0 bg-black/60 pointer-events-none z-10"
                    style={{ width: `${100 - endPercent}%` }}
                />

                {/* Start handle */}
                <div
                    className="absolute inset-y-0 w-4 cursor-ew-resize z-20 flex items-center justify-center group"
                    style={{ left: `calc(${startPercent}% - 8px)` }}
                    onMouseDown={() => setIsDraggingStart(true)}
                >
                    <div className="w-1 h-full bg-emerald-500 group-hover:bg-emerald-400 rounded-full" />
                    <div className="absolute -top-5 text-[10px] text-emerald-400 whitespace-nowrap">
                        {formatTime(startTime)}
                    </div>
                </div>

                {/* End handle */}
                <div
                    className="absolute inset-y-0 w-4 cursor-ew-resize z-20 flex items-center justify-center group"
                    style={{ left: `calc(${endPercent}% - 8px)` }}
                    onMouseDown={() => setIsDraggingEnd(true)}
                >
                    <div className="w-1 h-full bg-red-500 group-hover:bg-red-400 rounded-full" />
                    <div className="absolute -top-5 text-[10px] text-red-400 whitespace-nowrap">
                        {formatTime(endTime)}
                    </div>
                </div>

                {/* Waveform */}
                <AudioWaveform
                    waveformData={waveformData}
                    duration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onSeek={handleSeek}
                    height={80}
                />
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-4">
                <button
                    type="button"
                    onClick={togglePlayback}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                    {isPlaying ? (
                        <Pause size={18} className="text-white" />
                    ) : (
                        <Play size={18} className="text-white ml-0.5" />
                    )}
                </button>

                <div className="flex-1 text-center">
                    <span className="text-sm text-white/60">
                        Preview: {formatTime(startTime)} - {formatTime(endTime)}
                    </span>
                </div>
            </div>
        </div>
    );
}
