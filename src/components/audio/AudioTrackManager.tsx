'use client';

import React, { useState, useCallback } from 'react';
import { Music, Plus, Trash2, GripVertical, Volume2 } from 'lucide-react';
import AudioLibraryPicker from './AudioLibraryPicker';
import AudioTrimmer from './AudioTrimmer';
import AudioVolumeControl from './AudioVolumeControl';

interface AudioTrack {
    id: string;
    audioAssetId: string;
    title: string;
    audioUrl: string;
    waveformData: number[];
    duration: number;
    startTime: number;
    endTime: number;
    volume: number;
    attributionText: string;
    coverImageUrl?: string;
}

interface AudioTrackManagerProps {
    tracks: AudioTrack[];
    onTracksChange: (tracks: AudioTrack[]) => void;
    videoVolume: number;
    isVideoMuted: boolean;
    onVideoVolumeChange: (volume: number) => void;
    onVideoMuteToggle: () => void;
    maxDuration?: number;
    maxTracks?: number;
    className?: string;
}

export default function AudioTrackManager({
    tracks,
    onTracksChange,
    videoVolume,
    isVideoMuted,
    onVideoVolumeChange,
    onVideoMuteToggle,
    maxDuration,
    maxTracks = 3,
    className = '',
}: AudioTrackManagerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [editingTrack, setEditingTrack] = useState<string | null>(null);

    const handleAddTrack = useCallback(
        (audio: any) => {
            const newTrack: AudioTrack = {
                id: `track-${Date.now()}`,
                audioAssetId: audio.id,
                title: audio.title || 'Untitled Audio',
                audioUrl: audio.audioUrl,
                waveformData: audio.waveformData || [],
                duration: audio.duration,
                startTime: 0,
                endTime: maxDuration ? Math.min(audio.duration, maxDuration) : audio.duration,
                volume: 1.0,
                attributionText: audio.attributionText,
                coverImageUrl: audio.coverImageUrl,
            };

            onTracksChange([...tracks, newTrack]);
        },
        [tracks, onTracksChange, maxDuration]
    );

    const handleRemoveTrack = useCallback(
        (trackId: string) => {
            onTracksChange(tracks.filter((t) => t.id !== trackId));
            if (editingTrack === trackId) {
                setEditingTrack(null);
            }
        },
        [tracks, onTracksChange, editingTrack]
    );

    const handleTrimChange = useCallback(
        (trackId: string, startTime: number, endTime: number) => {
            onTracksChange(
                tracks.map((t) => (t.id === trackId ? { ...t, startTime, endTime } : t))
            );
        },
        [tracks, onTracksChange]
    );

    const handleVolumeChange = useCallback(
        (trackId: string, volume: number) => {
            onTracksChange(
                tracks.map((t) => (t.id === trackId ? { ...t, volume } : t))
            );
        },
        [tracks, onTracksChange]
    );

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <Music size={16} />
                    Audio Tracks ({tracks.length}/{maxTracks})
                </h3>
                {tracks.length < maxTracks && (
                    <button
                        type="button"
                        onClick={() => setShowPicker(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <Plus size={14} />
                        Add Audio
                    </button>
                )}
            </div>

            {/* Video volume control */}
            <div className="p-3 bg-white/5 rounded-xl">
                <AudioVolumeControl
                    label="Video Audio"
                    volume={videoVolume}
                    isMuted={isVideoMuted}
                    onVolumeChange={onVideoVolumeChange}
                    onMuteToggle={onVideoMuteToggle}
                />
            </div>

            {/* Track list */}
            {tracks.length === 0 ? (
                <div
                    onClick={() => setShowPicker(true)}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors"
                >
                    <Music size={32} className="text-white/40 mb-2" />
                    <p className="text-sm text-white/60">No audio tracks added</p>
                    <p className="text-xs text-white/40 mt-1">
                        Click to browse audio library
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tracks.map((track, index) => (
                        <div
                            key={track.id}
                            className="bg-white/5 rounded-xl overflow-hidden"
                        >
                            {/* Track header */}
                            <div className="flex items-center gap-3 p-3">
                                <div className="flex items-center gap-2 text-white/40 cursor-move">
                                    <GripVertical size={14} />
                                    <span className="text-xs font-mono">{index + 1}</span>
                                </div>

                                {/* Cover */}
                                {track.coverImageUrl ? (
                                    <img
                                        src={track.coverImageUrl}
                                        alt=""
                                        className="w-10 h-10 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                        <Music size={16} className="text-white/50" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {track.title}
                                    </p>
                                    <p className="text-xs text-white/50 truncate">
                                        {track.attributionText}
                                    </p>
                                </div>

                                {/* Duration */}
                                <span className="text-xs text-white/50">
                                    {formatDuration(track.endTime - track.startTime)}
                                </span>

                                {/* Actions */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditingTrack(editingTrack === track.id ? null : track.id)
                                    }
                                    className={`p-2 rounded-lg transition-colors ${editingTrack === track.id
                                            ? 'bg-white text-black'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}
                                >
                                    <Volume2 size={14} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleRemoveTrack(track.id)}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Expanded edit panel */}
                            {editingTrack === track.id && (
                                <div className="border-t border-white/10 p-4 space-y-4 bg-white/[0.02]">
                                    {/* Volume control */}
                                    <AudioVolumeControl
                                        label="Track Volume"
                                        volume={track.volume}
                                        onVolumeChange={(volume) =>
                                            handleVolumeChange(track.id, volume)
                                        }
                                        showMuteButton={false}
                                    />

                                    {/* Trimmer */}
                                    {track.waveformData.length > 0 && (
                                        <AudioTrimmer
                                            audioUrl={track.audioUrl}
                                            duration={track.duration}
                                            waveformData={track.waveformData}
                                            initialStartTime={track.startTime}
                                            initialEndTime={track.endTime}
                                            maxDuration={maxDuration}
                                            onTrimChange={(start, end) =>
                                                handleTrimChange(track.id, start, end)
                                            }
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Audio picker modal */}
            <AudioLibraryPicker
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                onSelect={handleAddTrack}
                maxDuration={maxDuration}
                excludeIds={tracks.map((t) => t.audioAssetId)}
            />
        </div>
    );
}
