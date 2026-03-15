import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, Modal, Animated, Dimensions, FlatList, ActivityIndicator, Alert, AlertButton, BackHandler, KeyboardAvoidingView, Platform, Keyboard, StatusBar, ImageBackground } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Mic, Send, Search, Settings, MoreVertical, Phone, Video, Image as ImageIcon, Smile, X, ChevronLeft, ChevronUp, ChevronDown, GripVertical, Sparkles, User as UserIcon, Sun, Moon, Anchor, Heart, Map as MapIcon, Book, Plus, Tag, Frown, AlertTriangle, Check, CheckCheck, Clock, Trash2, EyeOff, Lock, Bookmark, Users, Reply, Download } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanResponder, Animated as RNAnimated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useNavVisibility } from '../../context/NavContext';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEncryption } from '../../context/EncryptionContext';
import { encryptMessage, decryptMessage, decryptFile } from '../../lib/encryption';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

import { MediaUploadService } from '../../services/MediaUploadService';

import * as ImagePicker from 'expo-image-picker';

import { Paperclip } from 'lucide-react-native';
import CustomToast, { ToastType } from '../../components/CustomToast';
import ChatPostCard from '../../components/ChatPostCard';
import CollaborativeModal from '../../components/CollaborativeModal';

import MediaPreview from '../../components/chat/MediaPreview';
import EncryptedMedia from '../../components/chat/EncryptedMedia';
import DocumentBubble from '../../components/chat/DocumentBubble';
import LocationBubble from '../../components/chat/LocationBubble';
import * as DocumentPicker from 'expo-document-picker';

// === NEW FEATURE IMPORTS ===
import { ChannelPool } from '../../lib/ChannelPool';
import { EncryptionKeyCache } from '../../lib/EncryptionKeyCache';
import { SecureMessageQueue } from '../../lib/SecureMessageQueue';
import { sealSender, serializeSealedSender } from '../../lib/SealedSender';
import { verifyKey } from '../../lib/KeyVerification';
import LiveCanvas from '../../components/chat/LiveCanvas';
import SendButtonMenu, { SendMode, ToneType, getToneStyle } from '../../components/chat/SendButtonMenu';
import ChatStack from '../../components/chat/ChatStack';
import { SnoozePickerModal, useSnooze } from '../../components/chat/SwipeToSnooze';
import { SlashCommandsPanel, SlashCommand } from '../../components/chat/SlashCommands';
import { PollCard, PollData } from '../../components/chat/PollCard';
import { SpinCard, SpinData } from '../../components/chat/SpinCard';
import { LocCard, LocationData } from '../../components/chat/LocCard';
import StickyNote from '../../components/chat/StickyNote';
import MessageStatusIndicator from '../../components/chat/MessageStatusIndicator';
import { BondingService } from '../../services/BondingService';


const { width } = Dimensions.get('window');


