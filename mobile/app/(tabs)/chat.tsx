import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, Modal, Animated, Dimensions, FlatList } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Send, Search, Settings, MoreVertical, Phone, Video, Image as ImageIcon, Smile, X, ChevronLeft, Sparkles, User, Heart, Zap, Moon, Sun } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Pusher from 'pusher-js/react-native';

import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const getApiUrl = () => {
    return process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';
};

const API_URL = getApiUrl();

type PersonaType = 'friend' | 'therapist' | 'coach' | 'mystic';
type ThemeMode = 'light' | 'dark' | 'cosmic';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    senderId?: string;
    readAt?: string;
}

interface User {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    lastSeen?: string;
}

export default function ChatScreen() {
    const [activeTheme, setActiveTheme] = useState<ThemeMode>('cosmic');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [conversations, setConversations] = useState<User[]>([]);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [persona, setPersona] = useState<PersonaType>('friend');
    const [showPersonaSelector, setShowPersonaSelector] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null); // Should come from auth context

    const pusherRef = useRef<Pusher | null>(null);
    const slideAnim = useRef(new Animated.Value(width)).current;
    const activeConversationIdRef = useRef<string | null>(null);

    // --- Pusher & Initial Data ---
    useEffect(() => {
        // Initialize Pusher
        const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY || 'ee5640481e0a26c0a4b8', {
            cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'ap2',
        });

        pusherRef.current = pusher;

        fetchConversations();

        return () => {
            pusher.disconnect();
        };
    }, [currentUser]);

    // Subscribe to conversation channel when entering a chat
    useEffect(() => {
        if (!pusherRef.current || !activeConversationIdRef.current) return;

        const channelName = `conversation-${activeConversationIdRef.current}`;
        const channel = pusherRef.current.subscribe(channelName);

        channel.bind('message:new', (msg: any) => {
            setMessages(prev => {
                // Avoid duplicates
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, {
                    id: msg.id,
                    role: msg.senderId === currentUser?.id ? 'user' : 'assistant',
                    content: msg.content,
                    timestamp: msg.timestamp,
                    senderId: msg.senderId
                }];
            });
            // Update conversation list last message
            fetchConversations();
        });

        return () => {
            pusherRef.current?.unsubscribe(channelName);
        };
    }, [selectedUser]); // Re-run when selected user changes (which implies conversation change)


    // --- API Calls ---
    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_URL}/api/chat/conversations`);
            const data = await res.json();
            if (data.conversations) {
                setConversations(data.conversations.map((c: any) => ({
                    id: c.user.id,
                    name: c.user.name,
                    avatar: c.user.avatar || 'https://api.dicebear.com/7.x/avataaars/png?seed=User',
                    status: isUserOnline(c.user.lastSeen) ? 'online' : 'offline',
                    lastMessage: c.lastMessage,
                    lastMessageAt: c.lastMessageAt,
                    unreadCount: c.unreadCount,
                    lastSeen: c.user.lastSeen
                })));
            }
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        }
    };

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            // Run all search queries in parallel
            const [followersRes, followingRes, allUsersRes] = await Promise.all([
                fetch(`${API_URL}/api/users/followers-following?type=followers&search=${encodeURIComponent(query)}`),
                fetch(`${API_URL}/api/users/followers-following?type=following&search=${encodeURIComponent(query)}`),
                fetch(`${API_URL}/api/search/users?search=${encodeURIComponent(query)}`)
            ]);

            const followersData = followersRes.ok ? await followersRes.json() : { users: [] };
            const followingData = followingRes.ok ? await followingRes.json() : { users: [] };
            const allUsersData = allUsersRes.ok ? await allUsersRes.json() : { users: [] };

            // Combine followers and following results
            const followersFollowingResults = [...(followersData.users || []), ...(followingData.users || [])];
            const followersFollowingMap = new Map(
                followersFollowingResults.map((u: any) => [u.id, u])
            );

            // Combine all results: followers/following prioritized, then new users
            const combinedResults = Array.from(followersFollowingMap.values());

            // Add all platform users that aren't already in followers/following
            const newUsersNotInFollowersFollowing = (allUsersData.users || []).filter(
                (user: any) => !followersFollowingMap.has(user.id)
            );

            const finalResults = [...combinedResults, ...newUsersNotInFollowersFollowing];

            setSearchResults(finalResults.map((u: any) => ({
                id: u.id,
                name: u.name || u.profile?.displayName || 'Unknown',
                avatar: u.profile?.avatarUrl || u.avatar || 'https://api.dicebear.com/7.x/avataaars/png?seed=User',
                status: isUserOnline(u.lastSeen) ? 'online' : 'offline',
                lastSeen: u.lastSeen
            })));
        } catch (err) {
            console.error('Failed to search users', err);
        }
    };

    const fetchMessages = async (userId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/chat/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId })
            });
            const { conversationId } = await res.json();

            activeConversationIdRef.current = conversationId;

            const msgRes = await fetch(`${API_URL}/api/chat/${conversationId}/messages`);
            const msgData = await msgRes.json();
            if (msgData.messages) {
                setMessages(msgData.messages.map((m: any) => ({
                    id: m.id,
                    role: m.senderId === currentUser?.id ? 'user' : 'assistant',
                    content: m.content,
                    timestamp: new Date(m.createdAt).getTime(),
                    senderId: m.senderId
                })));
            }
            return conversationId;
        } catch (err) {
            console.error('Failed to fetch messages', err);
            return null;
        }
    };

    const sendMessage = async (content: string) => {
        if (!selectedUser || !content.trim()) return;

        // Optimistic update
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, {
            id: tempId,
            role: 'user',
            content,
            timestamp: Date.now(),
            senderId: currentUser?.id
        }]);
        setInputText('');

        try {
            const res = await fetch(`${API_URL}/api/chat/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: selectedUser.id })
            });
            const { conversationId } = await res.json();

            await fetch(`${API_URL}/api/chat/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

    // --- Helpers ---
    const isUserOnline = (lastSeen?: string) => {
        if (!lastSeen) return false;
        const diff = Date.now() - new Date(lastSeen).getTime();
        return diff < 5 * 60 * 1000; // Online if active in last 5 mins
    };

    const handleUserSelect = async (user: User) => {
        setSelectedUser(user);
        setMessages([]); // Clear prev messages
        activeConversationIdRef.current = null; // Reset active conv ID

        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 100,
        }).start();

        if (user.id === 'dbot') {
            setMessages([
                { id: 'init', role: 'assistant', content: `Hello! I'm dbot in ${persona} mode. How can I support you?`, timestamp: Date.now() }
            ]);
        } else {
            await fetchMessages(user.id);
        }
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
        fetchConversations(); // Refresh list on back
    };

    // --- Render Helpers ---
    const getGradientColors = (): [string, string, string] => {
        switch (activeTheme) {
            case 'light': return ['#ffffff', '#f8f9fa', '#e9ecef']; // Pure White/Gray
            case 'dark': return ['#000000', '#0a0a0a', '#171717']; // Pure Black
            case 'cosmic': return ['#000000', '#0a0a0a', '#171717']; // Map cosmic to black
            default: return ['#000000', '#0a0a0a', '#171717'];
        }
    };

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center z-10">
            <Text className={`text-3xl font-bold ${activeTheme === 'light' ? 'text-black' : 'text-white'}`}>
                Messages
            </Text>
            <View className="flex-row gap-4">
                <TouchableOpacity onPress={() => setActiveTheme(prev => prev === 'light' ? 'dark' : 'light')}>
                    {activeTheme === 'light' ? <Sun color="black" size={24} /> : <Moon color="white" size={24} />}
                </TouchableOpacity>
                <TouchableOpacity>
                    <Image
                        source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=User' }}
                        className={`w-10 h-10 rounded-full border-2 ${activeTheme === 'light' ? 'border-black/10' : 'border-white/20'}`}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSearchBar = () => (
        <View className="px-6 py-4">
            <BlurView intensity={30} tint={activeTheme === 'light' ? 'light' : 'dark'} className={`flex-row items-center px-4 py-3 rounded-2xl overflow-hidden border ${activeTheme === 'light' ? 'border-black/5' : 'border-white/10'}`}>
                <Search color={activeTheme === 'light' ? '#000' : '#fff'} size={20} />
                <TextInput
                    placeholder="Search users..."
                    placeholderTextColor={activeTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'}
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        searchUsers(text);
                    }}
                    className={`flex-1 ml-3 text-base ${activeTheme === 'light' ? 'text-black' : 'text-white'}`}
                />
            </BlurView>
        </View>
    );

    const renderUserList = () => (
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Dbot Special Card - Black & White */}
            <TouchableOpacity
                onPress={() => handleUserSelect({ id: 'dbot', name: 'dbot AI', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=dbot', status: 'online' })}
                className="mb-6"
            >
                <BlurView
                    intensity={40}
                    tint={activeTheme === 'light' ? 'light' : 'dark'}
                    className={`p-4 rounded-3xl flex-row items-center overflow-hidden border ${activeTheme === 'light' ? 'border-black/5' : 'border-white/10'}`}
                >
                    <View className={`w-14 h-14 rounded-full items-center justify-center border ${activeTheme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/20'}`}>
                        <Sparkles color={activeTheme === 'light' ? 'black' : 'white'} size={28} />
                    </View>
                    <View className="flex-1 ml-4">
                        <Text className={`text-lg font-bold ${activeTheme === 'light' ? 'text-black' : 'text-white'}`}>dbot AI</Text>
                        <Text className={`text-sm ${activeTheme === 'light' ? 'text-black/60' : 'text-white/60'}`}>Your personal companion</Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${activeTheme === 'light' ? 'bg-black/5' : 'bg-white/10'}`}>
                        <Text className={`text-xs font-medium ${activeTheme === 'light' ? 'text-black' : 'text-white'}`}>Active</Text>
                    </View>
                </BlurView>
            </TouchableOpacity>

            <Text className={`text-sm font-semibold mb-4 ${activeTheme === 'light' ? 'text-black/40' : 'text-white/40'}`}>
                {searchQuery ? 'SEARCH RESULTS' : 'RECENT CONVERSATIONS'}
            </Text>

            {(searchQuery ? searchResults : conversations).map((user) => (
                <TouchableOpacity
                    key={user.id}
                    onPress={() => handleUserSelect(user)}
                    className={`flex-row items-center mb-5 p-3 rounded-2xl transition-all active:scale-95 ${activeTheme === 'light' ? 'active:bg-black/5' : 'active:bg-white/5'}`}
                >
                    <View className="relative">
                        <Image source={{ uri: user.avatar }} className="w-14 h-14 rounded-2xl bg-gray-200" />
                        {user.status === 'online' && (
                            <View className={`absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 ${activeTheme === 'light' ? 'border-white' : 'border-black'}`} />
                        )}
                    </View>
                    <View className={`flex-1 ml-4 border-b pb-4 ${activeTheme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                        <View className="flex-row justify-between items-center mb-1">
                            <Text className={`text-base font-bold ${activeTheme === 'light' ? 'text-black' : 'text-white'}`}>
                                {user.name}
                            </Text>
                            {user.lastMessageAt && (
                                <Text className={`text-xs ${activeTheme === 'light' ? 'text-black/40' : 'text-white/40'}`}>
                                    {new Date(user.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            )}
                        </View>
                        <Text
                            numberOfLines={1}
                            className={`text-sm ${user.unreadCount ? (activeTheme === 'light' ? 'text-black font-semibold' : 'text-white font-semibold') : (activeTheme === 'light' ? 'text-black/50' : 'text-white/50')}`}
                        >
                            {user.lastMessage || (user.status === 'online' ? 'Online' : `Last seen ${user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'recently'}`)}
                        </Text>
                    </View>
                    {user.unreadCount ? (
                        <View className={`w-6 h-6 rounded-full items-center justify-center ml-2 ${activeTheme === 'light' ? 'bg-black' : 'bg-white'}`}>
                            <Text className={`text-xs font-bold ${activeTheme === 'light' ? 'text-white' : 'text-black'}`}>{user.unreadCount}</Text>
                        </View>
                    ) : null}
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderChatRoom = () => {
        if (!selectedUser) return null;
        const isDbot = selectedUser.id === 'dbot';

        return (
            <Animated.View
                style={{ transform: [{ translateX: slideAnim }] }}
                className="absolute inset-0 z-50 bg-black"
            >
                <LinearGradient colors={getGradientColors()} className="flex-1">
                    <SafeAreaView className="flex-1">
                        {/* Chat Header */}
                        <BlurView intensity={80} tint={activeTheme === 'light' ? 'light' : 'dark'} className={`flex-row items-center justify-between px-4 py-3 border-b ${activeTheme === 'light' ? 'border-black/5' : 'border-white/10'}`}>
                            <View className="flex-row items-center">
                                <TouchableOpacity onPress={handleBack} className="mr-3 p-2 rounded-full hover:bg-white/10">
                                    <ChevronLeft color={activeTheme === 'light' ? 'black' : 'white'} size={24} />
                                </TouchableOpacity>
                                <Image source={{ uri: selectedUser.avatar }} className="w-10 h-10 rounded-full bg-gray-200" />
                                <View className="ml-3">
                                    <Text className={`text-base font-bold ${activeTheme === 'light' ? 'text-black' : 'text-white'}`}>
                                        {selectedUser.name}
                                    </Text>
                                    <Text className={`text-xs ${activeTheme === 'light' ? 'text-black/50' : 'text-white/50'}`}>
                                        {isDbot ? `${persona} mode` : (selectedUser.status === 'online' ? 'Online' : 'Offline')}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row gap-4">
                                {isDbot && (
                                    <TouchableOpacity onPress={() => setShowPersonaSelector(true)}>
                                        <User color={activeTheme === 'light' ? 'black' : 'white'} size={22} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity>
                                    <Phone color={activeTheme === 'light' ? 'black' : 'white'} size={22} />
                                </TouchableOpacity>
                                <TouchableOpacity>
                                    <Video color={activeTheme === 'light' ? 'black' : 'white'} size={22} />
                                </TouchableOpacity>
                            </View>
                        </BlurView>

                        {/* Messages List */}
                        <ScrollView
                            className="flex-1 px-4 py-6"
                            contentContainerStyle={{ paddingBottom: 20 }}
                            ref={ref => ref?.scrollToEnd({ animated: true })}
                        >
                            {messages.map((msg) => (
                                <View
                                    key={msg.id}
                                    className={`mb-4 max-w-[80%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
                                >
                                    <BlurView
                                        intensity={40}
                                        tint={activeTheme === 'light' ? 'light' : 'dark'}
                                        className={`px-5 py-3 rounded-2xl ${msg.role === 'user'
                                            ? (activeTheme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/10') + ' rounded-br-none'
                                            : (activeTheme === 'light' ? 'bg-white border-black/5' : 'bg-black/40 border-white/10') + ' rounded-bl-none'
                                            } border overflow-hidden`}
                                    >
                                        <Text className={`text-base ${activeTheme === 'light' ? 'text-black' : 'text-white'}`}>
                                            {msg.content}
                                        </Text>
                                    </BlurView>
                                    <View className={`flex-row items-center mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <Text className={`text-[10px] ${activeTheme === 'light' ? 'text-black/40' : 'text-white/30'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        {msg.role === 'user' && (
                                            <Text className={`text-[10px] ml-1 ${activeTheme === 'light' ? 'text-black/40' : 'text-white/30'}`}>
                                                {msg.readAt ? '• Read' : '• Sent'}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Input Area */}
                        <BlurView intensity={90} tint={activeTheme === 'light' ? 'light' : 'dark'} className={`px-4 py-4 border-t ${activeTheme === 'light' ? 'border-black/5' : 'border-white/10'} pb-8`}>
                            <View className="flex-row items-center gap-3">
                                <TouchableOpacity className={`p-2 rounded-full ${activeTheme === 'light' ? 'bg-black/5' : 'bg-white/5'}`}>
                                    <Sparkles color={activeTheme === 'light' ? 'black' : 'white'} size={20} />
                                </TouchableOpacity>
                                <TextInput
                                    placeholder={isDbot ? `Message ${persona}...` : "Type a message..."}
                                    placeholderTextColor={activeTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'}
                                    value={inputText}
                                    onChangeText={setInputText}
                                    className={`flex-1 h-12 px-4 rounded-full border ${activeTheme === 'light' ? 'bg-white border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                                />
                                {inputText ? (
                                    <TouchableOpacity onPress={() => sendMessage(inputText)} className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${activeTheme === 'light' ? 'bg-black shadow-black/20' : 'bg-white shadow-white/20'}`}>
                                        <Send color={activeTheme === 'light' ? 'white' : 'black'} size={20} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setIsVoiceMode(!isVoiceMode)}
                                        className={`w-12 h-12 rounded-full items-center justify-center border ${isVoiceMode ? 'bg-red-500/20 border-red-500' : (activeTheme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10')}`}
                                    >
                                        <Mic color={isVoiceMode ? '#ef4444' : (activeTheme === 'light' ? 'black' : 'white')} size={20} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </BlurView>
                    </SafeAreaView>
                </LinearGradient>

                {/* Persona Selector Modal */}
                <Modal visible={showPersonaSelector} transparent animationType="fade">
                    <View className="flex-1 bg-black/80 justify-center items-center p-6">
                        <BlurView intensity={40} tint="dark" className="w-full bg-gray-900/80 rounded-3xl p-6 border border-white/10">
                            <Text className="text-white text-xl font-bold mb-6 text-center">Select Dbot Persona</Text>
                            <View className="flex-row flex-wrap justify-center gap-4">
                                {['friend', 'therapist', 'coach', 'mystic'].map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => { setPersona(p as PersonaType); setShowPersonaSelector(false); }}
                                        className={`px-6 py-3 rounded-full border ${persona === p ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10'}`}
                                    >
                                        <Text className={`${persona === p ? 'text-black' : 'text-white'} capitalize font-medium`}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity onPress={() => setShowPersonaSelector(false)} className="mt-8 self-center">
                                <Text className="text-white/50">Cancel</Text>
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                </Modal>
            </Animated.View>
        );
    };

    return (
        <LinearGradient
            colors={getGradientColors()}
            className="flex-1"
        >
            <SafeAreaView className="flex-1">
                {renderHeader()}
                {renderSearchBar()}
                {renderUserList()}
                {renderChatRoom()}
            </SafeAreaView>
        </LinearGradient>
    );
}
