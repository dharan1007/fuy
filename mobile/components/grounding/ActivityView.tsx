import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Dimensions,
    Alert, TextInput, FlatList, RefreshControl
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
    Play, Activity, TrendingUp, Flame, MapPin, Timer, Users, Search,
    UserPlus, X, ChevronRight, Share2, Mountain
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activityTracker, ActivitySession, ActivityType } from '../../services/ActivityTrackingService';
import ActivityTrackingService from '../../services/ActivityTrackingService';
import { ActivityService, ActivityRecord, GroupActivityRecord } from '../../services/ActivityService';
import LiveTrackingScreen from './LiveTrackingScreen';
import ActivitySummaryScreen from './ActivitySummaryScreen';
import ActivityHistoryList from './ActivityHistoryList';
import ActivityShareCard from './ActivityShareCard';
import { ActivityFeedCard, CommentSection } from './ActivityFeedCard';
import ActivityMapView from './ActivityMapView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewState = 'main' | 'tracking' | 'summary' | 'share' | 'detail';
type SubTab = 'history' | 'feed' | 'groups';

export default function ActivityView() {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    const colors = isDark ? {
        background: '#0B0B0B',
        surface: '#161616',
        surfaceAlt: '#1C1C1C',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accent: '#FFFFFF',
        accentSubtle: '#2A2A2A',
    } : {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        surfaceAlt: '#F0F0F0',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#000000',
        accentSubtle: '#F0F0F0',
    };

    const [viewState, setViewState] = useState<ViewState>('main');
    const [subTab, setSubTab] = useState<SubTab>('history');
    const [localHistory, setLocalHistory] = useState<ActivitySession[]>([]);
    const [cloudHistory, setCloudHistory] = useState<ActivityRecord[]>([]);
    const [feedActivities, setFeedActivities] = useState<ActivityRecord[]>([]);
    const [groups, setGroups] = useState<GroupActivityRecord[]>([]);
    const [selectedSession, setSelectedSession] = useState<ActivitySession | null>(null);
    const [detailActivity, setDetailActivity] = useState<ActivityRecord | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string>('');

    // Tag modal
    const [showTagModal, setShowTagModal] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [taggedIds, setTaggedIds] = useState<string[]>([]);
    const [pendingSession, setPendingSession] = useState<ActivitySession | null>(null);

    // Group modal
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');

    // Load user ID and data on mount
    useEffect(() => {
        loadUserId();
        loadLocalHistory();
        loadCloudData();

        // Restore in-progress session
        activityTracker.restoreSession().then(hasSession => {
            if (hasSession) setViewState('tracking');
        });
    }, []);

    const loadUserId = async () => {
        try {
            const stored = await AsyncStorage.getItem('wrex_user_id');
            if (stored) {
                setUserId(stored);
            } else {
                // Try to get from supabase auth
                const { supabase } = require('../../lib/supabase');
                const { data } = await supabase.auth.getUser();
                if (data?.user?.id) {
                    setUserId(data.user.id);
                    await AsyncStorage.setItem('wrex_user_id', data.user.id);
                }
            }
        } catch (e) {
            console.log('[ActivityView] No user ID found, using local-only mode');
        }
    };

    const loadLocalHistory = async () => {
        const activities = await activityTracker.getHistory();
        setLocalHistory(activities);
    };

    const loadCloudData = async () => {
        try {
            if (!userId) return;
            const [history, feed, myGroups] = await Promise.all([
                ActivityService.getUserActivities(userId),
                ActivityService.getActivityFeed(0, 20, userId),
                ActivityService.getMyGroups(userId),
            ]);
            setCloudHistory(history);
            setFeedActivities(feed);
            setGroups(myGroups);
        } catch (e) {
            console.log('[ActivityView] Cloud data fetch failed (offline mode):', e);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadLocalHistory();
        await loadCloudData();
        setRefreshing(false);
    };

    useEffect(() => {
        if (userId) loadCloudData();
    }, [userId]);

    // --- Actions ---

    const handleStartActivity = () => setViewState('tracking');

    const handleFinishActivity = useCallback(async (session: ActivitySession) => {
        // Show tag modal before saving
        setPendingSession(session);
        setSelectedSession(session);
        setViewState('summary');

        // Try to sync to Supabase
        if (userId) {
            try {
                session.userId = userId;
                await ActivityService.saveActivity(session);
                console.log('[ActivityView] Activity synced to Supabase');
                loadCloudData();
            } catch (e) {
                console.log('[ActivityView] Supabase sync failed (saved locally):', e);
            }
        }

        loadLocalHistory();
    }, [userId]);

    const handleDiscardActivity = () => setViewState('main');

    const handleCloseSummary = () => {
        setSelectedSession(null);
        setPendingSession(null);
        setViewState('main');
    };

    const handleOpenShareCard = () => {
        if (selectedSession) setViewState('share');
    };

    const handleCloseShareCard = () => {
        if (selectedSession) setViewState('summary');
        else setViewState('main');
    };

    const handleSelectLocal = (activity: ActivitySession) => {
        setSelectedSession(activity);
        setViewState('summary');
    };

    const handleSelectCloud = async (activity: ActivityRecord) => {
        // Fetch full details with GPS points
        const full = await ActivityService.getActivityById(activity.id);
        if (full && full.points) {
            const session: ActivitySession = {
                id: full.id,
                userId: full.userId,
                activityType: full.activityType as ActivityType,
                startTime: new Date(full.startTime).getTime(),
                endTime: full.endTime ? new Date(full.endTime).getTime() : null,
                distance: full.distance,
                duration: full.duration,
                avgPace: full.avgPace,
                calories: full.calories,
                elevationGain: full.elevationGain,
                points: full.points,
                status: 'finished',
                taggedUsers: full.taggedUsers?.map(t => t.userId) || [],
                privacyLevel: full.privacyLevel as any,
            };
            setSelectedSession(session);
            setViewState('summary');
        }
    };

    const handleDeleteLocal = async (id: string) => {
        Alert.alert('Delete Activity', 'Remove this activity?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await activityTracker.deleteActivity(id);
                    if (userId) await ActivityService.deleteActivity(id);
                    loadLocalHistory();
                    loadCloudData();
                }
            },
        ]);
    };

    const handleLike = async (activityId: string) => {
        if (!userId) return;
        await ActivityService.toggleLike(activityId, userId);
        loadCloudData();
    };

    // Tag search
    const handleTagSearch = async (query: string) => {
        setTagSearch(query);
        if (query.length >= 2) {
            const results = await ActivityService.searchUsers(query);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const handleTagUser = (uid: string) => {
        setTaggedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    const handleConfirmTags = async () => {
        if (pendingSession && taggedIds.length > 0 && userId) {
            await ActivityService.tagUsers(pendingSession.id, taggedIds);
        }
        setShowTagModal(false);
        setTaggedIds([]);
        setTagSearch('');
    };

    // Group actions
    const handleCreateGroup = async () => {
        if (!groupName.trim() || !userId) return;
        const group = await ActivityService.createGroupActivity(userId, groupName.trim(), 'run');
        if (group) {
            Alert.alert('Group Created', `Invite code: ${group.inviteCode}`);
            setGroupName('');
            setShowGroupModal(false);
            loadCloudData();
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim() || !userId) return;
        const group = await ActivityService.joinGroupActivity(joinCode.trim().toUpperCase(), userId);
        if (group) {
            Alert.alert('Joined', `You joined ${group.name}`);
            setJoinCode('');
            setShowGroupModal(false);
            loadCloudData();
        } else {
            Alert.alert('Error', 'Invalid or expired invite code');
        }
    };

    // --- Stats ---
    const totalDistance = localHistory.reduce((sum, a) => sum + a.distance, 0);
    const totalActivities = localHistory.length;
    const totalCalories = localHistory.reduce((sum, a) => sum + a.calories, 0);
    const totalDuration = localHistory.reduce((sum, a) => sum + a.duration, 0);

    // --- Fullscreen modals ---
    if (viewState === 'tracking') {
        return (
            <Modal visible animationType="slide" presentationStyle="fullScreen">
                <LiveTrackingScreen onFinish={handleFinishActivity} onDiscard={handleDiscardActivity} isDark={isDark} />
            </Modal>
        );
    }

    if (viewState === 'summary' && selectedSession) {
        return (
            <Modal visible animationType="slide" presentationStyle="fullScreen">
                <ActivitySummaryScreen
                    session={selectedSession}
                    onClose={handleCloseSummary}
                    onShareCard={handleOpenShareCard}
                    onTagFriends={() => {
                        setPendingSession(selectedSession);
                        setShowTagModal(true);
                    }}
                    isDark={isDark}
                />
            </Modal>
        );
    }

    if (viewState === 'share' && selectedSession) {
        return (
            <Modal visible animationType="slide" presentationStyle="fullScreen">
                <ActivityShareCard session={selectedSession} onClose={handleCloseShareCard} isDark={isDark} />
            </Modal>
        );
    }

    // --- Main View ---
    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
            >
                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity onPress={handleStartActivity} style={[styles.primaryAction, { backgroundColor: colors.accent }]}>
                        <Play size={16} color={colors.background} fill={colors.background} />
                        <Text style={[styles.primaryActionText, { color: colors.background }]}>Start Activity</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowGroupModal(true)} style={[styles.secondaryAction, { backgroundColor: colors.accentSubtle }]}>
                        <Users size={16} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Summary Stats */}
                {totalActivities > 0 && (
                    <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>ALL TIME</Text>
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryItem}>
                                <MapPin size={14} color={colors.textTertiary} />
                                <Text style={[styles.summaryValue, { color: colors.text }]}>{(totalDistance / 1000).toFixed(1)}</Text>
                                <Text style={[styles.summaryUnit, { color: colors.textTertiary }]}>km</Text>
                            </View>
                            <View style={[styles.summaryDivider, { backgroundColor: colors.accentSubtle }]} />
                            <View style={styles.summaryItem}>
                                <Activity size={14} color={colors.textTertiary} />
                                <Text style={[styles.summaryValue, { color: colors.text }]}>{totalActivities}</Text>
                                <Text style={[styles.summaryUnit, { color: colors.textTertiary }]}>total</Text>
                            </View>
                            <View style={[styles.summaryDivider, { backgroundColor: colors.accentSubtle }]} />
                            <View style={styles.summaryItem}>
                                <Flame size={14} color={colors.textTertiary} />
                                <Text style={[styles.summaryValue, { color: colors.text }]}>{totalCalories.toLocaleString()}</Text>
                                <Text style={[styles.summaryUnit, { color: colors.textTertiary }]}>cal</Text>
                            </View>
                            <View style={[styles.summaryDivider, { backgroundColor: colors.accentSubtle }]} />
                            <View style={styles.summaryItem}>
                                <Timer size={14} color={colors.textTertiary} />
                                <Text style={[styles.summaryValue, { color: colors.text }]}>{Math.floor(totalDuration / 3600)}</Text>
                                <Text style={[styles.summaryUnit, { color: colors.textTertiary }]}>hrs</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Latest Activity Preview */}
                {localHistory.length > 0 && localHistory[0].points.length >= 2 && (
                    <TouchableOpacity
                        onPress={() => handleSelectLocal(localHistory[0])}
                        style={[styles.recentCard, { backgroundColor: colors.surface }]}
                        activeOpacity={0.8}
                    >
                        <View style={styles.recentHeader}>
                            <View>
                                <Text style={[styles.recentLabel, { color: colors.textSecondary }]}>LATEST</Text>
                                <Text style={[styles.recentType, { color: colors.text }]}>
                                    {ActivityTrackingService.getActivityLabel(localHistory[0].activityType)}
                                </Text>
                            </View>
                            <View style={styles.recentStats}>
                                <Text style={[styles.recentDist, { color: colors.text }]}>
                                    {(localHistory[0].distance / 1000).toFixed(2)} km
                                </Text>
                                <Text style={[styles.recentDuration, { color: colors.textSecondary }]}>
                                    {ActivityTrackingService.formatDuration(localHistory[0].duration)}
                                </Text>
                            </View>
                        </View>
                        <ActivityMapView
                            points={localHistory[0].points}
                            showUserLocation={false}
                            isDark={isDark}
                            style={styles.recentMap}
                        />
                    </TouchableOpacity>
                )}

                {/* Sub-tabs: History / Feed / Groups */}
                <View style={[styles.subTabs, { backgroundColor: colors.accentSubtle }]}>
                    {(['history', 'feed', 'groups'] as SubTab[]).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setSubTab(tab)}
                            style={[styles.subTab, subTab === tab && { backgroundColor: colors.surface }]}
                        >
                            <Text style={[styles.subTabText, { color: subTab === tab ? colors.text : colors.textSecondary }]}>
                                {tab === 'history' ? 'History' : tab === 'feed' ? 'Feed' : 'Groups'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab Content */}
                {subTab === 'history' && (
                    <View style={styles.tabContent}>
                        <ActivityHistoryList
                            activities={localHistory}
                            onSelect={handleSelectLocal}
                            onDelete={handleDeleteLocal}
                            isDark={isDark}
                        />
                    </View>
                )}

                {subTab === 'feed' && (
                    <View style={styles.tabContent}>
                        {feedActivities.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                                <Activity size={32} color={colors.textTertiary} />
                                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No feed yet</Text>
                                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                                    Activities from you and others will appear here
                                </Text>
                            </View>
                        ) : (
                            feedActivities.map(a => (
                                <ActivityFeedCard
                                    key={a.id}
                                    activity={a}
                                    currentUserId={userId}
                                    onTap={() => handleSelectCloud(a)}
                                    onLike={() => handleLike(a.id)}
                                    isDark={isDark}
                                />
                            ))
                        )}
                    </View>
                )}

                {subTab === 'groups' && (
                    <View style={styles.tabContent}>
                        {groups.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                                <Users size={32} color={colors.textTertiary} />
                                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No groups yet</Text>
                                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                                    Create or join a group to track together
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowGroupModal(true)}
                                    style={[styles.emptyAction, { backgroundColor: colors.accent }]}
                                >
                                    <Text style={[styles.emptyActionText, { color: colors.background }]}>Create Group</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            groups.map(g => (
                                <View key={g.id} style={[styles.groupCard, { backgroundColor: colors.surface }]}>
                                    <View style={styles.groupInfo}>
                                        <Text style={[styles.groupName, { color: colors.text }]}>{g.name}</Text>
                                        <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>
                                            Code: {g.inviteCode} -- {g.participants?.length || 1} members
                                        </Text>
                                    </View>
                                    <ChevronRight size={16} color={colors.textTertiary} />
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Tag Users Modal */}
            <Modal visible={showTagModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Tag Friends</Text>
                            <TouchableOpacity onPress={handleConfirmTags}>
                                <Text style={[styles.modalDone, { color: colors.accent }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.searchBar, { backgroundColor: colors.accentSubtle }]}>
                            <Search size={16} color={colors.textTertiary} />
                            <TextInput
                                value={tagSearch}
                                onChangeText={handleTagSearch}
                                placeholder="Search users..."
                                placeholderTextColor={colors.textTertiary}
                                style={[styles.searchInput, { color: colors.text }]}
                            />
                        </View>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleTagUser(item.id)}
                                    style={[styles.tagUserRow, { backgroundColor: taggedIds.includes(item.id) ? colors.accentSubtle : 'transparent' }]}
                                >
                                    <View style={[styles.tagAvatar, { backgroundColor: colors.accentSubtle }]}>
                                        <Text style={[styles.tagAvatarText, { color: colors.text }]}>
                                            {(item.profile?.displayName || item.name || '?').charAt(0)}
                                        </Text>
                                    </View>
                                    <Text style={[styles.tagUserName, { color: colors.text }]}>
                                        {item.profile?.displayName || item.name}
                                    </Text>
                                    {taggedIds.includes(item.id) && (
                                        <View style={[styles.tagCheckmark, { backgroundColor: colors.accent }]}>
                                            <X size={10} color={colors.background} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                            style={styles.tagList}
                        />
                    </View>
                </View>
            </Modal>

            {/* Group Activity Modal */}
            <Modal visible={showGroupModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Group Activity</Text>
                            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Create */}
                        <Text style={[styles.groupSectionLabel, { color: colors.textSecondary }]}>CREATE NEW</Text>
                        <View style={[styles.groupInput, { backgroundColor: colors.accentSubtle }]}>
                            <TextInput
                                value={groupName}
                                onChangeText={setGroupName}
                                placeholder="Group name..."
                                placeholderTextColor={colors.textTertiary}
                                style={[styles.groupInputField, { color: colors.text }]}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleCreateGroup}
                            style={[styles.groupBtn, { backgroundColor: colors.accent }]}
                            disabled={!groupName.trim()}
                        >
                            <Text style={[styles.groupBtnText, { color: colors.background }]}>Create Group</Text>
                        </TouchableOpacity>

                        {/* Join */}
                        <Text style={[styles.groupSectionLabel, { color: colors.textSecondary, marginTop: 28 }]}>JOIN EXISTING</Text>
                        <View style={[styles.groupInput, { backgroundColor: colors.accentSubtle }]}>
                            <TextInput
                                value={joinCode}
                                onChangeText={setJoinCode}
                                placeholder="Invite code..."
                                placeholderTextColor={colors.textTertiary}
                                style={[styles.groupInputField, { color: colors.text }]}
                                autoCapitalize="characters"
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleJoinGroup}
                            style={[styles.groupBtn, { backgroundColor: colors.accentSubtle }]}
                            disabled={!joinCode.trim()}
                        >
                            <Text style={[styles.groupBtnText, { color: colors.text }]}>Join Group</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 40 },

    // Actions
    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    primaryAction: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, paddingVertical: 16, borderRadius: 18,
    },
    primaryActionText: { fontSize: 15, fontWeight: '600' },
    secondaryAction: {
        width: 54, height: 54, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },

    // Summary
    summaryCard: {
        padding: 20, borderRadius: 20, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 2,
    },
    summaryLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 2, marginBottom: 16 },
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
    summaryValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
    summaryUnit: { fontSize: 10, fontWeight: '500' },
    summaryDivider: { width: 1, height: 40 },

    // Recent
    recentCard: {
        borderRadius: 20, padding: 20, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 2,
    },
    recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    recentLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 2 },
    recentType: { fontSize: 18, fontWeight: '600', marginTop: 2 },
    recentStats: { alignItems: 'flex-end' },
    recentDist: { fontSize: 22, fontWeight: '200', letterSpacing: -0.5 },
    recentDuration: { fontSize: 12, marginTop: 2 },
    recentMap: { height: 140, borderRadius: 16 },

    // Sub-tabs (segmented control)
    subTabs: {
        flexDirection: 'row', borderRadius: 14, padding: 3, marginBottom: 16,
    },
    subTab: {
        flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12,
    },
    subTabText: { fontSize: 13, fontWeight: '600' },
    tabContent: { minHeight: 100 },

    // Empty state
    emptyState: {
        padding: 48, borderRadius: 20, alignItems: 'center', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
    },
    emptyTitle: { fontSize: 15, fontWeight: '600', marginTop: 4 },
    emptySubtext: { fontSize: 12, textAlign: 'center' },
    emptyAction: {
        marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    },
    emptyActionText: { fontSize: 14, fontWeight: '600' },

    // Group card
    groupCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 18, borderRadius: 18, marginBottom: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 1,
    },
    groupInfo: { flex: 1 },
    groupName: { fontSize: 15, fontWeight: '600' },
    groupMeta: { fontSize: 11, marginTop: 3 },

    // Modals
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    modalDone: { fontSize: 15, fontWeight: '600' },

    // Search
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginBottom: 16,
    },
    searchInput: { flex: 1, fontSize: 14, padding: 0 },

    // Tag list
    tagList: { maxHeight: 300 },
    tagUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
    tagAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tagAvatarText: { fontSize: 13, fontWeight: '600' },
    tagUserName: { fontSize: 14, fontWeight: '500', flex: 1 },
    tagCheckmark: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // Group modal
    groupSectionLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 2, marginBottom: 10 },
    groupInput: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
    groupInputField: { fontSize: 15, padding: 0 },
    groupBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 8 },
    groupBtnText: { fontSize: 15, fontWeight: '600' },
});
