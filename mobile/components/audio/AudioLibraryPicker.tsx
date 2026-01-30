import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    FlatList,
    TextInput,
    Pressable,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AudioWaveform from './AudioWaveform';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

interface AudioAsset {
    id: string;
    title: string | null;
    attributionText: string | null;
    duration: number;
    audioUrl: string;
    waveformData: number[] | null;
    coverImageUrl: string | null;
    usageCount: number;
    genre: string | null;
    originalCreator: {
        id: string;
        name: string;
        profile: {
            displayName: string | null;
            avatarUrl: string | null;
        } | null;
    };
}

interface AudioLibraryPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (audio: AudioAsset) => void;
    maxDuration?: number;
    excludeIds?: string[];
}

type TabType = 'trending' | 'recent' | 'my-audio';

export default function AudioLibraryPicker({
    visible,
    onClose,
    onSelect,
    maxDuration,
    excludeIds = [],
}: AudioLibraryPickerProps) {
    const [activeTab, setActiveTab] = useState<TabType>('trending');
    const [searchQuery, setSearchQuery] = useState('');
    const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    const fetchAudio = useCallback(async () => {
        setLoading(true);
        try {
            let endpoint = `${API_URL}/api/audio`;
            const params = new URLSearchParams();

            if (activeTab === 'trending') {
                endpoint = `${API_URL}/api/audio/trending`;
            } else if (activeTab === 'recent') {
                params.set('sortBy', 'recent');
            } else if (activeTab === 'my-audio') {
                params.set('creatorId', 'me');
            }

            if (searchQuery) {
                endpoint = `${API_URL}/api/audio/search`;
                params.set('q', searchQuery);
            }

            const url = params.toString() ? `${endpoint}?${params}` : endpoint;
            const res = await fetch(url);
            const data = await res.json();

            let assets = data.audioAssets || data.trending || data.results || [];

            if (maxDuration) {
                assets = assets.filter((a: AudioAsset) => a.duration <= maxDuration);
            }

            assets = assets.filter((a: AudioAsset) => !excludeIds.includes(a.id));

            setAudioAssets(assets);
        } catch (error) {
            console.error('Error fetching audio:', error);
            setAudioAssets([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, searchQuery, maxDuration, excludeIds]);

    useEffect(() => {
        if (visible) {
            fetchAudio();
        }
    }, [visible, activeTab, fetchAudio]);

    useEffect(() => {
        if (!visible && soundRef.current) {
            soundRef.current.unloadAsync();
            soundRef.current = null;
            setPlayingId(null);
        }
    }, [visible]);

    const togglePlay = async (audio: AudioAsset) => {
        try {
            if (playingId === audio.id) {
                if (soundRef.current) {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                    soundRef.current = null;
                }
                setPlayingId(null);
            } else {
                if (soundRef.current) {
                    await soundRef.current.unloadAsync();
                }
                const { sound } = await Audio.Sound.createAsync({ uri: audio.audioUrl });
                soundRef.current = sound;
                await sound.playAsync();
                setPlayingId(audio.id);
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setPlayingId(null);
                    }
                });
            }
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const renderAudioItem = ({ item }: { item: AudioAsset }) => (
        <Pressable
            style={styles.audioItem}
            onPress={() => {
                if (soundRef.current) {
                    soundRef.current.unloadAsync();
                }
                setPlayingId(null);
                onSelect(item);
                onClose();
            }}
        >
            <Pressable
                style={styles.coverContainer}
                onPress={() => togglePlay(item)}
            >
                {item.coverImageUrl ? (
                    <Image source={{ uri: item.coverImageUrl }} style={styles.cover} />
                ) : (
                    <View style={styles.coverPlaceholder}>
                        <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.5)" />
                    </View>
                )}
                <View style={styles.playOverlay}>
                    <Ionicons
                        name={playingId === item.id ? 'pause' : 'play'}
                        size={16}
                        color="#fff"
                    />
                </View>
            </Pressable>

            <View style={styles.audioInfo}>
                <Text style={styles.audioTitle} numberOfLines={1}>
                    {item.title || 'Untitled Audio'}
                </Text>
                <Text style={styles.audioCreator} numberOfLines={1}>
                    {item.attributionText || item.originalCreator?.profile?.displayName}
                </Text>
                <View style={styles.audioMeta}>
                    <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
                    <Text style={styles.metaText}>{formatNumber(item.usageCount)} uses</Text>
                    {item.genre && <Text style={styles.metaText}>{item.genre}</Text>}
                </View>
            </View>

            {item.waveformData && (
                <View style={styles.miniWaveform}>
                    <AudioWaveform
                        waveformData={item.waveformData}
                        duration={item.duration}
                        height={24}
                        barWidth={2}
                        barGap={1}
                    />
                </View>
            )}

            <Pressable style={styles.addButton}>
                <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
        </Pressable>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Audio Library</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
                        </Pressable>
                    </View>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search audio..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        {(['trending', 'recent', 'my-audio'] as TabType[]).map((tab) => (
                            <Pressable
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.tabActive]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Ionicons
                                    name={
                                        tab === 'trending'
                                            ? 'trending-up'
                                            : tab === 'recent'
                                                ? 'time'
                                                : 'musical-notes'
                                    }
                                    size={14}
                                    color={activeTab === tab ? '#000' : 'rgba(255,255,255,0.7)'}
                                />
                                <Text
                                    style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
                                >
                                    {tab === 'trending' ? 'Trending' : tab === 'recent' ? 'Recent' : 'My Audio'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* List */}
                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="rgba(255,255,255,0.5)" />
                        </View>
                    ) : audioAssets.length === 0 ? (
                        <View style={styles.centered}>
                            <Ionicons name="musical-notes" size={48} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.emptyText}>No audio found</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={audioAssets}
                            renderItem={renderAudioItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        margin: 16,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        paddingVertical: 12,
        marginLeft: 8,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    tabActive: {
        backgroundColor: '#fff',
    },
    tabText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#000',
    },
    list: {
        padding: 16,
        gap: 12,
    },
    audioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    coverContainer: {
        position: 'relative',
        width: 48,
        height: 48,
        borderRadius: 8,
        overflow: 'hidden',
    },
    cover: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioInfo: {
        flex: 1,
        minWidth: 0,
    },
    audioTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    audioCreator: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: 2,
    },
    audioMeta: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    metaText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
    },
    miniWaveform: {
        width: 60,
        height: 24,
    },
    addButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginTop: 12,
    },
});
