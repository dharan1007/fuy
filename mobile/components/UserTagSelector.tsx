import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Search, X, UserPlus, Check, Users } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface TaggedUser {
    id: string;
    name: string;
    avatar?: string;
    isFollowing?: boolean;
}

interface UserTagSelectorProps {
    currentUserId: string;
    selectedUsers: TaggedUser[];
    onUsersChange: (users: TaggedUser[]) => void;
    maxTags?: number;
}

export default function UserTagSelector({
    currentUserId,
    selectedUsers,
    onUsersChange,
    maxTags = 10
}: UserTagSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<TaggedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [followingIds, setFollowingIds] = useState<string[]>([]);

    // Fetch following IDs on mount
    useEffect(() => {
        const fetchFollowing = async () => {
            if (!currentUserId) return;
            try {
                const { data } = await supabase
                    .from('Follow')
                    .select('followingId')
                    .eq('followerId', currentUserId);
                if (data) {
                    setFollowingIds(data.map(f => f.followingId));
                }
            } catch (err) {
                console.error('Error fetching following:', err);
            }
        };
        fetchFollowing();
    }, [currentUserId]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            searchUsers();
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const searchUsers = async () => {
        setLoading(true);
        try {
            // Search all users that match the query
            const { data: users } = await supabase
                .from('User')
                .select('id, name, avatar, taggingPrivacy')
                .ilike('name', `%${searchQuery}%`)
                .neq('id', currentUserId || '')
                .limit(20);

            if (users) {
                // Filter out already selected users
                const filtered = users.filter(u =>
                    !selectedUsers.find(s => s.id === u.id)
                );

                // Sort: following users first, then others
                const sortedUsers = filtered.sort((a, b) => {
                    const aFollowing = followingIds.includes(a.id);
                    const bFollowing = followingIds.includes(b.id);
                    if (aFollowing && !bFollowing) return -1;
                    if (!aFollowing && bFollowing) return 1;
                    return 0;
                });

                // Check tagging privacy and build results
                const validUsers: TaggedUser[] = [];
                for (const user of sortedUsers) {
                    const canTag = await checkTaggingPermission(user.id, user.taggingPrivacy);
                    if (canTag) {
                        validUsers.push({
                            id: user.id,
                            name: user.name || 'User',
                            avatar: user.avatar || undefined,
                            isFollowing: followingIds.includes(user.id),
                        });
                    }
                    // Limit to 10 valid results
                    if (validUsers.length >= 10) break;
                }
                setSearchResults(validUsers);
            }
        } catch (err) {
            console.error('Error searching users:', err);
        }
        setLoading(false);
    };

    const checkTaggingPermission = async (userId: string, taggingPrivacy?: string): Promise<boolean> => {
        try {
            // If current user not loaded yet, allow tagging (will be validated on submit)
            if (!currentUserId) return true;

            // Check if blocked
            const { data: blocked } = await supabase
                .from('BlockedUser')
                .select('id')
                .or(`and(blockerId.eq.${userId},blockedId.eq.${currentUserId}),and(blockerId.eq.${currentUserId},blockedId.eq.${userId})`)
                .limit(1);

            if (blocked && blocked.length > 0) return false;

            const privacy = taggingPrivacy || 'followers';

            if (privacy === 'none') return false;
            if (privacy === 'everyone') return true;
            if (privacy === 'followers') {
                // Check if they follow currentUser
                const isFollowing = followingIds.includes(userId);
                if (isFollowing) return true;

                // Also check if they follow us back
                const { data: follows } = await supabase
                    .from('Follow')
                    .select('id')
                    .eq('followerId', userId)
                    .eq('followingId', currentUserId)
                    .limit(1);
                return follows && follows.length > 0;
            }
            return true;
        } catch {
            return false;
        }
    };

    const addUser = (user: TaggedUser) => {
        if (selectedUsers.length >= maxTags) return;
        onUsersChange([...selectedUsers, user]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeUser = (userId: string) => {
        onUsersChange(selectedUsers.filter(u => u.id !== userId));
    };

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>
                TAG PEOPLE ({selectedUsers.length}/{maxTags})
            </Text>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {selectedUsers.map((user) => (
                        <View
                            key={user.id}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                paddingVertical: 6,
                                paddingLeft: 6,
                                paddingRight: 10,
                                borderRadius: 20,
                                marginRight: 8,
                            }}
                        >
                            <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                overflow: 'hidden',
                                marginRight: 8,
                            }}>
                                {user.avatar ? (
                                    <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: '#fff', fontSize: 10 }}>{user.name?.charAt(0)?.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={{ color: '#fff', fontSize: 12, marginRight: 8 }}>{user.name}</Text>
                            <TouchableOpacity onPress={() => removeUser(user.id)}>
                                <X size={14} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Search Input */}
            <TouchableOpacity
                onPress={() => setShowSearch(!showSearch)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: showSearch ? 0 : 12,
                }}
            >
                <UserPlus size={16} color="rgba(255,255,255,0.4)" />
                {showSearch ? (
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search users..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ flex: 1, color: '#fff', paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 }}
                        autoFocus
                    />
                ) : (
                    <Text style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: 14 }}>
                        {selectedUsers.length === 0 ? 'Tag people...' : 'Add more...'}
                    </Text>
                )}
                {loading && <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />}
            </TouchableOpacity>

            {/* Search Results */}
            {showSearch && searchResults.length > 0 && (
                <View style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                }}>
                    {searchResults.map((user, index) => (
                        <TouchableOpacity
                            key={user.id}
                            onPress={() => addUser(user)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 12,
                                borderBottomWidth: index < searchResults.length - 1 ? 1 : 0,
                                borderBottomColor: 'rgba(255,255,255,0.05)',
                            }}
                        >
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                overflow: 'hidden',
                                marginRight: 12,
                            }}>
                                {user.avatar ? (
                                    <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: '#fff', fontSize: 14 }}>{user.name?.charAt(0)?.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{user.name}</Text>
                                {user.isFollowing && (
                                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Following</Text>
                                )}
                            </View>
                            <Check size={18} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
                <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                        No users found or they don't allow tagging
                    </Text>
                </View>
            )}
        </View>
    );
}
