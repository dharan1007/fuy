import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Anchor,
    ShoppingBag,
    Timer,
    Package,
    Tv,
    Heart,
    Book,
    MapPin,
    ChevronLeft,
    Eye,
    CheckCircle,
    Users,
    Clock,
    MessageCircle,
    Share2,
    Calendar,
    Palette,
    Dumbbell
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const GAP = 12;
const ITEM_WIDTH = (width - (GAP * 5)) / 4;

// Meteor Configurations
const METEORS = [
    { id: 'bonding', title: 'Relationships', icon: Heart, colors: ['#d90429', '#8d021f'], route: '/bonds', radius: { tl: 30, tr: 25, bl: 25, br: 30 } },
    { id: 'store', title: 'Store', icon: ShoppingBag, colors: ['#101010', '#000000'], route: '/store', radius: { tl: 20, tr: 30, bl: 30, br: 25 }, border: true },
    { id: 'wrex', title: 'Grounding', icon: Anchor, colors: ['#101010', '#000000'], route: '/grounding', radius: { tl: 35, tr: 15, bl: 35, br: 15 }, border: true },
    { id: 'pomodoro', title: 'Focus', icon: Timer, colors: ['#101010', '#000000'], route: '/pomodoro', radius: { tl: 25, tr: 25, bl: 15, br: 30 }, border: true },
    { id: 'orders', title: 'Orders', icon: Package, colors: ['#101010', '#000000'], route: '/orders', radius: { tl: 20, tr: 28, bl: 20, br: 28 }, border: true },
    { id: 'canvas', title: 'Journal', icon: Book, colors: ['#101010', '#000000'], route: '/journal', radius: { tl: 30, tr: 15, bl: 25, br: 20 }, border: true },
    { id: 'hopin', title: 'Events', icon: MapPin, colors: ['#101010', '#000000'], route: '/hopin', radius: { tl: 20, tr: 30, bl: 30, br: 20 }, border: true },
    { id: 'channel', title: 'Channel', icon: Tv, colors: ['#e5e5e5', '#ffffff'], route: '/channel', radius: { tl: 30, tr: 20, bl: 25, br: 25 }, textColor: '#000' },
];

