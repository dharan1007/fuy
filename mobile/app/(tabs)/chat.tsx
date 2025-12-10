import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, Modal, Animated, Dimensions, FlatList, ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Mic, Send, Search, Settings, MoreVertical, Phone, Video, Image as ImageIcon, Smile, X, ChevronLeft, Sparkles, User as UserIcon, Sun, Moon, Anchor, Heart, Map as MapIcon, Book, Plus, Tag, Frown, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useNavVisibility } from '../../context/NavContext';

import { MediaUploadService } from '../../services/MediaUploadService';
import * as ImagePicker from 'expo-image-picker';
import { Video as AVVideo, ResizeMode } from 'expo-av';
import { Paperclip } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type PersonaType = 'friend' | 'therapist' | 'coach' | 'mystic';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    type?: 'text' | 'image' | 'video' | 'audio';
    mediaUrl?: string;
    timestamp: number;
    senderId?: string;
    readAt?: string;
}

interface ChatUser {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    lastSeen?: string;
    isPinned?: boolean;
    followersCount?: number;
}

export default function ChatScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { colors, mode, toggleTheme } = useTheme();
    const { session } = useAuth();
    const { setHideNav } = useNavVisibility();
    const currentUserId = session?.user?.id;

    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
    const [conversations, setConversations] = useState<ChatUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dbUserId, setDbUserId] = useState<string | null>(null);
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [sortMode, setSortMode] = useState<'recent' | 'pinned' | 'followers'>('pinned');

    const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);

    // Tagging state
    const [showTagModal, setShowTagModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [factWarningText, setFactWarningText] = useState<string | null>(null);
    const [bondingWarnings, setBondingWarnings] = useState<{
        blacklist: string[];
        happy: string[];
        facts: { keyword: string; warningText: string }[];
    }>({ blacklist: [], happy: [], facts: [] });
    const [showBondingWarning, setShowBondingWarning] = useState(false);

    // Chat settings state
    const [showChatSettings, setShowChatSettings] = useState(false);
    const [chatBackground, setChatBackground] = useState<string | null>(null);
    const [messageRetention, setMessageRetention] = useState<'forever' | '1day' | 'viewonce' | 'custom'>('forever');
    const [customRetentionDays, setCustomRetentionDays] = useState(7);
    const [isUploading, setIsUploading] = useState(false);

    // Resolve DB User ID from Email and Fetch Profile Avatar
    useEffect(() => {
        const resolveDbUser = async () => {
            if (session?.user?.email) {
                const { data } = await supabase
                    .from('User')
                    .select(`
                        id,
                        profile:Profile(avatarUrl)
                    `)
                    .eq('email', session.user.email)
                    .single();

                if (data) {
                    setDbUserId(data.id);
                    // Handle potential array or single object return from Supabase
                    const profileData = Array.isArray(data.profile) ? data.profile[0] : data.profile;
                    if (profileData?.avatarUrl) {
                        setCurrentUserAvatar(profileData.avatarUrl);
                    }
                }
            }
        };
        resolveDbUser();
    }, [session?.user?.email]);

    // Heartbeat for Online Status
    useEffect(() => {
        if (!dbUserId) return;
        const updateStatus = async () => {
            await supabase.from('User').update({ lastSeen: new Date().toISOString() }).eq('id', dbUserId);
        };
        updateStatus(); // Initial
        const interval = setInterval(updateStatus, 2 * 60 * 1000); // Every 2 mins
        return () => clearInterval(interval);
    }, [dbUserId]);

    // Hide Floating Nav when Chat Room is Open
    useEffect(() => {
        setHideNav(!!selectedUser);
    }, [selectedUser, setHideNav]);

    // Dbot State
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [persona, setPersona] = useState<PersonaType>('friend');
    const [showPersonaSelector, setShowPersonaSelector] = useState(false);
    const [showApps, setShowApps] = useState(false);


    const slideAnim = useRef(new Animated.Value(width)).current;
    const activeConversationIdRef = useRef<string | null>(null);
    // Load Pinned IDs
    useEffect(() => {
        AsyncStorage.getItem('pinnedChatIds').then((json) => {
            if (json) setPinnedIds(new Set(JSON.parse(json)));
        });
    }, []);

    const handlePin = async (userId: string) => {
        const newSet = new Set(pinnedIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setPinnedIds(newSet);
        await AsyncStorage.setItem('pinnedChatIds', JSON.stringify(Array.from(newSet)));
    };

    const usersCache = useRef<Map<string, ChatUser>>(new Map());

    // --- Effects ---

    useEffect(() => {
        const onBackPress = () => {
            if (selectedUser) {
                handleBack();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => backHandler.remove();
    }, [selectedUser]);

    useEffect(() => {
        if (dbUserId) {
            fetchConversations();

            // Subscribe to realtime changes for Conversations
            const channel = supabase.channel('public:Conversation')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'Conversation' }, () => {
                    fetchConversations();
                })
                .subscribe();

            // Subscribe to User presence/status changes
            const userChannel = supabase.channel('public:User')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'User' }, (payload) => {
                    // Update search results or conversation list status if visible
                    setSearchResults(prev => prev.map(u => {
                        if (u.id === payload.new.id) {
                            return { ...u, status: isUserOnline(payload.new.lastSeen) ? 'online' : 'offline', lastSeen: payload.new.lastSeen };
                        }
                        return u;
                    }));
                    setConversations(prev => prev.map(c => {
                        if (c.id === payload.new.id) {
                            return { ...c, status: isUserOnline(payload.new.lastSeen) ? 'online' : 'offline', lastSeen: payload.new.lastSeen };
                        }
                        return c;
                    }));
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
                supabase.removeChannel(userChannel);
            }
        }
    }, [dbUserId]);

    // Subscribe to messages when a chat is open
    useEffect(() => {
        if (!activeConversationIdRef.current || !dbUserId) return;

        const channel = supabase.channel(`chat:${activeConversationIdRef.current}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'Message', filter: `conversationId=eq.${activeConversationIdRef.current}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new;
                        setMessages(prev => {
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            // If received message from partner, mark as read immediately if we are here
                            if (newMsg.senderId !== dbUserId) {
                                markAsRead(newMsg.id);
                            }
                            return [...prev, {
                                id: newMsg.id,
                                role: newMsg.senderId === dbUserId ? 'user' : 'assistant',
                                content: newMsg.content,
                                type: newMsg.type,
                                mediaUrl: newMsg.mediaUrl,
                                timestamp: new Date(newMsg.createdAt).getTime(),
                                senderId: newMsg.senderId,
                                readAt: newMsg.readAt
                            }];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new;
                        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, readAt: updated.readAt } : m));
                    }
                }
            )
            .subscribe();

        // Mark existing unread messages as read when opening
        markAllAsRead(activeConversationIdRef.current);

        return () => { supabase.removeChannel(channel); };
    }, [activeConversationIdRef.current, dbUserId]);

    // --- Data Fetching ---

    const fetchConversations = async () => {
        if (!dbUserId) return;

        try {
            // Fetch conversations where user is A or B
            // Also join User and Profile tables to get names and avatars
            const { data, error } = await supabase
                .from('Conversation')
                .select(`
                    id,
                    lastMessage,
                    lastMessageAt,
                    participantA,
                    participantB,
                    participantB,
                    userA:participantA ( id, name, lastSeen, followersCount, profile:Profile(avatarUrl, displayName) ),
                    userB:participantB ( id, name, lastSeen, followersCount, profile:Profile(avatarUrl, displayName) )
                `)
                .or(`participantA.eq.${dbUserId},participantB.eq.${dbUserId}`)
                .order('lastMessageAt', { ascending: false });

            if (error) throw error;

            const formatted: ChatUser[] = data.map((c: any) => {
                const isA = c.participantA === dbUserId;
                const partner = isA ? c.userB : c.userA;

                // Safety check if partner user was deleted
                if (!partner) return null;

                const name = partner.profile?.displayName || partner.name || 'Unknown User';
                const avatar = partner.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${partner.id}`;

                return {
                    id: partner.id,
                    name: name,
                    avatar: avatar,
                    status: (isUserOnline(partner.lastSeen) ? 'online' : 'offline') as 'online' | 'offline' | 'away',
                    lastMessage: c.lastMessage || 'Start a conversation',
                    lastMessageAt: c.lastMessageAt,
                    unreadCount: 0,
                    lastSeen: partner.lastSeen,
                    followersCount: partner.followersCount || 0,
                    isPinned: pinnedIds.has(partner.id),
                    conversationId: c.id
                };
            }).filter(Boolean) as ChatUser[];

            setConversations(formatted);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        }
    };

    const getSortedConversations = () => {
        let list = searchQuery ? searchResults : conversations;

        // Update isPinned status dynamically
        list = list.map(c => ({ ...c, isPinned: pinnedIds.has(c.id) }));

        if (sortMode === 'pinned') {
            return list.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
            });
        }
        if (sortMode === 'followers') {
            return list.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
        }
        // recent
        return list.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
    };

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            // Search users by name or email (checking Profile displayName first)
            const { data, error } = await supabase
                .from('User')
                .select(`
                    id, name, lastSeen,
                    profile:Profile!inner(displayName, avatarUrl)
                `)
                .ilike('profile.displayName', `%${query}%`)
                .neq('id', dbUserId)
                .limit(10);

            if (error) throw error;

            const formatted = data.map((u: any) => ({
                id: u.id,
                name: u.profile?.displayName || u.name || 'Unknown',
                avatar: u.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${u.id}`,
                status: (isUserOnline(u.lastSeen) ? 'online' : 'offline') as 'online' | 'offline' | 'away',
                lastSeen: u.lastSeen
            }));

            setSearchResults(formatted);
        } catch (err) {
            console.error('Error searching users:', err);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        if (!dbUserId) return;
        try {
            const { data, error } = await supabase
                .from('Message')
                .select('*')
                .eq('conversationId', conversationId)
                .order('createdAt', { ascending: true });

            if (error) throw error;

            setMessages(data.map((m: any) => ({
                id: m.id,
                role: m.senderId === dbUserId ? 'user' : 'assistant',
                content: m.content,
                type: m.type,
                mediaUrl: m.mediaUrl,
                timestamp: new Date(m.createdAt).getTime(),
                senderId: m.senderId,
                readAt: m.readAt
            })));
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    // --- Actions ---

    const handleUserSelect = async (user: ChatUser) => {
        if (!dbUserId) return;

        setIsLoading(true);
        setSelectedUser(user);
        setMessages([]);

        // Animation
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 100,
        }).start();

        if (user.id === 'dbot') {
            setMessages([{
                id: 'init', role: 'assistant',
                content: `Hello! I'm dbot in ${persona} mode. How can I support you?`,
                timestamp: Date.now()
            }]);
            activeConversationIdRef.current = null;
            setIsLoading(false);
            return;
        }

        try {
            // Find existing conversation or create new one
            // First, check if we already fetched it in the list
            let conversationId = (user as any).conversationId;

            if (!conversationId) {
                // Check DB specifically
                const { data: existing, error } = await supabase
                    .from('Conversation')
                    .select('id')
                    .or(`and(participantA.eq.${dbUserId},participantB.eq.${user.id}),and(participantA.eq.${user.id},participantB.eq.${dbUserId})`)
                    .maybeSingle(); // Use maybeSingle to avoid error if not found

                if (existing) {
                    conversationId = existing.id;
                } else {
                    // Create new conversation
                    const { data: newConv, error: createError } = await supabase
                        .from('Conversation')
                        .insert({
                            participantA: dbUserId,
                            participantB: user.id,
                            updatedAt: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    conversationId = newConv.id;
                }
            }

            activeConversationIdRef.current = conversationId;
            await fetchMessages(conversationId);
        } catch (err) {
            console.error('Error selecting chat:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (messageId: string) => {
        if (!dbUserId) return;
        await supabase.from('Message').update({ readAt: new Date().toISOString() }).eq('id', messageId);
    };

    const markAllAsRead = async (conversationId: string) => {
        if (!dbUserId) return;
        // Mark all messages from partner where readAt is null
        await supabase.from('Message')
            .update({ readAt: new Date().toISOString() })
            .eq('conversationId', conversationId)
            .neq('senderId', dbUserId)
            .is('readAt', null);
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !dbUserId) return;

        const content = inputText.trim();
        setInputText('');

        // Optimistic Update
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, {
            id: tempId,
            role: 'user',
            content,
            timestamp: Date.now(),
            senderId: dbUserId
        }]);

        if (selectedUser?.id === 'dbot') {
            // Mock Dbot response for demo
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: "I'm meant to be connected to an AI backend, but for now I'm just a demo bot on mobile! 🤖",
                    timestamp: Date.now()
                }]);
            }, 1000);
            return;
        }

        try {
            if (!activeConversationIdRef.current) return;

            const { error } = await supabase
                .from('Message')
                .insert({
                    conversationId: activeConversationIdRef.current,
                    senderId: dbUserId,
                    content
                });

            if (error) throw error;

            // Update Conversation lastMessage
            await supabase
                .from('Conversation')
                .update({
                    lastMessage: content,
                    lastMessageAt: new Date().toISOString()
                })
                .eq('id', activeConversationIdRef.current);

        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    // --- Helpers ---
    const isUserOnline = (lastSeen?: string) => {
        if (!lastSeen) return false;
        const diff = Date.now() - new Date(lastSeen).getTime();
        return diff < 5 * 60 * 1000;
    };

    const handleBack = () => {
        Animated.timing(slideAnim, {
            toValue: width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setSelectedUser(null);
            activeConversationIdRef.current = null;
        });
        fetchConversations();
    };

    // Tag a message
    const tagMessage = async (tagType: string) => {
        if (!selectedMessage || !dbUserId || !selectedUser) return;

        // Generate unique IDs for Supabase (since it doesn't auto-generate CUIDs)
        const generateId = () => `cm${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;

        try {
            const { error } = await supabase.from('MessageTag').insert({
                id: generateId(),
                messageId: selectedMessage.id,
                userId: dbUserId,
                profileId: selectedUser.id,
                tagType,
            });

            if (error) throw error;

            // Create notifications for both users
            await supabase.from('Notification').insert([
                { id: generateId(), userId: dbUserId, type: 'MESSAGE_TAGGED', message: `You tagged a message as ${tagType.toLowerCase()}` },
                { id: generateId(), userId: selectedUser.id, type: 'MESSAGE_TAGGED', message: `A message was tagged as ${tagType.toLowerCase()}` },
            ]);

            Alert.alert('Tagged!', `Message tagged as ${tagType.toLowerCase()}`);
        } catch (err) {
            console.error('Error tagging message:', err);
            Alert.alert('Error', 'Failed to tag message');
        } finally {
            setShowTagModal(false);
            setSelectedMessage(null);
        }
    };

    // Check for fact warnings before sending
    const checkFactWarnings = async (content: string): Promise<boolean> => {
        if (!dbUserId || !selectedUser || selectedUser.id === 'dbot') return true;

        try {
            const { data: warnings } = await supabase
                .from('FactWarning')
                .select('keyword, warningText')
                .eq('userId', dbUserId)
                .eq('profileId', selectedUser.id)
                .eq('isActive', true);

            if (!warnings || warnings.length === 0) return true;

            const contentLower = content.toLowerCase();
            const matched = warnings.filter(w => contentLower.includes(w.keyword.toLowerCase()));

            if (matched.length > 0) {
                return new Promise((resolve) => {
                    Alert.alert(
                        '⚠️ Fact Warning',
                        matched.map(w => `"${w.keyword}": ${w.warningText}`).join('\n\n'),
                        [
                            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                            { text: 'Send Anyway', onPress: () => resolve(true) },
                        ]
                    );
                });
            }
            return true;
        } catch {
            return true;
        }
    };

    // Check all bonding content in real-time while typing
    const checkAllBondingContent = async (content: string) => {
        if (!dbUserId || !selectedUser || selectedUser.id === 'dbot' || content.length < 3) {
            setBondingWarnings({ blacklist: [], happy: [], facts: [] });
            setShowBondingWarning(false);
            return;
        }

        try {
            const contentLower = content.toLowerCase();

            // Fetch tagged content for this profile (blacklist and happy)
            const { data: tags } = await supabase
                .from('MessageTag')
                .select('tagType, taggedContent, message:Message(content)')
                .eq('userId', dbUserId)
                .eq('profileId', selectedUser.id);

            // Fetch fact warnings
            const { data: factWarnings } = await supabase
                .from('FactWarning')
                .select('keyword, warningText')
                .eq('userId', dbUserId)
                .eq('profileId', selectedUser.id)
                .eq('isActive', true);

            const blacklistMatches: string[] = [];
            const happyMatches: string[] = [];
            const factMatches: { keyword: string; warningText: string }[] = [];

            // Check blacklist tags
            if (tags) {
                tags.forEach((tag: any) => {
                    const tagContent = (tag.taggedContent || (Array.isArray(tag.message) ? tag.message[0]?.content : tag.message?.content) || '').toLowerCase();
                    if (tagContent && contentLower.includes(tagContent.substring(0, 10))) {
                        if (['BLACKLIST', 'ANGRY', 'SAD'].includes(tag.tagType)) {
                            blacklistMatches.push(tagContent);
                        } else if (['HAPPY', 'JOY', 'FUNNY'].includes(tag.tagType)) {
                            happyMatches.push(tagContent);
                        }
                    }
                });
            }

            // Check fact warnings
            if (factWarnings) {
                factWarnings.forEach((w: any) => {
                    if (contentLower.includes(w.keyword.toLowerCase())) {
                        factMatches.push({ keyword: w.keyword, warningText: w.warningText });
                    }
                });
            }

            const hasWarnings = blacklistMatches.length > 0 || factMatches.length > 0;
            setBondingWarnings({
                blacklist: blacklistMatches,
                happy: happyMatches,
                facts: factMatches,
            });
            setShowBondingWarning(hasWarnings);
        } catch (error) {
            console.error('Error checking bonding content:', error);
        }
    };

    // Debounced input change handler
    const handleInputChange = (text: string) => {
        setInputText(text);
        // Check bonding content after a short delay
        if (text.length >= 3) {
            checkAllBondingContent(text);
        } else {
            setShowBondingWarning(false);
        }
    };

    const getGradientColors = (): [string, string, string] => {
        return mode === 'light' ? ['#ffffff', '#f8f9fa', '#e9ecef'] :
            mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0', '#DBC4A0'] :
                ['#000000', '#0a0a0a', '#171717'];
    };

    // --- Render Components ---

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center z-10 pl-16">
            <Text className="text-3xl font-bold" style={{ color: colors.text }}>Messages</Text>
            <TouchableOpacity>
                <Image
                    source={{ uri: currentUserAvatar || session?.user?.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/png?seed=Me' }}
                    className="w-10 h-10 rounded-full border-2"
                    style={{ borderColor: colors.border }}
                />
            </TouchableOpacity>
        </View>
    );

    const renderSearchBar = () => (
        <View className="px-6 py-4">
            <BlurView
                intensity={30}
                tint={mode === 'light' ? 'light' : 'dark'}
                className="flex-row items-center px-4 py-3 rounded-2xl overflow-hidden border"
                style={{ borderColor: colors.border }}
            >
                <Search color={colors.text} size={20} />
                <TextInput
                    placeholder="Search users..."
                    placeholderTextColor={colors.secondary}
                    value={searchQuery}
                    onChangeText={(t) => { setSearchQuery(t); searchUsers(t); }}
                    className="flex-1 ml-3 text-base"
                    style={{ color: colors.text }}
                />
            </BlurView>
            <TouchableOpacity
                onPress={() => setSortMode(prev => prev === 'pinned' ? 'recent' : prev === 'recent' ? 'followers' : 'pinned')}
                className="mt-2 self-end"
            >
                <Text style={{ color: colors.primary, fontSize: 12 }}>
                    Sort: {sortMode.charAt(0).toUpperCase() + sortMode.slice(1)}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderUserList = () => (
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Dbot */}
            <TouchableOpacity
                onPress={() => handleUserSelect({ id: 'dbot', name: 'dbot AI', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=dbot', status: 'online' })}
                className="mb-6"
            >
                <BlurView
                    intensity={40}
                    tint={mode === 'light' ? 'light' : 'dark'}
                    className="p-4 rounded-3xl flex-row items-center overflow-hidden border"
                    style={{ borderColor: colors.border }}
                >
                    <View className="w-14 h-14 rounded-full items-center justify-center border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <Sparkles color={colors.text} size={28} />
                    </View>
                    <View className="flex-1 ml-4">
                        <Text className="text-lg font-bold" style={{ color: colors.text }}>dbot AI</Text>
                        <Text className="text-sm" style={{ color: colors.secondary }}>Your personal companion</Text>
                    </View>
                </BlurView>
            </TouchableOpacity>

            <Text className="text-sm font-semibold mb-4" style={{ color: colors.secondary }}>
                {searchQuery ? 'SEARCH RESULTS' : 'RECENT CONVERSATIONS'}
            </Text>

            {(getSortedConversations()).map((user) => (
                <TouchableOpacity
                    key={user.id}
                    onPress={() => handleUserSelect(user)}
                    onLongPress={() => {
                        Alert.alert(
                            user.isPinned ? 'Unpin Chat' : 'Pin Chat',
                            `Do you want to ${user.isPinned ? 'unpin' : 'pin'} specific chat?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: user.isPinned ? 'Unpin' : 'Pin', onPress: () => handlePin(user.id) }
                            ]
                        );
                    }}
                    className="flex-row items-center mb-5 p-3 rounded-2xl"
                    style={{ backgroundColor: user.isPinned ? (mode === 'light' ? '#f0f9ff' : '#1e3a8a30') : 'transparent' }}
                >
                    <Image source={{ uri: user.avatar }} className="w-14 h-14 rounded-2xl bg-gray-200" />
                    <View className="flex-1 ml-4 border-b pb-4" style={{ borderColor: colors.border }}>
                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-base font-bold" style={{ color: colors.text }}>
                                {user.name} {user.isPinned && '📌'}
                            </Text>
                            {user.lastMessageAt && (
                                <Text className="text-xs" style={{ color: colors.secondary }}>
                                    {new Date(user.lastMessageAt).toLocaleDateString()}
                                </Text>
                            )}
                        </View>
                        <Text numberOfLines={1} className="text-sm font-semibold" style={{ color: colors.secondary }}>
                            {user.lastMessage || 'Open to chat'}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}

            {!searchQuery && conversations.length === 0 && (
                <View className="items-center mt-10 opacity-50">
                    <Text style={{ color: colors.secondary }}>No conversations yet.</Text>
                </View>
            )}
        </ScrollView>
    );

    const renderChatRoom = () => {
        if (!selectedUser) return null;
        const isDbot = selectedUser.id === 'dbot';

        return (
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }} className="absolute inset-0 z-50">
                <LinearGradient colors={getGradientColors()} className="flex-1">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        className="flex-1"
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <SafeAreaView className="flex-1">
                            {/* Header */}
                            <BlurView intensity={80} tint={mode === 'light' ? 'light' : 'dark'} className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                                <View className="flex-row items-center flex-1">
                                    <TouchableOpacity onPress={handleBack} className="mr-3 p-2 rounded-full">
                                        <ChevronLeft color={colors.text} size={24} />
                                    </TouchableOpacity>
                                    <Image source={{ uri: selectedUser.avatar }} className="w-10 h-10 rounded-full bg-gray-200" />
                                    <View className="ml-3 flex-1">
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-base font-bold" numberOfLines={1} style={{ color: colors.text }}>{selectedUser.name}</Text>
                                        </View>
                                        <Text className="text-xs" style={{ color: colors.secondary }}>{isDbot ? 'AI Companion' : selectedUser.status}</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <TouchableOpacity onPress={() => router.push({
                                        pathname: '/bonding',
                                        params: {
                                            userId: selectedUser.id,
                                            userName: selectedUser.name,
                                            userAvatar: selectedUser.avatar
                                        }
                                    })} className="p-2 rounded-full bg-gray-200/20">
                                        <Heart size={20} color={colors.text} />
                                    </TouchableOpacity>
                                    {/* Chat Settings */}
                                    <TouchableOpacity onPress={() => setShowChatSettings(true)} className="p-2 rounded-full bg-gray-200/20">
                                        <MoreVertical size={20} color={colors.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setShowApps(!showApps)} className={`p-2 rounded-full ${showApps ? 'bg-indigo-500' : 'bg-gray-200/20'}`}>
                                        <Plus size={20} color={showApps ? 'white' : colors.text} style={{ transform: [{ rotate: showApps ? '45deg' : '0deg' }] }} />
                                    </TouchableOpacity>
                                </View>
                            </BlurView>

                            {/* Collaborative Apps Toolbar */}
                            {showApps && (
                                <View className="flex-row justify-around py-4 border-b" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                                    <TouchableOpacity onPress={() => router.push('/grounding')} className="items-center">
                                        <View className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-1">
                                            <Anchor size={20} color="#a855f7" />
                                        </View>
                                        <Text style={{ color: colors.secondary, fontSize: 10 }}>WREX</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => router.push('/(tabs)/journal')} className="items-center">
                                        <View className="p-3 rounded-full bg-violet-100 dark:bg-violet-900/30 mb-1">
                                            <Book size={20} color="#8b5cf6" />
                                        </View>
                                        <Text style={{ color: colors.secondary, fontSize: 10 }}>Journal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => router.push('/hopin')} className="items-center">
                                        <View className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-1">
                                            <MapIcon size={20} color="#3b82f6" />
                                        </View>
                                        <Text style={{ color: colors.secondary, fontSize: 10 }}>Hopin</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Messages */}
                            {isLoading ? (
                                <View className="flex-1 items-center justify-center">
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            ) : (
                                <ScrollView
                                    className="flex-1 px-4 py-6"
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    ref={ref => ref?.scrollToEnd({ animated: true })}
                                >
                                    {messages.map((msg, index) => {
                                        // Check if this is the last message sent by ME
                                        const isMe = msg.role === 'user';
                                        const isLastFromMe = isMe && index === messages.length - 1;
                                        const isLast = index === messages.length - 1;

                                        // Ghosted Logic: 
                                        // If last message is from me, NOT read, and > 5 hours have passed
                                        const isGhosted = isLastFromMe && !msg.readAt && (Date.now() - msg.timestamp > 5 * 60 * 60 * 1000);

                                        return (
                                            <View
                                                key={msg.id}
                                                className={`mb-4 max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}
                                            >
                                                <View className={`flex-row items-start gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    {/* 3-dots menu for tagging (only for non-dbot) */}
                                                    {selectedUser?.id !== 'dbot' && (
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                setSelectedMessage(msg);
                                                                setShowTagModal(true);
                                                            }}
                                                            className="p-1 mt-2"
                                                        >
                                                            <MoreVertical size={16} color={colors.secondary} />
                                                        </TouchableOpacity>
                                                    )}

                                                    {/* Message bubble */}
                                                    <View className="flex-1">
                                                        {/* Message bubble - Android Fallback for BlurView visibility issues */}
                                                        {Platform.OS === 'android' ? (
                                                            <View className="px-5 py-3 rounded-2xl border overflow-hidden" style={{
                                                                backgroundColor: colors.card,
                                                                borderColor: colors.border,
                                                                borderBottomRightRadius: isMe ? 0 : 16,
                                                                borderBottomLeftRadius: isMe ? 16 : 0
                                                            }}>
                                                                {msg.type === 'image' && msg.mediaUrl ? (
                                                                    <Image source={{ uri: msg.mediaUrl }} style={{ width: 240, height: 320, borderRadius: 8 }} resizeMode="cover" />
                                                                ) : msg.type === 'video' && msg.mediaUrl ? (
                                                                    <AVVideo
                                                                        source={{ uri: msg.mediaUrl }}
                                                                        style={{ width: 240, height: 320, borderRadius: 8 }}
                                                                        useNativeControls
                                                                        resizeMode={ResizeMode.COVER}
                                                                    />
                                                                ) : (
                                                                    <Text className="text-base" style={{ color: colors.text }}>{msg.content}</Text>
                                                                )}
                                                            </View>
                                                        ) : (
                                                            <BlurView intensity={40} tint={mode === 'light' ? 'light' : 'dark'} className="px-5 py-3 rounded-2xl border overflow-hidden" style={{
                                                                backgroundColor: isMe ? colors.card : 'transparent',
                                                                borderColor: colors.border,
                                                                borderBottomRightRadius: isMe ? 0 : 16,
                                                                borderBottomLeftRadius: isMe ? 16 : 0
                                                            }}>
                                                                {msg.type === 'image' && msg.mediaUrl ? (
                                                                    <Image source={{ uri: msg.mediaUrl }} style={{ width: 240, height: 320, borderRadius: 8 }} resizeMode="cover" />
                                                                ) : msg.type === 'video' && msg.mediaUrl ? (
                                                                    <AVVideo
                                                                        source={{ uri: msg.mediaUrl }}
                                                                        style={{ width: 240, height: 320, borderRadius: 8 }}
                                                                        useNativeControls
                                                                        resizeMode={ResizeMode.COVER}
                                                                    />
                                                                ) : (
                                                                    <Text className="text-base" style={{ color: colors.text }}>{msg.content}</Text>
                                                                )}
                                                            </BlurView>
                                                        )}
                                                        <View className={`flex-row items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <Text className="text-[10px]" style={{ color: colors.secondary }}>
                                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </Text>
                                                            {isLastFromMe && msg.readAt && (
                                                                <Text className="text-[10px] font-bold text-blue-500 ml-1">Seen</Text>
                                                            )}
                                                        </View>
                                                        {isGhosted && (
                                                            <Text className="text-[10px] text-red-500 text-right mt-1 font-bold">
                                                                Ghosted for {Math.floor((Date.now() - msg.timestamp) / (60 * 60 * 1000))} hrs
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            )}

                            {/* Bonding Warning Display */}
                            {showBondingWarning && (
                                <View className="px-4 py-2" style={{ backgroundColor: '#fef2f2' }}>
                                    {bondingWarnings.blacklist.length > 0 && (
                                        <View className="flex-row items-center gap-2 mb-1">
                                            <AlertTriangle size={14} color="#ef4444" />
                                            <Text className="text-xs text-red-500 flex-1">
                                                ⚠️ Blacklisted content detected
                                            </Text>
                                        </View>
                                    )}
                                    {bondingWarnings.facts.length > 0 && (
                                        <View className="flex-row items-center gap-2">
                                            <AlertTriangle size={14} color="#f59e0b" />
                                            <Text className="text-xs text-amber-600 flex-1">
                                                💡 {bondingWarnings.facts.map(f => `"${f.keyword}": ${f.warningText}`).join(', ')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Input */}
                            <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="px-4 py-4 border-t pb-8" style={{ borderColor: colors.border }}>
                                <View className="flex-row items-center gap-2">
                                    {/* Media button */}
                                    <TouchableOpacity className="p-2" onPress={() => {
                                        Alert.alert('Send Media', 'Choose media type', [
                                            { text: 'Photo', onPress: () => handlePickMedia('image') },
                                            { text: 'Video', onPress: () => handlePickMedia('video') },
                                            { text: 'Cancel', style: 'cancel' }
                                        ]);
                                    }}>
                                        <Paperclip size={22} color={colors.secondary} />
                                    </TouchableOpacity>

                                    {/* Emoji/Sticker button */}
                                    <TouchableOpacity className="p-2" onPress={() => Alert.alert('Coming Soon', 'Sticker picker coming soon!')}>
                                        <Smile size={22} color={colors.secondary} />
                                    </TouchableOpacity>

                                    <TextInput
                                        placeholder="Type a message..."
                                        placeholderTextColor={colors.secondary}
                                        value={inputText}
                                        onChangeText={handleInputChange}
                                        className="flex-1 h-12 px-4 rounded-full border"
                                        style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                                    />
                                    <TouchableOpacity onPress={sendMessage} className="w-12 h-12 rounded-full items-center justify-center shadow-lg" style={{ backgroundColor: colors.primary }}>
                                        <Send color={mode === 'light' ? '#fff' : '#000'} size={20} />
                                    </TouchableOpacity>
                                </View>
                            </BlurView>
                        </SafeAreaView>
                    </KeyboardAvoidingView>
                </LinearGradient>
            </Animated.View>
        );
    };

    const handlePickMedia = async (type: 'image' | 'video') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 0.8,
                videoMaxDuration: 60,
            });

            if (!result.canceled && result.assets[0] && dbUserId) {
                setIsUploading(true);
                try {
                    const file = result.assets[0];
                    let uploadResult;

                    if (type === 'image') {
                        uploadResult = await MediaUploadService.uploadImage(file.uri);
                    } else {
                        uploadResult = await MediaUploadService.uploadVideo(file.uri);
                    }

                    // Send the message with media
                    if (activeConversationIdRef.current) {
                        const { error } = await supabase.from('Message').insert({
                            conversationId: activeConversationIdRef.current,
                            senderId: dbUserId,
                            content: type === 'image' ? '📷 Image' : '📹 Video',
                            type: type,
                            mediaUrl: uploadResult.url
                        });

                        if (error) throw error;

                        // Update conversation last message
                        await supabase.from('Conversation').update({
                            lastMessage: type === 'image' ? '📷 Image' : '📹 Video',
                            lastMessageAt: new Date().toISOString()
                        }).eq('id', activeConversationIdRef.current);
                    }
                } catch (err) {
                    Alert.alert('Upload Failed', 'Could not upload media');
                    console.error(err);
                } finally {
                    setIsUploading(false);
                }
            }
        } catch (err) {
            console.error('Media picker error:', err);
        }
    };

    // Tag Modal
    const renderTagModal = () => (
        <Modal visible={showTagModal} transparent animationType="fade">
            <TouchableOpacity
                className="flex-1 bg-black/50 justify-center items-center"
                activeOpacity={1}
                onPress={() => { setShowTagModal(false); setSelectedMessage(null); }}
            >
                <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="w-72 rounded-2xl overflow-hidden p-4">
                    <Text className="text-lg font-bold mb-4 text-center" style={{ color: colors.text }}>Tag Message</Text>

                    {/* Blacklist Tags */}
                    <Text className="text-xs font-bold mb-2" style={{ color: '#ef4444' }}>BLACKLIST</Text>
                    <View className="flex-row gap-2 mb-4">
                        {['BLACKLIST', 'ANGRY', 'SAD'].map(type => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => tagMessage(type)}
                                className="flex-1 py-2 rounded-lg items-center"
                                style={{ backgroundColor: '#ef444420' }}
                            >
                                <Text className="text-xs font-bold" style={{ color: '#ef4444' }}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Happy Tags */}
                    <Text className="text-xs font-bold mb-2" style={{ color: '#22c55e' }}>HAPPY LOCKER</Text>
                    <View className="flex-row gap-2 mb-4">
                        {['HAPPY', 'JOY', 'FUNNY'].map(type => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => tagMessage(type)}
                                className="flex-1 py-2 rounded-lg items-center"
                                style={{ backgroundColor: '#22c55e20' }}
                            >
                                <Text className="text-xs font-bold" style={{ color: '#22c55e' }}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Fact Tag */}
                    <Text className="text-xs font-bold mb-2" style={{ color: '#3b82f6' }}>FACT LOCKER</Text>
                    <TouchableOpacity
                        onPress={() => tagMessage('FACT')}
                        className="py-3 rounded-lg items-center mb-2"
                        style={{ backgroundColor: '#3b82f620' }}
                    >
                        <Text className="font-bold" style={{ color: '#3b82f6' }}>Save as Fact</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => { setShowTagModal(false); setSelectedMessage(null); }}
                        className="py-3 rounded-lg items-center mt-2"
                        style={{ backgroundColor: colors.card }}
                    >
                        <Text style={{ color: colors.secondary }}>Cancel</Text>
                    </TouchableOpacity>
                </BlurView>
            </TouchableOpacity>
        </Modal>
    );

    // Chat Settings Modal
    const renderChatSettingsModal = () => (
        <Modal visible={showChatSettings} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
                <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="rounded-t-3xl overflow-hidden p-6 pb-10">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold" style={{ color: colors.text }}>Chat Settings</Text>
                        <TouchableOpacity onPress={() => setShowChatSettings(false)}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Chat Background */}
                    <TouchableOpacity
                        onPress={() => Alert.alert('Change Background', 'Choose an image or video for chat background', [
                            { text: 'Remove Background', onPress: () => setChatBackground(null) },
                            { text: 'Choose Image', onPress: () => Alert.alert('Coming Soon', 'Image picker will be available soon') },
                            { text: 'Cancel', style: 'cancel' }
                        ])}
                        className="flex-row items-center py-4 border-b"
                        style={{ borderColor: colors.border }}
                    >
                        <ImageIcon size={22} color={colors.primary} />
                        <View className="ml-4 flex-1">
                            <Text className="font-medium" style={{ color: colors.text }}>Chat Background</Text>
                            <Text className="text-xs" style={{ color: colors.secondary }}>
                                {chatBackground ? 'Custom background set' : 'Default background'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Block User */}
                    <TouchableOpacity
                        onPress={() => Alert.alert(
                            'Block User',
                            `Are you sure you want to block ${selectedUser?.name}? They won't be able to message you.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Block', style: 'destructive', onPress: () => {
                                        Alert.alert('Blocked', `${selectedUser?.name} has been blocked`);
                                        setShowChatSettings(false);
                                        handleBack();
                                    }
                                }
                            ]
                        )}
                        className="flex-row items-center py-4 border-b"
                        style={{ borderColor: colors.border }}
                    >
                        <X size={22} color="#ef4444" />
                        <View className="ml-4 flex-1">
                            <Text className="font-medium text-red-500">Block User</Text>
                            <Text className="text-xs" style={{ color: colors.secondary }}>
                                Prevent this user from messaging you
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Message Retention */}
                    <View className="py-4">
                        <Text className="font-medium mb-3" style={{ color: colors.text }}>Message Retention</Text>
                        <Text className="text-xs mb-3" style={{ color: colors.secondary }}>
                            Messages will auto-delete after the selected time
                        </Text>

                        <View className="flex-row flex-wrap gap-2">
                            {[
                                { value: 'forever', label: 'Forever' },
                                { value: '1day', label: '24 Hours' },
                                { value: 'viewonce', label: 'View Once' },
                                { value: 'custom', label: `${customRetentionDays} Days` },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => {
                                        if (option.value === 'custom') {
                                            // Alert.prompt is iOS only, so use a simpler approach
                                            Alert.alert(
                                                'Custom Retention',
                                                `Messages will be deleted after ${customRetentionDays} days. You can change this value in the settings.`
                                            );
                                        }
                                        setMessageRetention(option.value as any);
                                    }}
                                    className={`px-4 py-2 rounded-full ${messageRetention === option.value ? 'bg-indigo-500' : ''}`}
                                    style={{ backgroundColor: messageRetention === option.value ? colors.primary : colors.card }}
                                >
                                    <Text
                                        className="text-sm font-medium"
                                        style={{ color: messageRetention === option.value ? '#fff' : colors.text }}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('Settings Saved', 'Your chat settings have been updated');
                            setShowChatSettings(false);
                        }}
                        className="mt-4 py-4 rounded-xl items-center"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Text className="font-bold text-white">Save Settings</Text>
                    </TouchableOpacity>
                </BlurView>
            </View>
        </Modal>
    );

    return (
        <LinearGradient colors={getGradientColors()} className="flex-1">
            <SafeAreaView className="flex-1">
                {renderHeader()}
                {renderSearchBar()}
                {renderUserList()}
                {renderChatRoom()}
                {renderTagModal()}
                {renderChatSettingsModal()}
            </SafeAreaView>
        </LinearGradient>
    );
}
