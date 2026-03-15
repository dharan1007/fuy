/**
 * Saved Audios Page
 * Shows all audios the user has saved, with search and navigation.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Image, TextInput, ActivityIndicator, StyleSheet, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Music, Search, Clock, Play, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const NEXT_PUBLIC_APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://fuymedia.org';

interface SavedAudioItem {
    savedId: string;
    savedAt: string;
    audioAsset: {
        id: string;
        title: string;
        attributionText: string;
        duration: number;
        genre: string | null;
        audioUrl: string;
        coverImageUrl: string | null;
        isOriginal: boolean;
        usageCount: number;
        createdAt: string;
    };
    creator: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
}

export default function SavedAudiosPage() {
    const router = useRouter();
    const { colors } = useTheme();

    const [audios, setAudios] = useState<SavedAudioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchSavedAudios(1, true);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSavedAudios(1, true);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchSavedAudios = async (pageNum: number, reset: boolean = false) => {
        try {
            if (reset) setLoading(true);
            const url = `${NEXT_PUBLIC_APP_URL}/api/audio/saved?page=${pageNum}&limit=20&search=${encodeURIComponent(search)}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.audios) {
                if (reset) {
                    setAudios(data.audios);
                } else {
                    setAudios(prev => [...prev, ...data.audios]);
                }
                setPage(pageNum);
                setHasMore(pageNum < data.pagination.totalPages);
            }
        } catch (e) {
            console.error('Failed to fetch saved audios:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsave = async (audioAssetId: string) => {
        try {
            await fetch(`${NEXT_PUBLIC_APP_URL}/api/audio/${audioAssetId}/save`, { method: 'DELETE' });
            setAudios(prev => prev.filter(a => a.audioAsset.id !== audioAssetId));
        } catch (e) {
            console.error('Failed to unsave audio:', e);
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const loadMore = () => {
        if (hasMore && !loading) {
            fetchSavedAudios(page + 1);
        }
    };

    const renderItem = ({ item }: { item: SavedAudioItem }) => (
        <TouchableOpacity
            onPress={() => router.push(`/audio/${item.audioAsset.id}`)}
            onLongPress={() => {
                Alert.alert(
                    'Remove Audio',
                    `Remove "${item.audioAsset.title}" from saved?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => handleUnsave(item.audioAsset.id) },
                    ]
                );
            }}
            style={styles.audioRow}
            activeOpacity={0.7}
        >
            {/* Cover */}
            <View style={styles.cover}>
                {item.audioAsset.coverImageUrl ? (
                    <Image source={{ uri: item.audioAsset.coverImageUrl }} style={styles.coverImg} />
                ) : (
                    <View style={styles.coverPlaceholder}>
                        <Music size={20} color="#444" />
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.audioAsset.title}</Text>
                <Text style={styles.creator} numberOfLines={1}>@{item.creator.name}</Text>
                <View style={styles.metaRow}>
                    <Clock size={11} color="#666" />
                    <Text style={styles.metaText}>{formatDuration(item.audioAsset.duration)}</Text>
                    <Play size={11} color="#666" />
                    <Text style={styles.metaText}>{item.audioAsset.usageCount} posts</Text>
                    {item.audioAsset.isOriginal && (
                        <View style={styles.originalTag}>
                            <Text style={styles.originalTagText}>ORIGINAL</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Remove */}
            <TouchableOpacity onPress={() => handleUnsave(item.audioAsset.id)} style={styles.removeBtn}>
                <Trash2 size={16} color="#555" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Saved Audios</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <Search size={16} color="#666" />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search saved audios..."
                    placeholderTextColor="#666"
                    style={styles.searchInput}
                />
            </View>

            {/* List */}
            {loading && audios.length === 0 ? (
                <ActivityIndicator color="#888" size="large" style={{ marginTop: 60 }} />
            ) : audios.length === 0 ? (
                <View style={styles.empty}>
                    <Music size={48} color="#333" />
                    <Text style={styles.emptyTitle}>No saved audios</Text>
                    <Text style={styles.emptySubtitle}>Save audios from posts to use them in your own content.</Text>
                </View>
            ) : (
                <FlatList
                    data={audios}
                    keyExtractor={(item) => item.savedId}
                    renderItem={renderItem}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListFooterComponent={hasMore ? <ActivityIndicator color="#888" style={{ marginVertical: 16 }} /> : null}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

    searchRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#111',
        marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderRadius: 12,
        borderWidth: 1, borderColor: '#222',
    },
    searchInput: { flex: 1, color: '#fff', paddingVertical: 10, marginLeft: 8, fontSize: 14 },

    audioRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
    },
    cover: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', marginRight: 12 },
    coverImg: { width: '100%', height: '100%' },
    coverPlaceholder: {
        width: '100%', height: '100%', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#222',
    },
    info: { flex: 1 },
    title: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
    creator: { color: '#888', fontSize: 13, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: '#666', fontSize: 11, marginRight: 8 },
    originalTag: { backgroundColor: '#1a1a1a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#333' },
    originalTagText: { color: '#888', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    removeBtn: { padding: 8 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyTitle: { color: '#888', fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    emptySubtitle: { color: '#555', fontSize: 14, textAlign: 'center' },
});