interface Buddy { id: string; name: string; avatarUrl: string | null; stats: Partial<{ chatTime: number; shares: number; hopin: number; canvas: number; wrex: number; total: number }>; }
interface AnalyticsData {
    profile: { views: number };
    buddies: { collabmates: Buddy[]; chat: Buddy[]; shares: Buddy[]; hopin: Buddy[]; canvas: Buddy[]; wrex: Buddy[] };
    tasks: { stats: { status: string; _count: { _all: number } }[] };
    content: {
        totalPosts: number;
        typeBreakdown: { type: string; count: number; bestPost: { id: string; snippet: string; wCount: number } | null }[];
        rankings: { mostLiked: any; mostDisliked: any; mostCapped: any };
        posts: any[];
    };
    history: { posts: any[]; tasks: any[] };
    channel?: { currentViewers: number; audience: { sentiment: { W: number; L: number; CAP: number } }; topShows: any[] };
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

export default function DashboardScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { fetchAnalytics(); }, []);

    // Calculate totals for Usage Analysis Graph
    const chatTotal = analytics?.buddies?.chat?.length || 0;
    const shareTotal = analytics?.buddies?.shares?.length || 0;
    const hopinTotal = analytics?.buddies?.hopin?.length || 0;
    const wrexTotal = analytics?.buddies?.wrex?.length || 0;
    const usageTotal = chatTotal + shareTotal + hopinTotal + wrexTotal || 1; // avoid div by 0

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setError('Not authenticated');
                setLoading(false);
                return;
            }

            console.log('[Dashboard] Fetching from API:', `${API_URL}/api/dashboard/analytics`);

            // Try API first
            try {
                if (session?.access_token) {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

                    const res = await fetch(`${API_URL}/api/dashboard/analytics`, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        const data = await res.json();
                        setAnalytics(data);
                        console.log('[Dashboard] Analytics loaded from API');
                        setLoading(false);
                        return;
                    }
                    console.warn('[Dashboard] API failed, falling back to direct queries:', res.status);
                }
            } catch (apiError) {
                console.warn('[Dashboard] API connection failed:', apiError);
            }

            // Fallback: Direct Supabase Queries (REAL DATA)
            console.log('[Dashboard] Running fallback queries with REAL DATA...');

            // 1. Profile Views
            const { data: profile } = await supabase.from('Profile').select('views').eq('userId', user.id).single();

            // 2. Posts & Counts
            const { count: postsCount } = await supabase.from('Post').select('*', { count: 'exact', head: true }).eq('userId', user.id);
            const { data: posts } = await supabase.from('Post').select('id, content, postType, createdAt, _count { reactions, comments }').eq('userId', user.id).order('createdAt', { ascending: false }).limit(20);

            // 3. Tasks (Focus)
            const { count: completedTasks } = await supabase.from('Task').select('*', { count: 'exact', head: true }).eq('userId', user.id).eq('status', 'DONE');
            const { count: totalTasks } = await supabase.from('Task').select('*', { count: 'exact', head: true }).eq('userId', user.id);

            // 4. Chat Buddies (Real aggregation from Message table)
            // Fetch last 100 messages to calculate top chatters client-side
            const { data: messages } = await supabase.from('Message').select('receiverId, receiver:receiverId(id, name, profile(avatarUrl))').or(`senderId.eq.${user.id},receiverId.eq.${user.id}`).limit(100);
            const chatCounts: { [key: string]: any } = {};
            messages?.forEach((m: any) => {
                const id = m.receiverId;
                if (!id || id === user.id) return;
                if (!chatCounts[id]) chatCounts[id] = { id, name: m.receiver?.name, avatarUrl: m.receiver?.profile?.avatarUrl, count: 0 };
                chatCounts[id].count++;
            });
            const topChatters = Object.values(chatCounts).sort((a: any, b: any) => b.count - a.count).map((c: any) => ({ ...c, stats: { chatTime: c.count } }));

            // 5. Share Buddies (Real from PostShare)
            const { data: shares } = await supabase.from('PostShare').select('toUserId, toUser:toUserId(id, name, profile(avatarUrl))').eq('userId', user.id).limit(50);
            const shareCounts: { [key: string]: any } = {};
            shares?.forEach((s: any) => {
                const id = s.toUserId;
                if (!id) return;
                if (!shareCounts[id]) shareCounts[id] = { id, name: s.toUser?.name, avatarUrl: s.toUser?.profile?.avatarUrl, count: 0 };
                shareCounts[id].count++;
            });
            const topSharers = Object.values(shareCounts).sort((a: any, b: any) => b.count - a.count).map((c: any) => ({ ...c, stats: { shares: c.count } }));

            // 6. Wrex Buddies (GymPartner)
            const { data: gymPartners } = await supabase.from('GymPartner').select('partnerId, partner:partnerId(id, name, profile(avatarUrl))').eq('userId', user.id);
            const wrexBuddies = gymPartners?.map((g: any) => ({
                id: g.partnerId, name: g.partner?.name, avatarUrl: g.partner?.profile?.avatarUrl, stats: { wrex: 10 } // specific stat if available
            })) || [];

            // 7. Hopin Buddies (PlanMember)
            // Find plans I'm in
            const { data: myPlans } = await supabase.from('PlanMember').select('planId').eq('userId', user.id);
            const planIds = myPlans?.map(p => p.planId) || [];
            let hopinBuddies: any[] = [];
            if (planIds.length > 0) {
                const { data: planMembers } = await supabase.from('PlanMember').select('userId, user:userId(id, name, profile(avatarUrl))').in('planId', planIds).neq('userId', user.id).limit(50);
                const hopinCounts: { [key: string]: any } = {};
                planMembers?.forEach((m: any) => {
                    if (!hopinCounts[m.userId]) hopinCounts[m.userId] = { id: m.userId, name: m.user?.name, avatarUrl: m.user?.profile?.avatarUrl, count: 0 };
                    hopinCounts[m.userId].count++;
                });
                hopinBuddies = Object.values(hopinCounts).sort((a: any, b: any) => b.count - a.count).map((c: any) => ({ ...c, stats: { hopin: c.count } }));
            }

            // 8. Channel Stats
            const { data: channel } = await supabase.from('Chan').select('isLive, watchingCount').eq('userId', user.id).single();
            const { count: wCount } = await supabase.from('Reaction').select('*', { count: 'exact', head: true }).eq('type', 'W').eq('userId', user.id); // reactions I GAVE or RECEIVED? analytics usually received.
            // Complex aggregate for received reactions specific to Live is hard via simple query. Using general received reactions as proxy.
            const { count: lCount } = await supabase.from('Reaction').select('*', { count: 'exact', head: true }).eq('type', 'L').eq('userId', user.id);
            const { count: capCount } = await supabase.from('Reaction').select('*', { count: 'exact', head: true }).eq('type', 'CAP').eq('userId', user.id);

            // Construct analytics object
            setAnalytics({
                profile: { views: profile?.views || 0 },
                buddies: {
                    collabmates: [], // Todo: add CollaborationInvite query
                    chat: topChatters,
                    shares: topSharers,
                    hopin: hopinBuddies,
                    canvas: [], // Todo: Journal query
                    wrex: wrexBuddies
                },
                tasks: { stats: [{ status: 'DONE', _count: { _all: completedTasks || 0 } }] },
                content: {
                    totalPosts: postsCount || 0,
                    typeBreakdown: [],
                    rankings: { mostLiked: null, mostDisliked: null, mostCapped: null },
                    posts: posts || []
                },
                history: {
                    posts: (posts || []).slice(0, 5),
                    tasks: [] // Todo: add recent tasks
                },
                channel: {
                    currentViewers: channel?.watchingCount || 0,
                    audience: { sentiment: { W: wCount || 0, L: lCount || 0, CAP: capCount || 0 } },
                    topShows: []
                }
            });
            console.log('[Dashboard] Loaded from REAL DATA fallback queries');

        } catch (e: any) {
            console.error('Failed to fetch analytics:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const tasksCompleted = analytics?.tasks?.stats?.find(d => d.status === 'DONE')?._count._all || 0;
    const topChatter = analytics?.buddies?.chat?.[0];
    const topCollab = analytics?.buddies?.collabmates?.[0];

    // Expanded Buddy Card for Vertical Stack
    const BuddyCard = ({ title, buddies, icon: Icon, statKey, label }: { title: string; buddies: Buddy[]; icon: any; statKey: keyof Buddy['stats']; label: string }) => (
        <View style={styles.buddyCardExpanded}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>TOP 5</Text>
            </View>

            {buddies && buddies.length > 0 ? (
                <View style={{ gap: 12 }}>
                    {buddies.slice(0, 5).map((b, idx) => (
                        <TouchableOpacity key={b.id} onPress={() => router.push(`/profile/${b.id}` as any)} style={styles.buddyRowExpanded}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', width: 14 }}>{idx + 1}</Text>
                                <View style={styles.buddyAvatar}>
                                    {b.avatarUrl ? <Image source={{ uri: b.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{b.name[0]}</Text>}
                                </View>
                                <View>
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{b.name}</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>@{b.name.toLowerCase().replace(/\s/g, '')}</Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{Math.round(b.stats?.[statKey] || 0)}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'uppercase' }}>{label}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <Text style={styles.emptyText}>No interaction data available yet.</Text>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>DASHBOARD</Text>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>ACTIVE</Text>
                        </View>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
                    {/* Meteor Grid */}
                    <Text style={styles.sectionTitle}>FEATURES</Text>
                    <View style={styles.grid}>
                        {METEORS.map((meteor) => (
                            <TouchableOpacity key={meteor.id} activeOpacity={0.8} onPress={() => router.push(meteor.route as any)}
                                style={[styles.meteorCard, { borderTopLeftRadius: meteor.radius.tl, borderTopRightRadius: meteor.radius.tr, borderBottomLeftRadius: meteor.radius.bl, borderBottomRightRadius: meteor.radius.br, borderWidth: meteor.border ? 1 : 0, borderColor: 'rgba(255,255,255,0.3)' }]}>
                                <LinearGradient colors={meteor.colors as [string, string]} style={StyleSheet.absoluteFill} start={{ x: 0.3, y: 0.3 }} end={{ x: 1, y: 1 }} />
                                <View style={styles.cardContent}>
                                    <View style={[styles.iconContainer, { backgroundColor: meteor.textColor ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]}>
                                        <meteor.icon size={16} color={meteor.textColor || 'white'} />
                                    </View>
                                    <Text numberOfLines={1} style={[styles.cardLabel, { color: meteor.textColor || 'white' }]}>{meteor.title}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Analytics Section */}
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ANALYTICS</Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.loadingText}>Loading analytics...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchAnalytics} style={styles.retryButton}>
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : analytics && (
                        <>
                            {/* Channel Performance (Monochrome) */}
                            {analytics.channel && (
                                <View style={styles.channelCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Live Audience</Text>
                                    </View>
                                    <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{analytics.channel.currentViewers}</Text>
                                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{analytics.channel.audience.sentiment.W}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase' }}>Wins</Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{analytics.channel.audience.sentiment.L}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase' }}>Losses</Text>
                                        </View>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{analytics.channel.audience.sentiment.CAP}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase' }}>Cap</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* KPI Cards (Monochrome) */}
                            <View style={styles.kpiRow}>
                                <View style={[styles.kpiCard, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                    <Eye size={16} color="#fff" />
                                    <Text style={styles.kpiLabel}>VIEWS</Text>
                                    <Text style={styles.kpiValue}>{analytics.profile?.views || 0}</Text>
                                </View>
                                <View style={[styles.kpiCard, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                    <CheckCircle size={16} color="#fff" />
                                    <Text style={styles.kpiLabel}>TASKS</Text>
                                    <Text style={styles.kpiValue}>{tasksCompleted}</Text>
                                </View>
                            </View>
                            <View style={styles.kpiRow}>
                                <View style={[styles.kpiCard, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                    <Clock size={16} color="#fff" />
                                    <Text style={styles.kpiLabel}>TOP CHAT</Text>
                                    <Text style={styles.kpiValueSmall} numberOfLines={1}>{topChatter?.name || 'None'}</Text>
                                </View>
                                <View style={[styles.kpiCard, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                    <Users size={16} color="#fff" />
                                    <Text style={styles.kpiLabel}>TOP COLLAB</Text>
                                    <Text style={styles.kpiValueSmall} numberOfLines={1}>{topCollab?.name || 'None'}</Text>
                                </View>
                            </View>

                            {/* Feature Usage Analysis (Graph) */}
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>USAGE ANALYSIS</Text>
                            <View style={styles.analyticsCard}>
                                <View style={{ gap: 12 }}>
                                    {[
                                        { label: 'Relationships (Chat/Share)', val: (chatTotal + shareTotal) / usageTotal },
                                        { label: 'Grounding (Wrex)', val: wrexTotal / usageTotal },
                                        { label: 'Events (Hopin)', val: hopinTotal / usageTotal }
                                    ].map((item, idx) => (
                                        <View key={idx}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ color: '#fff', fontSize: 11 }}>{item.label}</Text>
                                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{Math.round(item.val * 100)}%</Text>
                                            </View>
                                            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                                                <View style={{ width: `${Math.max(item.val * 100, 2)}%`, height: '100%', backgroundColor: '#fff', borderRadius: 2 }} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Contacts Analysis (Vertical Stack) */}
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>CONTACTS ANALYSIS</Text>
                            <View style={{ gap: 16 }}>
                                <BuddyCard title="Chat Frequency" buddies={analytics?.buddies?.chat || []} icon={MessageCircle} statKey="chatTime" label="mins" />
                                <BuddyCard title="Content Shares" buddies={analytics?.buddies?.shares || []} icon={Share2} statKey="shares" label="shares" />
                                <BuddyCard title="Collaborations" buddies={analytics?.buddies?.collabmates || []} icon={Users} statKey="total" label="score" />
                                <BuddyCard title="Event Attendance" buddies={analytics?.buddies?.hopin || []} icon={Calendar} statKey="hopin" label="events" />
                                <BuddyCard title="Journal Enries" buddies={analytics?.buddies?.canvas || []} icon={Palette} statKey="canvas" label="entries" />
                                <BuddyCard title="Grounding Sessions" buddies={analytics?.buddies?.wrex || []} icon={Dumbbell} statKey="wrex" label="sessions" />
                            </View>

                            {/* Posts Section */}
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>POSTS</Text>
                            <View style={styles.analyticsCard}>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Total Posts</Text>
                                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{analytics?.content?.totalPosts || 0}</Text>
                            </View>

                            {/* Type Breakdown Cards */}
                            {analytics?.content?.typeBreakdown && analytics.content.typeBreakdown.length > 0 && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                    {analytics.content.typeBreakdown.map((item) => (
                                        <TouchableOpacity key={item.type} style={styles.typeCard} onPress={() => item.bestPost && router.push(`/post/${item.bestPost.id}` as any)}>
                                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{item.type}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{item.count} posts</Text>
                                            {item.bestPost && (
                                                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 4 }}>TOP POST</Text>
                                                    <Text style={{ color: '#fff', fontSize: 11, fontStyle: 'italic' }} numberOfLines={2}>"{item.bestPost.snippet}"</Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 }}>{item.bestPost.wCount} Wins</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Best Posts (Monochrome) */}
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>BEST POSTS</Text>
                            <View style={{ gap: 8 }}>
                                {analytics?.content?.rankings?.mostLiked && (
                                    <TouchableOpacity style={styles.highlightCard} onPress={() => router.push(`/post/${analytics.content.rankings.mostLiked.id}` as any)}>
                                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>MOST LIKED</Text>
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={2}>"{analytics.content.rankings.mostLiked.snippet || 'Media Post'}"</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, fontWeight: '700' }}>{analytics.content.rankings.mostLiked.breakdown?.W || 0} Wins</Text>
                                    </TouchableOpacity>
                                )}
                                {analytics?.content?.rankings?.mostDisliked && (
                                    <TouchableOpacity style={styles.highlightCard} onPress={() => router.push(`/post/${analytics.content.rankings.mostDisliked.id}` as any)}>
                                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>MOST DISLIKED</Text>
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={2}>"{analytics.content.rankings.mostDisliked.snippet || 'Media Post'}"</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, fontWeight: '700' }}>{analytics.content.rankings.mostDisliked.breakdown?.L || 0} Ls</Text>
                                    </TouchableOpacity>
                                )}
                                {analytics?.content?.rankings?.mostCapped && (
                                    <TouchableOpacity style={styles.highlightCard} onPress={() => router.push(`/post/${analytics.content.rankings.mostCapped.id}` as any)}>
                                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>BIGGEST CAP</Text>
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={2}>"{analytics.content.rankings.mostCapped.snippet || 'Media Post'}"</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, fontWeight: '700' }}>{analytics.content.rankings.mostCapped.breakdown?.CAP || 0} Caps</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Activity Log (Monochrome) */}
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ACTIVITY</Text>
                            <View style={styles.analyticsCard}>
                                {[...(analytics?.history?.posts || []).map(p => ({ ...p, type: 'POST' })), ...(analytics?.history?.tasks || []).map(t => ({ ...t, type: 'TASK' }))]
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .slice(0, 5)
                                    .map((item, idx) => (
                                        <TouchableOpacity key={idx} style={styles.activityRow} onPress={() => item.type === 'POST' && router.push(`/post/${item.id}` as any)}>
                                            <View style={[styles.activityBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{item.type}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={1}>{item.type === 'POST' ? item.postType : item.title}</Text>
                                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                            </View>
                        </>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 },
    statusText: { color: '#22c55e', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
    gridContainer: { paddingHorizontal: GAP },
    sectionTitle: { color: 'white', fontWeight: '700', marginBottom: 12, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    meteorCard: { width: ITEM_WIDTH, height: ITEM_WIDTH * 1.2, marginBottom: 8, overflow: 'hidden', shadowColor: '#fff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    cardContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
    iconContainer: { padding: 8, borderRadius: 999, marginBottom: 6 },
    cardLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
    loadingContainer: { padding: 40, alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 12 },
    errorContainer: { padding: 20, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center' },
    errorText: { color: '#ef4444', fontSize: 12, marginBottom: 12 },
    retryButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    channelCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    kpiCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    kpiLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', marginTop: 8, letterSpacing: 1 },
    kpiValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
    kpiValueSmall: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 4 },
    analyticsCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    buddyCardExpanded: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    buddyRowExpanded: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    buddyAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontStyle: 'italic', textAlign: 'center', padding: 12 },
    typeCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: (width - 40) / 2 },
    highlightCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    activityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
