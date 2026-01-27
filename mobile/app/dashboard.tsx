import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl } from '../lib/api';
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
    CheckCircle,
    Users,
    MessageCircle,
    Share2,
    Dumbbell,
    TrendingUp,
    Award,
    Calendar,
    Activity,
    UserPlus,
    BarChart3
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const GAP = 12;
const ITEM_WIDTH = (width - (GAP * 5)) / 4;

// Quick Action Buttons (horizontal pills)
const QUICK_ACTIONS = [
    { id: 'store', title: 'My Store', icon: ShoppingBag, route: '/dashboard/store', bg: '#1a1a1a' },
    { id: 'channel', title: 'Channel', icon: Tv, route: '/channel', bg: '#fff', textColor: '#000' },
    { id: 'connections', title: 'Connections', icon: Heart, route: '/bonds', bg: '#dc2626' },
];

interface TopChatter { id: string; name: string; avatarUrl: string | null; chatTime: number; messageCount: number; }
interface TopPost { id: string; content: string; count: number; postType: string; }
interface TopInteractor { id: string; name: string; avatarUrl: string | null; interactions: number; }

interface DashboardData {
    // Connections
    followersCount: number;
    followingCount: number;
    chatsToday: number;
    chatsPast7Days: number;

    // Tasks
    tasksCompleted: number;
    tasksPending: number;

    // Top Chatters
    topChatters: TopChatter[];

    // Wrex (Grounding)
    workoutDays: number;
    currentDietPlan: string | null;
    bodyMetrics: { weight?: number; height?: number; bmi?: number; };
    recentHealthIssues: string[];

    // Hopin
    invitesReceived: number;
    eventsAttended: number;

    // Posts
    topWPost: TopPost | null;
    topLPost: TopPost | null;
    mostCappedPost: TopPost | null;
    mostSharedPost: TopPost | null;
    mostViewedPost: TopPost | null;
    postTypeDivision: { type: string; count: number }[];
    bestAudience: TopInteractor[];
    totalPosts: number;
    profile: { avatarUrl: string } | null;
}

