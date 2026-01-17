import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Image,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
    Animated,
    PanResponder,
    StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
    ChevronLeft,
    ChevronDown,
    Frown,
    Smile,
    BookOpen,
    Plus,
    Trash2,
    AlertTriangle,
    X,
    Edit3,
    Clock,
    MessageSquare,
    TrendingUp,
    Slash,
    Target,
    Bell,
    Lock,
    Unlock,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import Svg, { Circle, Path, Rect, Line, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

// Premium Color Palette
const COLORS = {
    background: '#0A0A0F',
    cardBg: '#12121A',
    cardBgAlt: '#1A1A24',
    accentRed: '#FF3B5C',
    accentGreen: '#00D68F',
    accentBlue: '#3B82F6',
    accentOrange: '#FF8B3D',
    accentCyan: '#00C9FF',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.35)',
    border: 'rgba(255,255,255,0.08)',
    borderActive: 'rgba(255,255,255,0.15)',
};

// Types
interface Profile {
    id: string;
    name: string;
    avatar: string;
    lastMessageAt?: string;
}

interface MessageTag {
    id: string;
    messageId: string;
    tagType: string;
    taggedContent?: string;
    note?: string;
    createdAt: string;
    triggeredCount?: number;
    message: {
        id: string;
        content: string;
        createdAt: string;
        sender: {
            name: string;
            profile?: { displayName?: string; avatarUrl?: string };
        };
    };
}

interface FactWarning {
    id: string;
    keyword: string;
    warningText: string;
    isActive: boolean;
    triggeredCount?: number;
}

interface ChatInsights {
    totalMessages: number;
    myMessages: number;
    partnerMessages: number;
    avgResponseTimeMinutes: number;
    messagesThisWeek: number;
}

type LockerType = 'red' | 'green' | 'custom' | 'triggers';

// Swipable Card Component
const SwipableCard = ({
    item,
    color,
    onEdit,
    onDelete,
    type
}: {
    item: any;
    color: string;
    onEdit: () => void;
    onDelete: () => void;
    type: 'tag' | 'trigger' | 'fact';
}) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const [showActions, setShowActions] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0 && gestureState.dx > -120) {
                    pan.setValue({ x: gestureState.dx, y: 0 });
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < -50) {
                    Animated.spring(pan, { toValue: { x: -100, y: 0 }, useNativeDriver: true }).start();
                    setShowActions(true);
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
                    setShowActions(false);
                }
            },
        })
    ).current;

    const resetPosition = () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        setShowActions(false);
    };

    return (
        <View style={[styles.cardWrapper, { marginBottom: 12 }]}>
            {/* Action buttons behind */}
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.accentBlue }]}
                    onPress={() => { resetPosition(); onEdit(); }}
                >
                    <Edit3 size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.accentRed }]}
                    onPress={() => { resetPosition(); onDelete(); }}
                >
                    <Trash2 size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Main Card */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.swipableCard,
                    { transform: [{ translateX: pan.x }] }
                ]}
            >
                <View style={[styles.cardColorBar, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.tagBadge, { backgroundColor: color + '20' }]}>
                            <Text style={[styles.tagBadgeText, { color }]}>
                                {type === 'tag' ? item.tagType : type === 'trigger' ? 'TRIGGER' : 'FACT'}
                            </Text>
                        </View>
                        {item.triggeredCount > 0 && (
                            <View style={styles.countBadge}>
                                <Bell size={10} color={COLORS.textSecondary} />
                                <Text style={styles.countText}>{item.triggeredCount}x</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.cardMainText} numberOfLines={2}>
                        {type === 'fact' ? item.warningText : item.taggedContent || item.selectedText || item.message?.content}
                    </Text>
                    {type === 'fact' && (
                        <Text style={styles.keywordText}>Keyword: "{item.keyword}"</Text>
                    )}
                    <Text style={styles.dateText}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
};

