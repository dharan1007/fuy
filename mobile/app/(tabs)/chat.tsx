import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, Modal, Animated, Dimensions, FlatList } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Send, Search, Settings, MoreVertical, Phone, Video, Image as ImageIcon, Smile, X, ChevronLeft, Sparkles, User, Heart, Zap, Moon, Sun } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io, { Socket } from 'socket.io-client';

import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const getApiUrl = () => {
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri;
        if (hostUri) {
            return `http://${hostUri.split(':')[0]}:3000`;
        }
    }
    return process.env.EXPO_PUBLIC_API_URL || 'https://your-production-url.com';
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

    const socketRef = useRef<Socket | null>(null);
    const slideAnim = useRef(new Animated.Value(width)).current;
    const activeConversationIdRef = useRef<string | null>(null);

    const markMessagesAsRead = async (conversationId: string, messageIds: string[]) => {
        if (!conversationId || messageIds.length === 0) return;
        try {
            await fetch(`${API_URL}/api/chat/${conversationId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds })
            });
        } catch (err) {
            console.error('Failed to mark messages as read', err);
        }
    };

    // --- Socket & Initial Data ---
    useEffect(() => {
        // Initialize Socket
        socketRef.current = io(API_URL);

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
            // Register user (mock ID for now, should be real auth ID)
            if (currentUser) {
                socketRef.current?.emit('user:register', currentUser.id);
            }
        });

        socketRef.current.on('message:new', (msg: any) => {
            setMessages(prev => [...prev, {
                id: msg.id,
                role: msg.senderId === currentUser?.id ? 'user' : 'assistant', // Simplified role logic
                content: msg.content,
                timestamp: msg.timestamp,
                senderId: msg.senderId
            }]);

            // Update conversation list last message
            fetchConversations();
        });

        socketRef.current.on('user:online', ({ userId }) => {
            setConversations(prev => prev.map(u => u.id === userId ? { ...u, status: 'online' } : u));
        });

        socketRef.current.on('user:offline', ({ userId }) => {
            setConversations(prev => prev.map(u => u.id === userId ? { ...u, status: 'offline' } : u));
        });

        fetchConversations();

        return () => {
            socketRef.current?.disconnect();
        };
    }, [currentUser]);

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
            const res = await fetch(`${API_URL}/api/users/search?q=${query}`);
            const data = await res.json();
            if (data.users) {
                setSearchResults(data.users.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    avatar: u.profile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=User',
                    status: isUserOnline(u.lastSeen) ? 'online' : 'offline',
                    lastSeen: u.lastSeen
                })));
            }
        } catch (err) {
            console.error('Failed to search users', err);
        }
    };

    const fetchMessages = async (userId: string) => {
        // First get conversation ID (simplified logic: assume 1:1)
        // In real app, we'd pass conversation ID directly
        try {
            const res = await fetch(`${API_URL}/api/chat/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId })
            });
            const { conversationId } = await res.json();

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
            // Get conv ID again (should cache this)
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
        }).start(() => setSelectedUser(null));
        fetchConversations(); // Refresh list on back
    };

    // --- Render Helpers ---
    const getGradientColors = (): [string, string, string] => {
        switch (activeTheme) {
            case 'light': return ['#f0f9ff', '#e0f2fe', '#bae6fd'];
            case 'dark': return ['#0f172a', '#1e293b', '#334155'];
            case 'cosmic': return ['#0f0c29', '#302b63', '#24243e'];
            default: return ['#0f0c29', '#302b63', '#24243e'];
        }
    };

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center z-10">
            <Text className={`text-3xl font-bold ${activeTheme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                Messages
            </Text>
            <View className="flex-row gap-4">
                <TouchableOpacity onPress={() => setActiveTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'cosmic' : 'light')}>
                    {activeTheme === 'light' ? <Sun color="#475569" size={24} /> : activeTheme === 'dark' ? <Moon color="white" size={24} /> : <Sparkles color="#c084fc" size={24} />}
                </TouchableOpacity>
                <TouchableOpacity>
                    <Image
                        source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=User' }}
                        className="w-10 h-10 rounded-full border-2 border-white/20"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSearchBar = () => (
        <View className="px-6 py-4">
            <BlurView intensity={20} tint={activeTheme === 'light' ? 'light' : 'dark'} className="flex-row items-center px-4 py-3 rounded-2xl overflow-hidden border border-white/10">
                <Search color={activeTheme === 'light' ? '#64748b' : 'rgba(255,255,255,0.5)'} size={20} />
                <TextInput
                    placeholder="Search users..."
                    placeholderTextColor={activeTheme === 'light' ? '#94a3b8' : 'rgba(255,255,255,0.3)'}
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        searchUsers(text);
                    }}
                    className={`flex-1 ml-3 text-base ${activeTheme === 'light' ? 'text-slate-800' : 'text-white'}`}
                />
            </BlurView>
        </View>
    );

    const renderUserList = () => (
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Dbot Special Card */}
            <TouchableOpacity
                onPress={() => handleUserSelect({ id: 'dbot', name: 'dbot AI', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=dbot', status: 'online' })}
                className="mb-6"
            >
                <LinearGradient
                    colors={['#4f46e5', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="p-4 rounded-3xl flex-row items-center shadow-lg"
                >
                    <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center border border-white/30">
                        <Sparkles color="white" size={28} />
                    </View>
                    <View className="flex-1 ml-4">
                        <Text className="text-white text-lg font-bold">dbot AI</Text>
                        <Text className="text-white/80 text-sm">Your personal companion</Text>
                    </View>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                        <Text className="text-white text-xs font-medium">Active</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            <Text className={`text-sm font-semibold mb-4 ${activeTheme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>
                {searchQuery ? 'SEARCH RESULTS' : 'RECENT CONVERSATIONS'}
            </Text>

            {(searchQuery ? searchResults : conversations).map((user) => (
                <TouchableOpacity
                    key={user.id}
                    onPress={() => handleUserSelect(user)}
                    className="flex-row items-center mb-5"
                >
                    <View className="relative">
                        <Image source={{ uri: user.avatar }} className="w-14 h-14 rounded-2xl bg-gray-200" />
                        {user.status === 'online' && (
                            <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                        )}
                    </View>
                    <View className="flex-1 ml-4 border-b border-white/5 pb-4">
                        <View className="flex-row justify-between items-center mb-1">
                            <Text className={`text-base font-bold ${activeTheme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                                {user.name}
                            </Text>
                            {user.lastMessageAt && (
                                <Text className={`text-xs ${activeTheme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>
                                    {new Date(user.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            )}
                        </View>
                        <Text
                            numberOfLines={1}
                            className={`text-sm ${user.unreadCount ? (activeTheme === 'light' ? 'text-slate-800 font-semibold' : 'text-white font-semibold') : (activeTheme === 'light' ? 'text-slate-500' : 'text-white/50')}`}
                        >
                            {user.lastMessage || (user.status === 'online' ? 'Online' : `Last seen ${user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'recently'}`)}
                        </Text>
                    </View>
                    {user.unreadCount ? (
                        <View className="w-6 h-6 bg-rose-500 rounded-full items-center justify-center ml-2">
                            <Text className="text-white text-xs font-bold">{user.unreadCount}</Text>
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
                        <BlurView intensity={80} tint={activeTheme === 'light' ? 'light' : 'dark'} className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
                            <View className="flex-row items-center">
                                <TouchableOpacity onPress={handleBack} className="mr-3 p-2 rounded-full hover:bg-white/10">
                                    <ChevronLeft color={activeTheme === 'light' ? '#1e293b' : 'white'} size={24} />
                                </TouchableOpacity>
                                <Image source={{ uri: selectedUser.avatar }} className="w-10 h-10 rounded-full bg-gray-200" />
                                <View className="ml-3">
                                    <Text className={`text-base font-bold ${activeTheme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                                        {selectedUser.name}
                                    </Text>
                                    <Text className={`text-xs ${activeTheme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>
                                        {isDbot ? `${persona} mode` : (selectedUser.status === 'online' ? 'Online' : 'Offline')}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row gap-4">
                                {isDbot && (
                                    <TouchableOpacity onPress={() => setShowPersonaSelector(true)}>
                                        <User color={activeTheme === 'light' ? '#1e293b' : 'white'} size={22} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity>
                                    <Phone color={activeTheme === 'light' ? '#1e293b' : 'white'} size={22} />
                                </TouchableOpacity>
                                <TouchableOpacity>
                                    <Video color={activeTheme === 'light' ? '#1e293b' : 'white'} size={22} />
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
                                            ? 'bg-blue-500/20 border-blue-400/30 rounded-br-none'
                                            : 'bg-white/10 border-white/10 rounded-bl-none'
                                            } border overflow-hidden`}
                                    >
                                        <Text className={`text-base ${activeTheme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                                            {msg.content}
                                        </Text>
                                    </BlurView>
                                    <View className={`flex-row items-center mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <Text className={`text-[10px] ${activeTheme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        {msg.role === 'user' && (
                                            <Text className={`text-[10px] ml-1 ${activeTheme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>
                                                {msg.readAt ? '• Read' : '• Sent'}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Input Area */}
                        <BlurView intensity={90} tint={activeTheme === 'light' ? 'light' : 'dark'} className="px-4 py-4 border-t border-white/10 pb-8">
                            <View className="flex-row items-center gap-3">
                                <TouchableOpacity className="p-2 rounded-full bg-white/5">
                                    <Sparkles color={activeTheme === 'light' ? '#64748b' : 'white'} size={20} />
                                </TouchableOpacity>
                                <TextInput
                                    placeholder={isDbot ? `Message ${persona}...` : "Type a message..."}
                                    placeholderTextColor={activeTheme === 'light' ? '#94a3b8' : 'rgba(255,255,255,0.3)'}
                                    value={inputText}
                                    onChangeText={setInputText}
                                    className={`flex-1 h-12 px-4 rounded-full border border-white/10 ${activeTheme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-white/5 text-white'}`}
                                />
                                {inputText ? (
                                    <TouchableOpacity onPress={() => sendMessage(inputText)} className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/30">
                                        <Send color="white" size={20} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setIsVoiceMode(!isVoiceMode)}
                                        className={`w-12 h-12 rounded-full items-center justify-center border ${isVoiceMode ? 'bg-red-500/20 border-red-500' : 'bg-white/5 border-white/10'}`}
                                    >
                                        <Mic color={isVoiceMode ? '#ef4444' : (activeTheme === 'light' ? '#64748b' : 'white')} size={20} />
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
                                        className={`px-6 py-3 rounded-full border ${persona === p ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10'}`}
                                    >
                                        <Text className="text-white capitalize font-medium">{p}</Text>
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
