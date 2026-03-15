/**
 * Audio Detail Page
 * Shows audio info, creator, usage count, posts using this audio.
 * Allows save/unsave and "Use This Audio" for new posts.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Image, FlatList, ActivityIndicator, StyleSheet, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Music, Bookmark, Play, Users, Clock, Hash } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width: SW } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SW - 12) / 3;

const NEXT_PUBLIC_APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://fuymedia.org';

interface AudioDetail {
    id: string;
    title: string;
    attributionText: string;
    duration: number;
    genre: string | null;
    audioUrl: string;
    coverImageUrl: string | null;
    usageCount: number;
    savedCount: number;
    isOriginal: boolean;
    isReusable: boolean;
    musicalInfo: { tempo: number | null; key: string | null } | null;
    createdAt: string;
}

interface Creator {
    id: string;
    name: string;
    avatarUrl: string | null;
}

interface PostItem {
    id: string;
    thumbnailUrl: string | null;
    mediaUrl: string;
    mediaType: string;
    postType: string;
}

export default function AudioDetailPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session } = useAuth();
    const { colors } = useTheme();

    const [audioDetail, setAudioDetail] = useState<AudioDetail | null>(null);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [savingState, setSavingState] = useState(false);

    useEffect(() => {
        if (id) {
            fetchAudioDetail();
            fetchAudioPosts();
        }
    }, [id]);

    const fetchAudioDetail = async () => {
        try {
            const res = await fetch(`${NEXT_PUBLIC_APP_URL}/api/audio/${id}`);
            const data = await res.json();
            if (data.audioAsset) {
                setAudioDetail(data.audioAsset);
                setCreator(data.creator);
                setIsSaved(data.isSaved || false);
            }
        } catch (e) {
            console.error('Failed to fetch audio detail:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAudioPosts = async () => {
        try {
            const res = await fetch(`${NEXT_PUBLIC_APP_URL}/api/audio/${id}/posts?limit=30`);
            const data = await res.json();
            if (data.posts) {
                setPosts(data.posts);
            }
        } catch (e) {
            console.error('Failed to fetch audio posts:', e);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleSaveToggle = async () => {
        if (savingState) return;
        setSavingState(true);
        try {
            const method = isSaved ? 'DELETE' : 'POST';
            await fetch(`${NEXT_PUBLIC_APP_URL}/api/audio/${id}/save`, { method });
            setIsSaved(!isSaved);
        } catch (e) {
            console.error('Failed to toggle save:', e);
        } finally {
            setSavingState(false);
        }
    };

    const handleUseAudio = () => {
        if (!audioDetail?.isReusable) {
            Alert.alert('Not Available', 'This audio is not available for reuse.');
            return;
        }
        // Navigate to create screen with audio pre-selected
        router.push({
            pathname: '/(tabs)/create',
            params: {
                audioAssetId: audioDetail?.id,
                audioTitle: audioDetail?.title,
                audioCreator: creator?.name,
            },
        });
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: '#000' }]}>
                <ActivityIndicator color="#fff" size="large" style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    if (!audioDetail) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: '#000' }]}>
                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Audio not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Audio</Text>
                <TouchableOpacity onPress={handleSaveToggle} style={styles.saveBtn}>
                    <Bookmark
                        size={22}
                        color={isSaved ? '#fff' : '#888'}
                        fill={isSaved ? '#fff' : 'transparent'}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Audio Card */}
                <View style={styles.audioCard}>
                    <View style={styles.coverBox}>
                        {audioDetail.coverImageUrl ? (
                            <Image source={{ uri: audioDetail.coverImageUrl }} style={styles.coverImage} />
                        ) : (
                            <View style={styles.coverPlaceholder}>
                                <Music size={40} color="#444" />
                            </View>
                        )}
                        <View style={styles.playOverlay}>
                            <Play size={28} color="#fff" fill="#fff" />
                        </View>
                    </View>

                    <Text style={styles.audioTitle}>{audioDetail.title}</Text>
                    <Text style={styles.attribution}>{audioDetail.attributionText}</Text>

                    {/* Creator */}
                    <TouchableOpacity
                        onPress={() => creator && router.push(`/profile/${creator.id}`)}
                        style={styles.creatorRow}
                    >
                        {creator?.avatarUrl ? (
                            <Image source={{ uri: creator.avatarUrl }} style={styles.creatorAvatar} />
                        ) : (
                            <View style={[styles.creatorAvatar, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                                <Users size={14} color="#888" />
                            </View>
                        )}
                        <Text style={styles.creatorName}>@{creator?.name}</Text>
                        {audioDetail.isOriginal && (
                            <View style={styles.originalBadge}>
                                <Text style={styles.originalText}>ORIGINAL</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Play size={14} color="#888" />
                            <Text style={styles.statText}>{audioDetail.usageCount} posts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Clock size={14} color="#888" />
                            <Text style={styles.statText}>{formatDuration(audioDetail.duration)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Bookmark size={14} color="#888" />
                            <Text style={styles.statText}>{audioDetail.savedCount} saves</Text>
                        </View>
                        {audioDetail.genre && (
                            <View style={styles.statItem}>
                                <Hash size={14} color="#888" />
                                <Text style={styles.statText}>{audioDetail.genre}</Text>
                            </View>
                        )}
                    </View>

                    {/* Musical Info */}
                    {audioDetail.musicalInfo && (
                        <View style={styles.musicalRow}>
                            {audioDetail.musicalInfo.tempo && (
                                <View style={styles.musicalBadge}>
                                    <Text style={styles.musicalText}>{Math.round(audioDetail.musicalInfo.tempo)} BPM</Text>
                                </View>
                            )}
                            {audioDetail.musicalInfo.key && (
                                <View style={styles.musicalBadge}>
                                    <Text style={styles.musicalText}>{audioDetail.musicalInfo.key}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    {audioDetail.isReusable && (
                        <TouchableOpacity onPress={handleUseAudio} style={styles.useBtn}>
                            <Music size={18} color="#000" />
                            <Text style={styles.useBtnText}>Use This Audio</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleSaveToggle} style={[styles.saveBtnLarge, isSaved && styles.saveBtnActive]}>
                        <Bookmark size={18} color={isSaved ? '#000' : '#fff'} fill={isSaved ? '#000' : 'transparent'} />
                        <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextActive]}>
                            {isSaved ? 'Saved' : 'Save Audio'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Posts Grid */}
                <View style={styles.postsSection}>
                    <Text style={styles.postsSectionTitle}>
                        {audioDetail.usageCount} {audioDetail.usageCount === 1 ? 'Post' : 'Posts'} using this audio
                    </Text>

                    {loadingPosts ? (
                        <ActivityIndicator color="#888" style={{ marginTop: 20 }} />
                    ) : posts.length === 0 ? (
                        <Text style={styles.emptyText}>No posts using this audio yet.</Text>
                    ) : (
                        <View style={styles.grid}>
                            {posts.map((post, index) => (
                                <TouchableOpacity
                                    key={post.id}
                                    onPress={() => router.push(`/post/${post.id}`)}
                                    style={styles.gridItem}
                                >
                                    {post.thumbnailUrl ? (
                                        <Image source={{ uri: post.thumbnailUrl }} style={styles.gridImage} />
                                    ) : post.mediaUrl ? (
                                        <Image source={{ uri: post.mediaUrl }} style={styles.gridImage} />
                                    ) : (
                                        <View style={[styles.gridImage, { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }]}>
                                            <Play size={20} color="#555" />
                                        </View>
                                    )}
                                    {(post.mediaType === 'VIDEO' || post.postType === 'LILL' || post.postType === 'FILL') && (
                                        <View style={styles.videoIcon}>
                                            <Play size={10} color="#fff" fill="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
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
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
    saveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: 60 },

    // Audio Card
    audioCard: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
    coverBox: { width: 180, height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111', marginBottom: 20, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
    playOverlay: {
        position: 'absolute', bottom: 10, right: 10,
        width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    audioTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
    attribution: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 16 },

    // Creator
    creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    creatorAvatar: { width: 28, height: 28, borderRadius: 14,  overflow: 'hidden' },
    creatorName: { color: '#ccc', fontSize: 14, fontWeight: '600' },
    originalBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
    originalText: { color: '#888', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

    // Stats
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { color: '#888', fontSize: 13 },

    // Musical
    musicalRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    musicalBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
    musicalText: { color: '#aaa', fontSize: 12, fontWeight: '600' },

    // Actions
    actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
    useBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12,
    },
    useBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
    saveBtnLarge: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#1a1a1a', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333',
    },
    saveBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    saveBtnTextActive: { color: '#000' },

    // Posts Grid
    postsSection: { paddingHorizontal: 4 },
    postsSectionTitle: { color: '#888', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12, paddingHorizontal: 20 },
    emptyText: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
    gridItem: { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE * 1.4, borderRadius: 4, overflow: 'hidden', position: 'relative' },
    gridImage: { width: '100%', height: '100%' },
    videoIcon: {
        position: 'absolute', top: 6, right: 6,
        width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center',
    },
});