export default function DashboardScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setError('Not authenticated'); setLoading(false); return; }

            // Fetch all data in parallel
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Connections: Followers/Following
            const [
                { data: profile },
                { count: followersCount },
                { count: followingCount }
            ] = await Promise.all([
                supabase.from('Profile').select('*').eq('userId', user.id).single(),
                supabase.from('Subscription').select('*', { count: 'exact', head: true }).eq('subscribedToId', user.id),
                supabase.from('Subscription').select('*', { count: 'exact', head: true }).eq('subscriberId', user.id)
            ]);

            // Chat stats
            const { data: messagesAll } = await supabase
                .from('Message')
                .select('id, createdAt, senderId, receiverId, sender:senderId(id, name, profile:Profile(avatarUrl)), receiver:receiverId(id, name, profile:Profile(avatarUrl))')
                .or(`senderId.eq.${user.id},receiverId.eq.${user.id}`)
                .order('createdAt', { ascending: false })
                .limit(500);

            const chatsToday = messagesAll?.filter(m => new Date(m.createdAt) >= today).length || 0;
            const chatsPast7Days = messagesAll?.filter(m => new Date(m.createdAt) >= sevenDaysAgo).length || 0;

            // Top Chatters
            const chatCounts: { [key: string]: any } = {};
            messagesAll?.forEach((m: any) => {
                const otherId = m.senderId === user.id ? m.receiverId : m.senderId;
                const other = m.senderId === user.id ? m.receiver : m.sender;
                if (!otherId || otherId === user.id) return;
                if (!chatCounts[otherId]) chatCounts[otherId] = {
                    id: otherId,
                    name: other?.name || 'Unknown',
                    avatarUrl: other?.profile?.avatarUrl,
                    messageCount: 0,
                    chatTime: 0
                };
                chatCounts[otherId].messageCount++;
                // Estimate chat time: ~15 seconds per message
                chatCounts[otherId].chatTime += 15;
            });
            const topChatters = Object.values(chatCounts)
                .sort((a: any, b: any) => b.messageCount - a.messageCount)
                .slice(0, 3) as TopChatter[];

            // Tasks
            const [
                { count: tasksCompleted },
                { count: tasksPending }
            ] = await Promise.all([
                supabase.from('Task').select('*', { count: 'exact', head: true }).eq('creatorId', user.id).eq('status', 'DONE'),
                supabase.from('Task').select('*', { count: 'exact', head: true }).eq('creatorId', user.id).neq('status', 'DONE')
            ]);

            // Wrex (Grounding) - Workout sessions, diet, health
            const { count: workoutDays } = await supabase
                .from('WorkoutSession')
                .select('*', { count: 'exact', head: true })
                .eq('userId', user.id);

            const { data: dietPlan } = await supabase
                .from('DietPlan')
                .select('name')
                .eq('userId', user.id)
                .order('createdAt', { ascending: false })
                .limit(1)
                .single();

            const { data: biometrics } = await supabase
                .from('BiometricLog')
                .select('weight, height')
                .eq('userId', user.id)
                .order('date', { ascending: false })
                .limit(1)
                .single();

            const { data: healthIssues } = await supabase
                .from('HealthCondition')
                .select('name')
                .eq('userId', user.id)
                .limit(5);

            // Hopin - Invites and attended events
            const [
                { count: invitesReceived },
                { count: eventsAttended }
            ] = await Promise.all([
                supabase.from('PlanMember').select('*', { count: 'exact', head: true }).eq('userId', user.id).eq('status', 'PENDING'),
                supabase.from('PlanMember').select('*', { count: 'exact', head: true }).eq('userId', user.id).in('status', ['ACCEPTED', 'VERIFIED'])
            ]);

            // Posts with reactions
            const { data: posts } = await supabase
                .from('Post')
                .select('id, content, postType, viewCount')
                .eq('userId', user.id);

            const postIds = posts?.map(p => p.id) || [];

            // Get reaction counts per post
            let postReactions: any[] = [];
            let postShares: any[] = [];
            if (postIds.length > 0) {
                const { data: reactions } = await supabase
                    .from('Reaction')
                    .select('postId, type')
                    .in('postId', postIds);
                postReactions = reactions || [];

                const { data: shares } = await supabase
                    .from('PostShare')
                    .select('postId')
                    .in('postId', postIds);
                postShares = shares || [];
            }

            // Calculate top posts
            const postStats: { [key: string]: { w: number; l: number; cap: number; shares: number; views: number; content: string; postType: string } } = {};
            posts?.forEach(p => {
                postStats[p.id] = { w: 0, l: 0, cap: 0, shares: 0, views: p.viewCount || 0, content: p.content || '', postType: p.postType || 'POST' };
            });
            postReactions.forEach((r: any) => {
                if (postStats[r.postId]) {
                    if (r.type === 'W') postStats[r.postId].w++;
                    if (r.type === 'L') postStats[r.postId].l++;
                    if (r.type === 'CAP') postStats[r.postId].cap++;
                }
            });
            postShares.forEach((s: any) => {
                if (postStats[s.postId]) postStats[s.postId].shares++;
            });

            const sortedByW = Object.entries(postStats).sort((a, b) => b[1].w - a[1].w);
            const sortedByL = Object.entries(postStats).sort((a, b) => b[1].l - a[1].l);
            const sortedByCap = Object.entries(postStats).sort((a, b) => b[1].cap - a[1].cap);
            const sortedByShares = Object.entries(postStats).sort((a, b) => b[1].shares - a[1].shares);
            const sortedByViews = Object.entries(postStats).sort((a, b) => b[1].views - a[1].views);

            const makeTopPost = (entry: [string, any] | undefined): TopPost | null => {
                if (!entry) return null;
                return { id: entry[0], content: entry[1].content, count: entry[1].w || entry[1].l || entry[1].cap || entry[1].shares || entry[1].views, postType: entry[1].postType };
            };

            // Post type division
            const typeCounts: { [key: string]: number } = {};
            posts?.forEach(p => {
                const t = p.postType || 'POST';
                typeCounts[t] = (typeCounts[t] || 0) + 1;
            });
            const postTypeDivision = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

            // Best audience - top 5 users who interact most
            const interactorCounts: { [key: string]: any } = {};
            if (postIds.length > 0) {
                const { data: allReactions } = await supabase
                    .from('Reaction')
                    .select('userId, user:userId(id, name, profile:Profile(avatarUrl))')
                    .in('postId', postIds);

                allReactions?.forEach((r: any) => {
                    if (r.userId === user.id) return;
                    if (!interactorCounts[r.userId]) {
                        interactorCounts[r.userId] = { id: r.userId, name: r.user?.name || 'Unknown', avatarUrl: r.user?.profile?.avatarUrl, interactions: 0 };
                    }
                    interactorCounts[r.userId].interactions++;
                });
            }
            const bestAudience = Object.values(interactorCounts)
                .sort((a: any, b: any) => b.interactions - a.interactions)
                .slice(0, 5) as TopInteractor[];

            // Set data
            setData({
                followersCount: followersCount || 0,
                followingCount: followingCount || 0,
                chatsToday,
                chatsPast7Days,
                tasksCompleted: tasksCompleted || 0,
                tasksPending: tasksPending || 0,
                topChatters,
                workoutDays: workoutDays || 0,
                currentDietPlan: dietPlan?.name || null,
                bodyMetrics: {
                    weight: biometrics?.weight,
                    height: biometrics?.height,
                    bmi: biometrics?.weight && biometrics?.height ?
                        Math.round((biometrics.weight / ((biometrics.height / 100) ** 2)) * 10) / 10 : undefined
                },
                recentHealthIssues: healthIssues?.map(h => h.name) || [],
                invitesReceived: invitesReceived || 0,
                eventsAttended: eventsAttended || 0,
                topWPost: makeTopPost(sortedByW[0]),
                topLPost: makeTopPost(sortedByL[0]),
                mostCappedPost: makeTopPost(sortedByCap[0]),
                mostSharedPost: sortedByShares[0] ? { ...makeTopPost(sortedByShares[0])!, count: sortedByShares[0][1].shares } : null,
                mostViewedPost: sortedByViews[0] ? { ...makeTopPost(sortedByViews[0])!, count: sortedByViews[0][1].views } : null,
                postTypeDivision,
                bestAudience,
                totalPosts: posts?.length || 0,
                profile: profile || null
            });

        } catch (e: any) {
            console.error('Dashboard error:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) => (
        <View style={styles.statCard}>
            <Icon size={18} color="#fff" />
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
            {sub && <Text style={styles.statSub}>{sub}</Text>}
        </View>
    );

    const SectionTitle = ({ children }: { children: string }) => (
        <Text style={styles.sectionTitle}>{children}</Text>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
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
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                        {data?.profile?.avatarUrl ? (
                            <Image source={{ uri: data.profile.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#333' }} />
                        ) : (
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#888', fontWeight: 'bold' }}>U</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    {/* Quick Action Pills */}
                    <View style={styles.pillsRow}>
                        {QUICK_ACTIONS.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                activeOpacity={0.8}
                                onPress={() => router.push(action.route as any)}
                                style={[styles.pillButton, { backgroundColor: action.bg, borderColor: action.bg === '#1a1a1a' ? 'rgba(255,255,255,0.2)' : 'transparent' }]}
                            >
                                <action.icon size={18} color={action.textColor || '#fff'} />
                                <Text style={[styles.pillText, { color: action.textColor || '#fff' }]}>{action.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.loadingText}>Loading analytics...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorWrap}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchDashboardData} style={styles.retryBtn}>
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : data && (
                        <>
                            {/* Analytics Overview */}
                            <SectionTitle>ANALYTICS</SectionTitle>
                            <View style={styles.statsRow}>
                                <StatCard icon={CheckCircle} label="TASKS DONE" value={data.tasksCompleted} sub={`${data.tasksPending} pending`} />
                                <StatCard icon={BarChart3} label="TOTAL POSTS" value={data.totalPosts} />
                            </View>

                            {/* Top Chatters */}
                            <SectionTitle>TOP CHAT</SectionTitle>
                            <View style={styles.card}>
                                {data.topChatters.length > 0 ? (
                                    data.topChatters.map((c, idx) => (
                                        <TouchableOpacity key={c.id} onPress={() => router.push(`/chat` as any)} style={styles.chatRow}>
                                            <View style={styles.chatRank}><Text style={styles.rankText}>{idx + 1}</Text></View>
                                            <View style={styles.avatar}>
                                                {c.avatarUrl ? <Image source={{ uri: c.avatarUrl }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{c.name[0]}</Text>}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.chatName}>{c.name}</Text>
                                                <Text style={styles.chatSub}>{c.messageCount} messages</Text>
                                            </View>
                                            <View style={styles.chatCount}>
                                                <Text style={styles.countValue}>{formatChatTime(c.chatTime)}</Text>
                                                <Text style={styles.countLabel}>time</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyChatState}>
                                        <MessageCircle size={32} color="rgba(255,255,255,0.2)" />
                                        <Text style={styles.emptyChatTitle}>No chats yet</Text>
                                        <Text style={styles.emptyChatSub}>Start chatting with others to see your top contacts here</Text>
                                        <TouchableOpacity onPress={() => router.push('/chat' as any)} style={styles.startChatBtn}>
                                            <Text style={styles.startChatText}>Start Chatting</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Connections */}
                            <SectionTitle>CONNECTIONS</SectionTitle>
                            <View style={styles.statsRow}>
                                <StatCard icon={Users} label="FOLLOWERS" value={data.followersCount} />
                                <StatCard icon={UserPlus} label="FOLLOWING" value={data.followingCount} />
                            </View>
                            <View style={styles.statsRow}>
                                <StatCard icon={MessageCircle} label="CHATS TODAY" value={data.chatsToday} />
                                <StatCard icon={Share2} label="PAST 7 DAYS" value={data.chatsPast7Days} sub="messages" />
                            </View>

                            {/* Wrex (Grounding) */}
                            <SectionTitle>GROUNDING</SectionTitle>
                            <View style={styles.card}>
                                <View style={styles.wrexRow}>
                                    <Dumbbell size={20} color="#22c55e" />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.wrexLabel}>WORKOUT DAYS</Text>
                                        <Text style={styles.wrexValue}>{data.workoutDays} sessions</Text>
                                    </View>
                                </View>
                                {data.currentDietPlan && (
                                    <View style={styles.wrexRow}>
                                        <Activity size={20} color="#f59e0b" />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.wrexLabel}>CURRENT DIET</Text>
                                            <Text style={styles.wrexValue}>{data.currentDietPlan}</Text>
                                        </View>
                                    </View>
                                )}
                                {(data.bodyMetrics.weight || data.bodyMetrics.height) && (
                                    <View style={styles.wrexRow}>
                                        <TrendingUp size={20} color="#3b82f6" />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.wrexLabel}>BODY METRICS</Text>
                                            <Text style={styles.wrexValue}>
                                                {data.bodyMetrics.weight ? `${data.bodyMetrics.weight}kg` : ''}
                                                {data.bodyMetrics.height ? ` / ${data.bodyMetrics.height}cm` : ''}
                                                {data.bodyMetrics.bmi ? ` (BMI: ${data.bodyMetrics.bmi})` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {data.recentHealthIssues.length > 0 && (
                                    <View style={[styles.wrexRow, { borderBottomWidth: 0 }]}>
                                        <Heart size={20} color="#ef4444" />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.wrexLabel}>HEALTH CONDITIONS</Text>
                                            <Text style={styles.wrexValue}>{data.recentHealthIssues.join(', ')}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Hopin */}
                            <SectionTitle>EVENTS</SectionTitle>
                            <View style={styles.statsRow}>
                                <StatCard icon={Calendar} label="INVITES" value={data.invitesReceived} sub="pending" />
                                <StatCard icon={Award} label="ATTENDED" value={data.eventsAttended} sub="events" />
                            </View>

                            {/* Posts */}
                            <SectionTitle>POSTS</SectionTitle>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>TOP PERFORMING</Text>
                                {data.topWPost && (
                                    <TouchableOpacity onPress={() => router.push(`/post/${data.topWPost!.id}` as any)} style={styles.postRow}>
                                        <View style={[styles.postBadge, { backgroundColor: '#22c55e20' }]}><Text style={[styles.badgeText, { color: '#22c55e' }]}>W</Text></View>
                                        <View style={{ flex: 1 }}><Text style={styles.postContent} numberOfLines={1}>{data.topWPost.content || 'Media Post'}</Text></View>
                                        <Text style={styles.postCount}>{sortedPostCount(data, 'W')} wins</Text>
                                    </TouchableOpacity>
                                )}
                                {data.topLPost && (
                                    <TouchableOpacity onPress={() => router.push(`/post/${data.topLPost!.id}` as any)} style={styles.postRow}>
                                        <View style={[styles.postBadge, { backgroundColor: '#ef444420' }]}><Text style={[styles.badgeText, { color: '#ef4444' }]}>L</Text></View>
                                        <View style={{ flex: 1 }}><Text style={styles.postContent} numberOfLines={1}>{data.topLPost.content || 'Media Post'}</Text></View>
                                        <Text style={styles.postCount}>{sortedPostCount(data, 'L')} Ls</Text>
                                    </TouchableOpacity>
                                )}
                                {data.mostCappedPost && (
                                    <TouchableOpacity onPress={() => router.push(`/post/${data.mostCappedPost!.id}` as any)} style={styles.postRow}>
                                        <View style={[styles.postBadge, { backgroundColor: '#3b82f620' }]}><Text style={[styles.badgeText, { color: '#3b82f6' }]}>CAP</Text></View>
                                        <View style={{ flex: 1 }}><Text style={styles.postContent} numberOfLines={1}>{data.mostCappedPost.content || 'Media Post'}</Text></View>
                                        <Text style={styles.postCount}>{sortedPostCount(data, 'CAP')} caps</Text>
                                    </TouchableOpacity>
                                )}
                                {data.mostSharedPost && (
                                    <TouchableOpacity onPress={() => router.push(`/post/${data.mostSharedPost!.id}` as any)} style={styles.postRow}>
                                        <View style={[styles.postBadge, { backgroundColor: '#f59e0b20' }]}><Text style={[styles.badgeText, { color: '#f59e0b' }]}>SHARE</Text></View>
                                        <View style={{ flex: 1 }}><Text style={styles.postContent} numberOfLines={1}>{data.mostSharedPost.content || 'Media Post'}</Text></View>
                                        <Text style={styles.postCount}>{data.mostSharedPost.count} shares</Text>
                                    </TouchableOpacity>
                                )}
                                {data.mostViewedPost && (
                                    <TouchableOpacity onPress={() => router.push(`/post/${data.mostViewedPost!.id}` as any)} style={[styles.postRow, { borderBottomWidth: 0 }]}>
                                        <View style={[styles.postBadge, { backgroundColor: '#ffffff10' }]}><Text style={[styles.badgeText, { color: '#fff' }]}>VIEW</Text></View>
                                        <View style={{ flex: 1 }}><Text style={styles.postContent} numberOfLines={1}>{data.mostViewedPost.content || 'Media Post'}</Text></View>
                                        <Text style={styles.postCount}>{data.mostViewedPost.count} views</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Post Type Division */}
                            {data.postTypeDivision.length > 0 && (
                                <View style={[styles.card, { marginTop: 12 }]}>
                                    <Text style={styles.cardTitle}>POST TYPES</Text>
                                    <View style={styles.typesWrap}>
                                        {data.postTypeDivision.map((t) => (
                                            <View key={t.type} style={styles.typeChip}>
                                                <Text style={styles.typeText}>{t.type}</Text>
                                                <Text style={styles.typeCount}>{t.count}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Best Audience */}
                            {data.bestAudience.length > 0 && (
                                <>
                                    <SectionTitle>BEST AUDIENCE</SectionTitle>
                                    <View style={styles.card}>
                                        {data.bestAudience.map((a, idx) => (
                                            <TouchableOpacity key={a.id} onPress={() => router.push(`/profile/${a.id}` as any)} style={styles.chatRow}>
                                                <View style={styles.chatRank}><Text style={styles.rankText}>{idx + 1}</Text></View>
                                                <View style={styles.avatar}>
                                                    {a.avatarUrl ? <Image source={{ uri: a.avatarUrl }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{a.name[0]}</Text>}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.chatName}>{a.name}</Text>
                                                </View>
                                                <View style={styles.chatCount}>
                                                    <Text style={styles.countValue}>{a.interactions}</Text>
                                                    <Text style={styles.countLabel}>reactions</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                        </>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// Helper to get sorted count
function sortedPostCount(data: DashboardData, type: 'W' | 'L' | 'CAP'): number {
    if (type === 'W' && data.topWPost) return data.topWPost.count;
    if (type === 'L' && data.topLPost) return data.topLPost.count;
    if (type === 'CAP' && data.mostCappedPost) return data.mostCappedPost.count;
    return 0;
}

// Helper to format chat time
function formatChatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: GAP },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 },
    statusText: { color: '#22c55e', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
    sectionTitle: { color: 'white', fontWeight: '700', marginBottom: 12, marginTop: 24, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    featureCard: { width: ITEM_WIDTH, height: ITEM_WIDTH * 1.2, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    featureContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
    iconWrap: { padding: 8, borderRadius: 999, marginBottom: 6 },
    featureLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
    loadingWrap: { padding: 40, alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 12 },
    errorWrap: { padding: 20, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center' },
    errorText: { color: '#ef4444', fontSize: 12, marginBottom: 12 },
    retryBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', marginTop: 8, letterSpacing: 0.5 },
    statValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
    statSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
    chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    chatRank: { width: 20, alignItems: 'center' },
    rankText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden' },
    avatarImg: { width: 36, height: 36, borderRadius: 18 },
    avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    chatName: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 12 },
    chatCount: { alignItems: 'flex-end' },
    countValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
    countLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'uppercase' },
    emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
    wrexRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    wrexLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    wrexValue: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
    postRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 10 },
    postBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    postContent: { color: '#fff', fontSize: 13 },
    postCount: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
    typesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    typeCount: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
    // Pills
    pillsRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8 },
    pillButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 25, borderWidth: 1 },
    pillText: { fontSize: 12, fontWeight: '700' },
    // Chat empty state
    chatSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 12 },
    emptyChatState: { alignItems: 'center', paddingVertical: 24 },
    emptyChatTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 12 },
    emptyChatSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16, maxWidth: 200 },
    startChatBtn: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    startChatText: { color: '#000', fontSize: 13, fontWeight: '700' },
});
