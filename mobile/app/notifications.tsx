import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft, Check, X, UserPlus, Bell, Heart, MessageCircle, Users, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

interface NotificationData {
    id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
    friendshipId?: string;
    friendshipStatus?: string;
    isGhosted?: boolean;
    isFollowing?: boolean;
    sender?: {
        id: string;
        name: string | null;
        avatarUrl: string | null;
        displayName: string | null;
    };
    _actionTaken?: 'ACCEPT' | 'REJECT' | 'GHOST' | 'FOLLOWED_BACK';
}

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        loadNotifications();
    }, [filter]);

    const loadNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
            setCurrentUserId(user.id);

            // 1. Fetch ALL Friend Requests (including accepted, rejected, ghosted for history)
            const { data: requests } = await supabase
                .from('Friendship')
                .select(`
                    id,
                    userId,
                    status,
                    createdAt,
                    isGhosted,
                    ghostedBy,
                    user:userId (id, name, profile:Profile(avatarUrl, displayName))
                `)
                .eq('friendId', user.id)
                .order('createdAt', { ascending: false });

            // 2. Fetch General Notifications
            let notifQuery = supabase
                .from('Notification')
                .select('*')
                .eq('userId', user.id)
                .order('createdAt', { ascending: false })
                .limit(50);

            if (filter === 'unread') {
                notifQuery = notifQuery.eq('read', false);
            }

            const { data: notifs } = await notifQuery;

            // 3. Get sender info for FOLLOW notifications
            const senderIds = [...new Set((notifs || [])
                .filter((n: any) => n.type === 'FOLLOW' && n.postId)
                .map((n: any) => n.postId))];

            let senderMap: Record<string, any> = {};
            if (senderIds.length > 0) {
                const { data: senders } = await supabase
                    .from('User')
                    .select('id, name, profile:Profile(avatarUrl, displayName)')
                    .in('id', senderIds);

                if (senders) {
                    senders.forEach((s: any) => {
                        const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
                        senderMap[s.id] = {
                            id: s.id,
                            name: s.name,
                            avatarUrl: profile?.avatarUrl,
                            displayName: profile?.displayName
                        };
                    });
                }
            }

            // 4. Check follow status
            let followingSet = new Set<string>();
            if (senderIds.length > 0) {
                const { data: subs } = await supabase
                    .from('Subscription')
                    .select('subscribedToId')
                    .eq('subscriberId', user.id)
                    .in('subscribedToId', senderIds);

                if (subs) {
                    subs.forEach((s: any) => followingSet.add(s.subscribedToId));
                }
            }

            // Transform Friend Requests (show all statuses for history)
            const mappedRequests: NotificationData[] = (requests || [])
                .filter((req: any) => !req.isGhosted || req.ghostedBy === user.id) // Show if not ghosted OR I ghosted it
                .map((req: any) => {
                    const userProfile = Array.isArray(req.user?.profile) ? req.user.profile[0] : req.user?.profile;

                    let message = 'wants to follow you';
                    if (req.status === 'ACCEPTED') message = 'is now following you';
                    if (req.status === 'REJECTED') message = 'request was declined';
                    if (req.isGhosted) message = 'request was hidden';

                    return {
                        id: `req_${req.id}`,
                        type: 'FRIEND_REQUEST',
                        message: message,
                        read: req.status !== 'PENDING',
                        createdAt: req.createdAt,
                        friendshipId: req.id,
                        friendshipStatus: req.status,
                        isGhosted: req.isGhosted,
                        sender: {
                            id: req.user?.id || req.userId,
                            name: req.user?.name,
                            avatarUrl: userProfile?.avatarUrl,
                            displayName: userProfile?.displayName
                        }
                    };
                });

            // Transform Notifications
            const mappedNotifs: NotificationData[] = (notifs || []).map((n: any) => {
                let cleanContent = n.message || '';
                cleanContent = cleanContent.replace(/^Someone\s+/, '');
                cleanContent = cleanContent.charAt(0).toUpperCase() + cleanContent.slice(1);

                const sender = n.type === 'FOLLOW' && n.postId ? senderMap[n.postId] : null;

                return {
                    id: n.id,
                    type: n.type,
                    message: cleanContent,
                    read: n.read,
                    createdAt: n.createdAt,
                    sender: sender,
                    isFollowing: sender ? followingSet.has(sender.id) : false
                };
            });

            // Combine and sort
            const combined = [...mappedRequests, ...mappedNotifs].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setNotifications(filter === 'unread' ? combined.filter(n => !n.read) : combined);

            // Mark all as read
            if (notifs?.some((n: any) => !n.read)) {
                await supabase
                    .from('Notification')
                    .update({ read: true })
                    .eq('userId', user.id)
                    .eq('read', false);
            }

        } catch (e) {
            console.error('Load notifications error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleFriendAction = async (friendshipId: string, action: 'ACCEPT' | 'REJECT' | 'GHOST', notificationId: string) => {
        if (!currentUserId) return;

        // Optimistic UI
        setNotifications(prev => prev.map(n =>
            n.id === notificationId ? {
                ...n,
                _actionTaken: action,
                friendshipStatus: action === 'ACCEPT' ? 'ACCEPTED' : action === 'REJECT' ? 'REJECTED' : n.friendshipStatus,
                isGhosted: action === 'GHOST' ? true : n.isGhosted,
                message: action === 'ACCEPT' ? 'is now following you' : action === 'REJECT' ? 'request was declined' : 'request was hidden'
            } : n
        ));

        try {
            if (action === 'ACCEPT') {
                // Update friendship status
                await supabase.from('Friendship').update({ status: 'ACCEPTED' }).eq('id', friendshipId);

                // Create subscription
                const { data: friendship } = await supabase.from('Friendship').select('userId').eq('id', friendshipId).single();
                if (friendship) {
                    await supabase.from('Subscription').upsert({
                        subscriberId: friendship.userId,
                        subscribedToId: currentUserId
                    }, { onConflict: 'subscriberId,subscribedToId' });
                }

                Alert.alert('Accepted', 'You are now connected');
            } else if (action === 'REJECT') {
                await supabase.from('Friendship').update({ status: 'REJECTED' }).eq('id', friendshipId);
                Alert.alert('Declined', 'Request has been declined');
            } else if (action === 'GHOST') {
                await supabase.from('Friendship').update({ isGhosted: true, ghostedBy: currentUserId }).eq('id', friendshipId);
                Alert.alert('Hidden', 'Request has been hidden');
            }
        } catch (e) {
            console.error('Friend action error:', e);
            Alert.alert('Error', 'Action failed');
            loadNotifications();
        }
    };

    const handleFollowBack = async (targetUserId: string, notificationId: string) => {
        if (!currentUserId) return;

        setNotifications(prev => prev.map(n =>
            n.id === notificationId ? { ...n, _actionTaken: 'FOLLOWED_BACK', isFollowing: true } : n
        ));

        try {
            await supabase.from('Subscription').upsert({
                subscriberId: currentUserId,
                subscribedToId: targetUserId
            }, { onConflict: 'subscriberId,subscribedToId' });

            Alert.alert('Following', 'You are now following this user');
        } catch (e) {
            console.error('Follow back error:', e);
            loadNotifications();
        }
    };

    const deleteNotification = async (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));

        if (!notificationId.startsWith('req_')) {
            await supabase.from('Notification').delete().eq('id', notificationId);
        }
    };

    const navigateToProfile = (userId: string | undefined) => {
        if (userId) {
            router.push(`/profile/${userId}` as any);
        }
    };

    const getDisplayName = (sender: any) => {
        return sender?.displayName || sender?.name || 'Unknown';
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'FRIEND_REQUEST':
                return <UserPlus size={18} color="#fff" />;
            case 'FRIEND_ACCEPT':
            case 'FOLLOW':
                return <Users size={18} color="#fff" />;
            case 'POST_LIKE':
            case 'REACTION':
                return <Heart size={18} color="#fff" />;
            case 'POST_COMMENT':
            case 'COMMENT_REPLY':
                return <MessageCircle size={18} color="#fff" />;
            default:
                return <Bell size={18} color="#fff" />;
        }
    };

    const renderNotification = ({ item }: { item: NotificationData }) => {
        const displayName = item.sender ? getDisplayName(item.sender) : null;

        // Check if this is a pending request that hasn't been acted on
        const isPendingRequest = item.type === 'FRIEND_REQUEST' &&
            item.friendshipStatus === 'PENDING' &&
            !item._actionTaken &&
            !item.isGhosted;

        // Check various states
        const wasAccepted = item.friendshipStatus === 'ACCEPTED' || item._actionTaken === 'ACCEPT';
        const wasRejected = item.friendshipStatus === 'REJECTED' || item._actionTaken === 'REJECT';
        const wasGhosted = item.isGhosted || item._actionTaken === 'GHOST';

        // For FOLLOW type notifications
        const showFollowBack = item.type === 'FOLLOW' && !item.isFollowing && item._actionTaken !== 'FOLLOWED_BACK' && item.sender;
        const isFollowing = item.isFollowing || item._actionTaken === 'FOLLOWED_BACK';

        return (
            <View
                style={{
                    backgroundColor: item.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    marginBottom: 12,
                    overflow: 'hidden'
                }}
            >
                <TouchableOpacity
                    style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
                    onPress={() => navigateToProfile(item.sender?.id)}
                    activeOpacity={0.7}
                >
                    {/* Avatar/Icon */}
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        {item.sender?.avatarUrl ? (
                            <Image
                                source={{ uri: item.sender.avatarUrl }}
                                style={{ width: 44, height: 44, borderRadius: 22 }}
                            />
                        ) : (
                            getNotificationIcon(item.type)
                        )}
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>
                            {displayName && <Text style={{ fontWeight: '700' }}>{displayName} </Text>}
                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{item.message}</Text>
                        </Text>

                        {/* PENDING REQUEST: Show Accept, Reject, Ghost buttons */}
                        {isPendingRequest && item.friendshipId && (
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                <TouchableOpacity
                                    onPress={() => handleFriendAction(item.friendshipId!, 'ACCEPT', item.id)}
                                    style={{
                                        backgroundColor: '#fff',
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <Check size={14} color="#000" />
                                    <Text style={{ color: '#000', fontWeight: '700', fontSize: 11 }}>ACCEPT</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleFriendAction(item.friendshipId!, 'REJECT', item.id)}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.3)',
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <X size={14} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>REJECT</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleFriendAction(item.friendshipId!, 'GHOST', item.id)}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <EyeOff size={14} color="rgba(255,255,255,0.6)" />
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 11 }}>GHOST</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Status Badges */}
                        {wasAccepted && (
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: 'flex-start',
                                marginTop: 12
                            }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>ACCEPTED</Text>
                            </View>
                        )}

                        {wasRejected && (
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: 'flex-start',
                                marginTop: 12
                            }}>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>DECLINED</Text>
                            </View>
                        )}

                        {wasGhosted && (
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: 'flex-start',
                                marginTop: 12
                            }}>
                                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' }}>HIDDEN</Text>
                            </View>
                        )}

                        {/* Follow Back Button for FOLLOW notifications */}
                        {showFollowBack && item.sender?.id && (
                            <TouchableOpacity
                                onPress={() => handleFollowBack(item.sender!.id, item.id)}
                                style={{
                                    backgroundColor: '#fff',
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    alignSelf: 'flex-start',
                                    marginTop: 12
                                }}
                            >
                                <Text style={{ color: '#000', fontWeight: '700', fontSize: 11 }}>FOLLOW BACK</Text>
                            </TouchableOpacity>
                        )}

                        {/* Following Badge */}
                        {isFollowing && item.type === 'FOLLOW' && (
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: 'flex-start',
                                marginTop: 12
                            }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>FOLLOWING</Text>
                            </View>
                        )}

                        {/* Timestamp */}
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity onPress={() => deleteNotification(item.id)} style={{ padding: 4 }}>
                        <X size={16} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.15)',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ChevronLeft size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 2 }}>NOTIFICATIONS</Text>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={{
                    flexDirection: 'row',
                    marginHorizontal: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 4
                }}>
                    <TouchableOpacity
                        onPress={() => setFilter('all')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 8,
                            backgroundColor: filter === 'all' ? '#fff' : 'transparent'
                        }}
                    >
                        <Text style={{
                            textAlign: 'center',
                            fontWeight: '700',
                            fontSize: 12,
                            color: filter === 'all' ? '#000' : 'rgba(255,255,255,0.5)'
                        }}>ALL</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setFilter('unread')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 8,
                            backgroundColor: filter === 'unread' ? '#fff' : 'transparent'
                        }}
                    >
                        <Text style={{
                            textAlign: 'center',
                            fontWeight: '700',
                            fontSize: 12,
                            color: filter === 'unread' ? '#000' : 'rgba(255,255,255,0.5)'
                        }}>UNREAD</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 10, fontWeight: '600', letterSpacing: 2 }}>LOADING</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        renderItem={renderNotification}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => { setRefreshing(true); loadNotifications(); }}
                                tintColor="#fff"
                            />
                        }
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingVertical: 80, opacity: 0.5 }}>
                                <View style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.15)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    <Bell size={28} color="rgba(255,255,255,0.3)" />
                                </View>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' }}>NO NOTIFICATIONS</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