type PersonaType = 'friend' | 'therapist' | 'coach' | 'mystic';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'post' | 'reply' | 'document' | 'location' | 'trigger';
    mediaUrl?: string;
    createdAt?: string;
    timestamp: number;
    senderId?: string;
    readAt?: string;
    isSaved?: boolean;
    tags?: string[];
    isEdited?: boolean;
    isDeleted?: boolean;
    deletedBy?: string[];
    updatedAt?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document' | 'location';
    mediaEncryptionKey?: string;
    viewOnce?: boolean;
    expiresAt?: string; // ISO string
    isPasswordProtected?: boolean; // New field for password protected docs
    thumbnailUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    isSending?: boolean;
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
const SwipeableMessage = ({ children, onReply, onSnooze, isMe }: { children: React.ReactNode, onReply: () => void, onSnooze?: () => void, isMe: boolean }) => {
    const pan = React.useRef(new RNAnimated.ValueXY()).current;
    const hasTriggeredHaptic = React.useRef(false);

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
                    // Haptic feedback at snooze threshold for received messages
                    if (!isMe && onSnooze && gestureState.dx > 72 && !hasTriggeredHaptic.current) {
                        hasTriggeredHaptic.current = true;
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                    }
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                hasTriggeredHaptic.current = false;
                if (!isMe && onSnooze && gestureState.dx > 72) {
                    // Snooze threshold for received messages
                    onSnooze();
                } else if (gestureState.dx > 50) {
                    // Reply threshold
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
        console.log(`[ChatAction] handleSaveNickname: targetUser=${editUser.id}, nickname=${tempNickname.trim()}`);
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
        console.log(`[ChatAction] handleShowOptions: user=${user.id}`);
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

    // MENTIONS / TAGGING STATE
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionResults, setMentionResults] = useState<ChatUser[]>([]);
    const [followingIds, setFollowingIds] = useState<string[]>([]);

    useEffect(() => {
        if (!dbUserId) return;
        supabase.from('Follow').select('followingId').eq('followerId', dbUserId)
            .then(({ data }) => {
                if (data) setFollowingIds(data.map(f => f.followingId));
            });
    }, [dbUserId]);

    // Chat settings state
    const [showChatSettings, setShowChatSettings] = useState(false);
    const [showCollaborativeModal, setShowCollaborativeModal] = useState(false);
    const [chatBackground, setChatBackground] = useState<string | null>(null);
    const [messageRetention, setMessageRetention] = useState<'immediately' | 'forever' | '1day' | 'custom'>('immediately');
    const [customRetentionDays, setCustomRetentionDays] = useState(7);

    const [isUploading, setIsUploading] = useState(false);
    const isSendingRef = useRef(false);
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
    const [chatToDelete, setChatToDelete] = useState<string | null>(null);
    const [deletedConversationIds, setDeletedConversationIds] = useState<Set<string>>(new Set());
    const deletedIdsRef = useRef<Set<string>>(new Set());

    // Toast state
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<ToastType>('success');
    const showToast = (message: string, type: ToastType = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // --- Media & Location State ---
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<{ uri: string; type: 'image' | 'video' | 'document'; fileSize?: number; mimeType?: string; fileName?: string | null }[]>([]);

    // === NEW FEATURE STATE ===
    const [liveCanvasEnabled, setLiveCanvasEnabled] = useState(false);
    const [liveCanvasPartnerText, setLiveCanvasPartnerText] = useState('');
    const { showSnoozePicker, initiateSnooze, handleSnoozeSelect, closeSnoozePicker } = useSnooze();

    const [viewingMediaMsg, setViewingMediaMsg] = useState<Message | null>(null);

    // --- Message Scroll & Highlight State ---
    const scrollViewRef = useRef<ScrollView>(null);
    const messageLayouts = useRef<Record<string, number>>({});
    const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

    const scrollToMessage = (msgId: string) => {
        const yPos = messageLayouts.current[msgId];
        if (yPos !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: Math.max(0, yPos - 20), animated: true });

            // Flash effect
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 1500);
        }
    };

    // --- Handlers ---
    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit

    const handleDownloadMediaToDevice = async (msg: Message) => {
        try {
            if (!msg.mediaUrl) return;
            const filename = msg.mediaUrl.split('/').pop()?.split('?')[0] || 'media_dl';
            const cacheDir = FileSystem.cacheDirectory + 'chat_downloads/';
            await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => { });

            const localEncryptedPath = cacheDir + 'enc_' + filename;
            const downloadRes = await FileSystem.downloadAsync(msg.mediaUrl, localEncryptedPath);

            let decryptedPath = localEncryptedPath;
            if (msg.mediaEncryptionKey) {
                const parts = msg.mediaEncryptionKey.split(':');
                if (parts.length >= 2 && !msg.mediaEncryptionKey.includes('pw:')) {
                    const iv = parts[0];
                    const keyStr = parts[1];
                    const dec = await decryptFile(localEncryptedPath, keyStr, iv);
                    if (dec) decryptedPath = dec;
                } else if (msg.mediaEncryptionKey.includes('pw:')) {
                    Alert.alert("Password Required", "Cannot download password protected file directly.");
                    return;
                }
            }
            if (decryptedPath) {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(decryptedPath);
                } else {
                    Alert.alert("Error", "Sharing is not available on this device.");
                }
            }
        } catch (e) {
            console.error("Download Error:", e);
            Alert.alert("Error", "Could not download media");
        }
    };

    const handlePickMedia = async (source: 'camera' | 'library') => {
        console.log(`[ChatAction] handlePickMedia: source=${source}`);
        setShowAttachmentMenu(false);
        try {
            const result = source === 'camera'
                ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    quality: 0.8,
                    allowsMultipleSelection: true,
                    selectionLimit: 12
                });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const validAssets = result.assets.filter(a => (a.fileSize || 0) <= MAX_FILE_SIZE_BYTES);

                if (validAssets.length < result.assets.length) {
                    Alert.alert('File Size Limit', 'Some files exceeded the 50MB limit and were skipped.');
                }

                if (validAssets.length === 0) return;

                const items = validAssets.map(asset => ({
                    uri: asset.uri,
                    type: asset.type === 'video' ? 'video' as const : 'image' as const,
                    fileSize: asset.fileSize,
                    mimeType: asset.mimeType,
                    fileName: asset.fileName
                }));
                setPreviewMedia(items);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick media');
        }
    };

    const handlePickDocument = async () => {
        console.log(`[ChatAction] handlePickDocument: invoked`);
        setShowAttachmentMenu(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
            if (result.canceled || !result.assets || result.assets.length === 0) return;

            const validAssets = result.assets.filter(a => (a.size || 0) <= MAX_FILE_SIZE_BYTES);
            if (validAssets.length < result.assets.length) {
                Alert.alert('File Size Limit', 'Some documents exceeded the 50MB limit and were skipped.');
            }
            if (validAssets.length === 0) return;

            if (validAssets.length > 12) {
                Alert.alert('Limit Exceeded', 'You can only select up to 12 documents at once.');
                validAssets.splice(12);
            }

            const items = validAssets.map(asset => ({
                uri: asset.uri,
                type: 'document' as const,
                fileSize: asset.size,
                mimeType: asset.mimeType,
                fileName: asset.name
            }));

            setPreviewMedia(items);
        } catch (error) {
            console.log('Error picking doc', error);
        }
    };

    const handleSendMedia = async (data: { caption: string; viewOnce: boolean; expiresAt: Date | null; password?: string }) => {
        if (!previewMedia || previewMedia.length === 0) return;
        console.log(`[ChatAction] handleSendMedia: multipleCount=${previewMedia.length}, viewOnce=${data.viewOnce}`);

        const itemsToUpload = [...previewMedia];
        setPreviewMedia([]); // Close preview immediately

        for (let i = 0; i < itemsToUpload.length; i++) {
            const item = itemsToUpload[i];
            const tempId = `temp-${Date.now()}-${i}`;
            const type = item.type;

            // Give the caption to the first item, others get empty string (unless it is a document, then name)
            const itemContent = i === 0 && data.caption ? data.caption : (type === 'document' ? `ðŸ“„ ${item.fileName || 'Document'}` : '');

            // Optimistic Media "Sending" Bubble to UI instantly!
            const optimisticMsg: Message = {
                id: tempId,
                role: 'user',
                content: itemContent,
                type: type,
                mediaUrl: item.uri,
                timestamp: Date.now(),
                createdAt: new Date().toISOString(),
                senderId: dbUserId!,
                readAt: null,
                isSaved: false,
                viewOnce: data.viewOnce,
                isSending: true,
                fileName: item.fileName || undefined,
                fileSize: item.fileSize,
                mimeType: item.mimeType,
            };

            setMessages(prev => [...prev, optimisticMsg]);
            setIsLoading(false);

            try {
                // Upload service call
                let uploadResult;
                if (type === 'document') {
                    uploadResult = await MediaUploadService.uploadDocument(item.uri, true, data.password);
                } else {
                    uploadResult = await MediaUploadService.uploadMedia(
                        item.uri,
                        type === 'video' ? 'VIDEO' : 'IMAGE',
                        undefined,
                        true, // Always encrypt
                        data.password
                    );
                }

                // Call the actual sendMessage logic to commit to DB and broadcast
                await sendMessage(
                    type,
                    itemContent,
                    uploadResult.url,
                    {
                        mediaEncryptionKey: uploadResult.encryptionKey ?
                            (uploadResult.iv ? `${uploadResult.iv}:${uploadResult.encryptionKey}` : uploadResult.encryptionKey)
                            : undefined,
                        mimeType: item.mimeType,
                        fileName: item.fileName || undefined,
                        fileSize: item.fileSize,
                        viewOnce: data.viewOnce,
                        isPasswordProtected: !!data.password,
                        tempId: tempId
                    }
                );

            } catch (error) {
                console.error("Failed to upload media:", error);
                showToast("Failed to send some media", 'error');
                setMessages(prev => prev.filter(msg => msg.id !== tempId));
            }
        }
        setIsUploading(false);
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
    const [selectedSlashCollectionId, setSelectedSlashCollectionId] = useState<string | null>(null);
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
                .select('conversationId, isHidden, isLocked, isDeleted')
                .eq('userId', dbUserId);

            if (states) {
                const hidden = new Set<string>();
                const locked = new Set<string>();
                const dbDeleted = new Set<string>();
                states.forEach((s: any) => {
                    if (s.isHidden) hidden.add(s.conversationId);
                    if (s.isLocked) locked.add(s.conversationId);
                    if (s.isDeleted) dbDeleted.add(s.conversationId);
                });
                setHiddenConversationIds(hidden);
                setLockedConversationIds(locked);

                // MERGE local deleted IDs with DB deleted IDs (never overwrite local deletions)
                // Local AsyncStorage is the primary source of truth since RLS may block DB writes
                let mergedDeleted = new Set<string>(dbDeleted);
                try {
                    const storedDeleted = await AsyncStorage.getItem('deletedConversationIds');
                    if (storedDeleted) {
                        const localIds: string[] = JSON.parse(storedDeleted);
                        localIds.forEach(id => mergedDeleted.add(id));
                    }
                } catch (_) { /* ignore */ }
                setDeletedConversationIds(mergedDeleted);
                deletedIdsRef.current = mergedDeleted;
                await AsyncStorage.setItem('deletedConversationIds', JSON.stringify(Array.from(mergedDeleted)));
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
        console.log(`[ChatAction] handlePin: targetUser=${userId}, currentlyPinned=${pinnedIds.has(userId)}`);
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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'Conversation' }, (payload) => {
                    console.log(`[Realtime] public:Conversation update received:`, payload);
                    fetchConversations();
                })
                .subscribe();

            // Subscribe to User presence/status changes
            const userChannel = supabase.channel('public:User')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'User' }, (payload) => {
                    console.log(`[Realtime] public:User status update received for user=${payload.new.id}, lastSeen=${payload.new.lastSeen}`);
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

    // REFRESH DATA ON KEY UNLOCK
    useEffect(() => {
        if (privateKey) {
            console.log("Keys unlocked - refreshing chat data");
            fetchConversations();
            if (activeConversationIdRef.current && selectedUser) {
                fetchMessages(activeConversationIdRef.current);
            }
        }
    }, [privateKey]);

    // Subscribe to messages when a chat is open
    // Ref to hold channel for broadcast sending
    const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Typing Indicator State
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingSentRef = useRef<number>(0);

    // Load accepted state on mount/change
    useEffect(() => {
        if (activeConversationIdRef.current) {
            AsyncStorage.getItem(`accepted_${activeConversationIdRef.current}`).then(val => {
                if (val === 'true') setTempAccepted(true);
                else setTempAccepted(false);
            });
        }
    }, [activeConversationIdRef.current]);

    const handleAcceptRequest = async () => {
        setTempAccepted(true);
        if (activeConversationIdRef.current) {
            await AsyncStorage.setItem(`accepted_${activeConversationIdRef.current}`, 'true');
        }
    };

    useEffect(() => {
        if (!activeConversationIdRef.current || !dbUserId) return;

        const channel = supabase.channel(`chat:${activeConversationIdRef.current}`)
            // FAST PATH: Listen for broadcast messages (instant delivery)
            .on('broadcast', { event: 'typing' }, (payload) => {
                console.log(`[Realtime] chat:${activeConversationIdRef.current} broadcast typing event received from sender=${payload.payload.senderId}`);
                if (payload.payload.senderId !== dbUserId) {
                    setIsPartnerTyping(true);
                    // Clear previous timeout
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    // Set new timeout to clear typing status
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsPartnerTyping(false);
                    }, 3000);
                }
            })
            .on('broadcast', { event: 'new_message' }, async (payload) => {
                const newMsg = payload.payload;
                console.log(`[Realtime] chat:${activeConversationIdRef.current} broadcast new_message received: id=${newMsg.id}`);
                // Skip if it's our own message (already added via optimistic update)
                if (newMsg.senderId === dbUserId) return;

                // Stop typing indicator when message received
                setIsPartnerTyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

                let text = newMsg.content;
                // Decrypt if needed
                if (text && text.startsWith('{') && text.includes('"c":') && privateKey && selectedUser?.publicKey) {
                    try {
                        const parsed = JSON.parse(text);
                        if (parsed.c && parsed.n && parsed.h) {
                            const isInitiator = dbUserId! < selectedUser.id;
                            const decrypted = await decryptMessage(
                                { ciphertext: parsed.c, nonce: parsed.n, header: parsed.h },
                                privateKey,
                                selectedUser.publicKey,
                                activeConversationIdRef.current!,
                                isInitiator
                            );
                            if (decrypted) text = decrypted;
                        }
                    } catch (e) { }
                }

                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    markAsRead(newMsg.id);
                    return [...prev, {
                        id: newMsg.id,
                        role: 'assistant',
                        content: text,
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
                async (payload) => {
                    console.log(`[Realtime] chat:${activeConversationIdRef.current} Message postgres_changes received: eventType=${payload.eventType}`);
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new;
                        let text = newMsg.content;

                        // Decrypt if needed OUTSIDE setMessages
                        if (newMsg.senderId !== dbUserId) {
                            markAsRead(newMsg.id);
                            if (text && text.startsWith('{') && text.includes('"c":') && privateKey && selectedUser?.publicKey) {
                                try {
                                    const parsed = JSON.parse(text);
                                    if (parsed.c && parsed.n && parsed.h) {
                                        const isInitiator = dbUserId! < selectedUser.id;
                                        const decrypted = await decryptMessage(
                                            { ciphertext: parsed.c, nonce: parsed.n, header: parsed.h },
                                            privateKey,
                                            selectedUser.publicKey,
                                            activeConversationIdRef.current!,
                                            isInitiator
                                        );
                                        if (decrypted) text = decrypted;
                                    }
                                } catch (e) { }
                            }
                        }

                        setMessages(prev => {
                            // DEDUPLICATION: Skip if already received via broadcast
                            if (prev.find(m => m.id === newMsg.id)) return prev;

                            return [...prev, {
                                id: newMsg.id,
                                role: newMsg.senderId === dbUserId ? 'user' : 'assistant',
                                content: text,
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
    }, [activeConversationIdRef.current, dbUserId, privateKey, selectedUser]);

    // --- Data Fetching ---

    const fetchConversations = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;
        console.log(`[ChatData] fetchConversations: invoked for user=${currentUser.id}`);

        try {
            // Always load deleted IDs from AsyncStorage and merge with in-memory ref
            // This ensures deletions persist even when realtime events re-trigger this function
            let currentDeletedIds = new Set<string>(deletedIdsRef.current);
            try {
                const storedDeleted = await AsyncStorage.getItem('deletedConversationIds');
                if (storedDeleted) {
                    const parsed: string[] = JSON.parse(storedDeleted);
                    parsed.forEach(id => currentDeletedIds.add(id));
                    deletedIdsRef.current = currentDeletedIds;
                    setDeletedConversationIds(currentDeletedIds);
                }
            } catch (e) { /* ignore parse errors */ }

            // Fetch conversations where user is A or B
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

            const formatted: ChatUser[] = data.map((c: any) => {
                // Filter out deleted conversations immediately
                if (currentDeletedIds.has(c.id)) return null;

                const isA = c.participantA === currentUser.id;
                const partner = isA ? c.userB : c.userA;

                // Safety check if partner user was deleted
                if (!partner) return null;

                const name = partner.profile?.displayName || partner.name || 'Unknown User';
                const avatar = partner.profile?.avatarUrl || null;

                return {
                    id: partner.id,
                    name: name,
                    avatar: avatar,
                    status: (isUserOnline(partner.lastSeen) ? 'online' : 'offline') as 'online' | 'offline' | 'away',
                    lastMessage: (() => {
                        if (!c.lastMessage) return 'Start a conversation';
                        try {
                            if (c.lastMessage.startsWith('{')) {
                                const parsed = JSON.parse(c.lastMessage);
                                if (parsed.text && parsed.replyTo) return parsed.text;

                                // Decrypt preview if keys are available
                                // NOTE: Removed preview decryption because Ratchet state cannot be advanced for previews without dropping actual messages
                                // Handle encrypted messages - show placeholder
                                if (parsed.c && parsed.n) return 'Encrypted message';
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
        const searchLower = searchQuery.toLowerCase().trim();
        const isHiddenSearch = searchLower === 'hidden';

        if (searchLower.length > 0) {
            console.log(`[ChatList] Searching for: "${searchLower}". Is override Hidden Mode? ${isHiddenSearch}`);
        }

        // Filter out deleted chats FIRST
        const activeConversations = conversations.filter(c => !deletedConversationIds.has(c.conversationId || c.id));

        // If explicitly typing "hidden", bypass the remote `searchResults` array 
        // and filter our local `conversations` array instead.
        let list: ChatUser[] = [];

        if (isHiddenSearch) {
            list = activeConversations;
        } else if (searchLower.length > 0) {
            // Find local conversations that match the name
            const localMatches = activeConversations.filter(c =>
                c.name && c.name.toLowerCase().includes(searchLower)
            );

            // Combine Supabase search results with local matches, keeping unique IDs
            const combinedMap = new Map();
            searchResults
                .filter(u => !deletedConversationIds.has(u.conversationId || u.id))
                .forEach(u => combinedMap.set(u.id, u));
            localMatches.forEach(u => {
                if (!combinedMap.has(u.id)) combinedMap.set(u.id, u);
            });

            list = Array.from(combinedMap.values());
            console.log(`[ChatList] Combined ${localMatches.length} local matches with ${searchResults.length} remote hits.`);
        } else {
            list = activeConversations;
        }

        // Update flags dynamically
        list = list.map(c => ({
            ...c,
            isPinned: pinnedIds.has(c.id),
            isHidden: hiddenConversationIds.has(c.conversationId || c.id),
            isLocked: lockedConversationIds.has(c.conversationId || c.id)
        }));

        if (isHiddenSearch) {
            console.log(`[ChatList] Filtering ${list.length} local conversations for hidden ones...`);
            // Only show hidden chats
            list = list.filter(c => c.isHidden);
        } else if (searchLower.length > 0) {
            // Show all chats (including hidden) matching the search term
            // `list` now includes both local matches and Supabase results!
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
        console.log(`[ChatData] searchUsers: query="${query}"`);
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
                    profile:Profile!inner(displayName, avatarUrl, publicKey)
                `)
                .ilike('profile.displayName', `%${query}%`)
                .neq('id', dbUserId)
                .limit(10);

            // Search by Profile Code
            const { data: codeUser } = await supabase
                .from('User')
                .select(`
                    id, name, lastSeen, profileCode,
                    profile:Profile!inner(displayName, avatarUrl, publicKey)
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
                // Attempt to find an existing conversation with this user to inherit flags and ID
                const existingConv = conversations.find((c: any) => c.id === u.id);

                return {
                    id: u.id,
                    name: profile?.displayName || u.name || 'Unknown',
                    avatar: profile?.avatarUrl || '',
                    status: (isUserOnline(u.lastSeen) ? 'online' : 'offline') as 'online' | 'offline' | 'away',
                    lastSeen: u.lastSeen,
                    publicKey: profile?.publicKey,
                    conversationId: existingConv?.conversationId || null,
                    isHidden: hiddenConversationIds.has(existingConv?.conversationId || u.id),
                    isLocked: lockedConversationIds.has(existingConv?.conversationId || u.id),
                    lastMessage: existingConv?.lastMessage || '',
                    lastMessageAt: existingConv?.lastMessageAt || null,
                };
            }).filter((u: any) => !blockedIds.has(u.id)) as ChatUser[];

            setSearchResults(formatted);
        } catch (err) {
            console.error('Error searching users:', err);
        }
    };

    // Chat Management Handlers
    const handleDeleteChat = async (conversationId: string) => {
        console.log(`[ChatAction] handleDeleteChat: initiated for conv=${conversationId}`);
        if (!dbUserId) return;

        // === STEP 1: Persist deletion locally FIRST (before any DB call) ===
        // This ensures the chat stays gone even if DB operations fail
        const newDeletedIds = new Set(deletedIdsRef.current).add(conversationId);
        deletedIdsRef.current = newDeletedIds;
        setDeletedConversationIds(newDeletedIds);
        setConversations(prev => prev.filter(c => (c.conversationId || c.id) !== conversationId));
        setShowOptionsModal(false);

        // Persist to AsyncStorage immediately -- this is the source of truth on next launch
        await AsyncStorage.setItem('deletedConversationIds', JSON.stringify(Array.from(newDeletedIds)));

        // Clean up cached data
        try {
            await AsyncStorage.multiRemove([
                `wallpaper_${conversationId}`,
                `accepted_${conversationId}`,
            ]);
        } catch (_) { /* non-critical */ }

        // Remove from pinned if pinned
        const pinnedUser = conversations.find(c => (c.conversationId || c.id) === conversationId);
        if (pinnedUser && pinnedIds.has(pinnedUser.id)) {
            const newPinned = new Set(pinnedIds);
            newPinned.delete(pinnedUser.id);
            setPinnedIds(newPinned);
            const newOrder = pinnedOrder.filter(id => id !== pinnedUser.id);
            setPinnedOrder(newOrder);
            await AsyncStorage.setItem('pinnedChatIds', JSON.stringify(Array.from(newPinned)));
            await AsyncStorage.setItem('pinnedChatOrder', JSON.stringify(newOrder));
        }

        // === STEP 2: Attempt hard delete from database ===
        // If any of these fail (e.g. RLS), the conversation stays hidden locally
        try {
            // Get all message IDs first
            const { data: msgRows, error: msgFetchErr } = await supabase
                .from('Message')
                .select('id')
                .eq('conversationId', conversationId);

            if (msgFetchErr) console.warn('[DeleteChat] Could not fetch messages:', msgFetchErr.message);

            const messageIds = (msgRows || []).map((m: any) => m.id);

            if (messageIds.length > 0) {
                // Delete message children -- ignore errors (tables might not have matching rows)
                const { error: tagErr } = await supabase.from('MessageTag').delete().in('messageId', messageIds);
                if (tagErr) console.warn('[DeleteChat] MessageTag delete:', tagErr.message);

                const { error: trigErr } = await supabase.from('Trigger').delete().in('messageId', messageIds);
                if (trigErr) console.warn('[DeleteChat] Trigger delete:', trigErr.message);

                const { error: delMsgErr } = await supabase.from('DeletedMessage').delete().in('messageId', messageIds);
                if (delMsgErr) console.warn('[DeleteChat] DeletedMessage delete:', delMsgErr.message);
            }

            // Delete messages
            const { error: msgDelErr } = await supabase.from('Message').delete().eq('conversationId', conversationId);
            if (msgDelErr) console.warn('[DeleteChat] Message delete:', msgDelErr.message);

            // Delete conversation state
            const { error: stateDelErr } = await supabase.from('ConversationState').delete().eq('conversationId', conversationId);
            if (stateDelErr) console.warn('[DeleteChat] ConversationState delete:', stateDelErr.message);

            // Delete conversation
            const { error: convDelErr } = await supabase.from('Conversation').delete().eq('id', conversationId);
            if (convDelErr) {
                console.warn('[DeleteChat] Conversation delete failed:', convDelErr.message);
                // Fallback: if hard delete fails (RLS), ensure soft delete flag is set
                await supabase.from('ConversationState').upsert({
                    conversationId,
                    userId: dbUserId,
                    isDeleted: true
                }, { onConflict: 'conversationId,userId' });
            }
        } catch (err) {
            console.error('[DeleteChat] DB operation error:', err);
            // Even if DB fails entirely, the chat stays hidden locally via AsyncStorage
            // Attempt soft-delete fallback
            try {
                await supabase.from('ConversationState').upsert({
                    conversationId,
                    userId: dbUserId,
                    isDeleted: true
                }, { onConflict: 'conversationId,userId' });
            } catch (_) { /* last resort fallback failed */ }
        }

        showToast('Chat deleted', 'success');
    };

    const handleHideChat = async (conversationId: string) => {
        if (!dbUserId) return;
        console.log(`[ChatAction] handleHideChat: conversationId=${conversationId}, currentlyHidden=${hiddenConversationIds.has(conversationId)}`);

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
        console.log(`[ChatAction] handleLockChat: initiated for conv=${conversationId}`);
        setLockModalConversationId(conversationId);
        setIsSettingPin(true);
        setPinInput('');
        setShowLockModal(true);
        setShowOptionsModal(false);
    };

    const handleSetPin = async () => {
        console.log(`[ChatAction] handleSetPin: creating PIN for conv=${lockModalConversationId}`);
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
        console.log(`[ChatAction] handleUnlockChat: removing lock for conv=${conversationId}`);

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

    const fetchMessages = async (conversationId: string, targetUserArg?: ChatUser) => {
        console.log(`[ChatData] fetchMessages: fetching messages for conv=${conversationId}`);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        // Use argument if provided, otherwise fallback to state (which might be stale but useful in some contexts)
        const currentSelectedUser = targetUserArg || selectedUser;

        try {
            // Direct Supabase query - no API call needed
            const { data: messagesData, error } = await supabase
                .from('Message')
                .select(`
                    id, conversationId, senderId, content, type, mediaUrl, isSaved, readAt, createdAt, mediaEncryptionKey, viewOnce, fileName, fileSize, mimeType, duration,
                    sender:User!senderId(id, name, profile:Profile(avatarUrl, publicKey)),
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
                .eq('userId', currentUser.id);

            const myDeletedIds = new Set((myDeletedData || []).map(d => d.messageId));

            const fetchedMessages: Message[] = [];
            for (const m of (messagesData || [])) {
                if (myDeletedIds.has(m.id)) continue;
                let text = m.content;
                const isMe = m.senderId === currentUser.id;

                // Attempt Decryption sequentially
                if (!isMe && text && text.startsWith('{') && text.includes('"c":') && privateKey) {
                    try {
                        const parsed = JSON.parse(text);
                        if (parsed.c && parsed.n && parsed.h) {
                            const mAny = m as any;
                            const senderProfile = Array.isArray(mAny.sender?.profile) ? mAny.sender.profile[0] : mAny.sender?.profile;
                            const senderPubKey = senderProfile?.publicKey;
                            
                            if (senderPubKey) {
                                const isInitiator = currentUser.id < m.senderId;
                                const decrypted = await decryptMessage(
                                    { ciphertext: parsed.c, nonce: parsed.n, header: parsed.h },
                                    privateKey,
                                    senderPubKey,
                                    activeConversationIdRef.current!,
                                    isInitiator
                                );
                                if (decrypted) text = decrypted;
                            }
                        }
                    } catch (e) { /* ignore JSON parse error */ }
                } else if (isMe && text && text.startsWith('{') && text.includes('"c":')) {
                    // Ratchet: We can't decrypt our own sent messages directly from the ratchet
                    text = "Encrypted Message (Sent)";
                }

                const safeCreatedAt = m.createdAt.endsWith('Z') ? m.createdAt : `${m.createdAt}Z`;
                fetchedMessages.push({
                    id: m.id,
                    senderId: m.senderId,
                    content: text,
                    type: m.type,
                    mediaUrl: m.mediaUrl,
                    timestamp: new Date(safeCreatedAt).getTime(),
                    createdAt: safeCreatedAt,
                    role: (isMe ? 'user' : 'assistant') as 'user' | 'assistant' | 'system',
                    isSaved: m.isSaved,
                    readAt: m.readAt,
                    tags: m.messageTags?.map((t: any) => t.tagType) || [],
                    mediaEncryptionKey: m.mediaEncryptionKey,
                    viewOnce: m.viewOnce,
                    fileName: m.fileName,
                    fileSize: m.fileSize,
                    mimeType: m.mimeType,
                    duration: m.duration
                });
            }

            setMessages(fetchedMessages);

            // Mark unread messages as read
            const unreadIds = (messagesData || [])
                .filter((m: any) => m.senderId !== currentUser.id && !m.readAt)
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
        console.log(`[ChatUI] handleUserSelect: opening chat with user=${user.id}`);
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

            // If this conversation was previously deleted, un-delete it
            if (deletedIdsRef.current.has(conversationId)) {
                try {
                    await supabase.from('ConversationState').upsert({
                        conversationId,
                        userId: currentUser.id,
                        isDeleted: false
                    }, { onConflict: 'conversationId,userId' });
                    const newDeletedIds = new Set(deletedIdsRef.current);
                    newDeletedIds.delete(conversationId);
                    deletedIdsRef.current = newDeletedIds;
                    setDeletedConversationIds(newDeletedIds);
                    await AsyncStorage.setItem('deletedConversationIds', JSON.stringify(Array.from(newDeletedIds)));
                } catch (e) {
                    console.error('Error un-deleting conversation:', e);
                }
            }

            await fetchMessages(conversationId, user);

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

                    // Run retention cleanup on chat open (covers 1-day case and any pending immediate cleanup)
                    if (retData.messageRetention && retData.messageRetention !== 'forever') {
                        performRetentionCleanup(conversationId, retData.messageRetention);
                    }
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

    // Helper: fetch IDs of messages that have tags or triggers (must be protected from retention deletion)
    const getProtectedMessageIds = async (conversationId: string): Promise<Set<string>> => {
        const { data: taggedMsgs } = await supabase.from('MessageTag')
            .select('messageId, message!inner(conversationId)')
            .eq('message.conversationId', conversationId);
        const { data: triggeredMsgs } = await supabase.from('Trigger')
            .select('messageId, message!inner(conversationId)')
            .eq('message.conversationId', conversationId);
        const ids = new Set<string>();
        (taggedMsgs || []).forEach((t: any) => ids.add(t.messageId));
        (triggeredMsgs || []).forEach((t: any) => ids.add(t.messageId));
        return ids;
    };

    // Helper: delete media files from storage for given message URLs
    // Note: Migration to Cloudflare R2 means we no longer delete directly via Supabase SDK.
    // In the future, a backend worker should clean up R2 objects if needed.
    const deleteMediaFromStorage = async (mediaUrls: string[]) => {
        const validUrls = mediaUrls.filter(Boolean);
        if (validUrls.length === 0) return;
        
        console.log(`[Retention] Skipping storage deletion for ${validUrls.length} media items (handled by R2 lifecycle rules)`);
        // We no longer call supabase.storage.remove() here.
    };

    // Core retention cleanup: hard-deletes messages from DB + storage
    // For 'immediately': only deletes messages that both users have seen AND both have left the chat
    // For '1day': only deletes messages where readAt + 24h has passed (both must have seen)
    const performRetentionCleanup = async (conversationId: string, retention: string) => {
        if (retention === 'forever' || !retention) return;

        const protectedIds = await getProtectedMessageIds(conversationId);

        // Get both users' ConversationState to check exit times
        const { data: conv } = await supabase
            .from('Conversation')
            .select('participantA, participantB')
            .eq('id', conversationId)
            .single();
        if (!conv) return;

        const { data: states } = await supabase
            .from('ConversationState')
            .select('userId, lastExitedAt')
            .eq('conversationId', conversationId);

        const stateMap: Record<string, string | null> = {};
        (states || []).forEach((s: any) => {
            stateMap[s.userId] = s.lastExitedAt;
        });

        const userAExit = stateMap[conv.participantA] || null;
        const userBExit = stateMap[conv.participantB] || null;

        // Both users must have exited the chat at least once
        if (!userAExit || !userBExit) return;

        if (retention === 'immediately') {
            // Find all read, non-saved messages
            const { data: candidates } = await supabase.from('Message')
                .select('id, mediaUrl, senderId, readAt, createdAt')
                .eq('conversationId', conversationId)
                .eq('isSaved', false)
                .eq('isDeleted', false)
                .not('readAt', 'is', null);

            if (!candidates || candidates.length === 0) return;

            // Filter: the message must have been seen by BOTH users,
            // AND both users must have exited the chat AFTER seeing it.
            // readAt = when the receiver read it. Sender saw it when they sent it.
            // For sender: they exited after createdAt
            // For receiver: they exited after readAt
            const idsToDelete: string[] = [];
            const mediaToDelete: string[] = [];

            for (const msg of candidates) {
                if (protectedIds.has(msg.id)) continue;

                const isSenderA = msg.senderId === conv.participantA;
                const senderExit = isSenderA ? userAExit : userBExit;
                const receiverExit = isSenderA ? userBExit : userAExit;

                // Sender exits after they sent it (they saw it by sending)
                const senderSawAndLeft = new Date(senderExit).getTime() >= new Date(msg.createdAt).getTime();
                // Receiver exits after they read it
                const receiverSawAndLeft = msg.readAt && new Date(receiverExit).getTime() >= new Date(msg.readAt).getTime();

                if (senderSawAndLeft && receiverSawAndLeft) {
                    idsToDelete.push(msg.id);
                    if (msg.mediaUrl) mediaToDelete.push(msg.mediaUrl);
                }
            }

            if (idsToDelete.length === 0) return;

            // Delete media from storage first
            await deleteMediaFromStorage(mediaToDelete);

            // Hard delete from DB in batches of 50
            for (let i = 0; i < idsToDelete.length; i += 50) {
                const batch = idsToDelete.slice(i, i + 50);
                await supabase.from('Message').delete().in('id', batch);
            }

            // Remove from local state
            const deletedSet = new Set(idsToDelete);
            setMessages(prev => prev.filter(m => !deletedSet.has(m.id)));

            console.log(`[Retention] Immediately deleted ${idsToDelete.length} messages, ${mediaToDelete.length} media files`);

        } else if (retention === '1day') {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            // Find messages that have been read AND are non-saved
            const { data: candidates } = await supabase.from('Message')
                .select('id, mediaUrl, senderId, readAt, createdAt')
                .eq('conversationId', conversationId)
                .eq('isSaved', false)
                .eq('isDeleted', false)
                .not('readAt', 'is', null);

            if (!candidates || candidates.length === 0) return;

            const idsToDelete: string[] = [];
            const mediaToDelete: string[] = [];

            for (const msg of candidates) {
                if (protectedIds.has(msg.id)) continue;

                // readAt = when receiver read it. 24h must have passed since readAt.
                const readTime = new Date(msg.readAt).getTime();
                if (now - readTime < DAY_MS) continue; // Not yet 24h since read

                const isSenderA = msg.senderId === conv.participantA;
                const senderExit = isSenderA ? userAExit : userBExit;
                const receiverExit = isSenderA ? userBExit : userAExit;

                // Both must have exited after the message
                const senderSawAndLeft = new Date(senderExit).getTime() >= new Date(msg.createdAt).getTime();
                const receiverSawAndLeft = new Date(receiverExit).getTime() >= readTime;

                if (senderSawAndLeft && receiverSawAndLeft) {
                    idsToDelete.push(msg.id);
                    if (msg.mediaUrl) mediaToDelete.push(msg.mediaUrl);
                }
            }

            if (idsToDelete.length === 0) return;

            await deleteMediaFromStorage(mediaToDelete);

            for (let i = 0; i < idsToDelete.length; i += 50) {
                const batch = idsToDelete.slice(i, i + 50);
                await supabase.from('Message').delete().in('id', batch);
            }

            const deletedSet = new Set(idsToDelete);
            setMessages(prev => prev.filter(m => !deletedSet.has(m.id)));

            console.log(`[Retention] 1day deleted ${idsToDelete.length} messages, ${mediaToDelete.length} media files`);
        }
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

    const sendMessage = async (
        type: 'text' | 'image' | 'video' | 'audio' | 'post' | 'document' | 'location' | 'trigger' = 'text',
        content: string = inputText,
        mediaUrl: string | null = null,
        options: {
            mediaEncryptionKey?: string;
            viewOnce?: boolean;
            expiresAt?: string;
            thumbnailUrl?: string;
            fileName?: string;
            fileSize?: number;
            mimeType?: string;
            duration?: number;
            isPasswordProtected?: boolean;
            tempId?: string;
        } = {}
    ) => {
        console.log(`[ChatAction] sendMessage: type=${type}, hasMediaUrl=${!!mediaUrl}`);
        if (isSendingRef.current) return;
        if (!content.trim() && type === 'text' && !mediaUrl) return;

        isSendingRef.current = true;
        const currentText = content;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            Alert.alert("Error", "You must be logged in to send messages");
            isSendingRef.current = false;
            return;
        }

        const senderId = user.id;
        const messageId = `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 11)}`;
        const timestamp = Date.now();

        let messageType: any = type;

        // E2EE Encryption
        let messageContent = currentText;
        let sealedSenderData: string | null = null;
        if (privateKey && selectedUser?.publicKey && (type === 'text' || type === 'trigger')) {
            try {
                // MITM Key Verification Check
                const keyStatus = await verifyKey(selectedUser.id, selectedUser.publicKey);
                if (keyStatus === 'changed') {
                    Alert.alert("Security Warning", "The recipient's encryption key has changed. Interception warning. Verify safety number.", [{ text: 'Cancel', style: 'cancel' }]);
                    isSendingRef.current = false;
                    return;
                }

                // Ratchet Encryption
                const isInitiator = dbUserId! < selectedUser.id;
                const encrypted = await encryptMessage(currentText, privateKey, selectedUser.publicKey, activeConversationIdRef.current!, isInitiator);
                // Pack as JSON
                messageContent = JSON.stringify({ c: encrypted.ciphertext, n: encrypted.nonce, h: encrypted.header });

                // Sealed Sender Encryption
                const sealed = sealSender(senderId, selectedUser.publicKey);
                sealedSenderData = serializeSealedSender(sealed);
            } catch (e) {
                console.error("Encryption failed:", e);
                Alert.alert("Security Error", "Could not encrypt message.");
                isSendingRef.current = false;
                return;
            }
        }

        // Handle Reply
        if (replyTo && type === 'text') {
            messageType = 'reply';
            messageContent = JSON.stringify({
                text: currentText,
                replyTo: replyTo
            });
        }

        // Optimistic Update
        const optimisticMsg: Message = {
            id: messageId,
            role: 'user',
            content: currentText,
            type: messageType,
            mediaUrl: mediaUrl || undefined,
            timestamp: timestamp,
            createdAt: new Date(timestamp).toISOString(),
            senderId: senderId,
            readAt: null,
            isSaved: false,
            mediaType: options.mimeType ? (type as any) : undefined,
            viewOnce: options.viewOnce,
            isPasswordProtected: options.isPasswordProtected,
            fileName: options.fileName,
            fileSize: options.fileSize,
            mimeType: options.mimeType,
            duration: options.duration,
        };

        // Update UI INSTANTLY for zero perceived latency
        setMessages(prev => {
            if (options.tempId) {
                // Replace the 'Sending...' temp media message with the real one
                return prev.map(msg => msg.id === options.tempId ? optimisticMsg : msg);
            }
            return [...prev, optimisticMsg];
        });

        if (type === 'text') setInputText('');
        setReplyTo(null);

        // Check Trigger Warnings AFTER updating UI but BEFORE network payload
        // This keeps UI responsive but still blocks bad content
        if (type === 'text' && currentText) {
            const proceed = await checkTriggerWarnings(currentText);
            if (!proceed) {
                // Revert optimistic UI if warning rejected
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
                setInputText(currentText);
                isSendingRef.current = false;
                return;
            }
        }

        // FAST PATH: Broadcast
        if (chatChannelRef.current) {
            chatChannelRef.current.send({
                type: 'broadcast',
                event: 'new_message',
                payload: {
                    id: messageId,
                    content: messageContent,
                    senderId: senderId,
                    createdAt: new Date(timestamp).toISOString(),
                    type: messageType,
                    mediaUrl: mediaUrl,
                    readAt: null,
                    ...options
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
                    mediaUrl: mediaUrl,
                    createdAt: new Date(timestamp).toISOString(),
                    mediaType: type !== 'text' ? type : null, // Store specific media type
                    mediaEncryptionKey: options.mediaEncryptionKey,
                    viewOnce: options.viewOnce || false,
                    expiresAt: options.expiresAt,
                    thumbnailUrl: options.thumbnailUrl,
                    fileName: options.fileName,
                    fileSize: options.fileSize,
                    mimeType: options.mimeType,
                    duration: options.duration,
                    sealedSender: sealedSenderData, // Add sealed sender blob
                });

            if (error) {
                console.error("Supabase Message Insert Error:", JSON.stringify(error, null, 2));
                throw error;
            }

            // Update Conversation lastMessage
            await supabase
                .from('Conversation')
                .update({
                    lastMessage: type === 'text' ? 'Encrypted message' : (type === 'image' ? (options.viewOnce ? 'ðŸ“· View Once Photo' : 'ðŸ“· Photo') : (type === 'video' ? 'ðŸŽ¥ Video' : (type === 'document' ? `ðŸ“„ Document` : 'ðŸ“ Location'))),
                    lastMessageAt: new Date().toISOString()
                })
                .eq('id', activeConversationIdRef.current);

        } catch (err: any) {
            console.error('Error sending message:', err);
            Alert.alert("Delivery Failed", `Could not send message: ${err.message || 'Unknown error'}`);
            // Optionally revert message on failure
        } finally {
            isSendingRef.current = false;
        }
    };

    // --- Helpers ---
    const isUserOnline = (lastSeen?: string) => {
        if (!lastSeen) return false;
        const diff = Date.now() - new Date(lastSeen).getTime();
        return diff < 5 * 60 * 1000;
    };

    const handleBack = () => {
        // Capture conversation ID before clearing it
        const conversationId = activeConversationIdRef.current;

        // IMMEDIATELY clear messages and run slide animation for instant back navigation
        // This prevents the UI from blocking on network calls
        setMessages([]);

        // Remove active chat channel subscription immediately
        if (chatChannelRef.current) {
            supabase.removeChannel(chatChannelRef.current);
            chatChannelRef.current = null;
        }

        Animated.timing(slideAnim, {
            toValue: width,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setSelectedUser(null);
            activeConversationIdRef.current = null;
        });

        // Refresh conversation list
        fetchConversations();

        // Run cleanup in background (fire-and-forget, does not block UI)
        if (conversationId && dbUserId) {
            (async () => {
                try {
                    // Record exit time
                    await supabase.from('ConversationState').upsert({
                        conversationId,
                        userId: dbUserId,
                        lastExitedAt: new Date().toISOString()
                    }, { onConflict: 'conversationId,userId' });

                    // Mark all messages as read
                    await markAllAsRead(conversationId);

                    // Get retention setting and run cleanup
                    const { data: conv } = await supabase
                        .from('Conversation')
                        .select('messageRetention')
                        .eq('id', conversationId)
                        .single();

                    if (conv?.messageRetention && conv.messageRetention !== 'forever') {
                        await performRetentionCleanup(conversationId, conv.messageRetention);
                    }
                } catch (err) {
                    console.error('[Chat] Background cleanup failed:', err);
                }
            })();
        }
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
                    id: generateId(),
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

    // --- Trigger & Tag Functions ---
    const fetchTriggerCollections = async () => {
        if (!dbUserId || !activeConversationIdRef.current) return;

        // 1. Fetch proper Trigger Collections
        const { data: dbCollections } = await supabase
            .from('TriggerCollection')
            .select('id, name, keyword')
            .eq('userId', dbUserId)
            .eq('conversationId', activeConversationIdRef.current)
            .order('name');

        // 2. Fetch distinct custom Tags used in this conversation
        const { data: tagData, error: tagError } = await supabase
            .from('MessageTag')
            .select('tagType, Message!inner(conversationId)')
            .eq('userId', dbUserId)
            .eq('Message.conversationId', activeConversationIdRef.current);

        console.log(`[SlashMenu] Fetched tagData:`, tagData?.length, tagError);
        if (tagError) {
            Alert.alert("Tag Fetch Error (Cols)", tagError.message);
        }

        const finalCollections: any[] = dbCollections || [];

        if (tagData) {
            // Extract unique tags
            const uniqueTags = Array.from(new Set(tagData.map((t: any) => t.tagType)));
            uniqueTags.forEach(tag => {
                // Add virtual collection for each tag
                finalCollections.push({
                    id: `tag_${tag}`,
                    name: `Tagged: ${tag}`,
                    keyword: String(tag).toLowerCase(),
                    isTag: true
                });
            });
        }

        setTriggerCollections(finalCollections);
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
                if (!activeConversationIdRef.current) {
                    showToast('No active conversation', 'error');
                    return;
                }
                // Check if already exists in this conversation to avoid duplicate error
                const { data: existingColl } = await supabase
                    .from('TriggerCollection')
                    .select('id')
                    .eq('userId', dbUserId)
                    .eq('conversationId', activeConversationIdRef.current)
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
                            conversationId: activeConversationIdRef.current,
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
                    createdAt: now
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


    // Fetch all triggers and tagged messages for slash command
    const fetchAllTriggers = async () => {
        if (!dbUserId) return;

        // 1. Fetch standard triggers
        const { data: triggerData } = await supabase
            .from('Trigger')
            .select(`
                id, selectedText, conditionType, createdAt,
                collection:TriggerCollection(id, name, keyword),
                message:Message(id, senderId, createdAt)
            `)
            .eq('collection.userId', dbUserId)
            .eq('isActive', true);

        // 2. Fetch tagged messages for this chat
        const { data: tagData, error: tagError } = await supabase
            .from('MessageTag')
            .select(`
                id, tagType, createdAt,
                Message!inner(id, senderId, content, createdAt, conversationId)
            `)
            .eq('userId', dbUserId)
            .eq('Message.conversationId', activeConversationIdRef.current);

        console.log(`[SlashMenu] Fetched allTriggers tags:`, tagData?.length, tagError);
        if (tagError) {
            Alert.alert("Tag Fetch Error (Items)", tagError.message);
        }

        let combined: any[] = triggerData || [];

        if (tagData) {
            const formattedTags = tagData.map((t: any) => ({
                id: t.id,
                selectedText: t.Message?.content ? t.Message.content : 'Media/File',
                createdAt: t.createdAt,
                conditionType: 'tag',
                isTagTrigger: true,
                collection: {
                    id: `tag_${t.tagType}`,
                    name: `Tagged: ${t.tagType}`,
                    keyword: String(t.tagType).toLowerCase()
                },
                message: t.Message
            }));
            combined = [...combined, ...formattedTags];
        }

        setAllTriggers(combined);
    };



    // --- Message Edit & Delete Functions ---

    const confirmDelete = async (type: 'me' | 'everyone') => {
        if (!selectedMessageToDelete || !dbUserId) return;

        try {
            if (type === 'me') {
                // Insert into DeletedMessage table
                const { error } = await supabase.from('DeletedMessage').insert({
                    id: 'dm' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
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
        console.log(`[ChatAction] handleDeleteMessage: showing delete modal for msg=${message.id}`);
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
        console.log(`[ChatAction] handleStartEdit: initiated edit for msg=${message.id}`);
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
        console.log(`[ChatAction] saveEditedMessage: saving new content for msg=${editingMessageId}`);
        const previousContent = messages.find(m => m.id === editingMessageId)?.content;
        try {
            setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: inputText, isEdited: true } : m));
            const { error } = await supabase.from('Message').update({ content: inputText, isEdited: true }).eq('id', editingMessageId);
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
        if (!dbUserId || !selectedUser || selectedUser.id === 'dbot' || !activeConversationIdRef.current) return true;

        try {
            const { data: triggers } = await supabase
                .from('Trigger')
                .select(`
                    id, selectedText, conditionType, warningMessage, targetUser,
                    collection:TriggerCollection(id, userId, conversationId, name, muteWarnings)
                `)
                .eq('isActive', true);

            if (!triggers || triggers.length === 0) return true;

            // Filter triggers that belong to this user AND this conversation
            const myTriggers = triggers.filter((t: any) =>
                t.collection?.userId === dbUserId &&
                t.collection?.conversationId === activeConversationIdRef.current &&
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
        return true; // FactWarning table does not exist in schema
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
                .select('tagType, message!inner(content, conversationId)')
                .eq('userId', dbUserId)
                .eq('message.conversationId', activeConversationIdRef.current);

            const blacklistMatches: string[] = [];
            const happyMatches: string[] = [];

            // Check blacklist tags
            if (tags) {
                tags.forEach((tag: any) => {
                    const tagContent = (Array.isArray(tag.message) ? tag.message[0]?.content : tag.message?.content || '').toLowerCase();
                    if (tagContent && contentLower.includes(tagContent.substring(0, 10))) {
                        if (['BLACKLIST', 'ANGRY', 'SAD'].includes(tag.tagType)) {
                            blacklistMatches.push(tagContent);
                        } else if (['HAPPY', 'JOY', 'FUNNY'].includes(tag.tagType)) {
                            happyMatches.push(tagContent);
                        }
                    }
                });
            }

            const hasWarnings = blacklistMatches.length > 0;
            setBondingWarnings({
                blacklist: blacklistMatches,
                happy: happyMatches,
                facts: [],
            });
            setShowBondingWarning(hasWarnings);
        } catch (error) {
            console.error('Error checking bonding content:', error);
        }
    };

    // --- MENTION LOGIC ---
    const checkTaggingPermission = async (userId: string, taggingPrivacy?: string): Promise<boolean> => {
        try {
            if (!dbUserId) return true;
            // Check formatted blocked... (simplified for speed, relying on backend rls mostly but UI check good)
            const privacy = taggingPrivacy || 'followers';
            if (privacy === 'none') return false;
            if (privacy === 'everyone') return true;
            if (privacy === 'followers') return followingIds.includes(userId);
            return true;
        } catch { return false; }
    };

    const searchUsersForMention = async (query: string) => {
        try {
            const { data: users } = await supabase
                .from('User')
                .select('id, name, avatar, taggingPrivacy')
                .ilike('name', `%${query}%`)
                .neq('id', dbUserId || '')
                .limit(5);

            if (users) {
                const validUsers: ChatUser[] = [];
                for (const u of users) {
                    const allowed = await checkTaggingPermission(u.id, u.taggingPrivacy);
                    if (allowed) validUsers.push({
                        id: u.id,
                        name: u.name,
                        avatar: u.avatar,
                        status: 'online', // dummy
                        lastMessageAt: new Date().toISOString()
                    });
                }
                setMentionResults(validUsers);
            }
        } catch (err) {
            console.error('Mention search error', err);
        }
    };

    const handleMentionSelect = (user: ChatUser) => {
        const parts = inputText.split('@');
        parts.pop(); // remove query
        const newText = parts.join('@') + `@${user.name} `;
        setInputText(newText);
        setShowMentionList(false);
    };

    // Debounced input change handler
    const handleInputChange = (text: string) => {
        setInputText(text);

        // Detect Mention
        const lastAt = text.lastIndexOf('@');
        if (lastAt !== -1) {
            const query = text.slice(lastAt + 1);
            // Ensure no space in query (simple mention logic)
            if (!query.includes(' ')) {
                setMentionQuery(query);
                setShowMentionList(true);
                searchUsersForMention(query);
            } else {
                setShowMentionList(false);
            }
        } else {
            setShowMentionList(false);
        }

        // Broadcast Typing Event (Throttled)
        const now = Date.now();
        if (text.length > 0 && now - lastTypingSentRef.current > 2000) {
            lastTypingSentRef.current = now;
            if (chatChannelRef.current) {
                chatChannelRef.current.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { senderId: dbUserId }
                });
            }
        }

        // Detect "/" slash command
        if (text.startsWith('/')) {
            const query = text.slice(1).toLowerCase();
            setSlashSearchQuery(query);
            fetchTriggerCollections();
            fetchAllTriggers();
            setShowSlashMenu(true);
            if (text === '/') {
                setSelectedSlashCollectionId(null);
            }
        } else {
            setShowSlashMenu(false);
            setSelectedSlashCollectionId(null);
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
        const triggerPayload = {
            text: trigger.selectedText,
            senderId: trigger.message?.senderId || dbUserId,
            createdAt: trigger.message?.createdAt || trigger.createdAt
        };

        sendMessage('trigger', JSON.stringify(triggerPayload));
        setShowSlashMenu(false);
    };







    // --- Render Components ---

    const renderHeader = () => (
        <View className="px-6 pt-2 pb-2 flex-row justify-end items-center z-10">
            <TouchableOpacity
                className="shadow-lg"
                style={{ shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
            >
                {currentUserAvatar ? (
                    <Image
                        source={{ uri: currentUserAvatar }}
                        className="w-12 h-12 rounded-full border-2"
                        style={{ borderColor: colors.card }}
                    />
                ) : (
                    <View className="w-12 h-12 rounded-full border-2 items-center justify-center bg-zinc-800" style={{ borderColor: colors.card }}>
                        <UserIcon size={24} color={colors.text} />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderSearchBar = () => (
        <View className="px-6 py-1 mb-1">
            <BlurView
                intensity={20}
                tint={mode === 'light' ? 'light' : 'dark'}
                className="flex-row items-center px-4 py-2 rounded-full overflow-hidden border"
                style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }}
            >
                <Search color={colors.secondary} size={16} />
                <TextInput
                    placeholder="Search conversations..."
                    placeholderTextColor={colors.secondary}
                    value={searchQuery}
                    onChangeText={(t) => { setSearchQuery(t); searchUsers(t); }}
                    className="flex-1 ml-3 text-sm font-medium"
                    style={{ color: colors.text }}
                />
            </BlurView>
            <View className="flex-row justify-end mt-2 px-2">
                <TouchableOpacity
                    onPress={() => setSortMode(prev => prev === 'pinned' ? 'recent' : prev === 'recent' ? 'followers' : 'pinned')}
                    className="flex-row items-center gap-1.5 opacity-80"
                >
                    <Text className="text-xs font-semibold" style={{ color: colors.secondary }}>
                        Sort by {sortMode.charAt(0).toUpperCase() + sortMode.slice(1)}
                    </Text>
                    <ChevronDown size={12} color={colors.secondary} />
                </TouchableOpacity>
            </View>
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

    const renderActiveNow = () => {
        const activeUsers = conversations.filter(u => u.status === 'online');
        if (activeUsers.length === 0) return null;

        return (
            <View className="mb-6">
                <Text className="text-xs font-bold mb-3 px-6 tracking-widest text-zinc-500 uppercase">
                    Active Now
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
                    {activeUsers.map(user => (
                        <TouchableOpacity
                            key={user.id}
                            onPress={() => handleUserSelect(user)}
                            className="items-center mr-1"
                        >
                            <View className="relative mb-2">
                                <Image
                                    source={{ uri: user.avatar || '' }}
                                    className="w-14 h-14 rounded-full border-2"
                                    style={{ borderColor: colors.card }}
                                />
                                <View className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2" style={{ borderColor: colors.background }} />
                            </View>
                            <Text className="text-xs font-medium text-center" numberOfLines={1} style={{ color: colors.text, maxWidth: 60 }}>
                                {nicknames[user.id] || user.name.split(' ')[0]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderUserList = () => (
        <ScrollView className="flex-1 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Active Now Section */}
            {!searchQuery && renderActiveNow()}

            {/* Section Title */}
            <Text className="text-xs font-bold mb-3 px-6 tracking-widest text-zinc-500 uppercase">
                {searchQuery ? 'SEARCH RESULTS' : 'RECENT CHATS'}
            </Text>

            <View className="px-4">
                {getSortedConversations().map((user) => (
                    <View
                        key={user.id}
                        className="mb-3 relative"
                    >
                        {/* Main Card - Floating Glass Aesthetic */}
                        <BlurView
                            intensity={0} // Using simple transparency for performance, but styled like glass
                            className="rounded-[24px] overflow-hidden border"
                            style={{
                                borderColor: 'rgba(255,255,255,0.05)',
                                backgroundColor: mode === 'light' ? '#FFFFFF' : 'rgba(24, 24, 27, 0.6)'
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => handleUserSelect(user)}
                                className="flex-row items-center p-4"
                                activeOpacity={0.7}
                            >
                                {/* Drag Handle for Pinned Chats */}
                                {(user as any).isPinned && (
                                    <View className="flex-col items-center justify-center mr-3 -ml-1 opacity-50">
                                        <GripVertical size={14} color={colors.secondary} />
                                    </View>
                                )}

                                {/* Avatar Section */}
                                <View className="relative mr-4">
                                    {user.avatar ? (
                                        <Image
                                            source={{ uri: user.avatar }}
                                            className="w-14 h-14 rounded-full border"
                                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                                        />
                                    ) : (
                                        <View className="w-14 h-14 rounded-full border border-white/10 bg-zinc-800 items-center justify-center">
                                            <UserIcon size={24} color="#52525b" />
                                        </View>
                                    )}
                                    {/* Status Indicator overlapping avatar */}
                                    {user.status === 'online' && (
                                        <View className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2" style={{ borderColor: mode === 'dark' ? '#18181b' : '#fff' }} />
                                    )}
                                </View>

                                {/* Content Section */}
                                <View className="flex-1 justify-center space-y-1">
                                    {/* Top Row: Name & Time */}
                                    <View className="flex-row justify-between items-center">
                                        <View className="flex-row items-center gap-1.5 flex-1 mr-2 overflow-hidden">
                                            <Text className="text-base font-bold tracking-tight shrink" numberOfLines={1} style={{ color: colors.text }}>
                                                {nicknames[user.id] || user.name}
                                            </Text>
                                            {user.isPinned && <Anchor size={12} color={colors.primary} style={{ transform: [{ rotate: '45deg' }], flexShrink: 0 }} />}
                                            {/* Locked Icon */}
                                            {lockedConversationIds.has(user.conversationId || user.id) && (
                                                <Lock size={12} color={colors.secondary} style={{ flexShrink: 0 }} />
                                            )}
                                        </View>

                                        {user.lastMessageAt && (
                                            <Text className="text-[10px] font-medium opacity-60 mr-8" style={{ color: colors.secondary }}>
                                                {(() => {
                                                    const safeDate = user.lastMessageAt.endsWith('Z') ? user.lastMessageAt : `${user.lastMessageAt}Z`;
                                                    const msgTime = new Date(safeDate).getTime();
                                                    return msgTime > new Date().setHours(0, 0, 0, 0) ?
                                                        new Date(safeDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                                                        new Date(safeDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                })()}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Second Row: Last Message */}
                                    <View className="flex-row justify-between items-center">
                                        <Text
                                            numberOfLines={1}
                                            className={`text-sm flex-1 mr-4 ${user.unreadCount && user.unreadCount > 0 ? 'font-bold' : 'font-normal opacity-70'}`}
                                            style={{ color: user.unreadCount && user.unreadCount > 0 ? colors.text : colors.secondary }}
                                        >
                                            {hiddenConversationIds.has(user.conversationId || user.id) ?
                                                <Text className="italic">Hidden conversation</Text> :
                                                (user.lastMessage || 'Start a new conversation')
                                            }
                                        </Text>

                                        {/* Unread Badge */}
                                        {user.unreadCount && user.unreadCount > 0 ? (
                                            <View className="min-w-[20px] h-5 px-1.5 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                                                <Text className="text-[10px] font-bold text-black">
                                                    {user.unreadCount > 99 ? '99+' : user.unreadCount}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </BlurView>

                        {/* 3-Dots Menu - Vertical Icon - OUTSIDE the touch area for clearer separation */}
                        <TouchableOpacity
                            onPress={() => handleShowOptions(user)}
                            className="absolute right-2 top-2 p-2 z-10 opacity-0 bg-transparent h-full w-10"
                        // Keeping it visually hidden but accessible via long press usually, 
                        // but here we have a dedicated button. 
                        // Let's make it an actual visible button in the corner if preferred, 
                        // OR relying on the swipe actions/long press.
                        // For this design, let's keep it subtle but visible.
                        >
                            {/* Hidden interaction layer if needed, but we'll use a visible button below */}
                        </TouchableOpacity>

                        {/* Actual Visible Menu Button overlaying the top right corner slightly */}
                        <TouchableOpacity
                            onPress={() => handleShowOptions(user)}
                            className="absolute top-4 right-4 p-1 rounded-full opacity-30"
                        >
                            <MoreVertical size={16} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

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
            <Animated.View style={{ transform: [{ translateX: slideAnim }], backgroundColor: '#000000', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
                <SafeAreaView className="flex-1">
                    {/* Header - OUTSIDE KeyboardAvoidingView to stay fixed */}
                    <BlurView intensity={80} tint={mode === 'light' ? 'light' : 'dark'} className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                        <View className="flex-row items-center flex-1">
                            <TouchableOpacity onPress={handleBack} className="mr-3 p-2 rounded-full">
                                <ChevronLeft color={colors.text} size={24} />
                            </TouchableOpacity>
                            {selectedUser.avatar ? (
                                <Image source={{ uri: selectedUser.avatar }} className="w-10 h-10 rounded-full bg-gray-200" />
                            ) : (
                                <View className="w-10 h-10 rounded-full items-center justify-center bg-zinc-800" style={{ borderColor: colors.card, borderWidth: 1 }}>
                                    <UserIcon size={20} color={colors.secondary} />
                                </View>
                            )}
                            <View className="ml-3 flex-1">
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-base font-bold" numberOfLines={1} style={{ color: colors.text }}>{selectedUser.name}</Text>
                                </View>
                                <Text className="text-xs" style={{ color: isPartnerTyping ? colors.primary : colors.secondary, fontWeight: isPartnerTyping ? 'bold' : 'normal' }}>
                                    {isPartnerTyping ? 'Typing...' : (isDbot ? 'AI Companion' : selectedUser.status)}
                                </Text>
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

                        </View>
                    </BlurView>

                    {/* Sticky Note (pinned below header) */}
                    <StickyNote
                        roomId={activeConversationIdRef.current || ''}
                        conversationId={activeConversationIdRef.current || ''}
                        myPrivateKey={privateKey}
                        theirPublicKey={selectedUser?.publicKey || null}
                    />

                    {/* Messages and Input - Inside KeyboardAvoidingView */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    >
                        <View style={{ flex: 1 }}>
                            {/* Messages */}
                            {isLoading ? (
                                <View className="flex-1 items-center justify-center">
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            ) : (
                                <ScrollView
                                    className="flex-1 px-4 py-6"
                                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
                                    keyboardShouldPersistTaps="handled"
                                    ref={scrollViewRef}
                                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                                >

                                    {/* MESSAGE REQUEST UI (Top of Chat) */}
                                    {isMessageRequest && (
                                        <View className="px-4 py-4 mb-4 rounded-2xl mx-2 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                            <Text className="font-bold text-base mb-1" style={{ color: colors.text }}>Message Request</Text>
                                            <Text className="text-sm mb-3 leading-5" style={{ color: colors.secondary }}>
                                                {selectedUser.name} wants to message you. You won't see their messages until you accept.
                                            </Text>
                                            <View className="flex-row gap-3">
                                                <TouchableOpacity
                                                    onPress={handleBlock}
                                                    className="flex-1 py-2.5 bg-red-500/10 rounded-xl items-center border border-red-500/20"
                                                >
                                                    <Text className="font-bold text-red-500 text-sm">Block</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleAcceptRequest}
                                                    className="flex-1 py-2.5 bg-white rounded-xl items-center"
                                                >
                                                    <Text className="font-bold text-black text-sm">Accept</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {/* Empty State / Start Conversation */}
                                    {messages.length === 0 && !isDbot && (
                                        <View className="flex-1 items-center justify-center py-20 opacity-50">
                                            <View className="w-20 h-20 rounded-full bg-zinc-800 border items-center justify-center mb-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                {selectedUser.avatar ? (
                                                    <Image source={{ uri: selectedUser.avatar }} className="w-full h-full rounded-full opacity-60" />
                                                ) : (
                                                    <UserIcon size={32} color={colors.secondary} />
                                                )}
                                            </View>
                                            <Text className="text-lg font-bold text-zinc-400">Start a conversation</Text>
                                            <Text className="text-sm text-zinc-600 text-center mt-2 px-10">
                                                Say hello to {selectedUser.name}!
                                            </Text>
                                        </View>
                                    )}

                                    {messages.map((msg, index) => {
                                        const msgDate = new Date(msg.createdAt || msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                                        const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt || messages[index - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                                        const showDateSeparator = msgDate !== prevMsgDate;

                                        // Check if this is the last message sent by ME
                                        const isMe = msg.role === 'user';

                                        // Parse reply content if type is reply, or decrypt if encrypted
                                        let displayContent = msg.content;
                                        let replyContext = null;

                                        // First, check if the message is still encrypted (looks like {"c":"...","n":"..."})
                                        // This can happen for messages from other sources that weren't decrypted
                                        if (displayContent && displayContent.startsWith('{') && displayContent.includes('"c":')) {
                                            displayContent = "Encrypted message";
                                        }

                                        if (msg.type === 'reply') {
                                            try {
                                                const parsed = JSON.parse(displayContent);
                                                if (parsed.text) {
                                                    displayContent = parsed.text;
                                                    replyContext = parsed.replyTo;
                                                }
                                            } catch (e) {
                                                // Fallback - content is not JSON, use as is
                                            }
                                        }

                                        let triggerContext: any = null;
                                        if (msg.type === 'trigger') {
                                            try {
                                                triggerContext = JSON.parse(displayContent);
                                            } catch (e) {
                                                triggerContext = { text: displayContent };
                                            }
                                        }

                                        const getTagColor = (tag: string) => {
                                            // Custom tags are white (on bubble)
                                            // User said "white with black text" for the CHIP. "same white ot should xome on the message bubble".
                                            // White dot on bubble.
                                            return 'bg-white';
                                        };

                                        // Deduplicate tags for the menu
                                        const uniqueTags = Array.from(new Set(messages.flatMap(m => m.tags || [])))
                                            .filter(t => t && t !== 'RED' && t !== 'GREEN');

                                        return (
                                            <View
                                                key={msg.id}
                                                style={{ marginBottom: 10 }}
                                                onLayout={(e) => {
                                                    messageLayouts.current[msg.id] = e.nativeEvent.layout.y;
                                                }}
                                            >
                                                {showDateSeparator && (
                                                    <View className="items-center my-4">
                                                        <View className="px-3 py-1 bg-zinc-800/80 rounded-full border border-zinc-700/50">
                                                            <Text className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{msgDate}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                <SwipeableMessage
                                                    isMe={isMe}
                                                    onReply={() => setReplyTo({ id: msg.id, content: displayContent, sender: isMe ? 'You' : (nicknames[selectedUser.id] || selectedUser.name) })}
                                                    onSnooze={!isMe ? () => initiateSnooze(
                                                        msg.id,
                                                        displayContent,
                                                        nicknames[selectedUser.id] || selectedUser.name,
                                                        activeConversationIdRef.current || ''
                                                    ) : undefined}
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
                                                                    <TouchableOpacity
                                                                        onPress={() => scrollToMessage(replyContext.id)}
                                                                        activeOpacity={0.7}
                                                                        className="mb-1 px-3 py-2 rounded-xl bg-zinc-800/80 border-l-4 border-blue-500 shadow-sm"
                                                                        style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
                                                                    >
                                                                        <Text className="text-[10px] text-blue-400 font-bold mb-0.5" style={{ color: mode === 'light' ? '#3B82F6' : '#60A5FA' }}>Replying to {replyContext.sender}</Text>
                                                                        <Text className="text-xs text-zinc-300" style={{ color: mode === 'light' ? '#4B5563' : '#D1D5DB' }} numberOfLines={1}>{replyContext.content}</Text>
                                                                    </TouchableOpacity>
                                                                )}

                                                                <View
                                                                    className={`${(msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'location') ? '' : 'px-4 py-3'} rounded-2xl relative`}
                                                                    style={{
                                                                        backgroundColor: (msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'location') ? 'transparent' : (isMe ? (mode === 'light' ? '#000000' : '#FFFFFF') : (mode === 'light' ? '#E5E5EA' : '#262626')),
                                                                        borderWidth: highlightedMsgId === msg.id ? 2 : 0,
                                                                        borderColor: highlightedMsgId === msg.id ? '#3B82F6' : 'transparent',
                                                                    }}
                                                                >
                                                                    {msg.type === 'image' || msg.type === 'video' ? (
                                                                        <View className="relative">
                                                                            <EncryptedMedia
                                                                                type={msg.type as 'image' | 'video'}
                                                                                uri={msg.mediaUrl || ''}
                                                                                encryptionKey={msg.mediaEncryptionKey}
                                                                                viewOnce={msg.viewOnce}
                                                                                isMe={isMe}
                                                                                style={{ width: 200, height: 260, borderRadius: 8, opacity: msg.isSending ? 0.5 : 1 }}
                                                                                onPress={() => {
                                                                                    if (!msg.isSending && !msg.viewOnce && !msg.mediaEncryptionKey?.includes('pw:')) {
                                                                                        setViewingMediaMsg(msg);
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {msg.isSending && (
                                                                                <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-lg">
                                                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                                                </View>
                                                                            )}
                                                                        </View>
                                                                    ) : msg.type === 'document' ? (
                                                                        <DocumentBubble
                                                                            filename={msg.fileName || 'Document'}
                                                                            fileSize={msg.fileSize}
                                                                            uri={msg.mediaUrl || ''}
                                                                            encryptionKey={msg.mediaEncryptionKey}
                                                                            isMe={isMe}
                                                                            mimeType={msg.mimeType}
                                                                        />
                                                                    ) : msg.type === 'location' ? (
                                                                        <LocationBubble
                                                                            locationUrl={msg.mediaUrl || '0,0'}
                                                                            address={msg.content}
                                                                            isMe={isMe}
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
                                                                    ) : msg.type === 'trigger' && triggerContext ? (
                                                                        <View className="flex-col">
                                                                            {/* Custom Target User Header */}
                                                                            <View className="flex-row items-center mb-1 pb-1 border-b border-white/10">
                                                                                <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                                                                    Saved Message
                                                                                </Text>
                                                                            </View>
                                                                            {/* Body */}
                                                                            <Text className="text-sm italic font-medium mt-1 mb-2" style={{ color: isMe ? (mode === 'light' ? '#FFFFFF' : '#000000') : (mode === 'light' ? '#000000' : '#FFFFFF') }}>
                                                                                "{triggerContext.text}"
                                                                            </Text>
                                                                            {/* Footer Metadata */}
                                                                            <View className="flex-row justify-between items-center opacity-70">
                                                                                <Text className="text-[9px]" style={{ color: isMe ? (mode === 'light' ? '#FFFFFF' : '#000000') : (mode === 'light' ? '#000000' : '#FFFFFF') }}>
                                                                                    Sent by {triggerContext.senderId === dbUserId ? 'You' : (nicknames[triggerContext.senderId] || selectedUser?.name || 'Partner')}
                                                                                </Text>
                                                                                {triggerContext.createdAt && (
                                                                                    <Text className="text-[9px]" style={{ color: isMe ? (mode === 'light' ? '#FFFFFF' : '#000000') : (mode === 'light' ? '#000000' : '#FFFFFF') }}>
                                                                                        {new Date(triggerContext.createdAt).toLocaleDateString()}
                                                                                    </Text>
                                                                                )}
                                                                            </View>
                                                                        </View>
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

                                                                    {/* Time and Status Footer (Metadata) */}
                                                                    <View className="flex-row items-center justify-end mt-[6px] gap-1">
                                                                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                                                                            {msg.createdAt
                                                                                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                                                                                : new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                                                                            }
                                                                        </Text>
                                                                        {isMe && (
                                                                            <MessageStatusIndicator
                                                                                messageId={msg.id}
                                                                                initialStatus={msg.isSending ? 'sending' : msg.readAt ? 'confirmed' : 'sent'}
                                                                                isMe={isMe}
                                                                                readAt={msg.readAt}
                                                                            />
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

                                                {/* INLINE MENU */}
                                                {taggingMessageId === msg.id && (
                                                    <View className="mt-2 self-center w-full items-center">
                                                        {!isAddingTag ? (
                                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, alignItems: 'center' }}>

                                                                {['image', 'video', 'document'].includes(msg.type || '') ? (
                                                                    <>
                                                                        <TouchableOpacity onPress={() => { setReplyTo({ id: msg.id, content: msg.type || '', sender: msg.senderId === dbUserId ? 'You' : (selectedUser?.name || 'User') }); setTaggingMessageId(null); }} className="px-3 py-1.5 bg-blue-500 rounded-full flex-row items-center gap-1">
                                                                            <Reply size={12} color="#FFFFFF" />
                                                                            <Text className="text-xs font-bold text-white">Reply</Text>
                                                                        </TouchableOpacity>
                                                                        <TouchableOpacity onPress={() => { handleSaveMessage(msg.id, msg.isSaved || false); setTaggingMessageId(null); }} className="px-3 py-1.5 bg-zinc-700 rounded-full flex-row items-center gap-1 border border-zinc-600">
                                                                            <Bookmark fill={msg.isSaved ? "#fff" : "transparent"} size={12} color="#FFFFFF" />
                                                                            <Text className="text-xs font-bold text-white">{msg.isSaved ? 'Unsave' : 'Save'}</Text>
                                                                        </TouchableOpacity>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <TouchableOpacity onPress={() => { setReplyTo({ id: msg.id, content: displayContent, sender: msg.senderId === dbUserId ? 'You' : (selectedUser?.name || 'User') }); setTaggingMessageId(null); }} className="px-3 py-1.5 bg-blue-500 rounded-full flex-row items-center gap-1">
                                                                            <Reply size={12} color="#FFFFFF" />
                                                                            <Text className="text-xs font-bold text-white">Reply</Text>
                                                                        </TouchableOpacity>

                                                                        {/* YELLOW + (Add) - Keep as Custom Tagging entry point */}
                                                                        <TouchableOpacity onPress={() => { setIsAddingTag(true); setNewTagText(''); }} className="w-8 h-8 rounded-full bg-yellow-500/30 border-2 border-yellow-500 items-center justify-center">
                                                                            <Plus size={16} color="#FFFFFF" />
                                                                        </TouchableOpacity>

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

                                                        {/* Pin to Bonding */}
                                                        <TouchableOpacity
                                                            onPress={async () => {
                                                                const preview = displayContent.slice(0, 80);
                                                                try {
                                                                    await BondingService.addBondMoment(
                                                                        activeConversationIdRef.current || "",
                                                                        msg.id,
                                                                        preview,
                                                                        null,
                                                                    );
                                                                    setTaggingMessageId(null);
                                                                    showToast("Message pinned to bonding page", "success");
                                                                } catch (e) {
                                                                    console.error("[PinToBonding] error:", e);
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-zinc-700 rounded-full flex-row items-center gap-1 border border-zinc-600"
                                                        >
                                                            <Anchor size={12} color="#FFFFFF" />
                                                            <Text className="text-xs font-bold text-white">Pin</Text>
                                                        </TouchableOpacity>

                                                                        {/* Edit Button */}
                                                                        <TouchableOpacity
                                                                            onPress={() => handleStartEdit(msg)}
                                                                            className="px-2 py-1 bg-white rounded-full flex-row items-center gap-1 border border-zinc-800"
                                                                        >
                                                                            <Text className="text-[10px] font-bold text-black" style={{ color: '#000' }}>Edit</Text>
                                                                        </TouchableOpacity>
                                                                    </>
                                                                )}

                                                                {/* Delete Button (Available for all message types if isMe, but we'll show it generally just for consistency since original allowed it) */}
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
                                                âš ï¸ Blacklisted content detected
                                            </Text>
                                        </View>
                                    )}
                                    {bondingWarnings.facts.length > 0 && (
                                        <View className="flex-row items-center gap-2">
                                            <AlertTriangle size={14} color="#f59e0b" />
                                            <Text className="text-xs text-amber-600 flex-1">
                                                ðŸ’¡ {bondingWarnings.facts.map(f => `"${f.keyword}": ${f.warningText}`).join(', ')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
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

                            {/* Input or Blocked */}
                            {blockedIds.has(selectedUser.id) ? (
                                <View className="px-4 py-6 border-t items-center justify-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    <Text style={{ color: colors.secondary, fontWeight: '600' }}>You cannot message this user.</Text>
                                </View>
                            ) : isMessageRequest ? (
                                /* Hide Input when it is a request */
                                <View className="px-4 py-4 border-t items-center justify-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    <Text style={{ color: colors.secondary, fontStyle: 'italic' }}>Accept the request to reply.</Text>
                                </View>
                            ) : (
                                <>
                                <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="px-4 py-3 border-t" style={{ borderColor: colors.border }}>
                                    {/* MENTION SUGGESTIONS */}
                                    {showMentionList && mentionResults.length > 0 && (
                                        <View className="mb-3 p-3 rounded-xl absolute bottom-full left-4 right-4 z-50 shadow-lg"
                                            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxHeight: 200 }}>
                                            <Text className="text-xs font-bold mb-2 opacity-50" style={{ color: colors.text }}>MENTIONS</Text>
                                            <ScrollView keyboardShouldPersistTaps="handled">
                                                {mentionResults.map(u => (
                                                    <TouchableOpacity key={u.id} onPress={() => handleMentionSelect(u)} className="flex-row items-center py-2 border-b border-gray-100/10">
                                                        <Image source={{ uri: u.avatar }} className="w-8 h-8 rounded-full mr-2" />
                                                        <Text style={{ color: colors.text, fontWeight: '600' }}>{u.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {/* Slash Command Menu */}
                                    {showSlashMenu && (
                                        <View className="mb-3 p-3 rounded-xl absolute bottom-full left-4 right-4 z-50 shadow-lg" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxHeight: 350 }}>
                                            <View className="flex-row items-center justify-between mb-3 border-b pb-2" style={{ borderColor: colors.border }}>
                                                {selectedSlashCollectionId ? (
                                                    <View className="flex-row items-center gap-2">
                                                        <TouchableOpacity onPress={() => setSelectedSlashCollectionId(null)}>
                                                            <Text style={{ color: colors.primary, fontSize: 14 }}>â† Back</Text>
                                                        </TouchableOpacity>
                                                        <Text className="font-bold text-sm" style={{ color: colors.text }}>
                                                            {triggerCollections.find(c => c.id === selectedSlashCollectionId)?.name}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text className="font-bold text-sm" style={{ color: colors.text }}>Trigger Collections</Text>
                                                )}
                                                <TouchableOpacity onPress={() => { setShowSlashMenu(false); setSelectedSlashCollectionId(null); }}>
                                                    <X size={18} color={colors.secondary} />
                                                </TouchableOpacity>
                                            </View>

                                            <ScrollView>
                                                {!selectedSlashCollectionId ? (
                                                    // STEP 1: SHOW COLLECTIONS
                                                    <>
                                                        {triggerCollections.filter(c =>
                                                            !slashSearchQuery || c.name.toLowerCase().includes(slashSearchQuery) || c.keyword?.toLowerCase().includes(slashSearchQuery)
                                                        ).map(c => {
                                                            const count = allTriggers.filter((t: any) => t.collection?.id === c.id).length;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={c.id}
                                                                    className="py-3 items-center flex-row justify-between border-b"
                                                                    style={{ borderColor: colors.border }}
                                                                    onPress={() => setSelectedSlashCollectionId(c.id)}
                                                                >
                                                                    <View>
                                                                        <Text className="font-bold text-[15px] mb-1" style={{ color: colors.text }}>/{c.keyword || c.name.toLowerCase()}</Text>
                                                                        <Text className="text-xs" style={{ color: colors.secondary }}>{c.name}</Text>
                                                                    </View>
                                                                    <View className="bg-zinc-800/50 px-2 py-1 rounded-md">
                                                                        <Text className="text-xs font-bold" style={{ color: colors.text }}>{count} items</Text>
                                                                    </View>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                        {triggerCollections.length === 0 && (
                                                            <Text className="py-6 text-center text-sm" style={{ color: colors.secondary }}>
                                                                No trigger collections yet. Create one by tapping the 3 dots on a message.
                                                            </Text>
                                                        )}
                                                    </>
                                                ) : (
                                                    // STEP 2: SHOW TRIGGERS IN SELECTED COLLECTION
                                                    <>
                                                        {allTriggers.filter((t: any) => t.collection?.id === selectedSlashCollectionId).length > 0 ? (
                                                            allTriggers.filter((t: any) => t.collection?.id === selectedSlashCollectionId)
                                                                .filter((t: any) => !slashSearchQuery || t.selectedText.toLowerCase().includes(slashSearchQuery))
                                                                .map((trigger: any) => (
                                                                    <TouchableOpacity
                                                                        key={trigger.id}
                                                                        className="py-3 border-b"
                                                                        style={{ borderColor: colors.border }}
                                                                        onPress={() => handleSlashSelect(trigger)}
                                                                    >
                                                                        <Text className="text-sm font-medium mb-1" style={{ color: colors.text }} numberOfLines={4}>
                                                                            "{trigger.selectedText}"
                                                                        </Text>
                                                                        <Text className="text-[10px]" style={{ color: colors.secondary }}>
                                                                            {trigger.message ? (
                                                                                `${new Date(trigger.message.createdAt).toLocaleDateString()} at ${new Date(trigger.message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} â€¢ by ${trigger.message.senderId === dbUserId ? 'You' : (nicknames[trigger.message.senderId] || selectedUser?.name || 'Partner')}`
                                                                            ) : (
                                                                                `Saved on ${new Date(trigger.createdAt).toLocaleDateString()}`
                                                                            )}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                ))) : (
                                                            <Text className="py-6 text-center text-sm" style={{ color: colors.secondary }}>
                                                                No saved messages in this collection.
                                                            </Text>
                                                        )}
                                                    </>
                                                )}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {/* Slash Commands Panel */}
                                    <SlashCommandsPanel
                                        inputText={inputText}
                                        onSelectCommand={(cmd) => {
                                            setInputText('');
                                            // Handle each command
                                            if (cmd.id === 'loc') {
                                                (async () => {
                                                    try {
                                                        const Location = require('expo-location');
                                                        const { status } = await Location.requestForegroundPermissionsAsync();
                                                        if (status !== 'granted') {
                                                            Alert.alert('Permission Denied', 'Location access is needed for /loc');
                                                            return;
                                                        }
                                                        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                                        const [geo] = await Location.reverseGeocodeAsync({
                                                            latitude: loc.coords.latitude,
                                                            longitude: loc.coords.longitude,
                                                        });
                                                        const address = geo ? `${geo.street || ''} ${geo.city || ''} ${geo.region || ''}`.trim() : 'Current Location';
                                                        const locationPayload = JSON.stringify({
                                                            type: 'location',
                                                            latitude: loc.coords.latitude,
                                                            longitude: loc.coords.longitude,
                                                            address,
                                                        });
                                                        setInputText(locationPayload);
                                                    } catch (e) {
                                                        Alert.alert('Error', 'Could not get your location.');
                                                    }
                                                })();
                                            } else if (cmd.id === 'poll') {
                                                Alert.alert('Poll', 'Enter your poll question in the text box');
                                                setInputText('/poll ');
                                            } else if (cmd.id === 'spin') {
                                                Alert.alert('Spin', 'Enter options separated by commas');
                                                setInputText('/spin ');
                                            } else if (cmd.id === 'sticky') {
                                                setInputText('');
                                                // StickyNote has its own create modal
                                            } else if (cmd.id === 'eta') {
                                                (async () => {
                                                    try {
                                                        const Location = require('expo-location');
                                                        const { status } = await Location.requestForegroundPermissionsAsync();
                                                        if (status !== 'granted') {
                                                            Alert.alert('Permission Denied', 'Location access is needed for /eta');
                                                            return;
                                                        }
                                                        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                                        const [geo] = await Location.reverseGeocodeAsync({
                                                            latitude: loc.coords.latitude,
                                                            longitude: loc.coords.longitude,
                                                        });
                                                        const address = geo ? `${geo.city || geo.region || 'here'}` : 'here';
                                                        const etaText = `I am currently near ${address}. Sharing my ETA soon.`;
                                                        setInputText(etaText);
                                                    } catch (e) {
                                                        Alert.alert('Error', 'Could not get your location for ETA.');
                                                    }
                                                })();
                                            }
                                        }}
                                        colors={colors}
                                    />
                                    <View className="flex-row items-center gap-2">
                                        <ChatStack
                                            onSendBatch={(texts) => {
                                                // Send each message in the batch
                                                texts.forEach((text, i) => {
                                                    setTimeout(() => {
                                                        setInputText(text);
                                                        // Trigger send
                                                        sendMessage();
                                                    }, i * 100);
                                                });
                                            }}
                                            colors={colors}
                                            mode={(mode as 'light' | 'dark')}
                                        />
                                        <TouchableOpacity className="p-2" onPress={() => setShowAttachmentMenu(true)}>
                                            <Paperclip size={22} color={colors.secondary} />
                                        </TouchableOpacity>

                                        {/* Emoji/Sticker button removed for V2 */}

                                        <TextInput
                                            placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                                            placeholderTextColor="rgba(255,255,255,0.45)"
                                            value={inputText}
                                            onChangeText={handleInputChange}
                                            className="flex-1 px-5"
                                            style={{
                                                height: 52,
                                                borderRadius: 26,
                                                backgroundColor: '#111111',
                                                borderWidth: 1,
                                                borderColor: 'rgba(255,255,255,0.08)',
                                                color: '#FFFFFF',
                                                fontSize: 14
                                            }}
                                            onSubmitEditing={() => editingMessageId ? saveEditedMessage() : sendMessage()}
                                            returnKeyType="send"
                                        />
                                        <SendButtonMenu
                                            onSend={(sendMode, sendTone) => {
                                                sendMessage();
                                            }}
                                            isEditing={!!editingMessageId}
                                            onEditSave={saveEditedMessage}
                                            roomId={activeConversationIdRef.current || ''}
                                        />

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

                                {/* Live Canvas Preview (between messages and input) */}
                                <LiveCanvas
                                    roomId={activeConversationIdRef.current || ''}
                                    enabled={liveCanvasEnabled}
                                    myPrivateKey={privateKey}
                                    theirPublicKey={selectedUser?.publicKey || null}
                                    onTextReceived={setLiveCanvasPartnerText}
                                    onTogglePartner={() => undefined}
                                />
                                </>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Animated.View >
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
                setIsUploading(true);

                try {
                    // Upload to cloud storage for persistence across app restarts
                    const uploadResult = await MediaUploadService.uploadMedia(
                        asset.uri, 'IMAGE', undefined, false
                    );
                    const permanentUrl = uploadResult.url;

                    // Store the permanent URL locally and in DB
                    if (activeConversationIdRef.current) {
                        const wallpaperKey = `wallpaper_${activeConversationIdRef.current}`;
                        await AsyncStorage.setItem(wallpaperKey, permanentUrl);

                        // Also save to DB for sync across devices
                        supabase
                            .from('Conversation')
                            .update({ wallpaperUrl: permanentUrl })
                            .eq('id', activeConversationIdRef.current);
                    }

                    setChatBackground(permanentUrl);
                    showToast('Wallpaper updated', 'success');
                } catch (uploadErr) {
                    console.error('Failed to upload wallpaper:', uploadErr);
                    showError('Failed to upload wallpaper. Please try again.');
                } finally {
                    setIsUploading(false);
                }
            }
        } catch (err) {
            console.error('Image picker error:', err);
            showError('Failed to select image. Please try again.');
        }
    };

    const handleRemoveBackground = async () => {
        setChatBackground(null);
        if (activeConversationIdRef.current) {
            // Clean up AsyncStorage cached wallpaper
            const wallpaperKey = `wallpaper_${activeConversationIdRef.current}`;
            await AsyncStorage.removeItem(wallpaperKey);
            // Remove from DB
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

            // Trigger retention cleanup with new setting
            if (messageRetention !== 'forever') {
                await performRetentionCleanup(conversationId, messageRetention);
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
                {renderSearchBar()}
                {/* Profile Pic Header Removed for V2 */}
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
                                                const convId = optionsUser.conversationId || optionsUser.id;
                                                setChatToDelete(convId);
                                                setShowOptionsModal(false);
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

                {/* Delete Chat Confirmation Modal */}
                <Modal visible={!!chatToDelete} transparent animationType="fade">
                    <View className="flex-1 justify-center items-center bg-black/60 px-6">
                        <BlurView intensity={80} tint={mode === 'light' ? 'light' : 'dark'} className="w-full max-w-sm rounded-[28px] overflow-hidden border border-white/10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                            <View className="p-6 items-center">
                                <View className="w-14 h-14 rounded-full bg-red-500/10 items-center justify-center mb-5 border border-red-500/20">
                                    <Trash2 size={28} color="#ef4444" />
                                </View>
                                <Text className="text-xl font-bold mb-2 text-center" style={{ color: colors.text }}>Delete Chat?</Text>
                                <Text className="text-sm text-center mb-6 leading-5" style={{ color: colors.secondary }}>
                                    Are you sure you want to delete this chat? This will hide it from your chat list forever.
                                </Text>
                                <View className="flex-row gap-3 w-full">
                                    <TouchableOpacity
                                        onPress={() => setChatToDelete(null)}
                                        className="flex-1 py-3.5 rounded-2xl border border-white/10 items-center justify-center bg-white/5"
                                    >
                                        <Text className="font-semibold text-base" style={{ color: colors.text }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (chatToDelete) handleDeleteChat(chatToDelete);
                                            setChatToDelete(null);
                                        }}
                                        className="flex-1 py-3.5 rounded-2xl items-center justify-center bg-red-600 shadow-sm"
                                    >
                                        <Text className="font-bold text-white text-base">Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BlurView>
                    </View>
                </Modal>


                {/* Toast Notification */}
                {toastMessage && (
                    <CustomToast
                        visible={true}
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
                                    <Text key={i} className="text-white font-medium mb-1">â€¢ {w}</Text>
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

                {/* Attachment Menu Modal */}
                <Modal
                    visible={showAttachmentMenu}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAttachmentMenu(false)}
                >
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                        activeOpacity={1}
                        onPress={() => setShowAttachmentMenu(false)}
                    >
                        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                            <Text style={{ color: colors.secondary, marginBottom: 15, textAlign: 'center', fontWeight: 'bold' }}>Share Content</Text>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 20 }}>
                                <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => handlePickMedia('camera')}>
                                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                                        <ImageIcon size={24} color="#fff" />
                                    </View>
                                    <Text style={{ color: colors.text }}>Camera</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => handlePickMedia('library')}>
                                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                                        <ImageIcon size={24} color="#fff" />
                                    </View>
                                    <Text style={{ color: colors.text }}>Library</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={{ alignItems: 'center' }} onPress={handlePickDocument}>
                                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                                        <Book size={24} color="#fff" />
                                    </View>
                                    <Text style={{ color: colors.text }}>Document</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => setShowAttachmentMenu(false)}
                                style={{ marginTop: 20, padding: 15, alignItems: 'center', borderTopWidth: 1, borderColor: colors.border }}
                            >
                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Media Preview Modal */}
                {previewMedia.length > 0 && (
                    <MediaPreview
                        items={previewMedia as any}
                        onSend={handleSendMedia}
                        onClose={() => setPreviewMedia([])}
                    />
                )}


                {/* Media Viewer Modal (Full Screen) */}
                <Modal visible={!!viewingMediaMsg} transparent animationType="fade" onRequestClose={() => setViewingMediaMsg(null)}>
                    <View style={{ flex: 1, backgroundColor: '#000' }}>
                        {/* Header Actions */}
                        <View style={{
                            position: 'absolute', top: 50, left: 0, right: 0, zIndex: 50,
                            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10,
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }}>
                            <TouchableOpacity onPress={() => setViewingMediaMsg(null)} style={{ padding: 8 }}>
                                <X color="#fff" size={28} />
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', gap: 20 }}>
                                <TouchableOpacity onPress={() => {
                                    if (viewingMediaMsg) {
                                        setReplyTo({
                                            id: viewingMediaMsg.id,
                                            content: viewingMediaMsg.type === 'video' ? 'Video' : 'Photo',
                                            sender: viewingMediaMsg.senderId === dbUserId ? 'You' : (selectedUser?.name || 'User')
                                        });
                                    }
                                    setViewingMediaMsg(null);
                                }}>
                                    <Reply color="#fff" size={24} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    if (viewingMediaMsg) handleSaveMessage(viewingMediaMsg.id, viewingMediaMsg.isSaved || false);
                                }}>
                                    <Bookmark color="#fff" fill={viewingMediaMsg?.isSaved ? "#fff" : "transparent"} size={24} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    if (viewingMediaMsg) handleDownloadMediaToDevice(viewingMediaMsg);
                                }}>
                                    <Download color="#fff" size={24} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Display Content */}
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            {viewingMediaMsg && (
                                <EncryptedMedia
                                    type={viewingMediaMsg.type as 'image' | 'video'}
                                    uri={viewingMediaMsg.mediaUrl || ''}
                                    encryptionKey={viewingMediaMsg.mediaEncryptionKey}
                                    isMe={true} // bypass restrictions in full screen preview
                                    style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height - 150 }}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Snooze Picker Modal */}
                <SnoozePickerModal
                    visible={showSnoozePicker}
                    onClose={closeSnoozePicker}
                    onSelect={handleSnoozeSelect}
                    colors={colors}
                />

            </SafeAreaView>
        </View >
    );
};

// Snooze Picker Modal rendered at root level for proper z-index
// Note: The useSnooze hook is in the component above; the modal is rendered here.





