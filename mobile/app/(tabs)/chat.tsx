import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, Modal, Animated, Dimensions, FlatList, ActivityIndicator, Alert, AlertButton, BackHandler, KeyboardAvoidingView, Platform, Keyboard, StatusBar, ImageBackground } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Mic, Send, Search, Settings, MoreVertical, Phone, Video, Image as ImageIcon, Smile, X, ChevronLeft, ChevronUp, ChevronDown, GripVertical, Sparkles, User as UserIcon, Sun, Moon, Anchor, Heart, Map as MapIcon, Book, Plus, Tag, Frown, AlertTriangle, Check, CheckCheck, Clock, Trash2, EyeOff, Lock, Bookmark, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanResponder, Animated as RNAnimated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useNavVisibility } from '../../context/NavContext';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEncryption } from '../../context/EncryptionContext';
import { encryptMessage, decryptMessage } from '../../lib/encryption';

import { MediaUploadService } from '../../services/MediaUploadService';
import { uploadToR2 } from '../../lib/upload';
import * as ImagePicker from 'expo-image-picker';
import { Video as AVVideo, ResizeMode } from 'expo-av';
import { Paperclip } from 'lucide-react-native';
import CustomToast, { ToastType } from '../../components/CustomToast';
import ChatPostCard from '../../components/ChatPostCard';
import CollaborativeModal from '../../components/CollaborativeModal';


const { width } = Dimensions.get('window');


type PersonaType = 'friend' | 'therapist' | 'coach' | 'mystic';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'post' | 'reply';
    mediaUrl?: string;
    timestamp: number;
    senderId?: string;
    readAt?: string;
    isSaved?: boolean;
    tags?: string[];
    isEdited?: boolean;
    isDeleted?: boolean;
    deletedBy?: string[];
    updatedAt?: string;
}

interface ChatUser {
    id: string;
    name: string;
    avatar: string | null;
    status: 'online' | 'offline' | 'away';
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    lastSeen?: string;
    isPinned?: boolean;
    followersCount?: number;
    conversationId?: string;
    isHidden?: boolean;
    isLocked?: boolean;
    publicKey?: string;
}

// Swipeable Message Component
const SwipeableMessage = ({ children, onReply, isMe }: { children: React.ReactNode, onReply: () => void, isMe: boolean }) => {
    const pan = React.useRef(new RNAnimated.ValueXY()).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only allow horizontal swipe (right for reply)
                return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
            },
            onPanResponderMove: (_, gestureState) => {
                // Limit swipe distance
                if (gestureState.dx > 0 && gestureState.dx < 100) {
                    pan.setValue({ x: gestureState.dx, y: 0 });
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 50) {
                    // Trigger reply
                    onReply();
                }
                RNAnimated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    return (
        <RNAnimated.View
            {...panResponder.panHandlers}
            style={{ transform: [{ translateX: pan.x }] }}
        >
            {children}
        </RNAnimated.View>
    );
};

