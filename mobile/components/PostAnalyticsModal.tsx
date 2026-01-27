import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { X, Eye, Share2, MessageCircle, TrendingUp, Award, Heart } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const PoopIcon = ({ color, size = 20 }: { color: string, size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M12 22C17.5228 22 22 19.7614 22 17C22 14.8858 19.3333 13.0808 15.5 12.3785C16.8954 11.5176 17.5 10.1501 17.5 9C17.5 7.42996 16.3621 6.13606 14.8878 5.64215C15.2674 5.15875 15.5 4.59858 15.5 4C15.5 2.34315 14.1569 1 12.5 1C10.8431 1 9.5 2.34315 9.5 4C9.5 4.59858 9.73259 5.15875 10.1122 5.64215C8.63793 6.13606 7.5 7.42996 7.5 9C7.5 10.1501 8.10457 11.5176 9.5 12.3785C5.66667 13.0808 3 14.8858 3 17C3 19.7614 7.47715 22 12 22Z" />
    </Svg>
);

const MagicCapIcon = ({ color, size = 20 }: { color: string, size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M12 2L2 20H22L12 2Z" />
        <Path d="M16 8L18 4L20 8" stroke={color} strokeWidth="1" fill="none" />
        <Path d="M4 12L6 8L8 12" stroke={color} strokeWidth="1" fill="none" />
    </Svg>
);
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';

interface PostAnalytics {
    totalViews: number;
    totalShares: number;
    totalReactions: number;
    totalComments: number;
    wCount: number;
    lCount: number;
    capCount: number;
    topPosts: {
        id: string;
        content: string;
        views: number;
        shares: number;
        reactions: number;
        postType: string;
    }[];
}

interface Props {
    visible: boolean;
    onClose: () => void;
    userId: string;
}

export default function PostAnalyticsModal({ visible, onClose, userId }: Props) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PostAnalytics | null>(null);

    useEffect(() => {
        if (visible && userId) {
            fetchAnalytics();
        }
    }, [visible, userId]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Fetch all user posts
            const { data: posts } = await supabase
                .from('Post')
                .select('id, content, postType, viewCount, shareCount')
                .eq('userId', userId);

            const postIds = posts?.map(p => p.id) || [];

            // Fetch reactions
            let wCount = 0, lCount = 0, capCount = 0, totalReactions = 0;
            if (postIds.length > 0) {
                const { data: reactions } = await supabase
                    .from('Reaction')
                    .select('type')
                    .in('postId', postIds);

                reactions?.forEach(r => {
                    totalReactions++;
                    if (r.type === 'W') wCount++;
                    if (r.type === 'L') lCount++;
                    if (r.type === 'CAP') capCount++;
                });
            }

            // Fetch comments count
            let totalComments = 0;
            if (postIds.length > 0) {
                const { count } = await supabase
                    .from('PostComment')
                    .select('*', { count: 'exact', head: true })
                    .in('postId', postIds);
                totalComments = count || 0;
            }

            // Calculate totals
            const totalViews = posts?.reduce((sum, p) => sum + (p.viewCount || 0), 0) || 0;
            const totalShares = posts?.reduce((sum, p) => sum + (p.shareCount || 0), 0) || 0;

            // Top posts by views
            const topPosts = (posts || [])
                .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
                .slice(0, 5)
                .map(p => ({
                    id: p.id,
                    content: p.content || 'Media Post',
                    views: p.viewCount || 0,
                    shares: p.shareCount || 0,
                    reactions: 0, // Would need per-post query
                    postType: p.postType || 'POST'
                }));

            setData({
                totalViews,
                totalShares,
                totalReactions,
                totalComments,
                wCount,
                lCount,
                capCount,
                topPosts
            });
        } catch (e) {
            console.error('Analytics error:', e);
        } finally {
            setLoading(false);
        }
    };

    const StatBox = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
        <View style={styles.statBox}>
            <Icon size={20} color={color} />
            <Text style={styles.statValue}>{value.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Post Analytics</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.loadingText}>Loading analytics...</Text>
                        </View>
                    ) : data && (
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            {/* Overview Stats */}
                            <Text style={styles.sectionTitle}>OVERVIEW</Text>
                            <View style={styles.statsGrid}>
                                <StatBox icon={Eye} label="Views" value={data.totalViews} color="#3b82f6" />
                                <StatBox icon={Share2} label="Shares" value={data.totalShares} color="#22c55e" />
                                <StatBox icon={TrendingUp} label="Reactions" value={data.totalReactions} color="#f59e0b" />
                                <StatBox icon={MessageCircle} label="Comments" value={data.totalComments} color="#ec4899" />
                            </View>

                            {/* Reaction Breakdown */}
                            <Text style={styles.sectionTitle}>REACTIONS</Text>
                            <View style={styles.reactionsRow}>
                                <View style={[styles.reactionBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                    <Heart size={18} color="#ef4444" fill="#ef4444" />
                                    <Text style={[styles.reactionValue, { color: '#ef4444' }]}>{data.wCount}</Text>
                                    <Text style={styles.reactionLabel}>Wins</Text>
                                </View>
                                <View style={[styles.reactionBox, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                    <PoopIcon size={18} color="#ffffff" />
                                    <Text style={[styles.reactionValue, { color: '#ffffff' }]}>{data.lCount}</Text>
                                    <Text style={styles.reactionLabel}>Losses</Text>
                                </View>
                                <View style={[styles.reactionBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                    <MagicCapIcon size={18} color="#3b82f6" />
                                    <Text style={[styles.reactionValue, { color: '#3b82f6' }]}>{data.capCount}</Text>
                                    <Text style={styles.reactionLabel}>Caps</Text>
                                </View>
                            </View>

                            {/* Top Posts */}
                            {data.topPosts.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>TOP POSTS BY VIEWS</Text>
                                    <View style={styles.topPostsWrap}>
                                        {data.topPosts.map((post, idx) => (
                                            <View key={post.id} style={styles.topPostRow}>
                                                <View style={styles.postRank}>
                                                    <Text style={styles.rankText}>{idx + 1}</Text>
                                                </View>
                                                <View style={styles.postInfo}>
                                                    <Text style={styles.postContent} numberOfLines={1}>{post.content}</Text>
                                                    <Text style={styles.postType}>{post.postType}</Text>
                                                </View>
                                                <View style={styles.postStats}>
                                                    <Text style={styles.postStatValue}>{post.views}</Text>
                                                    <Text style={styles.postStatLabel}>views</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    container: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    title: { color: '#fff', fontSize: 18, fontWeight: '800' },
    closeBtn: { padding: 4 },
    loadingWrap: { padding: 60, alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 12 },
    content: { paddingHorizontal: 20 },
    sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 24, marginBottom: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statBox: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    statValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 8 },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 },
    reactionsRow: { flexDirection: 'row', gap: 10 },
    reactionBox: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    reactionValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
    reactionLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
    topPostsWrap: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    topPostRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    postRank: { width: 24, alignItems: 'center' },
    rankText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '700' },
    postInfo: { flex: 1, marginLeft: 10 },
    postContent: { color: '#fff', fontSize: 13, fontWeight: '500' },
    postType: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2, textTransform: 'uppercase' },
    postStats: { alignItems: 'flex-end' },
    postStatValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
    postStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'uppercase' },
});