// Match Score Circle
const MatchScoreCircle = ({ score, size = 120 }: { score: number; size?: number }) => {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    const getScoreColor = () => {
        if (score >= 70) return COLORS.accentGreen;
        if (score >= 40) return COLORS.accentOrange;
        return COLORS.accentRed;
    };

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={COLORS.border}
                    strokeWidth={8}
                    fill="transparent"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={getScoreColor()}
                    strokeWidth={8}
                    fill="transparent"
                    strokeDasharray={`${progress} ${circumference}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={styles.matchScoreValue}>{score}%</Text>
                <Text style={styles.matchScoreLabel}>Match</Text>
            </View>
        </View>
    );
};

// Warning Analytics Bar Chart
const WarningChart = ({
    data
}: {
    data: { label: string; myCount: number; partnerCount: number; color: string }[]
}) => {
    const maxValue = Math.max(...data.flatMap(d => [d.myCount, d.partnerCount]), 1);

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Warning Analytics</Text>
            <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.accentCyan }]} />
                    <Text style={styles.legendText}>You</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.accentOrange }]} />
                    <Text style={styles.legendText}>Partner</Text>
                </View>
            </View>
            <View style={styles.barsContainer}>
                {data.map((item, index) => (
                    <View key={index} style={styles.barGroup}>
                        <View style={styles.barPair}>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height: (item.myCount / maxValue) * 60 || 4,
                                        backgroundColor: COLORS.accentCyan
                                    }
                                ]}
                            />
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height: (item.partnerCount / maxValue) * 60 || 4,
                                        backgroundColor: COLORS.accentOrange
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// Chat Insights Card
const ChatInsightsCard = ({ insights }: { insights: ChatInsights }) => {
    const totalRatio = insights.totalMessages > 0
        ? Math.round((insights.myMessages / insights.totalMessages) * 100)
        : 50;

    return (
        <View style={styles.insightsCard}>
            <Text style={styles.sectionTitle}>Chat Insights</Text>

            <View style={styles.insightsGrid}>
                <View style={styles.insightItem}>
                    <MessageSquare size={20} color={COLORS.accentBlue} />
                    <Text style={styles.insightValue}>{insights.totalMessages}</Text>
                    <Text style={styles.insightLabel}>Total Messages</Text>
                </View>
                <View style={styles.insightItem}>
                    <Clock size={20} color={COLORS.accentGreen} />
                    <Text style={styles.insightValue}>{insights.avgResponseTimeMinutes}m</Text>
                    <Text style={styles.insightLabel}>Avg Response</Text>
                </View>
                <View style={styles.insightItem}>
                    <TrendingUp size={20} color={COLORS.accentOrange} />
                    <Text style={styles.insightValue}>{insights.messagesThisWeek}</Text>
                    <Text style={styles.insightLabel}>This Week</Text>
                </View>
            </View>

            {/* Message Ratio Bar */}
            <View style={styles.ratioContainer}>
                <Text style={styles.ratioLabel}>Message Ratio</Text>
                <View style={styles.ratioBar}>
                    <View style={[styles.ratioFill, { width: `${totalRatio}%`, backgroundColor: COLORS.accentCyan }]} />
                    <View style={[styles.ratioFill, { width: `${100 - totalRatio}%`, backgroundColor: COLORS.accentOrange }]} />
                </View>
                <View style={styles.ratioLabels}>
                    <Text style={styles.ratioText}>You: {totalRatio}%</Text>
                    <Text style={styles.ratioText}>Partner: {100 - totalRatio}%</Text>
                </View>
            </View>
        </View>
    );
};

export default function BondingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ userId?: string; userName?: string; userAvatar?: string }>();
    const { colors, mode } = useTheme();
    const { session } = useAuth();

    // State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [activeLocker, setActiveLocker] = useState<LockerType>('red');
    const [tags, setTags] = useState<MessageTag[]>([]);
    const [tagCounts, setTagCounts] = useState<{ id: string; tagType: string; senderId?: string }[]>([]);
    const [facts, setFacts] = useState<FactWarning[]>([]);
    const [triggers, setTriggers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [matchScore, setMatchScore] = useState(0);
    const [chatInsights, setChatInsights] = useState<ChatInsights>({
        totalMessages: 0,
        myMessages: 0,
        partnerMessages: 0,
        avgResponseTimeMinutes: 0,
        messagesThisWeek: 0,
    });

    // Modals
    const [showAddFact, setShowAddFact] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [editType, setEditType] = useState<'tag' | 'trigger' | 'fact'>('tag');
    const [newKeyword, setNewKeyword] = useState('');
    const [newWarningText, setNewWarningText] = useState('');
    const [dbUserId, setDbUserId] = useState<string | null>(null);

    // Access Request State
    const [accessRequestStatus, setAccessRequestStatus] = useState<'none' | 'pending' | 'approved' | 'denied'>('none');
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);

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

    // Fetch profiles
    const fetchProfiles = useCallback(async () => {
        if (!dbUserId) return;
        try {
            const { data: conversations } = await supabase
                .from('Conversation')
                .select(`
                    id, lastMessageAt, participantA, participantB,
                    userA:participantA(id, name, profile:Profile(displayName, avatarUrl)),
                    userB:participantB(id, name, profile:Profile(displayName, avatarUrl))
                `)
                .or(`participantA.eq.${dbUserId},participantB.eq.${dbUserId}`)
                .order('lastMessageAt', { ascending: false });

            if (conversations) {
                const profileList: Profile[] = conversations.map((conv: any) => {
                    const isA = conv.participantA === dbUserId;
                    const partner = isA ? conv.userB : conv.userA;
                    const profileData = Array.isArray(partner.profile) ? partner.profile[0] : partner.profile;
                    return {
                        id: partner.id,
                        name: profileData?.displayName || partner.name || 'Unknown',
                        avatar: profileData?.avatarUrl || '',
                        lastMessageAt: conv.lastMessageAt,
                    };
                });
                setProfiles(profileList);
                if (!selectedProfile && profileList.length > 0) {
                    setSelectedProfile(profileList[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching profiles:', error);
        }
    }, [dbUserId, selectedProfile]);

    // Fetch tags based on locker type
    const fetchTags = useCallback(async () => {
        if (!selectedProfile || !dbUserId) return;

        let tagTypes: string[] = [];
        if (activeLocker === 'red') {
            tagTypes = ['BLACKLIST', 'ANGRY', 'SAD', 'RED'];
        } else if (activeLocker === 'green') {
            tagTypes = ['HAPPY', 'JOY', 'FUNNY', 'GREEN'];
        } else if (activeLocker === 'custom') {
            // Custom tags - everything that's not red/green
            tagTypes = [];
        }

        try {
            let query = supabase
                .from('MessageTag')
                .select(`
                    id, messageId, tagType, taggedContent, note, createdAt, triggeredCount,
                    message:Message(id, content, createdAt, sender:User!senderId(name, profile:Profile(displayName, avatarUrl)))
                `)
                .eq('userId', dbUserId)
                .eq('profileId', selectedProfile.id)
                .order('createdAt', { ascending: false });

            if (tagTypes.length > 0) {
                query = query.in('tagType', tagTypes);
            } else if (activeLocker === 'custom') {
                query = query.not('tagType', 'in', '(BLACKLIST,ANGRY,SAD,RED,HAPPY,JOY,FUNNY,GREEN)');
            }

            const { data, error } = await query;
            if (error) throw error;

            const formattedTags = (data || []).map((tag: any) => ({
                ...tag,
                message: Array.isArray(tag.message) ? tag.message[0] : tag.message,
            })).filter((tag: any) => tag.message);

            setTags(formattedTags);
        } catch (error) {
            console.log('Error fetching tags:', error);
            setTags([]);
        }
    }, [selectedProfile, activeLocker, dbUserId]);

    // Fetch all tag counts for analytics
    const fetchAllTagCounts = useCallback(async () => {
        if (!selectedProfile || !dbUserId) return;

        try {
            const { data } = await supabase
                .from('MessageTag')
                .select('id, tagType, message:Message(senderId)')
                .eq('userId', dbUserId)
                .eq('profileId', selectedProfile.id);

            setTagCounts((data || []).map((t: any) => ({
                id: t.id,
                tagType: t.tagType,
                senderId: Array.isArray(t.message) ? t.message[0]?.senderId : t.message?.senderId
            })));
        } catch (error) {
            console.log('Error fetching tag counts:', error);
            setTagCounts([]);
        }
    }, [selectedProfile, dbUserId]);

    // Fetch facts
    const fetchFacts = useCallback(async () => {
        if (!selectedProfile || !dbUserId) return;

        try {
            const { data } = await supabase
                .from('FactWarning')
                .select('*')
                .eq('userId', dbUserId)
                .eq('profileId', selectedProfile.id)
                .order('createdAt', { ascending: false });

            setFacts(data || []);
        } catch (error) {
            console.log('Error fetching facts:', error);
            setFacts([]);
        }
    }, [selectedProfile, dbUserId]);

    // Fetch triggers
    const fetchTriggers = useCallback(async () => {
        if (!dbUserId) return;

        try {
            const { data } = await supabase
                .from('Trigger')
                .select(`
                    id, selectedText, targetUser, conditionType, warningMessage, isActive, createdAt, triggeredCount,
                    collection:TriggerCollection(id, name, keyword),
                    message:Message(id, content, createdAt, senderId)
                `)
                .order('createdAt', { ascending: false });

            setTriggers(data || []);
        } catch (error) {
            console.log('Error fetching triggers:', error);
            setTriggers([]);
        }
    }, [dbUserId]);

    // Fetch chat insights
    const fetchChatInsights = useCallback(async () => {
        if (!selectedProfile || !dbUserId) return;

        try {
            // Get conversation ID
            const { data: conv } = await supabase
                .from('Conversation')
                .select('id')
                .or(`and(participantA.eq.${dbUserId},participantB.eq.${selectedProfile.id}),and(participantA.eq.${selectedProfile.id},participantB.eq.${dbUserId})`)
                .single();

            if (!conv) return;

            // Get message counts
            const { data: messages } = await supabase
                .from('Message')
                .select('id, senderId, createdAt')
                .eq('conversationId', conv.id);

            if (messages) {
                const myMessages = messages.filter(m => m.senderId === dbUserId).length;
                const partnerMessages = messages.filter(m => m.senderId === selectedProfile.id).length;

                // Messages this week
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const thisWeek = messages.filter(m => new Date(m.createdAt) > weekAgo).length;

                setChatInsights({
                    totalMessages: messages.length,
                    myMessages,
                    partnerMessages,
                    avgResponseTimeMinutes: 5, // Placeholder - would need complex calculation
                    messagesThisWeek: thisWeek,
                });
            }
        } catch (error) {
            console.log('Error fetching insights:', error);
        }
    }, [selectedProfile, dbUserId]);

    // Calculate match score (placeholder - would compare profile cards)
    const calculateMatchScore = useCallback(async () => {
        // This would compare public profile card data
        // For now, using a placeholder based on interaction
        const baseScore = 50;
        const interactionBonus = Math.min(chatInsights.totalMessages / 10, 30);
        const tagPenalty = tagCounts.filter(t => ['BLACKLIST', 'ANGRY', 'SAD', 'RED'].includes(t.tagType)).length * 2;
        const tagBonus = tagCounts.filter(t => ['HAPPY', 'JOY', 'FUNNY', 'GREEN'].includes(t.tagType)).length * 2;

        setMatchScore(Math.max(0, Math.min(100, Math.round(baseScore + interactionBonus + tagBonus - tagPenalty))));
    }, [chatInsights, tagCounts]);

    // Load data
    useEffect(() => {
        if (dbUserId) {
            setIsLoading(true);
            fetchProfiles().finally(() => setIsLoading(false));
        }
    }, [dbUserId]);

    useEffect(() => {
        if (params.userId && params.userName) {
            setSelectedProfile({
                id: params.userId,
                name: params.userName,
                avatar: params.userAvatar || '',
            });
        }
    }, [params.userId, params.userName, params.userAvatar]);

    useEffect(() => {
        if (selectedProfile && dbUserId) {
            fetchAllTagCounts();
            fetchFacts();
            fetchTags();
            fetchTriggers();
            fetchChatInsights();
        }
    }, [selectedProfile?.id, activeLocker, dbUserId]);

    useEffect(() => {
        calculateMatchScore();
    }, [chatInsights, tagCounts]);

    // Edit handler
    const handleEdit = (item: any, type: 'tag' | 'trigger' | 'fact') => {
        setEditItem(item);
        setEditType(type);
        if (type === 'fact') {
            setNewKeyword(item.keyword);
            setNewWarningText(item.warningText);
        }
        setShowEditModal(true);
    };

    // Delete handler
    const handleDelete = async (id: string, type: 'tag' | 'trigger' | 'fact') => {
        Alert.alert('Delete', 'Are you sure? This will be removed for both users.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const table = type === 'tag' ? 'MessageTag' : type === 'trigger' ? 'Trigger' : 'FactWarning';
                        await supabase.from(table).delete().eq('id', id);

                        // Send notification to chat (placeholder)
                        // TODO: Create a system message or notification

                        // Update local state
                        if (type === 'tag') setTags(prev => prev.filter(t => t.id !== id));
                        else if (type === 'trigger') setTriggers(prev => prev.filter(t => t.id !== id));
                        else setFacts(prev => prev.filter(f => f.id !== id));
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            }
        ]);
    };

    // Save edit
    const saveEdit = async () => {
        if (!editItem) return;

        try {
            if (editType === 'fact') {
                await supabase
                    .from('FactWarning')
                    .update({ keyword: newKeyword, warningText: newWarningText })
                    .eq('id', editItem.id);

                setFacts(prev => prev.map(f =>
                    f.id === editItem.id ? { ...f, keyword: newKeyword, warningText: newWarningText } : f
                ));
            }
            // TODO: Add notification to chat

            setShowEditModal(false);
            setEditItem(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    // Add fact
    const addFactWarning = async () => {
        if (!newKeyword.trim() || !newWarningText.trim() || !selectedProfile || !dbUserId) return;

        try {
            const id = `cm${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
            const { data } = await supabase
                .from('FactWarning')
                .insert({
                    id,
                    userId: dbUserId,
                    profileId: selectedProfile.id,
                    keyword: newKeyword.toLowerCase().trim(),
                    warningText: newWarningText.trim(),
                })
                .select()
                .single();

            if (data) setFacts(prev => [data, ...prev]);
            setNewKeyword('');
            setNewWarningText('');
            setShowAddFact(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to add warning');
        }
    };

    // Refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchProfiles(), fetchAllTagCounts(), fetchTags(), fetchFacts(), fetchTriggers(), fetchChatInsights()]);
        setIsRefreshing(false);
    };

    // Check access request status
    const checkAccessRequestStatus = useCallback(async () => {
        if (!selectedProfile || !dbUserId) return;

        try {
            const { data } = await supabase
                .from('ProfileAccessRequest')
                .select('status')
                .eq('requesterId', dbUserId)
                .eq('targetUserId', selectedProfile.id)
                .order('createdAt', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                setAccessRequestStatus(data.status.toLowerCase() as any);
            } else {
                setAccessRequestStatus('none');
            }
        } catch (error) {
            console.log('Error checking access status:', error);
        }
    }, [selectedProfile, dbUserId]);

    // Request access to private profile
    const requestAccess = async () => {
        if (!selectedProfile || !dbUserId || isRequestingAccess) return;

        setIsRequestingAccess(true);
        try {
            const id = `par_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;

            await supabase.from('ProfileAccessRequest').insert({
                id,
                requesterId: dbUserId,
                targetUserId: selectedProfile.id,
                fields: JSON.stringify(['all']),
                status: 'PENDING'
            });

            setAccessRequestStatus('pending');
            Alert.alert('Request Sent', `Your request to view ${selectedProfile.name}'s private profile has been sent.`);
        } catch (error: any) {
            if (error.code === '23505') {
                Alert.alert('Already Requested', 'You have already requested access.');
                setAccessRequestStatus('pending');
            } else {
                Alert.alert('Error', 'Failed to send request');
            }
        } finally {
            setIsRequestingAccess(false);
        }
    };

    // Check access status when profile changes
    useEffect(() => {
        if (selectedProfile && dbUserId) {
            checkAccessRequestStatus();
        }
    }, [selectedProfile?.id, dbUserId]);

    // Get locker color
    const getLockerColor = (locker: LockerType) => {
        switch (locker) {
            case 'red': return COLORS.accentRed;
            case 'green': return COLORS.accentGreen;
            case 'custom': return COLORS.accentBlue;
            case 'triggers': return COLORS.accentOrange;
        }
    };

    // Get locker count
    const getLockerCount = (locker: LockerType) => {
        if (locker === 'triggers') return triggers.length;
        if (locker === 'red') return tagCounts.filter(t => ['BLACKLIST', 'ANGRY', 'SAD', 'RED'].includes(t.tagType)).length;
        if (locker === 'green') return tagCounts.filter(t => ['HAPPY', 'JOY', 'FUNNY', 'GREEN'].includes(t.tagType)).length;
        return tagCounts.filter(t => !['BLACKLIST', 'ANGRY', 'SAD', 'RED', 'HAPPY', 'JOY', 'FUNNY', 'GREEN'].includes(t.tagType)).length + facts.length;
    };

    // Warning analytics data
    const getWarningAnalytics = () => {
        const redMy = tagCounts.filter(t => ['BLACKLIST', 'ANGRY', 'SAD', 'RED'].includes(t.tagType) && t.senderId === dbUserId).length;
        const redPartner = tagCounts.filter(t => ['BLACKLIST', 'ANGRY', 'SAD', 'RED'].includes(t.tagType) && t.senderId !== dbUserId).length;
        const greenMy = tagCounts.filter(t => ['HAPPY', 'JOY', 'FUNNY', 'GREEN'].includes(t.tagType) && t.senderId === dbUserId).length;
        const greenPartner = tagCounts.filter(t => ['HAPPY', 'JOY', 'FUNNY', 'GREEN'].includes(t.tagType) && t.senderId !== dbUserId).length;

        return [
            { label: 'Red', myCount: redMy, partnerCount: redPartner, color: COLORS.accentRed },
            { label: 'Green', myCount: greenMy, partnerCount: greenPartner, color: COLORS.accentGreen },
        ];
    };

    // Tag ratio
    const getTagRatio = () => {
        const redCount = tagCounts.filter(t => ['BLACKLIST', 'ANGRY', 'SAD', 'RED'].includes(t.tagType)).length;
        const greenCount = tagCounts.filter(t => ['HAPPY', 'JOY', 'FUNNY', 'GREEN'].includes(t.tagType)).length;
        const customCount = tagCounts.filter(t => !['BLACKLIST', 'ANGRY', 'SAD', 'RED', 'HAPPY', 'JOY', 'FUNNY', 'GREEN'].includes(t.tagType)).length;
        const total = redCount + greenCount + customCount || 1;
        return {
            red: Math.round((redCount / total) * 100),
            green: Math.round((greenCount / total) * 100),
            custom: Math.round((customCount / total) * 100),
        };
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accentBlue} />
            </View>
        );
    }

    const tagRatio = getTagRatio();

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft color={COLORS.textPrimary} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Bonding</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accentBlue} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Selector */}
                    <TouchableOpacity
                        onPress={() => setShowProfileDropdown(true)}
                        style={styles.profileSelector}
                    >
                        {selectedProfile ? (
                            <View style={styles.profileSelectorContent}>
                                <Image source={{ uri: selectedProfile.avatar }} style={styles.profileAvatar} />
                                <Text style={styles.profileName}>{selectedProfile.name}</Text>
                            </View>
                        ) : (
                            <Text style={{ color: COLORS.textSecondary }}>Select a profile</Text>
                        )}
                        <ChevronDown color={COLORS.textPrimary} size={20} />
                    </TouchableOpacity>

                    {selectedProfile && (
                        <>
                            {/* Match Score & Chat Insights Row */}
                            <View style={styles.topRow}>
                                <View style={styles.matchScoreContainer}>
                                    <MatchScoreCircle score={matchScore} />
                                </View>
                                <View style={styles.tagRatioContainer}>
                                    <Text style={styles.miniTitle}>Tag Ratio</Text>
                                    <View style={styles.tagRatioBar}>
                                        <View style={[styles.ratioSegment, { flex: tagRatio.red, backgroundColor: COLORS.accentRed }]} />
                                        <View style={[styles.ratioSegment, { flex: tagRatio.green, backgroundColor: COLORS.accentGreen }]} />
                                        <View style={[styles.ratioSegment, { flex: tagRatio.custom, backgroundColor: COLORS.accentBlue }]} />
                                    </View>
                                    <View style={styles.tagRatioLabels}>
                                        <Text style={[styles.ratioLabelText, { color: COLORS.accentRed }]}>Red {tagRatio.red}%</Text>
                                        <Text style={[styles.ratioLabelText, { color: COLORS.accentGreen }]}>Green {tagRatio.green}%</Text>
                                        <Text style={[styles.ratioLabelText, { color: COLORS.accentBlue }]}>Custom {tagRatio.custom}%</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Chat Insights */}
                            <ChatInsightsCard insights={chatInsights} />

                            {/* Warning Analytics */}
                            <WarningChart data={getWarningAnalytics()} />

                            {/* Private Access Request Card */}
                            <View style={styles.accessCard}>
                                <View style={styles.accessCardHeader}>
                                    {accessRequestStatus === 'approved' ? (
                                        <Unlock size={24} color={COLORS.accentGreen} />
                                    ) : (
                                        <Lock size={24} color={COLORS.textSecondary} />
                                    )}
                                    <View style={styles.accessCardContent}>
                                        <Text style={styles.accessCardTitle}>Private Profile Access</Text>
                                        <Text style={styles.accessCardDesc}>
                                            {accessRequestStatus === 'approved'
                                                ? 'Access granted to private information'
                                                : accessRequestStatus === 'pending'
                                                    ? 'Request pending approval'
                                                    : accessRequestStatus === 'denied'
                                                        ? 'Access request was denied'
                                                        : 'Request access to see private details'}
                                        </Text>
                                    </View>
                                </View>
                                {accessRequestStatus === 'none' && (
                                    <TouchableOpacity
                                        style={styles.accessBtn}
                                        onPress={requestAccess}
                                        disabled={isRequestingAccess}
                                    >
                                        {isRequestingAccess ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.accessBtnText}>Request Access</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                {accessRequestStatus === 'pending' && (
                                    <View style={[styles.accessBtn, { backgroundColor: COLORS.accentOrange }]}>
                                        <Text style={styles.accessBtnText}>Pending</Text>
                                    </View>
                                )}
                                {accessRequestStatus === 'approved' && (
                                    <View style={[styles.accessBtn, { backgroundColor: COLORS.accentGreen }]}>
                                        <Text style={styles.accessBtnText}>Approved</Text>
                                    </View>
                                )}
                            </View>

                            {/* Category Tabs */}
                            <View style={styles.tabs}>
                                {(['red', 'green', 'custom', 'triggers'] as LockerType[]).map((locker) => (
                                    <TouchableOpacity
                                        key={locker}
                                        onPress={() => setActiveLocker(locker)}
                                        style={[
                                            styles.tab,
                                            activeLocker === locker && { backgroundColor: getLockerColor(locker), borderColor: getLockerColor(locker) }
                                        ]}
                                    >
                                        {locker === 'red' && <Frown size={16} color={activeLocker === locker ? '#fff' : COLORS.accentRed} />}
                                        {locker === 'green' && <Smile size={16} color={activeLocker === locker ? '#fff' : COLORS.accentGreen} />}
                                        {locker === 'custom' && <Slash size={16} color={activeLocker === locker ? '#fff' : COLORS.accentBlue} />}
                                        {locker === 'triggers' && <Target size={16} color={activeLocker === locker ? '#fff' : COLORS.accentOrange} />}
                                        <Text style={[styles.tabText, { color: activeLocker === locker ? '#fff' : COLORS.textSecondary }]}>
                                            {locker.charAt(0).toUpperCase() + locker.slice(1)} ({getLockerCount(locker)})
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Cards */}
                            <Text style={styles.sectionTitle}>
                                {activeLocker === 'red' ? 'Red Tags' : activeLocker === 'green' ? 'Green Tags' : activeLocker === 'custom' ? 'Custom Tags & Facts' : 'Triggers'}
                            </Text>
                            <Text style={styles.swipeHint}>Swipe left to edit or delete</Text>

                            {activeLocker === 'triggers' ? (
                                triggers.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Target size={40} color={COLORS.textMuted} />
                                        <Text style={styles.emptyText}>No triggers yet</Text>
                                    </View>
                                ) : (
                                    triggers.map((trigger) => (
                                        <SwipableCard
                                            key={trigger.id}
                                            item={trigger}
                                            color={COLORS.accentOrange}
                                            type="trigger"
                                            onEdit={() => handleEdit(trigger, 'trigger')}
                                            onDelete={() => handleDelete(trigger.id, 'trigger')}
                                        />
                                    ))
                                )
                            ) : activeLocker === 'custom' ? (
                                <>
                                    {facts.map((fact) => (
                                        <SwipableCard
                                            key={fact.id}
                                            item={fact}
                                            color={COLORS.accentBlue}
                                            type="fact"
                                            onEdit={() => handleEdit(fact, 'fact')}
                                            onDelete={() => handleDelete(fact.id, 'fact')}
                                        />
                                    ))}
                                    {tags.map((tag) => (
                                        <SwipableCard
                                            key={tag.id}
                                            item={tag}
                                            color={COLORS.accentBlue}
                                            type="tag"
                                            onEdit={() => handleEdit(tag, 'tag')}
                                            onDelete={() => handleDelete(tag.id, 'tag')}
                                        />
                                    ))}
                                    {facts.length === 0 && tags.length === 0 && (
                                        <View style={styles.emptyState}>
                                            <BookOpen size={40} color={COLORS.textMuted} />
                                            <Text style={styles.emptyText}>No custom tags or facts</Text>
                                        </View>
                                    )}
                                </>
                            ) : (
                                tags.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        {activeLocker === 'red' ? <Frown size={40} color={COLORS.textMuted} /> : <Smile size={40} color={COLORS.textMuted} />}
                                        <Text style={styles.emptyText}>No {activeLocker} tags yet</Text>
                                    </View>
                                ) : (
                                    tags.map((tag) => (
                                        <SwipableCard
                                            key={tag.id}
                                            item={tag}
                                            color={getLockerColor(activeLocker)}
                                            type="tag"
                                            onEdit={() => handleEdit(tag, 'tag')}
                                            onDelete={() => handleDelete(tag.id, 'tag')}
                                        />
                                    ))
                                )
                            )}
                        </>
                    )}
                </ScrollView>

                {/* FAB for adding facts */}
                {activeLocker === 'custom' && selectedProfile && (
                    <TouchableOpacity
                        onPress={() => setShowAddFact(true)}
                        style={styles.fab}
                    >
                        <Plus size={24} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* Profile Dropdown Modal */}
                <Modal visible={showProfileDropdown} transparent animationType="fade">
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowProfileDropdown(false)}
                    >
                        <View style={styles.dropdownContainer}>
                            <BlurView intensity={80} tint="dark" style={styles.dropdownBlur}>
                                <ScrollView style={{ maxHeight: 400 }}>
                                    {profiles.map((profile) => (
                                        <TouchableOpacity
                                            key={profile.id}
                                            onPress={() => { setSelectedProfile(profile); setShowProfileDropdown(false); }}
                                            style={styles.dropdownItem}
                                        >
                                            <Image source={{ uri: profile.avatar }} style={styles.dropdownAvatar} />
                                            <Text style={styles.dropdownName}>{profile.name}</Text>
                                            {selectedProfile?.id === profile.id && (
                                                <View style={styles.selectedDot} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </BlurView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Add Fact Modal */}
                <Modal visible={showAddFact} transparent animationType="slide">
                    <View style={styles.bottomModalOverlay}>
                        <BlurView intensity={80} tint="dark" style={styles.bottomModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Fact Warning</Text>
                                <TouchableOpacity onPress={() => setShowAddFact(false)}>
                                    <X size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.inputLabel}>Keyword</Text>
                            <TextInput
                                value={newKeyword}
                                onChangeText={setNewKeyword}
                                placeholder="e.g., birthday"
                                placeholderTextColor={COLORS.textMuted}
                                style={styles.input}
                            />
                            <Text style={styles.inputLabel}>Warning Message</Text>
                            <TextInput
                                value={newWarningText}
                                onChangeText={setNewWarningText}
                                placeholder="e.g., Remember their birthday!"
                                placeholderTextColor={COLORS.textMuted}
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                multiline
                            />
                            <TouchableOpacity style={styles.saveBtn} onPress={addFactWarning}>
                                <Text style={styles.saveBtnText}>Add Warning</Text>
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                </Modal>

                {/* Edit Modal */}
                <Modal visible={showEditModal} transparent animationType="slide">
                    <View style={styles.bottomModalOverlay}>
                        <BlurView intensity={80} tint="dark" style={styles.bottomModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit {editType}</Text>
                                <TouchableOpacity onPress={() => { setShowEditModal(false); setEditItem(null); }}>
                                    <X size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            {editType === 'fact' && (
                                <>
                                    <Text style={styles.inputLabel}>Keyword</Text>
                                    <TextInput
                                        value={newKeyword}
                                        onChangeText={setNewKeyword}
                                        style={styles.input}
                                    />
                                    <Text style={styles.inputLabel}>Warning Message</Text>
                                    <TextInput
                                        value={newWarningText}
                                        onChangeText={setNewWarningText}
                                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                        multiline
                                    />
                                </>
                            )}
                            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    profileSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    profileSelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    topRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    matchScoreContainer: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    matchScoreValue: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    matchScoreLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    tagRatioContainer: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    miniTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    tagRatioBar: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    ratioSegment: {
        height: '100%',
    },
    tagRatioLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    ratioLabelText: {
        fontSize: 10,
        fontWeight: '600',
    },
    insightsCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    insightsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    insightItem: {
        alignItems: 'center',
    },
    insightValue: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 8,
    },
    insightLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    ratioContainer: {
        marginTop: 8,
    },
    ratioLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    ratioBar: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    ratioFill: {
        height: '100%',
    },
    ratioLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    ratioText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    chartContainer: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    chartLegend: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    barsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 80,
    },
    barGroup: {
        alignItems: 'center',
    },
    barPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
    },
    bar: {
        width: 24,
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    tabs: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
    },
    swipeHint: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginBottom: 12,
    },
    cardWrapper: {
        position: 'relative',
    },
    cardActions: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 8,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    swipableCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardColorBar: {
        width: 4,
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    tagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    countText: {
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    cardMainText: {
        fontSize: 14,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    keywordText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 12,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accentBlue,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.accentBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-start',
        paddingTop: 120,
    },
    dropdownContainer: {
        marginHorizontal: 24,
    },
    dropdownBlur: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    dropdownAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    dropdownName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    selectedDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.accentBlue,
    },
    bottomModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomModal: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    inputLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
    },
    saveBtn: {
        backgroundColor: COLORS.accentBlue,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    accessCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    accessCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    accessCardContent: {
        flex: 1,
        marginLeft: 16,
    },
    accessCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    accessCardDesc: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    accessBtn: {
        backgroundColor: COLORS.accentBlue,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    accessBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
