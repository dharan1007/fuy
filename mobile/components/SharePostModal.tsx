import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, Image, Share, Alert, ActivityIndicator, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Users, ExternalLink, Check, Search, Send, Loader2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface FeedPost {
    id: string;
    content: string;
    user: {
        id: string;
        name: string;
        profile: {
            displayName: string;
            avatarUrl: string | null;
        } | null;
    };
    postMedia: {
        url: string;
        type: 'IMAGE' | 'VIDEO';
    }[];
    postType?: string;
}

interface SharePostModalProps {
    visible: boolean;
    onClose: () => void;
    post: FeedPost;
}

interface UserItem {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
}

export default function SharePostModal({ visible, onClose, post }: SharePostModalProps) {
    const { colors, mode } = useTheme();
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<'in-app' | 'external'>('in-app');
    const [users, setUsers] = useState<UserItem[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dbUserId, setDbUserId] = useState<string | null>(null);

    // Resolve DB User ID
    useEffect(() => {
        const resolveUser = async () => {
            if (session?.user?.email) {
                const { data } = await supabase
                    .from('User')
                    .select('id')
                    .eq('email', session.user.email)
                    .single();
                if (data) setDbUserId(data.id);
            }
        };
        resolveUser();
    }, [session?.user?.email]);

    // Fetch users (suggestions or search)
    useEffect(() => {
        if (visible) {
            fetchUsers(searchQuery);
        }
    }, [visible, searchQuery]);

    const fetchUsers = async (query = '') => {
        if (!dbUserId) return;
        setLoading(true);
        try {
            let results: UserItem[] = [];

            if (query) {
                // Search users by name 
                const { data } = await supabase
                    .from('User')
                    .select(`
                        id, 
                        name, 
                        profile:Profile (displayName, avatarUrl)
                    `)
                    .ilike('name', `%${query}%`)
                    .limit(20);

                if (data) {
                    results = data.map((u: any) => ({
                        id: u.id,
                        name: u.name,
                        displayName: u.profile?.displayName,
                        avatarUrl: u.profile?.avatarUrl
                    }));
                }
            } else {
                // 1. Fetch recent conversations
                const { data: convos } = await supabase
                    .from('Conversation')
                    .select('participantA, participantB, lastMessageAt')
                    .or(`participantA.eq.${dbUserId},participantB.eq.${dbUserId}`)
                    .order('lastMessageAt', { ascending: false })
                    .limit(20);

                const recentUserIds = new Set<string>();
                if (convos) {
                    convos.forEach((c: any) => {
                        const otherId = c.participantA === dbUserId ? c.participantB : c.participantA;
                        if (otherId) recentUserIds.add(otherId);
                    });
                }

                // 2. Fetch following if needed (fill up to 20)
                let followingIds: string[] = [];
                if (recentUserIds.size < 20) {
                    const { data: follows } = await supabase
                        .from('Friendship')
                        .select('friendId')
                        .eq('userId', dbUserId)
                        .limit(20);

                    if (follows) {
                        followingIds = follows.map((f: any) => f.friendId);
                    }
                }

                const allIds = Array.from(new Set([...recentUserIds, ...followingIds]));

                if (allIds.length > 0) {
                    const { data: usersData } = await supabase
                        .from('User')
                        .select(`
                            id, 
                            name, 
                            profile:Profile (displayName, avatarUrl)
                        `)
                        .in('id', allIds);

                    if (usersData) {
                        // Map back to maintain loosely sort order of recent IDs
                        const userMap = new Map(usersData.map((u: any) => [u.id, u]));

                        allIds.forEach(id => {
                            const u: any = userMap.get(id);
                            if (u) {
                                results.push({
                                    id: u.id,
                                    name: u.name,
                                    displayName: u.profile?.displayName,
                                    avatarUrl: u.profile?.avatarUrl
                                });
                            }
                        });
                    }
                }
            }

            setUsers(results);

        } catch (e) {
            console.error('Fetch users error:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleSendInApp = async () => {
        if (selectedUsers.size === 0) {
            Alert.alert('Select Users', 'Please select at least one user to share with.');
            return;
        }
        if (!dbUserId) return;

        setSending(true);
        try {
            const media = post.postMedia && post.postMedia.length > 0 ? post.postMedia[0] : null;
            const authorName = post.user?.profile?.displayName || post.user?.name || 'Anonymous';
            const authorAvatar = post.user?.profile?.avatarUrl || null;

            for (const recipientId of selectedUsers) {
                // Find or create conversation
                let conversationId: string | null = null;

                const { data: existingConv } = await supabase
                    .from('Conversation')
                    .select('id')
                    .or(`and(participantA.eq.${dbUserId},participantB.eq.${recipientId}),and(participantA.eq.${recipientId},participantB.eq.${dbUserId})`)
                    .single();

                if (existingConv) {
                    conversationId = existingConv.id;
                } else {
                    const newId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
                    const { data: newConv } = await supabase
                        .from('Conversation')
                        .insert({
                            id: newId,
                            participantA: dbUserId,
                            participantB: recipientId
                        })
                        .select('id')
                        .single();
                    if (newConv) conversationId = newConv.id;
                }

                if (conversationId) {
                    // Send message with post type
                    const messageId = `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 11)}`;
                    await supabase.from('Message').insert({
                        id: messageId,
                        conversationId,
                        senderId: dbUserId,
                        content: JSON.stringify({
                            postId: post.id,
                            mediaUrl: media?.url,
                            mediaType: media?.type,
                            authorName,
                            authorAvatar,
                            caption: post.content ? post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '') : ''
                        }),
                        type: 'post', // Custom type 'post'
                        createdAt: new Date().toISOString()
                    });

                    // Update Conversation lastMessage
                    await supabase
                        .from('Conversation')
                        .update({
                            lastMessage: `Shared a post`,
                            lastMessageAt: new Date().toISOString()
                        })
                        .eq('id', conversationId);
                }
            }
            Alert.alert('Sent!', `Post shared with ${selectedUsers.size} user(s).`);

            // Increment share count
            const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fuy.fun';
            fetch(`${API_URL}/api/posts/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: post.id })
            }).catch(err => console.error('Failed to increment share:', err));

            setSelectedUsers(new Set());
            onClose();
        } catch (e) {
            console.error('Send error:', e);
            Alert.alert('Error', 'Failed to send. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleExternalShare = async () => {
        // Construct a deep link (assuming fuy:// schema or web url)
        // For now, using a placeholder web URL or just text
        const deepLink = `https://www.fuymedia.org/post/${post.id}`;
        const message = `Check out this post by ${post.user?.profile?.displayName || 'someone'} on FUY!\n\n${deepLink}`;

        try {
            const result = await Share.share({
                message,
                title: `Post by ${post.user?.name}`
            });

            if (result.action === Share.sharedAction) {
                // Increment share count
                const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fuy.fun';
                fetch(`${API_URL}/api/posts/share`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: post.id })
                }).catch(err => console.error('Failed to increment share:', err));
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const renderUserItem = ({ item }: { item: UserItem }) => {
        const isSelected = selectedUsers.has(item.id);
        return (
            <TouchableOpacity
                onPress={() => toggleUserSelection(item.id)}
                className="flex-row items-center p-3 mb-2 rounded-xl"
                style={{
                    backgroundColor: isSelected ? colors.primary + '20' : colors.card,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.border
                }}
            >
                <Image
                    source={{ uri: item.avatarUrl }}
                    className="w-10 h-10 rounded-full mr-3 bg-gray-200"
                />
                <Text className="flex-1 font-medium" style={{ color: colors.text }}>{item.displayName || item.name}</Text>
                {isSelected && (
                    <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                        <Check color="#fff" size={14} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View className="flex-1 justify-end">
                <TouchableOpacity className="flex-1" onPress={onClose} />
                <BlurView
                    intensity={80}
                    tint={mode === 'light' ? 'light' : 'dark'}
                    className="rounded-t-3xl overflow-hidden"
                    style={{ maxHeight: '80%' }}
                >
                    <View className="p-4" style={{ backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-xl font-bold" style={{ color: colors.text }}>Share Post</Text>
                            <TouchableOpacity onPress={onClose} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                                <X color={colors.text} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View className="flex-row mb-4 rounded-xl p-1" style={{ backgroundColor: colors.card }}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('in-app')}
                                className="flex-1 flex-row items-center justify-center py-3 rounded-lg gap-2"
                                style={{ backgroundColor: activeTab === 'in-app' ? '#fff' : 'transparent' }}
                            >
                                <Send color={activeTab === 'in-app' ? '#000' : colors.text} size={18} />
                                <Text style={{ color: activeTab === 'in-app' ? '#000' : colors.text, fontWeight: '600' }}>Share in FUY</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('external')}
                                className="flex-1 flex-row items-center justify-center py-3 rounded-lg gap-2"
                                style={{ backgroundColor: activeTab === 'external' ? '#fff' : 'transparent' }}
                            >
                                <ExternalLink color={activeTab === 'external' ? '#000' : colors.text} size={18} />
                                <Text style={{ color: activeTab === 'external' ? '#000' : colors.text, fontWeight: '600' }}>Other Apps</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        {activeTab === 'in-app' ? (
                            <View style={{ minHeight: 300 }}>
                                {/* Search Bar */}
                                <View className="flex-row items-center p-3 rounded-xl mb-3" style={{ backgroundColor: colors.background }}>
                                    <Search color={colors.secondary} size={18} />
                                    <TextInput
                                        placeholder="Search"
                                        placeholderTextColor={colors.secondary}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        style={{ flex: 1, marginLeft: 10, color: colors.text, fontSize: 16 }}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <X color={colors.secondary} size={16} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text className="text-sm mb-3" style={{ color: colors.secondary }}>
                                    {searchQuery ? 'Search Results:' : 'Suggested People:'}
                                </Text>
                                {loading ? (
                                    <ActivityIndicator color={colors.primary} size="large" />
                                ) : users.length === 0 ? (
                                    <Text className="text-center py-8" style={{ color: colors.secondary }}>
                                        No users to share with. Follow some users first!
                                    </Text>
                                ) : (
                                    <FlatList
                                        data={users}
                                        renderItem={renderUserItem}
                                        keyExtractor={(item) => item.id}
                                        style={{ maxHeight: 250 }}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}

                                {selectedUsers.size > 0 && (
                                    <TouchableOpacity
                                        onPress={handleSendInApp}
                                        disabled={sending}
                                        className="mt-4 py-4 rounded-xl items-center"
                                        style={{ backgroundColor: colors.primary }}
                                    >
                                        {sending ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text className="font-bold text-white">Send to {selectedUsers.size} User(s)</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View className="py-6 items-center">
                                <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.primary + '20' }}>
                                    <ExternalLink color={colors.primary} size={32} />
                                </View>
                                <Text className="text-center mb-2 font-bold text-lg" style={{ color: colors.text }}>
                                    Share to Other Apps
                                </Text>
                                <Text className="text-center mb-6 px-4" style={{ color: colors.secondary }}>
                                    Share a link to this post with your friends on other apps.
                                </Text>
                                <TouchableOpacity
                                    onPress={handleExternalShare}
                                    className="px-8 py-4 rounded-xl"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    <Text className="font-bold text-white">Share Link</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}
