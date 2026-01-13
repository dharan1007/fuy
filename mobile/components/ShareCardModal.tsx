import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, Image, Share, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Users, ExternalLink, Check, Search } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface ShareCardModalProps {
    visible: boolean;
    onClose: () => void;
    cardCode: string;
    cardOwnerName: string;
}

interface UserItem {
    id: string;
    name: string;
    avatarUrl?: string;
}

export default function ShareCardModal({ visible, onClose, cardCode, cardOwnerName }: ShareCardModalProps) {
    const { colors, mode } = useTheme();
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<'in-app' | 'external'>('in-app');
    const [users, setUsers] = useState<UserItem[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
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

    // Fetch users (followers/following)
    useEffect(() => {
        if (visible && dbUserId) {
            fetchUsers();
        }
    }, [visible, dbUserId]);

    const fetchUsers = async () => {
        if (!dbUserId) return;
        setLoading(true);
        try {
            // Fetch users this person follows
            const { data: followingData } = await supabase
                .from('Friendship')
                .select(`
                    friend:friendId (
                        id,
                        name,
                        profile:Profile (avatarUrl)
                    )
                `)
                .eq('userId', dbUserId);

            if (followingData) {
                const userList = followingData
                    .map((item: any) => item.friend)
                    .filter((u: any) => u)
                    .map((u: any) => ({
                        id: u.id,
                        name: u.name || 'User',
                        avatarUrl: u.profile?.avatarUrl || (Array.isArray(u.profile) ? u.profile[0]?.avatarUrl : null)
                    }));
                setUsers(userList);
            }
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
            for (const recipientId of selectedUsers) {
                // Find or create conversation
                let conversationId: string | null = null;

                const { data: existingConv } = await supabase
                    .from('Conversation')
                    .select('id')
                    .or(`and(userAId.eq.${dbUserId},userBId.eq.${recipientId}),and(userAId.eq.${recipientId},userBId.eq.${dbUserId})`)
                    .single();

                if (existingConv) {
                    conversationId = existingConv.id;
                } else {
                    const { data: newConv, error } = await supabase
                        .from('Conversation')
                        .insert({ userAId: dbUserId, userBId: recipientId })
                        .select('id')
                        .single();
                    if (newConv) conversationId = newConv.id;
                }

                if (conversationId) {
                    // Send message with profile card type
                    await supabase.from('Message').insert({
                        conversationId,
                        senderId: dbUserId,
                        content: JSON.stringify({
                            type: 'profile_card',
                            code: cardCode,
                            ownerName: cardOwnerName
                        }),
                        createdAt: new Date().toISOString()
                    });
                }
            }
            Alert.alert('Sent!', `Profile card shared with ${selectedUsers.size} user(s).`);
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
        const deepLink = `fuy://profile-card/${cardCode}`;
        const message = `Check out ${cardOwnerName}'s Profile Card on FUY!\n\nOpen this link in the FUY app: ${deepLink}\n\nOr search code: ${cardCode} in the Explore tab.`;

        try {
            await Share.share({
                message,
                title: `${cardOwnerName}'s Profile Card`
            });
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
                <Text className="flex-1 font-medium" style={{ color: colors.text }}>{item.name}</Text>
                {isSelected && (
                    <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                        <Check color="#fff" size={14} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
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
                            <Text className="text-xl font-bold" style={{ color: colors.text }}>Share Profile Card</Text>
                            <TouchableOpacity onPress={onClose} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                                <X color={colors.text} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View className="flex-row mb-4 rounded-xl p-1" style={{ backgroundColor: colors.card }}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('in-app')}
                                className="flex-1 flex-row items-center justify-center py-3 rounded-lg gap-2"
                                style={{ backgroundColor: activeTab === 'in-app' ? colors.primary : 'transparent' }}
                            >
                                <Users color={activeTab === 'in-app' ? '#fff' : colors.text} size={18} />
                                <Text style={{ color: activeTab === 'in-app' ? '#fff' : colors.text, fontWeight: '600' }}>Share in FUY</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('external')}
                                className="flex-1 flex-row items-center justify-center py-3 rounded-lg gap-2"
                                style={{ backgroundColor: activeTab === 'external' ? colors.primary : 'transparent' }}
                            >
                                <ExternalLink color={activeTab === 'external' ? '#fff' : colors.text} size={18} />
                                <Text style={{ color: activeTab === 'external' ? '#fff' : colors.text, fontWeight: '600' }}>Other Apps</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        {activeTab === 'in-app' ? (
                            <View style={{ minHeight: 300 }}>
                                <Text className="text-sm mb-3" style={{ color: colors.secondary }}>
                                    Select users to send this profile card:
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
                                    Share a secure link that opens this profile card in the FUY app.
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
