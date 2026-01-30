'use client';

import React from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface AudioVolumeControlProps {
    label: string;
    volume: number;
    isMuted?: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle?: () => void;
    showMuteButton?: boolean;
    className?: string;
}

export default function AudioVolumeControl({
    label,
    volume,
    isMuted = false,
    onVolumeChange,
    onMuteToggle,
    showMuteButton = true,
    className = '',
}: AudioVolumeControlProps) {
    const displayVolume = isMuted ? 0 : volume;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        onVolumeChange(newVolume);
    };

    const getVolumeIcon = () => {
        if (isMuted || displayVolume === 0) {
            return <VolumeX size={16} className="text-white/60" />;
        }
        if (displayVolume < 0.5) {
            return <Volume1 size={16} className="text-white/80" />;
        }
        return <Volume2 size={16} className="text-white" />;
    };

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Label */}
            <span className="text-sm text-white/80 w-24 truncate">{label}</span>

            {/* Mute button */}
            {showMuteButton && onMuteToggle && (
                <button
                    type="button"
                    onClick={onMuteToggle}
                    className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'
                        }`}
                >
                    {getVolumeIcon()}
                </button>
            )}

            {/* Volume slider */}
            <div className="flex-1 relative">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={displayVolume}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) ${displayVolume * 100}%, rgba(255,255,255,0.2) ${displayVolume * 100}%, rgba(255,255,255,0.2) 100%)`,
                    }}
                />
            </div>

            {/* Volume percentage */}
            <span className="text-xs text-white/60 w-10 text-right">
                {Math.round(displayVolume * 100)}%
            </span>
        </div>
    );
}

interface MultiTrackVolumeControlProps {
    videoVolume: number;
    isVideoMuted: boolean;
    audioTracks: Array<{
        id: string;
        name: string;
        volume: number;
    }>;
    onVideoVolumeChange: (volume: number) => void;
    onVideoMuteToggle: () => void;
    onAudioTrackVolumeChange: (trackId: string, volume: number) => void;
    className?: string;
}

export function MultiTrackVolumeControl({
    videoVolume,
    isVideoMuted,
    audioTracks,
    onVideoVolumeChange,
    onVideoMuteToggle,
    onAudioTrackVolumeChange,
    className = '',
}: MultiTrackVolumeControlProps) {
    return (
        <div className={`space-y-3 ${className}`}>
            <h4 className="text-sm font-medium text-white/80 mb-2">Volume Mixer</h4>

            {/* Video audio control */}
            <AudioVolumeControl
                label="Video Audio"
                volume={videoVolume}
                isMuted={isVideoMuted}
                onVolumeChange={onVideoVolumeChange}
                onMuteToggle={onVideoMuteToggle}
            />

            {/* Audio tracks */}
            {audioTracks.map((track) => (
                <AudioVolumeControl
                    key={track.id}
                    label={track.name}
                    volume={track.volume}
                    onVolumeChange={(volume) => onAudioTrackVolumeChange(track.id, volume)}
                    showMuteButton={false}
                />
            ))}
        </div>
    );
}