export default function ChatScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { colors, mode, toggleTheme } = useTheme();
    const { session } = useAuth();
    const { setHideNav } = useNavVisibility();
    const currentUserId = session?.user?.id;
    const { privateKey, publicKey: myPublicKey } = useEncryption();

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
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    // Keyboard visibility listener for Android pan mode
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Nickname State
    const [nicknames, setNicknames] = useState<Record<string, string>>({});
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [editUser, setEditUser] = useState<ChatUser | null>(null);
    const [tempNickname, setTempNickname] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('chatNicknames').then(json => {
            if (json) setNicknames(JSON.parse(json));
        });
    }, []);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedMessageToDelete, setSelectedMessageToDelete] = useState<Message | null>(null);
    const [isDeleteForEveryoneAvailable, setIsDeleteForEveryoneAvailable] = useState(false);

    const handleSaveNickname = async () => {
        if (!editUser) return;
        const newNicks = { ...nicknames, [editUser.id]: tempNickname.trim() };
        if (!tempNickname.trim()) delete newNicks[editUser.id];
        setNicknames(newNicks);
        await AsyncStorage.setItem('chatNicknames', JSON.stringify(newNicks));
        setShowNicknameModal(false);
        setEditUser(null);
    };

    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [optionsUser, setOptionsUser] = useState<ChatUser | null>(null);

    const handleShowOptions = (user: ChatUser) => {
        setOptionsUser(user);
        setShowOptionsModal(true);
    };

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
    const [showCollaborativeModal, setShowCollaborativeModal] = useState(false);
    const [chatBackground, setChatBackground] = useState<string | null>(null);
    const [messageRetention, setMessageRetention] = useState<'immediately' | 'forever' | '1day' | 'custom'>('immediately');
    const [customRetentionDays, setCustomRetentionDays] = useState(7);

    const [isUploading, setIsUploading] = useState(false);
    const [tempAccepted, setTempAccepted] = useState(false);

    // Safety: Blocked Users
    const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

    // Chat Management: Hidden & Locked
    const [hiddenConversationIds, setHiddenConversationIds] = useState<Set<string>>(new Set());
    const [lockedConversationIds, setLockedConversationIds] = useState<Set<string>>(new Set());
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockModalConversationId, setLockModalConversationId] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [pendingUnlockConversationId, setPendingUnlockConversationId] = useState<string | null>(null);
    const [showPinPrompt, setShowPinPrompt] = useState(false);

    // Toast state
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<ToastType>('success');
    const showToast = (message: string, type: ToastType = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const [replyTo, setReplyTo] = useState<{ id: string; content: string; sender: string } | null>(null);
    const [taggingMessageId, setTaggingMessageId] = useState<string | null>(null);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagText, setNewTagText] = useState('');
    const triggerResolveRef = useRef<((value: boolean) => void) | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    // Custom Trigger Warning State
    const [triggerWarningModalVisible, setTriggerWarningModalVisible] = useState(false);
    const [triggerWarningData, setTriggerWarningData] = useState<{
        warnings: string[];
        collectionId?: string;
        collectionName?: string;
        resolve: (value: boolean) => void;
    } | null>(null);

    // Trigger Collection State
    const [showTriggerModal, setShowTriggerModal] = useState(false);
    const [triggerMessage, setTriggerMessage] = useState<Message | null>(null);
    const [triggerSelectedText, setTriggerSelectedText] = useState('');
    const [triggerCollections, setTriggerCollections] = useState<{ id: string, name: string, keyword?: string }[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [triggerTargetUser, setTriggerTargetUser] = useState<'self' | 'other' | 'both'>('self');
    const [triggerConditionType, setTriggerConditionType] = useState<'exact_match' | 'keyword'>('keyword');
    const [triggerWarningMessage, setTriggerWarningMessage] = useState('');
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]); // For keyword condition
    // Slash command state
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashSearchQuery, setSlashSearchQuery] = useState('');
    const [allTriggers, setAllTriggers] = useState<any[]>([]);


    useEffect(() => {
        if (!dbUserId) return;
        const fetchBlocks = async () => {
            const { data: blocked } = await supabase.from('BlockedUser').select('blockedId').eq('blockerId', dbUserId);
            const { data: blocker } = await supabase.from('BlockedUser').select('blockerId').eq('blockedId', dbUserId);

            const ids = new Set<string>();
            if (blocked) blocked.forEach((b: any) => ids.add(b.blockedId));
            if (blocker) blocker.forEach((b: any) => ids.add(b.blockerId));
            setBlockedIds(ids);
        };
        fetchBlocks();
    }, [dbUserId]);

    // Fetch hidden and locked conversation states
    useEffect(() => {
        if (!dbUserId) return;
        const fetchConversationStates = async () => {
            const { data: states } = await supabase
                .from('ConversationState')
                .select('conversationId, isHidden, isLocked')
                .eq('userId', dbUserId);

            if (states) {
                const hidden = new Set<string>();
                const locked = new Set<string>();
                states.forEach((s: any) => {
                    if (s.isHidden) hidden.add(s.conversationId);
                    if (s.isLocked) locked.add(s.conversationId);
                });
                setHiddenConversationIds(hidden);
                setLockedConversationIds(locked);
            }
        };
        fetchConversationStates();
    }, [dbUserId]);

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

    // Hide Floating Nav when Chat Room is Open - Focus aware
    useFocusEffect(
        useCallback(() => {
            setHideNav(!!selectedUser);
            return () => {
                setHideNav(false);
                // Clear search when leaving page
                setSearchQuery('');
                setSearchResults([]);
            };
        }, [selectedUser, setHideNav])
    );

    // Dbot State
    const slideAnim = useRef(new Animated.Value(width)).current;
    const activeConversationIdRef = useRef<string | null>(null);
    // Load Pinned IDs
    useEffect(() => {
        AsyncStorage.getItem('pinnedChatIds').then((json) => {
            if (json) setPinnedIds(new Set(JSON.parse(json)));
        });
        // Also load pinned order
        AsyncStorage.getItem('pinnedChatOrder').then((json) => {
            if (json) setPinnedOrder(JSON.parse(json));
        });
    }, []);

    // Pinned order for rearranging
    const [pinnedOrder, setPinnedOrder] = useState<string[]>([]);

    const handlePin = async (userId: string) => {
        const newSet = new Set(pinnedIds);
        let newOrder = [...pinnedOrder];

        if (newSet.has(userId)) {
            newSet.delete(userId);
            newOrder = newOrder.filter(id => id !== userId);
        } else {
            newSet.add(userId);
            newOrder.push(userId);
        }
        setPinnedIds(newSet);
        setPinnedOrder(newOrder);
        await AsyncStorage.setItem('pinnedChatIds', JSON.stringify(Array.from(newSet)));
        await AsyncStorage.setItem('pinnedChatOrder', JSON.stringify(newOrder));
    };

    // Move pinned chat up in order
    const movePinnedUp = async (userId: string) => {
        const idx = pinnedOrder.indexOf(userId);
        if (idx <= 0) return;

        const newOrder = [...pinnedOrder];
        [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
        setPinnedOrder(newOrder);
        await AsyncStorage.setItem('pinnedChatOrder', JSON.stringify(newOrder));
    };

    // Move pinned chat down in order
    const movePinnedDown = async (userId: string) => {
        const idx = pinnedOrder.indexOf(userId);
        if (idx < 0 || idx >= pinnedOrder.length - 1) return;

        const newOrder = [...pinnedOrder];
        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
        setPinnedOrder(newOrder);
        await AsyncStorage.setItem('pinnedChatOrder', JSON.stringify(newOrder));
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
    // Ref to hold channel for broadcast sending
    const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!activeConversationIdRef.current || !dbUserId) return;

        const channel = supabase.channel(`chat:${activeConversationIdRef.current}`)
            // FAST PATH: Listen for broadcast messages (instant delivery)
            .on('broadcast', { event: 'new_message' }, (payload) => {
                const newMsg = payload.payload;
                // Skip if it's our own message (already added via optimistic update)
                if (newMsg.senderId === dbUserId) return;
                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    markAsRead(newMsg.id);
                    return [...prev, {
                        id: newMsg.id,
                        role: 'assistant',
                        content: newMsg.content,
                        type: newMsg.type || 'text',
                        mediaUrl: newMsg.mediaUrl,
                        timestamp: newMsg.timestamp || Date.now(),
                        senderId: newMsg.senderId,
                        readAt: null
                    }];
                });
            })
            // FALLBACK PATH: Listen for postgres_changes (for offline users, ensures persistence)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'Message', filter: `conversationId=eq.${activeConversationIdRef.current}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new;
                        setMessages(prev => {
                            // DEDUPLICATION: Skip if already received via broadcast
                            if (prev.find(m => m.id === newMsg.id)) return prev;
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

        chatChannelRef.current = channel;

        // Mark existing unread messages as read when opening
        markAllAsRead(activeConversationIdRef.current);

        return () => {
            supabase.removeChannel(channel);
            chatChannelRef.current = null;
        };
    }, [activeConversationIdRef.current, dbUserId]);

    // --- Data Fetching ---

    const fetchConversations = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

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
                    userA:participantA ( id, name, lastSeen, followersCount, profile:Profile(avatarUrl, displayName, publicKey) ),
                    userB:participantB ( id, name, lastSeen, followersCount, profile:Profile(avatarUrl, displayName, publicKey) )
                `)
                .or(`participantA.eq.${currentUser.id},participantB.eq.${currentUser.id}`)
                .order('lastMessageAt', { ascending: false });

            if (error) throw error;

            if (error) throw error;

            const formatted: ChatUser[] = data.map((c: any) => {
                const isA = c.participantA === currentUser.id;
                const partner = isA ? c.userB : c.userA;

                // Safety check if partner user was deleted
                if (!partner) return null;

                const name = partner.profile?.displayName || partner.name || 'Unknown User';
                const avatar = partner.profile?.avatarUrl || null; // No fallback avatar

                return {
                    id: partner.id,
                    name: name,
                    avatar: avatar, // Type needs to update or handle empty string? ChatUser defines string. I can pass empty string.
                    status: (isUserOnline(partner.lastSeen) ? 'online' : 'offline') as 'online' | 'offline' | 'away',
                    lastMessage: (() => {
                        if (!c.lastMessage) return 'Start a conversation';
                        try {
                            if (c.lastMessage.startsWith('{')) {
                                const parsed = JSON.parse(c.lastMessage);
                                if (parsed.text && parsed.replyTo) return parsed.text;
                            }
                        } catch (e) { }
                        return c.lastMessage;
                    })(),
                    lastMessageAt: c.lastMessageAt,
                    unreadCount: 0,
                    lastSeen: partner.lastSeen,
                    followersCount: partner.followersCount || 0,
                    isPinned: pinnedIds.has(partner.id),
                    conversationId: c.id,
                    publicKey: partner.profile?.publicKey
                };
            }).filter(Boolean).filter((u: any) => !blockedIds.has(u.id)) as ChatUser[];

            setConversations(formatted);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        }
    };

    const getSortedConversations = () => {
        let list = searchQuery ? searchResults : conversations;

        // Update flags dynamically
        list = list.map(c => ({
            ...c,
            isPinned: pinnedIds.has(c.id),
            isHidden: hiddenConversationIds.has(c.conversationId || c.id),
            isLocked: lockedConversationIds.has(c.conversationId || c.id)
        }));

        // Show hidden chats ONLY when specifically searching for "hidden"
        const searchLower = searchQuery.toLowerCase().trim();
        const showHidden = searchLower === 'hidden';

        if (showHidden) {
            // Only show hidden chats
            list = list.filter(c => c.isHidden);
        } else {
            // Filter out hidden chats for normal view
            list = list.filter(c => !c.isHidden);
        }

        // Sort based on mode
        let sortedList: typeof list;
        if (sortMode === 'followers') {
            sortedList = list.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
        } else {
            // recent (default)
            sortedList = list.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
        }

        // ALWAYS put pinned chats at top, sorted by custom pinnedOrder
        const pinned = sortedList.filter(c => c.isPinned);
        const unpinned = sortedList.filter(c => !c.isPinned);

        // Sort pinned by their order in pinnedOrder array
        const orderedPinned = pinned.sort((a, b) => {
            const aIdx = pinnedOrder.indexOf(a.id);
            const bIdx = pinnedOrder.indexOf(b.id);
            // If not in order array, put at end
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
        });

        return [...orderedPinned, ...unpinned];
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

            // Search by Profile Code
            const { data: codeUser } = await supabase
                .from('User')
                .select(`
                    id, name, lastSeen, profileCode,
                    profile:Profile!inner(displayName, avatarUrl)
                `)
                .eq('profileCode', query.replace('#', ''))
                .neq('id', dbUserId)
                .maybeSingle();

            let combinedData = data || [];
            if (codeUser) {
                // Check duplicates
                if (!combinedData.find((u: any) => u.id === codeUser.id)) {
                    combinedData.unshift(codeUser);
                }
            }

            if (error) throw error;

            const formatted = combinedData.map((u: any) => {
                const profile = Array.isArray(u.profile) ? u.profile[0] : u.profile;
                return {
                    id: u.id,
                    name: profile?.displayName || u.name || 'Unknown',
                    avatar: profile?.avatarUrl || '',
                    status: (isUserOnline(u.lastSeen) ? 'online' : 'offline') as 'online' | 'offline' | 'away',
                    lastSeen: u.lastSeen
                };
            }).filter((u: any) => !blockedIds.has(u.id));


            setSearchResults(formatted);
        } catch (err) {
            console.error('Error searching users:', err);
        }
    };

    // Chat Management Handlers
    const handleDeleteChat = async (conversationId: string) => {
        if (!dbUserId) return;

        try {
            // Upsert ConversationState with isDeleted = true
            await supabase.from('ConversationState').upsert({
                conversationId,
                userId: dbUserId,
                isDeleted: true
            }, { onConflict: 'conversationId,userId' });

            // Remove from local list
            setConversations(prev => prev.filter(c => (c.conversationId || c.id) !== conversationId));
            setShowOptionsModal(false);

            // Show success toast
            showToast('Chat deleted successfully', 'success');
        } catch (err) {
            console.error('Error deleting chat:', err);
            showToast('Failed to delete chat', 'error');
        }
    };

    const handleHideChat = async (conversationId: string) => {
        if (!dbUserId) return;

        try {
            const isCurrentlyHidden = hiddenConversationIds.has(conversationId);

            await supabase.from('ConversationState').upsert({
                conversationId,
                userId: dbUserId,
                isHidden: !isCurrentlyHidden
            }, { onConflict: 'conversationId,userId' });

            // Update local state
            setHiddenConversationIds(prev => {
                const newSet = new Set(prev);
                if (isCurrentlyHidden) {
                    newSet.delete(conversationId);
                } else {
                    newSet.add(conversationId);
                }
                return newSet;
            });
            setShowOptionsModal(false);
        } catch (err) {
            console.error('Error hiding chat:', err);
            showToast('Failed to hide chat', 'error');
        }
    };




    const handleLockChat = async (conversationId: string) => {
        setLockModalConversationId(conversationId);
        setIsSettingPin(true);
        setPinInput('');
        setShowLockModal(true);
        setShowOptionsModal(false);
    };

    const handleSetPin = async () => {
        if (!lockModalConversationId || !dbUserId || pinInput.length < 4) {
            Alert.alert('Error', 'PIN must be at least 4 digits');
            return;
        }

        try {
            // Store PIN securely
            await SecureStore.setItemAsync(`chat_pin_${lockModalConversationId}`, pinInput);

            // Update database
            await supabase.from('ConversationState').upsert({
                conversationId: lockModalConversationId,
                userId: dbUserId,
                isLocked: true
            }, { onConflict: 'conversationId,userId' });

            // Update local state
            setLockedConversationIds(prev => new Set(prev).add(lockModalConversationId));
            setShowLockModal(false);
            setPinInput('');
        } catch (err) {
            console.error('Error setting PIN:', err);
            showToast('Failed to set PIN', 'error');
        }
    };

    const handleUnlockChat = async (conversationId: string) => {
        if (!dbUserId) return;

        try {
            // Remove PIN
            await SecureStore.deleteItemAsync(`chat_pin_${conversationId}`);

            // Update database
            await supabase.from('ConversationState').upsert({
                conversationId,
                userId: dbUserId,
                isLocked: false
            }, { onConflict: 'conversationId,userId' });

            // Update local state
            setLockedConversationIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(conversationId);
                return newSet;
            });
        } catch (err) {
            console.error('Error unlocking chat:', err);
        }
    };

    const authenticateForChat = async (conversationId: string): Promise<boolean> => {
        // Check if biometric is available
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Chat',
                fallbackLabel: 'Use PIN',
                cancelLabel: 'Cancel',
            });

            if (result.success) return true;
        }

        // Fallback to PIN
        const storedPin = await SecureStore.getItemAsync(`chat_pin_${conversationId}`);
        if (storedPin) {
            setPendingUnlockConversationId(conversationId);
            setPinInput('');
            setShowPinPrompt(true);
            return false; // Will be handled by PIN modal
        }

        return true; // No lock set
    };

    const verifyPin = async () => {
        if (!pendingUnlockConversationId) return;

        const storedPin = await SecureStore.getItemAsync(`chat_pin_${pendingUnlockConversationId}`);
        if (storedPin === pinInput) {
            setShowPinPrompt(false);
            setPinInput('');
            // Proceed to open chat
            const user = conversations.find(c => (c.conversationId || c.id) === pendingUnlockConversationId);
            if (user) {
                handleUserSelect(user);
            }
            setPendingUnlockConversationId(null);
        } else {
            Alert.alert('Incorrect PIN', 'Please try again');
            setPinInput('');
        }
    };

    const fetchMessages = async (conversationId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // Direct Supabase query - no API call needed
            const { data: messagesData, error } = await supabase
                .from('Message')
                .select(`
                    id, conversationId, senderId, content, type, mediaUrl, isSaved, readAt, createdAt,
                    sender:User!senderId(id, name, profile:Profile(avatarUrl)),
                    messageTags:MessageTag(tagType),
                    sharedPost:Post!sharedPostId(id, content, postType, user:User(id, name, profile:Profile(displayName, avatarUrl)), postMedia:PostMedia(media:Media(url, type)))
                `)
                .eq('conversationId', conversationId)
                .neq('isDeleted', true)
                .order('createdAt', { ascending: true });

            if (error) throw error;

            // Fetch my deleted messages (soft deleted for me)
            const { data: myDeletedData } = await supabase
                .from('DeletedMessage')
                .select('messageId')
                .eq('userId', user.id);

            const myDeletedIds = new Set((myDeletedData || []).map(d => d.messageId));

            const fetchedMessages: Message[] = (messagesData || [])
                .filter((m: any) => !myDeletedIds.has(m.id))
                .map((m: any) => {
                    let text = m.content;
                    // Attempt Decryption
                    if (text && text.startsWith('{') && text.includes('"c":') && privateKey) {
                        try {
                            const isMe = m.senderId === user.id;

                            // For simple 1-on-1, the partner key is always selectedUser.publicKey
                            // But fetchMessages is called after selectedUser is set?
                            // Actually we might need to look it up if selectedUser isn't ready, but 
                            // usually fetchMessages is called when chat is open.
                            // HOWEVER: fetchMessages does not have access to selectedUser inside this map easily if it's stale?
                            // We can use the sender's public key from the join for incoming messages.
                            // For outgoing, we need to know who we sent it to.
                            // Let's assume selectedUser is available and correct context.

                            // Better: use the sender profile from query for incoming
                            const senderPubKey = m.sender?.profile?.publicKey;
                            // But if *I* sent it, m.sender is ME. I need the OTHER person's key.
                            // We can fall back to selectedUser.publicKey (current chat partner).
                            const otherKey = isMe ? selectedUser?.publicKey : (senderPubKey || selectedUser?.publicKey);

                            if (otherKey && privateKey) {
                                const parsed = JSON.parse(text);
                                if (parsed.c && parsed.n) {
                                    const decrypted = decryptMessage(
                                        { ciphertext: parsed.c, nonce: parsed.n },
                                        privateKey,
                                        otherKey
                                    );
                                    if (decrypted) text = decrypted;
                                }
                            }
                        } catch (e) { /* ignore JSON parse error */ }
                    }

                    return {
                        id: m.id,
                        conversationId: m.conversationId,
                        senderId: m.senderId,
                        content: text,
                        type: m.type,
                        mediaUrl: m.mediaUrl,
                        timestamp: new Date(m.createdAt).getTime(),
                        sender: m.senderId === user?.id ? 'me' : 'them',
                        role: (m.senderId === user?.id ? 'user' : 'assistant') as 'user' | 'assistant' | 'system',
                        isSaved: m.isSaved,
                        readAt: m.readAt,
                        tags: m.messageTags?.map((t: any) => t.tagType) || []
                    };
                });

            setMessages(fetchedMessages);

            // Mark unread messages as read
            const unreadIds = (messagesData || [])
                .filter((m: any) => m.senderId !== user.id && !m.readAt)
                .map((m: any) => m.id);

            if (unreadIds.length > 0) {
                await supabase
                    .from('Message')
                    .update({ readAt: new Date().toISOString() })
                    .in('id', unreadIds);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };


    // --- Actions ---

    const handleUserSelect = async (user: ChatUser) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
            Alert.alert("Error", "You must be logged in.");
            return;
        }

        // Check if chat is locked
        const conversationId = (user as any).conversationId;
        if (conversationId && lockedConversationIds.has(conversationId)) {
            const authenticated = await authenticateForChat(conversationId);
            if (!authenticated) return; // Will show PIN prompt
        }

        setIsLoading(true);
        setSelectedUser(user);
        setMessages([]);
        setTempAccepted(false);

        // Animation
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 100,
        }).start();

        try {
            // Find existing conversation or create new one
            // First, check if we already fetched it in the list
            let conversationId = (user as any).conversationId;

            if (!conversationId) {
                // Check DB specifically
                const { data: existing, error } = await supabase
                    .from('Conversation')
                    .select('id')
                    .or(`and(participantA.eq.${currentUser.id},participantB.eq.${user.id}),and(participantA.eq.${user.id},participantB.eq.${currentUser.id})`)
                    .maybeSingle(); // Use maybeSingle to avoid error if not found

                if (existing) {
                    conversationId = existing.id;
                } else {
                    // Create new conversation
                    const newId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
                    const { data: newConv, error: createError } = await supabase
                        .from('Conversation')
                        .insert({
                            id: newId,
                            participantA: currentUser.id,
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

            // Load wallpaper from local storage first (faster)
            const wallpaperKey = `wallpaper_${conversationId}`;
            const localWallpaper = await AsyncStorage.getItem(wallpaperKey);
            if (localWallpaper) {
                setChatBackground(localWallpaper);
            } else {
                // Fallback to DB
                const { data: convData } = await supabase
                    .from('Conversation')
                    .select('wallpaperUrl')
                    .eq('id', conversationId)
                    .single();
                if (convData?.wallpaperUrl) {
                    setChatBackground(convData.wallpaperUrl);
                    // Cache locally for next time
                    await AsyncStorage.setItem(wallpaperKey, convData.wallpaperUrl);
                } else {
                    setChatBackground(null);
                }
            }

            // Fetch retention setting separately (may not exist in older DBs)
            try {
                const { data: retData } = await supabase
                    .from('Conversation')
                    .select('messageRetention')
                    .eq('id', conversationId)
                    .single();
                if (retData?.messageRetention) {
                    setMessageRetention(retData.messageRetention as any);
                }
            } catch (retErr) {
                console.log('[Chat] messageRetention field may not exist:', retErr);
            }
        } catch (err) {
            console.error('Error selecting chat:', err);
            Alert.alert("Error", "Failed to load chat.");
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
        const { data: updatedMessages } = await supabase.from('Message')
            .update({ readAt: new Date().toISOString() })
            .eq('conversationId', conversationId)
            .neq('senderId', dbUserId)
            .is('readAt', null)
            .select('id');

        // If retention is 'immediately', delete messages that have been read by both parties - SOFT DELETE
        if (messageRetention === 'immediately') {
            // Find all messages where both parties have seen them
            // A message is "seen by both" if:
            // - It was sent by me AND partner has read it (readAt is set)
            // - It was sent by partner AND I just read it (above update)
            const { data: allMessages } = await supabase.from('Message')
                .select('id, senderId, readAt')
                .eq('conversationId', conversationId)
                .not('readAt', 'is', null);

            if (allMessages && allMessages.length > 0) {
                const messageIds = allMessages.map(m => m.id);

                // Soft Delete these messages from DB
                await supabase.from('Message')
                    .update({ isDeleted: true })
                    .in('id', messageIds);

                // Remove from local state
                setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
            }
        }
    };

    const sendMessage = async (type: 'text' | 'image' | 'video' | 'audio' | 'post' = 'text', content: string = inputText, mediaUrl: string | null = null) => {
        if (!content.trim() && type === 'text' && !mediaUrl) return;

        // Check Trigger Warnings
        if (type === 'text' && content) {
            const proceed = await checkTriggerWarnings(content);
            if (!proceed) return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            Alert.alert("Error", "You must be logged in to send messages");
            return;
        }

        const senderId = user.id;
        const messageId = `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 11)}`;
        const timestamp = Date.now();

        let messageType: Message['type'] = type;

        // E2EE Encryption
        let messageContent = content;
        if (privateKey && selectedUser?.publicKey && type === 'text') {
            try {
                const encrypted = encryptMessage(content, privateKey, selectedUser.publicKey);
                // Pack as JSON
                messageContent = JSON.stringify({ c: encrypted.ciphertext, n: encrypted.nonce });
            } catch (e) {
                console.error("Encryption failed:", e);
                Alert.alert("Security Error", "Could not encrypt message.");
                return;
            }
        } else if (!privateKey && type === 'text') {
            // Fallback or warning?
            // If keys are missing, we might want to block sending or warn.
            // For now, let's wrap in a warning logic or just send plain if that's the legacy behavior intended (but User asked for security).
            // Given "Completely secure", let's ALERT if no keys.
            Alert.alert("Secure Chat Locked", "Please unlock your secure wallet to send messages.");
            return;
        }

        // Handle Reply
        if (replyTo && type === 'text') {
            messageType = 'reply';
            messageContent = JSON.stringify({
                text: content,
                replyTo: replyTo
            });
        }

        // Optimistic Update
        const optimisticMsg: Message = {
            id: messageId,
            role: 'user',
            content: messageContent,
            type: messageType,
            mediaUrl: mediaUrl,
            timestamp: timestamp,
            senderId: senderId,
            readAt: null,
            isSaved: false,
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setInputText('');
        setReplyTo(null); // Clear reply

        // FAST PATH: Broadcast message instantly to other clients
        if (chatChannelRef.current) {
            chatChannelRef.current.send({
                type: 'broadcast',
                event: 'new_message',
                payload: {
                    id: messageId,
                    content: messageContent,
                    senderId: senderId,
                    timestamp: timestamp,
                    type: messageType,
                    mediaUrl: mediaUrl
                }
            });
        }

        try {
            if (!activeConversationIdRef.current) return;

            const { error } = await supabase
                .from('Message')
                .insert({
                    id: messageId,
                    conversationId: activeConversationIdRef.current,
                    senderId: senderId,
                    content: messageContent,
                    type: messageType,
                    mediaUrl: mediaUrl
                });

            if (error) {
                console.error("Supabase Message Insert Error:", JSON.stringify(error, null, 2));
                throw error;
            }

            // Update Conversation lastMessage
            await supabase
                .from('Conversation')
                .update({
                    lastMessage: content,
                    lastMessageAt: new Date().toISOString()
                })
                .eq('id', activeConversationIdRef.current);

        } catch (err: any) {
            console.error('Error sending message:', err);
            Alert.alert("Delivery Failed", `Could not send message: ${err.message || 'Unknown error'}`);
            // Optionally remove the optimistic message here
        }
    };

    // --- Helpers ---
    const isUserOnline = (lastSeen?: string) => {
        if (!lastSeen) return false;
        const diff = Date.now() - new Date(lastSeen).getTime();
        return diff < 5 * 60 * 1000;
    };

    const handleBack = async () => {
        // Direct Supabase retention cleanup on exit - no API call needed
        if (activeConversationIdRef.current && dbUserId) {
            try {
                const conversationId = activeConversationIdRef.current;

                // Record exit time
                await supabase.from('ConversationState').upsert({
                    conversationId,
                    userId: dbUserId,
                    lastExitedAt: new Date().toISOString()
                }, { onConflict: 'conversationId,userId' });

                // Get retention setting
                const { data: conv } = await supabase
                    .from('Conversation')
                    .select('messageRetention')
                    .eq('id', conversationId)
                    .single();

                // Handle retention cleanup - SOFT DELETE
                if (conv?.messageRetention === 'immediately') {
                    // Delete read messages that are not saved
                    await supabase.from('Message').update({ isDeleted: true })
                        .eq('conversationId', conversationId)
                        .eq('isSaved', false)
                        .not('readAt', 'is', null);
                } else if (conv?.messageRetention === '1day') {
                    // Delete messages older than 24 hours (not saved)
                    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    await supabase.from('Message').update({ isDeleted: true })
                        .eq('conversationId', conversationId)
                        .eq('isSaved', false)
                        .lt('createdAt', cutoff);
                }
            } catch (err) {
                console.error('[Chat] Failed to cleanup on exit:', err);
            }
        }

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

    // Save/unsave a message
    const handleSaveMessage = async (messageId: string, currentlySaved: boolean) => {
        if (!activeConversationIdRef.current) return;

        const newSavedState = !currentlySaved;

        // Optimistic update
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, isSaved: newSavedState } : m
        ));

        try {
            // Direct Supabase update - no API call needed
            const { error } = await supabase
                .from('Message')
                .update({ isSaved: newSavedState })
                .eq('id', messageId);

            if (error) throw error;
        } catch (err) {
            console.error('Error saving message:', err);
            // Revert optimistic update
            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, isSaved: currentlySaved } : m
            ));
            Alert.alert('Error', 'Failed to save message');
        }
    };

    // Tag a message
    const tagMessage = async (tagType: string) => {
        if (!selectedMessage || !dbUserId || !selectedUser) return;

        // Auto-save the message forever when tagged (User Request)
        await handleSaveMessage(selectedMessage.id, true);

        // Generate unique IDs for Supabase (unused API call)

        try {
            // Direct Supabase insert - no API call needed
            const { error } = await supabase
                .from('MessageTag')
                .insert({
                    messageId: selectedMessage.id,
                    userId: dbUserId,
                    tagType: tagType
                });

            if (error) throw error;

            // Optimistic Update for Tags (isSaved is handled by handleSaveMessage optimistic update)
            setMessages(prev => prev.map(m =>
                m.id === selectedMessage.id
                    ? { ...m, tags: [...(m.tags || []), tagType] }
                    : m
            ));

            showToast(`Tagged as ${tagType}`, 'success');
            setTimeout(() => setTaggingMessageId(null), 500); // Close menu
        } catch (err: any) {
            console.error('Error tagging message:', err);
            showToast('Failed to tag message', 'error');
        }
    };

    // --- Trigger Functions ---
    const fetchTriggerCollections = async () => {
        if (!dbUserId) return;
        const { data } = await supabase
            .from('TriggerCollection')
            .select('id, name, keyword')
            .eq('userId', dbUserId)
            .order('name');
        if (data) setTriggerCollections(data);
    };

    const openTriggerModal = (msg: Message) => {
        setTriggerMessage(msg);

        let initialText = msg.content;
        try {
            // Handle JSON content (e.g. replies)
            if (initialText && initialText.trim().startsWith('{')) {
                const parsed = JSON.parse(initialText);
                if (parsed && typeof parsed === 'object' && parsed.text) {
                    initialText = parsed.text;
                }
            }
        } catch (e) {
            // Not JSON, keep original text
        }

        setTriggerSelectedText(initialText);
        setSelectedCollectionId(null);
        setNewCollectionName('');
        setTriggerTargetUser('self');
        setTriggerConditionType('keyword');
        setTriggerWarningMessage('');
        setSelectedKeywords([]); // Reset selected keywords
        fetchTriggerCollections();
        setShowTriggerModal(true);
        setTaggingMessageId(null);
    };

    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    };

    const saveTrigger = async () => {
        if (!dbUserId || !triggerMessage || !triggerSelectedText.trim()) return;

        try {
            let collectionId = selectedCollectionId;
            const now = new Date().toISOString();

            // Create new collection if needed
            if (!collectionId && newCollectionName.trim()) {
                // Check if already exists to avoid 23505 duplicate error
                const { data: existingColl } = await supabase
                    .from('TriggerCollection')
                    .select('id')
                    .eq('userId', dbUserId)
                    .eq('name', newCollectionName.trim())
                    .maybeSingle();

                if (existingColl) {
                    collectionId = existingColl.id;
                } else {
                    const newId = generateId();
                    const { data: newCollection, error: collError } = await supabase
                        .from('TriggerCollection')
                        .insert({
                            id: newId,
                            userId: dbUserId,
                            name: newCollectionName.trim(),
                            keyword: newCollectionName.trim().toLowerCase().replace(/\s+/g, '_'),
                            createdAt: now,
                            updatedAt: now
                        })
                        .select()
                        .single();

                    if (collError) throw collError;
                    collectionId = newCollection.id;
                }
            }

            if (!collectionId) {
                showToast('Please select or create a collection', 'error');
                return;
            }

            // Create trigger
            let finalSelectedText = triggerSelectedText.trim();
            if (triggerConditionType === 'keyword') {
                if (selectedKeywords.length === 0) {
                    showToast('Please select at least one keyword', 'error');
                    return;
                }
                finalSelectedText = selectedKeywords.join(' ');
            }

            const triggerId = generateId();
            const { error: triggerError } = await supabase
                .from('Trigger')
                .insert({
                    id: triggerId,
                    collectionId,
                    messageId: triggerMessage.id,
                    selectedText: finalSelectedText,
                    targetUser: triggerTargetUser,
                    conditionType: triggerConditionType,
                    warningMessage: triggerWarningMessage.trim() || null,
                    createdAt: now,
                    updatedAt: now
                });

            if (triggerError) throw triggerError;

            // Auto-save the message forever
            await supabase.from('Message').update({ isSaved: true }).eq('id', triggerMessage.id);
            setMessages(prev => prev.map(m => m.id === triggerMessage.id ? { ...m, isSaved: true } : m));

            showToast('Trigger saved!', 'success');
            setShowTriggerModal(false);
        } catch (err) {
            console.error('Error saving trigger:', err);
            showToast('Failed to save trigger', 'error');
        }
    };



    // Check Trigger Warnings


    // Fetch all triggers for slash command
    const fetchAllTriggers = async () => {
        if (!dbUserId) return;
        const { data } = await supabase
            .from('Trigger')
            .select(`
                id, selectedText, conditionType, createdAt,
                collection:TriggerCollection(id, name, keyword),
                message:Message(id, senderId, createdAt)
            `)
            .eq('collection.userId', dbUserId)
            .eq('isActive', true);
        if (data) setAllTriggers(data);
    };



    // --- Message Edit & Delete Functions ---

    const confirmDelete = async (type: 'me' | 'everyone') => {
        if (!selectedMessageToDelete || !dbUserId) return;

        try {
            if (type === 'me') {
                // Insert into DeletedMessage table
                const { error } = await supabase.from('DeletedMessage').insert({
                    userId: dbUserId,
                    messageId: selectedMessageToDelete.id
                });
                if (error) throw error;
                setMessages(prev => prev.filter(m => m.id !== selectedMessageToDelete.id));
                showToast("Message deleted for you", "success");
            } else {
                // Delete for everyone (Soft delete Message)
                const { error } = await supabase.from('Message')
                    .update({ isDeleted: true })
                    .eq('id', selectedMessageToDelete.id);
                if (error) throw error;
                setMessages(prev => prev.filter(m => m.id !== selectedMessageToDelete.id));
                showToast("Message deleted for everyone", "success");
            }
        } catch (err) {
            console.error("Delete failed:", err);
            showToast("Failed to delete", "error");
        } finally {
            setDeleteModalVisible(false);
            setSelectedMessageToDelete(null);
            setTaggingMessageId(null);
        }
    };

    const handleDeleteMessage = (message: Message) => {
        const timeDiff = Date.now() - message.timestamp;
        const canDeleteForEveryone = timeDiff <= 5 * 60 * 1000 && message.senderId === dbUserId;

        setSelectedMessageToDelete(message);
        setIsDeleteForEveryoneAvailable(canDeleteForEveryone);
        setDeleteModalVisible(true);
    };

    /* OLD CODE BELOW TO DELETE */
    const _ignore_old_handleDeleteMessage = async (message: Message) => {
        if (!dbUserId) return;
        const timeDiff = Date.now() - message.timestamp;
        const canDeleteForEveryone = timeDiff <= 5 * 60 * 1000 && message.senderId === dbUserId;

        const options: AlertButton[] = [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete for Me",
                onPress: async () => {
                    try {
                        const currentDeletedBy = message.deletedBy || [];
                        const updatedDeletedBy = [...currentDeletedBy, dbUserId];

                        const { error } = await supabase.from('Message')
                            .update({ deletedBy: updatedDeletedBy })
                            .eq('id', message.id);

                        if (error) throw error;
                        setMessages(prev => prev.filter(m => m.id !== message.id));
                        showToast("Message deleted for you", "success");
                    } catch (err) {
                        console.error("Delete for me failed:", err);
                        showToast("Failed to delete", "error");
                    }
                }
            }
        ];

        if (canDeleteForEveryone) {
            options.push({
                text: "Delete for Everyone",
                style: "destructive",
                onPress: async () => {
                    try {
                        const { error } = await supabase.from('Message').update({ isDeleted: true }).eq('id', message.id);
                        if (error) throw error;
                        setMessages(prev => prev.filter(m => m.id !== message.id));
                        showToast("Message deleted for everyone", "success");
                    } catch (err) {
                        console.error("Delete for everyone failed:", err);
                        showToast("Failed to delete", "error");
                    }
                }
            });
        }

        Alert.alert(
            "Delete Message",
            canDeleteForEveryone ? "Who would you like to delete this message for?" : "This message will be deleted for you.",
            options
        );
        // REMOVED
        return;

        Alert.alert(
            "Delete Message",
            "Are you sure you want to delete this message?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Soft Delete
                            const { error } = await supabase.from('Message').update({ isDeleted: true }).eq('id', message.id);
                            if (error) throw error;

                            // Remove related data locally or via soft delete logic if needed
                            // For now, just hiding the message is enough as fetchMessages filters it out
                            setMessages(prev => prev.filter(m => m.id !== message.id));
                            showToast("Message deleted", "success");
                            setTaggingMessageId(null);
                        } catch (err) {
                            console.error("Delete failed:", err);
                            showToast("Failed to delete message", "error");
                        }
                    }
                }
            ]
        );
    };

    const handleStartEdit = (message: Message) => {
        // 5-minute time limit check
        const timeDiff = Date.now() - message.timestamp;
        if (timeDiff > 5 * 60 * 1000) {
            Alert.alert("Time Limit Reached", "You can only edit messages within 5 minutes of sending.");
            return;
        }

        setEditingMessageId(message.id);
        setInputText(message.content);
        setTaggingMessageId(null);
    };

    const saveEditedMessage = async () => {
        if (!editingMessageId || !inputText.trim()) return;
        const previousContent = messages.find(m => m.id === editingMessageId)?.content;
        try {
            setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: inputText, isEdited: true } : m));
            const { error } = await supabase.from('Message').update({ content: inputText, isEdited: true, updatedAt: new Date().toISOString() }).eq('id', editingMessageId);
            if (error) {
                if (previousContent) setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: previousContent } : m));
                throw error;
            }
        } catch (err) {
            console.error('Failed to save edited message:', err);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    // Check trigger warnings before sending
    const checkTriggerWarnings = async (content: string): Promise<boolean> => {
        if (!dbUserId || !selectedUser || selectedUser.id === 'dbot') return true;

        try {
            const { data: triggers } = await supabase
                .from('Trigger')
                .select(`
                    id, selectedText, conditionType, warningMessage, targetUser,
                    collection:TriggerCollection(id, userId, name, muteWarnings)
                `)
                .eq('isActive', true);

            if (!triggers || triggers.length === 0) return true;

            const myTriggers = triggers.filter((t: any) =>
                t.collection?.userId === dbUserId &&
                (t.targetUser === 'self' || t.targetUser === 'both')
            );

            const contentLower = content.toLowerCase();
            const matchedTriggers: any[] = [];

            for (const t of myTriggers) {
                if (t.conditionType === 'exact_match') {
                    if (content.trim() === t.selectedText) matchedTriggers.push(t);
                } else { // keyword
                    const words = t.selectedText.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
                    if (words.some((word: string) => contentLower.includes(word))) matchedTriggers.push(t);
                }
            }

            if (matchedTriggers.length > 0) {
                const firstMatch = matchedTriggers[0];
                if (firstMatch.collection?.muteWarnings) {
                    showToast(`Trigger detected in "${firstMatch.collection.name}" (Auto-sent)`, 'success');
                    return true;
                }

                return new Promise((resolve) => {
                    triggerResolveRef.current = resolve;
                    setTriggerWarningData({
                        warnings: matchedTriggers.map(t => t.warningMessage || `Matches "${t.selectedText}"`),
                        collectionId: firstMatch.collection?.id,
                        collectionName: firstMatch.collection?.name,
                        resolve
                    });
                    setTriggerWarningModalVisible(true);
                });
            }
            return true;
        } catch (err) {
            console.error(err);
            return true;
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

    // Check trigger warnings before sending


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

        // Detect "/" slash command
        if (text.startsWith('/')) {
            const query = text.slice(1).toLowerCase();
            setSlashSearchQuery(query);
            fetchTriggerCollections();
            fetchAllTriggers();
            setShowSlashMenu(true);
        } else {
            setShowSlashMenu(false);
        }

        // Check bonding content after a short delay
        if (text.length >= 3 && !text.startsWith('/')) {
            checkAllBondingContent(text);
        } else {
            setShowBondingWarning(false);
        }
    };

    // Handle selecting a trigger from slash menu
    const handleSlashSelect = (trigger: any) => {
        const insertText = `"${trigger.selectedText}" - ${new Date(trigger.createdAt).toLocaleDateString()}`;
        setInputText(insertText);
        setShowSlashMenu(false);
    };





    const handlePickMedia = async (type: 'image' | 'video') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: type === 'image' ? ['images'] : ['videos'],
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
                    if (activeConversationIdRef.current && session?.user?.id) {
                        const { error } = await supabase.from('Message').insert({
                            conversationId: activeConversationIdRef.current,
                            senderId: session.user.id,
                            content: type === 'image' ? '[Image]' : '[Video]',
                            type: type,
                            mediaUrl: uploadResult.url
                        });

                        if (error) throw error;

                        // Update conversation last message
                        await supabase.from('Conversation').update({
                            lastMessage: type === 'image' ? '[Image]' : '[Video]',
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

    // --- Render Components ---

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center z-10 pl-16">
            <Text className="text-3xl font-bold" style={{ color: colors.text }}>Messages</Text>
            <TouchableOpacity>
                {currentUserAvatar ? (
                    <Image
                        source={{ uri: currentUserAvatar }}
                        className="w-10 h-10 rounded-full border-2"
                        style={{ borderColor: colors.border }}
                    />
                ) : (
                    <View className="w-10 h-10 rounded-full border-2 items-center justify-center bg-zinc-800" style={{ borderColor: colors.border }}>
                        <UserIcon size={20} color={colors.text} />
                    </View>
                )}
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

    // --- Quick Reply Logic ---
    const [quickReplyTexts, setQuickReplyTexts] = useState<Record<string, string>>({});
    const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});

    const handleQuickReply = async (user: ChatUser) => {
        const text = quickReplyTexts[user.id]?.trim();
        if (!text || !dbUserId) return;

        setSendingReply(prev => ({ ...prev, [user.id]: true }));

        try {
            let conversationId = (user as any).conversationId;

            // Ensure conversation exists
            if (!conversationId) {
                const { data: existing } = await supabase
                    .from('Conversation')
                    .select('id')
                    .or(`and(participantA.eq.${dbUserId},participantB.eq.${user.id}),and(participantA.eq.${user.id},participantB.eq.${dbUserId})`)
                    .maybeSingle();

                if (existing) {
                    conversationId = existing.id;
                } else {
                    const newId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
                    const { data: newConv, error: createError } = await supabase
                        .from('Conversation')
                        .insert({
                            id: newId, // Explicitly provide ID
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

            // Send Message
            const messageId = `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 11)}`;
            const timestamp = new Date().toISOString();

            const { error: msgError } = await supabase.from('Message').insert({
                id: messageId,
                conversationId: conversationId,
                senderId: dbUserId,
                content: text,
                type: 'text'
            });

            if (msgError) throw msgError;

            // Update Conversation lastMessage
            await supabase
                .from('Conversation')
                .update({
                    lastMessage: text,
                    lastMessageAt: timestamp
                })
                .eq('id', conversationId);

            // Clear input
            setQuickReplyTexts(prev => ({ ...prev, [user.id]: '' }));

            // Optimistic update of the list item
            setConversations(prev => prev.map(c => {
                if (c.id === user.id) {
                    return {
                        ...c,
                        lastMessage: text,
                        lastMessageAt: timestamp,
                        conversationId // Ensure ID is saved
                    };
                }
                return c;
            }));

        } catch (err) {
            console.error("Quick reply failed", err);
            Alert.alert("Error", "Failed to send reply");
        } finally {
            setSendingReply(prev => ({ ...prev, [user.id]: false }));
        }
    };

    const renderUserList = () => (
        <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Section Title */}
            <Text className="text-xs font-bold mb-3 ml-1 tracking-widest text-zinc-500 uppercase">
                {searchQuery ? 'SEARCH RESULTS' : 'CHATS'}
            </Text>

            {getSortedConversations().map((user) => (
                <View
                    key={user.id}
                    className="mb-2 relative"
                >
                    {/* Main Card - Redesigned */}
                    <TouchableOpacity
                        onPress={() => handleUserSelect(user)}
                        className="flex-row items-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800"
                        style={{ overflow: 'hidden' }}
                        activeOpacity={0.7}
                    >
                        {/* Drag Handle for Pinned Chats */}
                        {(user as any).isPinned && (
                            <View className="flex-col items-center justify-center mr-2 -ml-1">
                                <TouchableOpacity onPress={() => movePinnedUp(user.id)} className="p-1 rounded-full mb-1 bg-zinc-800">
                                    <ChevronUp size={12} color="#71717a" />
                                </TouchableOpacity>
                                <GripVertical size={12} color="#52525b" />
                                <TouchableOpacity onPress={() => movePinnedDown(user.id)} className="p-1 rounded-full mt-1 bg-zinc-800">
                                    <ChevronDown size={12} color="#71717a" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Avatar Section - Smaller */}
                        <View className="relative mr-3">
                            {user.avatar ? (
                                <Image
                                    source={{ uri: user.avatar }}
                                    className="w-12 h-12 rounded-full border border-zinc-700"
                                />
                            ) : (
                                <View className="w-12 h-12 rounded-full border border-zinc-700 bg-zinc-800 items-center justify-center">
                                    <UserIcon size={20} color="#52525b" />
                                </View>
                            )}
                            {user.status === 'online' && (
                                <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                            )}
                        </View>

                        {/* Content Section */}
                        <View className="flex-1 pr-8 justify-center">
                            {/* Top Row: Name & Time */}
                            <View className="flex-row justify-between items-center mb-0.5">
                                <Text className="text-base font-bold text-white tracking-tight" numberOfLines={1}>
                                    {nicknames[user.id] || user.name}
                                </Text>

                                <View className="flex-row items-center gap-2">
                                    {/* Pinned Icon */}
                                    {user.isPinned && <Anchor size={12} color="#a1a1aa" style={{ transform: [{ rotate: '45deg' }] }} />}

                                    {/* Date & Time */}
                                    {user.lastMessageAt && (
                                        <Text className="text-[10px] font-medium text-zinc-500 text-right">
                                            {new Date(user.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Second Row: Last Message (No Quick Reply) */}
                            <Text
                                numberOfLines={1}
                                className={`text-sm ${user.unreadCount && user.unreadCount > 0 ? 'text-white font-bold' : 'text-zinc-500 font-normal'}`}
                            >
                                {user.lastMessage || 'New connection'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* 3-Dots Menu - Vertical Icon */}
                    <TouchableOpacity
                        onPress={() => handleShowOptions(user)}
                        className="absolute right-3 top-4 p-2 z-10 opacity-70"
                    >
                        <MoreVertical size={18} color="#71717a" />
                    </TouchableOpacity>

                </View>
            ))}

            {/* Visual Spacer at bottom */}
            <View className="h-20" />
        </ScrollView>
    );



    const renderChatRoom = () => {
        if (!selectedUser) return null;
        const isDbot = selectedUser.id === 'dbot';

        // Message Request Logic
        // It is a request if:
        // 1. Not Dbot
        // 2. We have messages (so it's not a blank "Start Conversation")
        // 3. None of the messages are from ME (dbUserId)
        // 4. User hasn't clicked "Accept" yet in this session
        const hasSentMessage = messages.some(m => m.senderId === dbUserId);
        const isMessageRequest = !isDbot && messages.length > 0 && !hasSentMessage && !tempAccepted;

        const handleBlock = async () => {
            Alert.alert(
                "Block User",
                "Are you sure? They won't be able to message you again.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Block",
                        style: "destructive",
                        onPress: async () => {
                            if (!dbUserId) return;
                            await supabase.from('BlockedUser').insert({
                                blockerId: dbUserId,
                                blockedId: selectedUser.id
                            });
                            setBlockedIds(prev => new Set(prev).add(selectedUser.id));
                            handleBack();
                        }
                    }
                ]
            );
        };

        return (
            <Animated.View style={{ transform: [{ translateX: slideAnim }], backgroundColor: colors.background, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
                <SafeAreaView className="flex-1">
                    {/* Header - OUTSIDE KeyboardAvoidingView to stay fixed */}
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
                            {/* Collaborative */}
                            <TouchableOpacity onPress={() => setShowCollaborativeModal(true)} className="p-2 rounded-full bg-gray-200/20">
                                <Users size={20} color={colors.text} />
                            </TouchableOpacity>
                            {/* Chat Settings */}
                            <TouchableOpacity onPress={() => setShowChatSettings(true)} className="p-2 rounded-full bg-gray-200/20">
                                <MoreVertical size={20} color={colors.text} />
                            </TouchableOpacity>

                        </View>
                    </BlurView>

                    {/* Messages and Input - Inside KeyboardAvoidingView */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        className="flex-1"
                        keyboardVerticalOffset={0}
                    >
                        <View style={{ flex: 1 }}>
                            {/* Optional Wallpaper Background */}
                            {chatBackground && (
                                <Image
                                    source={{ uri: chatBackground }}
                                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 }}
                                    resizeMode="cover"
                                />
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

                                    {/* Empty State / Start Conversation */}
                                    {messages.length === 0 && !isDbot && (
                                        <View className="flex-1 items-center justify-center py-20 opacity-50">
                                            <View className="w-20 h-20 rounded-full bg-zinc-800 items-center justify-center mb-4">
                                                <Image source={{ uri: selectedUser.avatar }} className="w-20 h-20 rounded-full opacity-50" />
                                            </View>
                                            <Text className="text-lg font-bold text-zinc-400">Start a conversation</Text>
                                            <Text className="text-sm text-zinc-600 text-center mt-2 px-10">
                                                Say hello to {selectedUser.name}!
                                            </Text>
                                        </View>
                                    )}

                                    {messages.map((msg, index) => {
                                        // Check if this is the last message sent by ME
                                        const isMe = msg.role === 'user';

                                        // Parse reply content if type is reply
                                        let displayContent = msg.content;
                                        let replyContext = null;
                                        if (msg.type === 'reply') {
                                            try {
                                                const parsed = JSON.parse(msg.content);
                                                displayContent = parsed.text;
                                                replyContext = parsed.replyTo;
                                            } catch (e) {
                                                // Fallback
                                            }
                                        }

                                        const getTagColor = (tag: string) => {
                                            if (tag === 'RED') return 'bg-red-500';
                                            if (tag === 'GREEN') return 'bg-green-500';
                                            // Custom tags are white (on bubble, white dot handled by border styling? No, usually bg-white)
                                            // User said "white with black text" for the CHIP. "same white ot should xome on the message bubble".
                                            // White dot on bubble.
                                            return 'bg-white';
                                        };

                                        // Deduplicate tags for the menu
                                        const uniqueTags = Array.from(new Set(messages.flatMap(m => m.tags || [])))
                                            .filter(t => t && t !== 'RED' && t !== 'GREEN');

                                        return (
                                            <View key={msg.id} className="mb-4">
                                                <SwipeableMessage
                                                    isMe={isMe}
                                                    onReply={() => setReplyTo({ id: msg.id, content: displayContent, sender: isMe ? 'You' : (nicknames[selectedUser.id] || selectedUser.name) })}
                                                >
                                                    <View className={`max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                                                        <View className="flex-row items-end gap-2">

                                                            {/* FRONT ICONS (3-dots) for isMe (Left side) */}
                                                            {isMe && selectedUser?.id !== 'dbot' && (
                                                                <TouchableOpacity onPress={() => {
                                                                    setTaggingMessageId(taggingMessageId === msg.id ? null : msg.id);
                                                                    setSelectedMessage(msg);
                                                                    setIsAddingTag(false); // Reset
                                                                }} className="p-1 mb-1">
                                                                    <MoreVertical size={16} color={colors.secondary} />
                                                                </TouchableOpacity>
                                                            )}

                                                            {/* BACK ICONS for !isMe (Left side) */}
                                                            {!isMe && selectedUser?.id !== 'dbot' && (
                                                                <View className="flex-row items-center gap-1">
                                                                    <TouchableOpacity onPress={() => handleSaveMessage(msg.id, msg.isSaved || false)} className="p-1 mb-1">
                                                                        <Bookmark size={16} color={msg.isSaved ? '#FFFFFF' : colors.secondary} fill={msg.isSaved ? '#FFFFFF' : 'transparent'} />
                                                                    </TouchableOpacity>

                                                                </View>
                                                            )}

                                                            {/* Message Bubble Container */}
                                                            <View>
                                                                {/* Reply Context Bubble */}
                                                                {replyContext && (
                                                                    <View
                                                                        className="mb-1 px-3 py-2 rounded-2xl bg-zinc-800/50 border-l-2 border-white opacity-80"
                                                                        style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
                                                                    >
                                                                        <Text className="text-[10px] text-white font-bold mb-0.5">Replying to {replyContext.sender}</Text>
                                                                        <Text className="text-xs text-zinc-400" numberOfLines={1}>{replyContext.content}</Text>
                                                                    </View>
                                                                )}

                                                                <View
                                                                    className="px-4 py-3 rounded-2xl relative"
                                                                    style={{
                                                                        backgroundColor: isMe ? (mode === 'light' ? '#000000' : '#FFFFFF') : (mode === 'light' ? '#E5E5EA' : '#262626'),
                                                                        borderWidth: 0
                                                                    }}
                                                                >
                                                                    {msg.type === 'image' && msg.mediaUrl ? (
                                                                        <Image source={{ uri: msg.mediaUrl }} style={{ width: 200, height: 260, borderRadius: 8 }} resizeMode="cover" />
                                                                    ) : msg.type === 'video' && msg.mediaUrl ? (
                                                                        <AVVideo
                                                                            source={{ uri: msg.mediaUrl }}
                                                                            style={{ width: 200, height: 260, borderRadius: 8 }}
                                                                            useNativeControls
                                                                            resizeMode={ResizeMode.COVER}
                                                                        />
                                                                    ) : msg.type === 'post' ? (
                                                                        <ChatPostCard
                                                                            data={(() => {
                                                                                try {
                                                                                    return JSON.parse(msg.content);
                                                                                } catch {
                                                                                    return {};
                                                                                }
                                                                            })()}
                                                                            isMe={isMe}
                                                                            onPress={() => {
                                                                                console.log('Post pressed');
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <View className="flex-row items-end flex-wrap">
                                                                            <Text className="text-sm" style={{ color: isMe ? (mode === 'light' ? '#FFFFFF' : '#000000') : (mode === 'light' ? '#000000' : '#FFFFFF') }}>
                                                                                {displayContent}
                                                                            </Text>
                                                                            {msg.isEdited && (
                                                                                <Text style={{ fontSize: 9, color: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', marginLeft: 4, marginBottom: 1 }}>
                                                                                    (edited)
                                                                                </Text>
                                                                            )}
                                                                        </View>
                                                                    )}

                                                                    {/* Time and Status Footer */}
                                                                    <View className="flex-row items-center justify-end mt-1 gap-1">
                                                                        <Text style={{ fontSize: 9, color: isMe ? (mode === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') : (mode === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)') }}>
                                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </Text>
                                                                        {isMe && (
                                                                            <View>
                                                                                {msg.readAt ? (
                                                                                    <CheckCheck size={10} color="#3B82F6" />
                                                                                ) : (
                                                                                    <Check size={10} color={mode === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                                                                                )}
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                </View>

                                                                {/* TAG DOT */}
                                                                {msg.tags && msg.tags.length > 0 && (
                                                                    <View className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-zinc-900 ${getTagColor(msg.tags[0])}`} />
                                                                )}
                                                            </View>

                                                            {/* BACK ICONS for isMe (Right side) */}
                                                            {isMe && selectedUser?.id !== 'dbot' && (
                                                                <View className="flex-row items-center gap-1">
                                                                    <TouchableOpacity onPress={() => handleSaveMessage(msg.id, msg.isSaved || false)} className="p-1 mb-1">
                                                                        <Bookmark size={16} color={msg.isSaved ? '#FFFFFF' : colors.secondary} fill={msg.isSaved ? '#FFFFFF' : 'transparent'} />
                                                                    </TouchableOpacity>

                                                                </View>
                                                            )}

                                                            {/* FRONT ICONS (3-dots) for !isMe (Right side) */}
                                                            {!isMe && selectedUser?.id !== 'dbot' && (
                                                                <TouchableOpacity onPress={() => {
                                                                    setTaggingMessageId(taggingMessageId === msg.id ? null : msg.id);
                                                                    setSelectedMessage(msg);
                                                                    setIsAddingTag(false);
                                                                }} className="p-1 mb-1">
                                                                    <MoreVertical size={16} color={colors.secondary} />
                                                                </TouchableOpacity>
                                                            )}

                                                        </View>
                                                    </View>
                                                </SwipeableMessage>

                                                {/* INLINE TAGGING MENU */}
                                                {taggingMessageId === msg.id && (
                                                    <View className="mt-2 self-center w-full items-center">
                                                        {!isAddingTag ? (
                                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, alignItems: 'center' }}>
                                                                {/* RED */}
                                                                <TouchableOpacity onPress={() => tagMessage('RED')} className="w-8 h-8 rounded-full bg-red-500/30 border-2 border-red-500" />

                                                                {/* YELLOW + (Add) */}
                                                                <TouchableOpacity onPress={() => { setIsAddingTag(true); setNewTagText(''); }} className="w-8 h-8 rounded-full bg-yellow-500/30 border-2 border-yellow-500 items-center justify-center">
                                                                    <Plus size={16} color="#FFFFFF" />
                                                                </TouchableOpacity>

                                                                {/* GREEN */}
                                                                <TouchableOpacity onPress={() => tagMessage('GREEN')} className="w-8 h-8 rounded-full bg-green-500/30 border-2 border-green-500" />

                                                                {/* Custom Tags */}
                                                                {uniqueTags.map(t => (
                                                                    <TouchableOpacity key={t} onPress={() => tagMessage(t)} className="px-3 py-1.5 bg-white rounded-full border border-zinc-800 opacity-90">
                                                                        <Text className="text-xs font-bold text-black">{t}</Text>
                                                                    </TouchableOpacity>
                                                                ))}

                                                                <TouchableOpacity
                                                                    onPress={() => openTriggerModal(msg)}
                                                                    className="px-3 py-1.5 bg-orange-500 rounded-full flex-row items-center gap-1"
                                                                >
                                                                    <AlertTriangle size={12} color="#FFFFFF" />
                                                                    <Text className="text-xs font-bold text-white">Trigger</Text>
                                                                </TouchableOpacity>

                                                                {/* Edit Button */}
                                                                <TouchableOpacity
                                                                    onPress={() => handleStartEdit(msg)}
                                                                    className="px-2 py-1 bg-white rounded-full flex-row items-center gap-1 border border-zinc-800"
                                                                >
                                                                    <Text className="text-[10px] font-bold text-black" style={{ color: '#000' }}>Edit</Text>
                                                                </TouchableOpacity>

                                                                {/* Delete Button */}
                                                                <TouchableOpacity
                                                                    onPress={() => handleDeleteMessage(msg)}
                                                                    className="px-2 py-1 bg-red-500/20 rounded-full flex-row items-center gap-1 border border-red-500/50"
                                                                >
                                                                    <Trash2 size={10} color="#ef4444" />
                                                                    <Text className="text-[10px] font-bold text-red-500">Delete</Text>
                                                                </TouchableOpacity>
                                                            </ScrollView>
                                                        ) : (
                                                            /* INPUT MODE */
                                                            <View className="flex-row items-center bg-zinc-800 rounded-full px-3 py-1 gap-2 border border-zinc-700">
                                                                <TextInput
                                                                    value={newTagText}
                                                                    onChangeText={setNewTagText}
                                                                    placeholder="Tag name..."
                                                                    placeholderTextColor="#a1a1aa"
                                                                    className="text-white text-base w-48 h-10 px-2"
                                                                    autoFocus
                                                                    onSubmitEditing={() => {
                                                                        if (newTagText.trim()) {
                                                                            tagMessage(newTagText.trim());
                                                                            setIsAddingTag(false);
                                                                        }
                                                                    }}
                                                                />
                                                                <TouchableOpacity onPress={() => {
                                                                    if (newTagText.trim()) {
                                                                        tagMessage(newTagText.trim());
                                                                        setIsAddingTag(false);
                                                                    }
                                                                }}>
                                                                    <Check size={20} color="#22c55e" />
                                                                </TouchableOpacity>
                                                                <TouchableOpacity onPress={() => setIsAddingTag(false)}>
                                                                    <X size={20} color="#ef4444" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        )}
                                                    </View>
                                                )
                                                }
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

                            {/* Input or Blocked or Message Request */}
                            {blockedIds.has(selectedUser.id) ? (
                                <View className="px-4 py-6 border-t items-center justify-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    <Text style={{ color: colors.secondary, fontWeight: '600' }}>You cannot message this user.</Text>
                                </View>
                            ) : isMessageRequest ? (
                                <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="px-6 py-6 border-t items-center" style={{ borderColor: colors.border }}>
                                    <Text className="font-bold text-lg mb-2" style={{ color: colors.text }}>Message Request</Text>
                                    <Text className="text-center text-sm mb-4" style={{ color: colors.secondary }}>
                                        {selectedUser.name} wants to message you. You won't see their messages until you accept.
                                    </Text>
                                    <View className="flex-row gap-4 w-full">
                                        <TouchableOpacity
                                            onPress={handleBlock}
                                            className="flex-1 py-3 bg-red-500/10 rounded-xl items-center border border-red-500/20"
                                        >
                                            <Text className="font-bold text-red-500">Block</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setTempAccepted(true)}
                                            className="flex-1 py-3 bg-white rounded-xl items-center"
                                        >
                                            <Text className="font-bold text-black">Accept</Text>
                                        </TouchableOpacity>
                                    </View>
                                </BlurView>
                            ) : (
                                <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="px-4 py-3 border-t" style={{ borderColor: colors.border }}>
                                    {/* Slash Command Menu */}
                                    {showSlashMenu && (
                                        <View className="mb-3 p-3 rounded-xl" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                                            <View className="flex-row items-center justify-between mb-2">
                                                <Text className="font-bold" style={{ color: colors.text }}>Trigger Collections</Text>
                                                <TouchableOpacity onPress={() => setShowSlashMenu(false)}>
                                                    <X size={16} color={colors.secondary} />
                                                </TouchableOpacity>
                                            </View>
                                            <ScrollView style={{ maxHeight: 200 }}>
                                                {triggerCollections.filter(c =>
                                                    !slashSearchQuery || c.name.toLowerCase().includes(slashSearchQuery) || c.keyword?.toLowerCase().includes(slashSearchQuery)
                                                ).map(c => (
                                                    <TouchableOpacity
                                                        key={c.id}
                                                        className="py-2 border-b"
                                                        style={{ borderColor: colors.border }}
                                                        onPress={() => {
                                                            // Show triggers in this collection
                                                            const collTriggers = allTriggers.filter((t: any) => t.collection?.id === c.id);
                                                            if (collTriggers.length > 0) {
                                                                handleSlashSelect(collTriggers[0]);
                                                            }
                                                        }}
                                                    >
                                                        <Text className="font-semibold" style={{ color: colors.text }}>/{c.keyword || c.name}</Text>
                                                        <Text className="text-xs" style={{ color: colors.secondary }}>{c.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                                {allTriggers.filter((t: any) =>
                                                    !slashSearchQuery || t.selectedText.toLowerCase().includes(slashSearchQuery)
                                                ).slice(0, 5).map((trigger: any) => (
                                                    <TouchableOpacity
                                                        key={trigger.id}
                                                        className="py-2 border-b"
                                                        style={{ borderColor: colors.border }}
                                                        onPress={() => handleSlashSelect(trigger)}
                                                    >
                                                        <Text className="text-sm" style={{ color: colors.text }} numberOfLines={1}>
                                                            {trigger.selectedText}
                                                        </Text>
                                                        <Text className="text-xs" style={{ color: colors.secondary }}>
                                                            {trigger.collection?.name} - {new Date(trigger.createdAt).toLocaleDateString()}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                                {triggerCollections.length === 0 && allTriggers.length === 0 && (
                                                    <Text className="py-4 text-center" style={{ color: colors.secondary }}>
                                                        No triggers yet. Create one from a message.
                                                    </Text>
                                                )}
                                            </ScrollView>
                                        </View>
                                    )}
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
                                            placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                                            placeholderTextColor={colors.secondary}
                                            value={inputText}
                                            onChangeText={handleInputChange}
                                            className="flex-1 h-12 px-4 rounded-full border"
                                            style={{
                                                backgroundColor: editingMessageId ? (mode === 'light' ? '#FFFFFF' : '#27272a') : colors.card,
                                                borderColor: editingMessageId ? (mode === 'light' ? '#e4e4e7' : '#3f3f46') : colors.border,
                                                color: colors.text
                                            }}
                                            onSubmitEditing={() => editingMessageId ? saveEditedMessage() : sendMessage()}
                                            returnKeyType="send"
                                        />
                                        <TouchableOpacity
                                            onPress={() => editingMessageId ? saveEditedMessage() : sendMessage()}
                                            className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
                                            style={{ backgroundColor: editingMessageId ? (mode === 'light' ? '#FFFFFF' : '#27272a') : colors.primary }}
                                        >
                                            {editingMessageId ? (
                                                <CheckCheck color={mode === 'light' ? '#000' : '#fff'} size={20} />
                                            ) : (
                                                <Send color={mode === 'light' ? '#fff' : '#000'} size={20} />
                                            )}
                                        </TouchableOpacity>

                                        {/* Cancel Edit Button */}
                                        {editingMessageId && (
                                            <TouchableOpacity
                                                onPress={() => { setEditingMessageId(null); setInputText(''); }}
                                                className="ml-2 w-10 h-10 rounded-full items-center justify-center bg-zinc-700"
                                            >
                                                <X color="#fff" size={16} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </BlurView>
                            )}

                            {/* Reply Preview */}
                            {replyTo && (
                                <View className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700 flex-row justify-between items-center">
                                    <View className="flex-1 border-l-4 border-white pl-2">
                                        <Text className="text-xs text-white font-bold mb-0.5">Replying to {replyTo.sender}</Text>
                                        <Text className="text-sm text-zinc-400" numberOfLines={1}>{replyTo.content}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setReplyTo(null)} className="p-2">
                                        <X size={16} color={colors.secondary} />
                                    </TouchableOpacity>
                                </View>
                            )}

                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Animated.View>
        );
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
    // Block Confirmation Modal State
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const showError = (message: string) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    const handleChangeBackground = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];

                // Store wallpaper locally per conversation (works offline)
                if (activeConversationIdRef.current) {
                    const wallpaperKey = `wallpaper_${activeConversationIdRef.current}`;
                    await AsyncStorage.setItem(wallpaperKey, asset.uri);

                    // Also try to save to DB for sync (non-blocking)
                    supabase
                        .from('Conversation')
                        .update({ wallpaperUrl: asset.uri })
                        .eq('id', activeConversationIdRef.current);
                }

                setChatBackground(asset.uri);
            }
        } catch (err) {
            console.error('Image picker error:', err);
            showError('Failed to select image. Please try again.');
        }
    };

    const handleRemoveBackground = async () => {
        setChatBackground(null);
        if (activeConversationIdRef.current) {
            await supabase.from('Conversation').update({ wallpaperUrl: null }).eq('id', activeConversationIdRef.current);
        }
    };

    const handleBlockUser = async () => {
        if (!dbUserId || !selectedUser) return;
        setShowBlockConfirm(false);

        try {
            const blockId = `bl${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
            await supabase.from('BlockedUser').insert({
                id: blockId,
                blockerId: dbUserId,
                blockedId: selectedUser.id
            });
            setBlockedIds(prev => new Set(prev).add(selectedUser.id));
            setShowChatSettings(false);
            handleBack();
        } catch (err) {
            console.error('Block failed:', err);
            showError('Failed to block user. Please try again.');
        }
    };

    const handleSaveSettings = async () => {
        if (!activeConversationIdRef.current) {
            setShowChatSettings(false);
            return;
        }

        const conversationId = activeConversationIdRef.current;
        console.log('[ChatSettings] Saving settings, retention:', messageRetention, 'conversationId:', conversationId);

        try {
            // Direct Supabase update for retention setting
            const { error: retentionError } = await supabase
                .from('Conversation')
                .update({ messageRetention })
                .eq('id', conversationId);

            if (retentionError) throw retentionError;

            console.log('[ChatSettings] Retention setting updated to:', messageRetention);

            // Trigger message deletion based on retention setting - USE SOFT DELETE
            if (messageRetention === 'immediately') {
                // Delete read messages that are not saved
                const { error: deleteError } = await supabase.from('Message')
                    .update({ isDeleted: true }) // Soft delete instead of hard delete
                    .eq('conversationId', conversationId)
                    .eq('isSaved', false)
                    .not('readAt', 'is', null);
                if (deleteError) console.error('[ChatSettings] Delete error:', deleteError);
            } else if (messageRetention === '1day') {
                // Delete messages older than 24 hours (not saved)
                const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { error: deleteError } = await supabase.from('Message')
                    .update({ isDeleted: true }) // Soft delete
                    .eq('conversationId', conversationId)
                    .eq('isSaved', false)
                    .lt('createdAt', cutoff);
                if (deleteError) console.error('[ChatSettings] Delete error:', deleteError);
            }

            // Refresh messages to show updated list
            await fetchMessages(conversationId);

            setShowChatSettings(false);
        } catch (err) {
            console.error('Save settings failed:', err);
            showError('Failed to save settings. Please try again.');
        }
    };

    // Error Modal UI
    const renderErrorModal = () => (
        <Modal visible={showErrorModal} transparent animationType="fade">
            <View className="flex-1 bg-black/70 justify-center items-center px-6">
                <View className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-800">
                    <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center self-center mb-4">
                        <X size={32} color="#ef4444" />
                    </View>
                    <Text className="text-xl font-bold text-white text-center mb-2">Something went wrong</Text>
                    <Text className="text-sm text-zinc-400 text-center mb-6">{errorMessage}</Text>
                    <TouchableOpacity
                        onPress={() => setShowErrorModal(false)}
                        className="py-4 rounded-2xl bg-white items-center"
                    >
                        <Text className="font-bold text-black">Try Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Delete Confirmation Modal UI
    const renderDeleteModal = () => (
        <Modal
            transparent
            visible={deleteModalVisible}
            animationType="fade"
            onRequestClose={() => setDeleteModalVisible(false)}
        >
            <View className="flex-1 justify-center items-center bg-black/50 px-4">
                <View className={`w-full max-w-sm rounded-[24px] overflow-hidden ${mode === 'light' ? 'bg-white' : 'bg-zinc-900'} p-6`}>
                    <View className="items-center mb-6">
                        <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-4">
                            <Trash2 size={24} color="#ef4444" />
                        </View>
                        <Text className={`text-xl font-bold mb-2 ${mode === 'light' ? 'text-black' : 'text-white'}`}>
                            Delete Message?
                        </Text>
                        <Text className={`text-center ${mode === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            Choose how you want to delete this message.
                        </Text>
                    </View>

                    <View className="gap-3">
                        {isDeleteForEveryoneAvailable && (
                            <TouchableOpacity
                                onPress={() => confirmDelete('everyone')}
                                className="w-full py-4 bg-red-500 rounded-2xl items-center"
                            >
                                <Text className="text-white font-bold text-base">Delete for Everyone</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={() => confirmDelete('me')}
                            className={`w-full py-4 rounded-2xl items-center border ${mode === 'light' ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-800 border-zinc-700'
                                }`}
                        >
                            <Text className={`font-bold text-base ${mode === 'light' ? 'text-black' : 'text-white'}`}>
                                Delete for Me
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setDeleteModalVisible(false)}
                            className="w-full py-4 items-center"
                        >
                            <Text className={`font-bold text-base ${mode === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    {/* Block Confirmation Modal UI */ }
    const renderBlockConfirmModal = () => (
        <Modal visible={showBlockConfirm} transparent animationType="fade">
            <View className="flex-1 bg-black/70 justify-center items-center px-6">
                <View className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-800">
                    <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center self-center mb-4">
                        <X size={32} color="#ef4444" />
                    </View>
                    <Text className="text-xl font-bold text-white text-center mb-2">Block {selectedUser?.name}?</Text>
                    <Text className="text-sm text-zinc-400 text-center mb-6">
                        They won't be able to message you or see your online status. You can unblock them later from settings.
                    </Text>
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={() => setShowBlockConfirm(false)}
                            className="flex-1 py-4 rounded-2xl bg-zinc-800 items-center"
                        >
                            <Text className="font-bold text-white">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleBlockUser}
                            className="flex-1 py-4 rounded-2xl bg-red-500 items-center"
                        >
                            <Text className="font-bold text-white">Block</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderChatSettingsModal = () => (
        <Modal visible={showChatSettings} transparent animationType="slide">
            <View className="flex-1 bg-black/60 justify-end">
                <View className="rounded-t-3xl overflow-hidden p-6 pb-10 bg-zinc-900">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-white">Chat Settings</Text>
                        <TouchableOpacity onPress={() => setShowChatSettings(false)} className="p-2 rounded-full bg-zinc-800">
                            <X size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Chat Background - B/W Card */}
                    <View className="bg-zinc-800 rounded-2xl p-4 mb-4">
                        <View className="flex-row items-center mb-4">
                            <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                                <ImageIcon size={20} color="#fff" />
                            </View>
                            <View className="ml-3 flex-1">
                                <Text className="font-semibold text-white">Chat Wallpaper</Text>
                                <Text className="text-xs text-zinc-400">
                                    {chatBackground ? 'Custom wallpaper active' : 'Using default theme'}
                                </Text>
                            </View>
                            {isUploading && <ActivityIndicator size="small" color="#fff" />}
                        </View>

                        {/* Background Action Buttons */}
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={handleChangeBackground}
                                className="flex-1 py-3 rounded-xl bg-white items-center"
                            >
                                <Text className="font-semibold text-black">Choose Photo</Text>
                            </TouchableOpacity>
                            {chatBackground && (
                                <TouchableOpacity
                                    onPress={handleRemoveBackground}
                                    className="py-3 px-4 rounded-xl bg-zinc-700 items-center"
                                >
                                    <Text className="font-semibold text-zinc-300">Remove</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Message Retention - Simplified */}
                    <View className="bg-zinc-800 rounded-2xl p-4 mb-4">
                        <Text className="font-semibold text-white mb-1">Delete Messages</Text>
                        <Text className="text-xs text-zinc-400 mb-4">
                            Choose when messages should be deleted
                        </Text>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setMessageRetention('immediately')}
                                className={`flex-1 py-3 rounded-xl items-center ${messageRetention === 'immediately' ? 'bg-white' : 'bg-zinc-700'}`}
                            >
                                <Text className={`font-semibold ${messageRetention === 'immediately' ? 'text-black' : 'text-white'}`}>
                                    Immediately
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setMessageRetention('1day')}
                                className={`flex-1 py-3 rounded-xl items-center ${messageRetention === '1day' ? 'bg-white' : 'bg-zinc-700'}`}
                            >
                                <Text className={`font-semibold ${messageRetention === '1day' ? 'text-black' : 'text-white'}`}>
                                    24 Hours
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Block User - Danger Zone */}
                    <TouchableOpacity
                        onPress={() => setShowBlockConfirm(true)}
                        className="bg-red-500/10 rounded-2xl p-4 flex-row items-center border border-red-500/20"
                    >
                        <View className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center">
                            <X size={20} color="#ef4444" />
                        </View>
                        <View className="ml-3 flex-1">
                            <Text className="font-semibold text-red-500">Block User</Text>
                            <Text className="text-xs text-zinc-400">
                                Stop receiving messages from this user
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSaveSettings}
                        className="mt-6 py-4 rounded-2xl items-center bg-white"
                    >
                        <Text className="font-bold text-black text-base">Save Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Lock Chat PIN Setup Modal
    const renderLockModal = () => (
        <Modal
            visible={showLockModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLockModal(false)}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center items-center bg-black/50 px-6"
            >
                <View className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6">
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center mb-4">
                            <Lock size={32} color={colors.text} />
                        </View>
                        <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
                            Set Chat PIN
                        </Text>
                        <Text className="text-sm text-center mt-2" style={{ color: colors.secondary }}>
                            Enter a 4+ digit PIN to lock this chat
                        </Text>
                    </View>

                    <TextInput
                        value={pinInput}
                        onChangeText={setPinInput}
                        placeholder="Enter PIN..."
                        placeholderTextColor={colors.secondary}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={6}
                        className="p-4 rounded-xl border mb-6 text-center text-2xl tracking-widest"
                        style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}
                        autoFocus
                    />

                    <View className="flex-row justify-end gap-4">
                        <TouchableOpacity onPress={() => {
                            setShowLockModal(false);
                            setPinInput('');
                        }}>
                            <Text className="text-base font-medium px-4 py-2" style={{ color: colors.secondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSetPin}
                            className="px-6 py-2 rounded-full"
                            style={{ backgroundColor: colors.text }}
                        >
                            <Text className="font-bold text-base" style={{ color: colors.background }}>Set PIN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    // PIN Prompt Modal (for unlocking)
    const renderPinPromptModal = () => (
        <Modal
            visible={showPinPrompt}
            transparent
            animationType="fade"
            onRequestClose={() => {
                setShowPinPrompt(false);
                setPendingUnlockConversationId(null);
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center items-center bg-black/50 px-6"
            >
                <View className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6">
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center mb-4">
                            <Lock size={32} color={colors.text} />
                        </View>
                        <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
                            Enter PIN
                        </Text>
                        <Text className="text-sm text-center mt-2" style={{ color: colors.secondary }}>
                            This chat is locked. Enter your PIN to view.
                        </Text>
                    </View>

                    <TextInput
                        value={pinInput}
                        onChangeText={setPinInput}
                        placeholder="Enter PIN..."
                        placeholderTextColor={colors.secondary}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={6}
                        className="p-4 rounded-xl border mb-6 text-center text-2xl tracking-widest"
                        style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}
                        autoFocus
                    />

                    <View className="flex-row justify-end gap-4">
                        <TouchableOpacity onPress={() => {
                            setShowPinPrompt(false);
                            setPinInput('');
                            setPendingUnlockConversationId(null);
                        }}>
                            <Text className="text-base font-medium px-4 py-2" style={{ color: colors.secondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={verifyPin}
                            className="px-6 py-2 rounded-full"
                            style={{ backgroundColor: colors.text }}
                        >
                            <Text className="font-bold text-base" style={{ color: colors.background }}>Unlock</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    const renderNicknameModal = () => (
        <Modal
            visible={showNicknameModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowNicknameModal(false)}
        >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center bg-black/50 px-6">
                <View className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-6">
                    <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>Set Nickname</Text>
                    <TextInput
                        value={tempNickname}
                        onChangeText={setTempNickname}
                        placeholder="Enter nickname..."
                        placeholderTextColor={colors.secondary}
                        className="p-4 rounded-xl border mb-6 text-base"
                        style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}
                        autoFocus
                    />
                    <View className="flex-row justify-end gap-4">
                        <TouchableOpacity onPress={() => setShowNicknameModal(false)}>
                            <Text className="text-base font-medium px-4 py-2" style={{ color: colors.secondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSaveNickname} className="bg-indigo-500 px-6 py-2 rounded-full">
                            <Text className="text-white font-bold text-base">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView className="flex-1">
                {renderHeader()}
                {renderSearchBar()}
                {renderUserList()}
                {renderChatRoom()}
                {renderTagModal()}
                {renderChatSettingsModal()}
                {renderLockModal()}
                {renderPinPromptModal()}
                {renderNicknameModal()}
                {renderErrorModal()}
                {renderBlockConfirmModal()}
                {renderDeleteModal()}
                {/* User Options Modal */}
                <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
                    <TouchableOpacity
                        className="flex-1 bg-black/50 justify-center items-center p-6"
                        activeOpacity={1}
                        onPress={() => setShowOptionsModal(false)}
                    >
                        <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="w-full max-w-sm rounded-3xl overflow-hidden p-6 border border-white/10">
                            {optionsUser && (
                                <>
                                    <View className="items-center mb-6">
                                        <Image
                                            source={{ uri: optionsUser.avatar || '' }}
                                            className="w-20 h-20 rounded-full mb-3 bg-gray-200"
                                        />
                                        <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
                                            {nicknames[optionsUser.id] || optionsUser.name}
                                        </Text>
                                    </View>

                                    <View className="gap-3">
                                        <TouchableOpacity
                                            onPress={() => {
                                                handlePin(optionsUser.id);
                                                setShowOptionsModal(false);
                                            }}
                                            className="flex-row items-center p-4 rounded-xl"
                                            style={{ backgroundColor: colors.card }}
                                        >
                                            <Anchor size={20} color={colors.text} />
                                            <Text className="ml-3 font-semibold text-base" style={{ color: colors.text }}>
                                                {optionsUser.isPinned ? 'Unpin User' : 'Pin User'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowOptionsModal(false);
                                                setEditUser(optionsUser);
                                                setTempNickname(nicknames[optionsUser.id] || '');
                                                setShowNicknameModal(true);
                                            }}
                                            className="flex-row items-center p-4 rounded-xl"
                                            style={{ backgroundColor: colors.card }}
                                        >
                                            <Tag size={20} color={colors.text} />
                                            <Text className="ml-3 font-semibold text-base" style={{ color: colors.text }}>
                                                Set Nickname
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Hide Chat */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                const convId = optionsUser.conversationId || optionsUser.id;
                                                handleHideChat(convId);
                                            }}
                                            className="flex-row items-center p-4 rounded-xl"
                                            style={{ backgroundColor: colors.card }}
                                        >
                                            <EyeOff size={20} color={colors.text} />
                                            <Text className="ml-3 font-semibold text-base" style={{ color: colors.text }}>
                                                {hiddenConversationIds.has(optionsUser.conversationId || optionsUser.id) ? 'Unhide Chat' : 'Hide Chat'}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Lock Chat */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                const convId = optionsUser.conversationId || optionsUser.id;
                                                if (lockedConversationIds.has(convId)) {
                                                    handleUnlockChat(convId);
                                                    setShowOptionsModal(false);
                                                } else {
                                                    handleLockChat(convId);
                                                }
                                            }}
                                            className="flex-row items-center p-4 rounded-xl"
                                            style={{ backgroundColor: colors.card }}
                                        >
                                            <Lock size={20} color={colors.text} />
                                            <Text className="ml-3 font-semibold text-base" style={{ color: colors.text }}>
                                                {lockedConversationIds.has(optionsUser.conversationId || optionsUser.id) ? 'Unlock Chat' : 'Lock Chat'}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Delete Chat */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert(
                                                    'Delete Chat',
                                                    'Are you sure you want to delete this chat? This will hide it from your chat list.',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Delete',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                const convId = optionsUser.conversationId || optionsUser.id;
                                                                handleDeleteChat(convId);
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                            className="flex-row items-center p-4 rounded-xl"
                                            style={{ backgroundColor: '#fef2f2' }}
                                        >
                                            <Trash2 size={20} color="#dc2626" />
                                            <Text className="ml-3 font-semibold text-base" style={{ color: '#dc2626' }}>
                                                Delete Chat
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => setShowOptionsModal(false)}
                                            className="mt-2 py-4 items-center"
                                        >
                                            <Text className="text-base font-medium" style={{ color: colors.secondary }}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </BlurView>
                    </TouchableOpacity>
                </Modal>


                {/* Toast Notification */}
                {toastMessage && (
                    <CustomToast
                        message={toastMessage}
                        type={toastType}
                        onHide={() => setToastMessage(null)}
                    />
                )}

                {/* Trigger Modal */}
                <Modal visible={showTriggerModal} transparent animationType="slide">
                    <View className="flex-1 justify-end bg-black/50">
                        <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="rounded-t-3xl overflow-hidden">
                            <ScrollView className="p-6">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Create Trigger</Text>
                                    <TouchableOpacity onPress={() => setShowTriggerModal(false)}>
                                        <X size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                {/* Selected Text */}
                                <Text className="text-sm mb-1" style={{ color: colors.secondary }}>Message to trigger on:</Text>
                                <TextInput
                                    value={triggerSelectedText}
                                    onChangeText={setTriggerSelectedText}
                                    multiline
                                    className="p-3 rounded-xl mb-4"
                                    style={{ backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 60 }}
                                />

                                {/* Keyword Selection */}
                                {triggerConditionType === 'keyword' && (
                                    <View className="mb-4">
                                        <Text className="text-sm mb-2" style={{ color: colors.secondary }}>Select keywords to trigger on:</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {triggerSelectedText.split(/\s+/).filter(w => w.length > 0).map((word, index) => {
                                                const isSelected = selectedKeywords.includes(word);
                                                return (
                                                    <TouchableOpacity
                                                        key={`${word}-${index}`}
                                                        onPress={() => {
                                                            if (isSelected) {
                                                                setSelectedKeywords(prev => prev.filter(w => w !== word));
                                                            } else {
                                                                setSelectedKeywords(prev => [...prev, word]);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded-lg border"
                                                        style={{
                                                            backgroundColor: isSelected ? colors.text : 'transparent',
                                                            borderColor: colors.border
                                                        }}
                                                    >
                                                        <Text style={{ color: isSelected ? colors.background : colors.text }}>{word}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* Collection Selection */}
                                <Text className="text-sm mb-2" style={{ color: colors.secondary }}>Collection:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                                    {triggerCollections.map(c => (
                                        <TouchableOpacity
                                            key={c.id}
                                            onPress={() => { setSelectedCollectionId(c.id); setNewCollectionName(''); }}
                                            className="px-3 py-2 rounded-full mr-2 border"
                                            style={{
                                                backgroundColor: selectedCollectionId === c.id ? colors.text : 'transparent',
                                                borderColor: colors.border
                                            }}
                                        >
                                            <Text style={{ color: selectedCollectionId === c.id ? colors.background : colors.text }}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        onPress={() => setSelectedCollectionId(null)}
                                        className="px-3 py-2 rounded-full border"
                                        style={{
                                            backgroundColor: !selectedCollectionId ? colors.text : 'transparent',
                                            borderColor: colors.border
                                        }}
                                    >
                                        <Text style={{ color: !selectedCollectionId ? colors.background : colors.text }}>+ New</Text>
                                    </TouchableOpacity>
                                </ScrollView>

                                {!selectedCollectionId && (
                                    <TextInput
                                        value={newCollectionName}
                                        onChangeText={setNewCollectionName}
                                        placeholder="New collection name..."
                                        placeholderTextColor={colors.secondary}
                                        className="p-3 rounded-xl mb-4 border"
                                        style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }}
                                    />
                                )}

                                {/* Target User */}
                                <Text className="text-sm mb-2" style={{ color: colors.secondary }}>Warn when typed by:</Text>
                                <View className="flex-row gap-2 mb-4">
                                    {(['self', 'other', 'both'] as const).map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            onPress={() => setTriggerTargetUser(t)}
                                            className="px-4 py-2 rounded-full border"
                                            style={{
                                                backgroundColor: triggerTargetUser === t ? colors.text : 'transparent',
                                                borderColor: colors.border
                                            }}
                                        >
                                            <Text style={{ color: triggerTargetUser === t ? colors.background : colors.text }}>
                                                {t === 'self' ? 'Me' : t === 'other' ? 'Them' : 'Both'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Condition Type */}
                                <Text className="text-sm mb-2" style={{ color: colors.secondary }}>Trigger condition:</Text>
                                <View className="flex-row gap-2 mb-4">
                                    <TouchableOpacity
                                        onPress={() => setTriggerConditionType('keyword')}
                                        className="px-4 py-2 rounded-full border"
                                        style={{
                                            backgroundColor: triggerConditionType === 'keyword' ? colors.text : 'transparent',
                                            borderColor: colors.border
                                        }}
                                    >
                                        <Text style={{ color: triggerConditionType === 'keyword' ? colors.background : colors.text }}>Contains keywords</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setTriggerConditionType('exact_match')}
                                        className="px-4 py-2 rounded-full border"
                                        style={{
                                            backgroundColor: triggerConditionType === 'exact_match' ? colors.text : 'transparent',
                                            borderColor: colors.border
                                        }}
                                    >
                                        <Text style={{ color: triggerConditionType === 'exact_match' ? colors.background : colors.text }}>Exact match</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Warning Message */}
                                <Text className="text-sm mb-1" style={{ color: colors.secondary }}>Warning message (optional):</Text>
                                <TextInput
                                    value={triggerWarningMessage}
                                    onChangeText={setTriggerWarningMessage}
                                    placeholder="e.g., Think before sending this..."
                                    placeholderTextColor={colors.secondary}
                                    className="p-3 rounded-xl mb-4 border"
                                    style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }}
                                />

                                {/* Save Button */}
                                <TouchableOpacity
                                    onPress={saveTrigger}
                                    className="bg-white p-4 rounded-xl items-center mt-2"
                                >
                                    <Text className="font-bold text-black">Save Trigger</Text>
                                </TouchableOpacity>
                            </ScrollView>

                        </BlurView>
                    </View>
                </Modal >

                {/* Custom Trigger Warning Modal */}

                <Modal
                    visible={triggerWarningModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => {
                        if (triggerResolveRef.current) triggerResolveRef.current(false);
                        setTriggerWarningModalVisible(false);
                    }
                    }
                >
                    <View className="flex-1 justify-center items-center bg-black/80 px-4">
                        <View className="w-full bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                            <View className="flex-row items-center gap-2 mb-4">
                                <AlertTriangle size={24} color="#f59e0b" />
                                <Text className="text-xl font-bold text-white">Trigger Warning</Text>
                            </View>

                            <Text className="text-zinc-400 mb-4">
                                This message contains triggers from collection <Text className="font-bold text-white">"{triggerWarningData?.collectionName}"</Text>:
                            </Text>

                            <View className="bg-zinc-800 p-4 rounded-xl mb-6">
                                {triggerWarningData?.warnings.map((w, i) => (
                                    <Text key={i} className="text-white font-medium mb-1">• {w}</Text>
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={async () => {
                                    if (triggerWarningData?.collectionId) {
                                        await supabase.from('TriggerCollection').update({ muteWarnings: true }).eq('id', triggerWarningData.collectionId);
                                        showToast("Warnings muted for this collection", "success");
                                        if (triggerResolveRef.current) triggerResolveRef.current(true);
                                        setTriggerWarningModalVisible(false);
                                    }
                                }}
                                className="flex-row items-center justify-center p-3 rounded-xl border border-zinc-600 mb-3"
                            >
                                <Text className="text-zinc-300 font-medium">Always allow for "{triggerWarningData?.collectionName}"</Text>
                            </TouchableOpacity>

                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => {
                                        if (triggerResolveRef.current) triggerResolveRef.current(false);
                                        setTriggerWarningModalVisible(false);
                                    }}
                                    className="flex-1 bg-zinc-800 p-3 rounded-xl items-center border border-zinc-700"
                                >
                                    <Text className="text-white font-bold">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (triggerResolveRef.current) triggerResolveRef.current(true);
                                        setTriggerWarningModalVisible(false);
                                    }}
                                    className="flex-1 bg-red-600 p-3 rounded-xl items-center"
                                >
                                    <Text className="text-white font-bold">Send Anyway</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Collaborative Modal */}
                <CollaborativeModal
                    visible={showCollaborativeModal}
                    onClose={() => setShowCollaborativeModal(false)}
                    partnerId={selectedUser?.id}
                    partnerName={selectedUser?.name}
                />
            </SafeAreaView>
        </View >
    );
};





