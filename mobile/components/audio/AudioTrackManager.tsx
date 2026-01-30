import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AudioLibraryPicker from './AudioLibraryPicker';
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
}: AudioTrackManagerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

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
            if (expandedTrack === trackId) {
                setExpandedTrack(null);
            }
        },
        [tracks, onTracksChange, expandedTrack]
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
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="musical-notes" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.headerTitle}>
                        Audio Tracks ({tracks.length}/{maxTracks})
                    </Text>
                </View>
                {tracks.length < maxTracks && (
                    <Pressable
                        style={styles.addButton}
                        onPress={() => setShowPicker(true)}
                    >
                        <Ionicons name="add" size={14} color="#fff" />
                        <Text style={styles.addButtonText}>Add</Text>
                    </Pressable>
                )}
            </View>

            {/* Video volume control */}
            <View style={styles.videoVolumeContainer}>
                <AudioVolumeControl
                    label="Video Audio"
                    volume={videoVolume}
                    isMuted={isVideoMuted}
                    onVolumeChange={onVideoVolumeChange}
                    onMuteToggle={onVideoMuteToggle}
                />
            </View>

            {/* Track list */}
            {tracks.length === 0 ? (
                <Pressable
                    style={styles.emptyState}
                    onPress={() => setShowPicker(true)}
                >
                    <Ionicons name="musical-notes" size={32} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.emptyText}>No audio tracks added</Text>
                    <Text style={styles.emptySubtext}>Tap to browse audio library</Text>
                </Pressable>
            ) : (
                <View style={styles.trackList}>
                    {tracks.map((track, index) => (
                        <View key={track.id} style={styles.trackItem}>
                            <View style={styles.trackHeader}>
                                <View style={styles.trackIndex}>
                                    <Text style={styles.indexText}>{index + 1}</Text>
                                </View>

                                {track.coverImageUrl ? (
                                    <View style={styles.trackCover}>
                                        {/* Would use Image here in real implementation */}
                                    </View>
                                ) : (
                                    <View style={styles.trackCoverPlaceholder}>
                                        <Ionicons name="musical-notes" size={14} color="rgba(255,255,255,0.5)" />
                                    </View>
                                )}

                                <View style={styles.trackInfo}>
                                    <Text style={styles.trackTitle} numberOfLines={1}>
                                        {track.title}
                                    </Text>
                                    <Text style={styles.trackAttribution} numberOfLines={1}>
                                        {track.attributionText}
                                    </Text>
                                </View>

                                <Text style={styles.trackDuration}>
                                    {formatDuration(track.endTime - track.startTime)}
                                </Text>

                                <Pressable
                                    style={styles.trackExpandButton}
                                    onPress={() =>
                                        setExpandedTrack(expandedTrack === track.id ? null : track.id)
                                    }
                                >
                                    <Ionicons
                                        name={expandedTrack === track.id ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color="rgba(255,255,255,0.6)"
                                    />
                                </Pressable>

                                <Pressable
                                    style={styles.trackRemoveButton}
                                    onPress={() => handleRemoveTrack(track.id)}
                                >
                                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                </Pressable>
                            </View>

                            {expandedTrack === track.id && (
                                <View style={styles.trackExpanded}>
                                    <AudioVolumeControl
                                        label="Track Volume"
                                        volume={track.volume}
                                        onVolumeChange={(volume) => handleVolumeChange(track.id, volume)}
                                        showMuteButton={false}
                                    />
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Audio picker modal */}
            <AudioLibraryPicker
                visible={showPicker}
                onClose={() => setShowPicker(false)}
                onSelect={handleAddTrack}
                maxDuration={maxDuration}
                excludeIds={tracks.map((t) => t.audioAssetId)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    videoVolumeContainer: {
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginTop: 8,
    },
    emptySubtext: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 4,
    },
    trackList: {
        gap: 8,
    },
    trackItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        overflow: 'hidden',
    },
    trackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8,
    },
    trackIndex: {
        width: 20,
        alignItems: 'center',
    },
    indexText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    trackCover: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    trackCoverPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackInfo: {
        flex: 1,
        minWidth: 0,
    },
    trackTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    trackAttribution: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    trackDuration: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },
    trackExpandButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    trackRemoveButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(239,68,68,0.1)',
    },
    trackExpanded: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
});
