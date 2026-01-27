import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Linking,
    Dimensions,
    StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    Heart,
    Calendar,
    Clock,
    MapPin,
    Users,
    Globe,
    ExternalLink,
    Share2,
    Ticket,
    CheckCircle,
    XCircle,
    Star,
    ArrowRight,
    AlertCircle,
    X
} from 'lucide-react-native';
import HopinService, { Plan, PlanMember } from '../../services/HopinService';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Monochrome palette
const MONO = {
    black: '#000000',
    white: '#FFFFFF',
    gray100: '#F8F8F8',
    gray200: '#E8E8E8',
    gray300: '#D0D0D0',
    gray400: '#A0A0A0',
    gray500: '#707070',
    gray600: '#505050',
    gray700: '#303030',
    gray800: '#1A1A1A',
    gray900: '#0A0A0A',
};

export default function EventDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, mode } = useTheme();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [myMembership, setMyMembership] = useState<PlanMember | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    const isDark = mode === 'dark';
    const bg = isDark ? MONO.gray900 : MONO.white;
    const cardBg = isDark ? MONO.gray800 : MONO.gray100;
    const textPrimary = isDark ? MONO.white : MONO.black;
    const textSecondary = isDark ? MONO.gray400 : MONO.gray600;
    const accent = isDark ? MONO.white : MONO.black;

    // Toast state
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
    };

    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    // Toast Component
    const Toast = () => {
        if (!toast.visible) return null;
        return (
            <View className="absolute top-20 left-5 right-5 z-50">
                <View className="flex-row items-center p-4 rounded-2xl" style={{ backgroundColor: toast.type === 'error' ? '#c00' : accent }}>
                    {toast.type === 'error' ? <AlertCircle size={20} color={MONO.white} /> : <CheckCircle size={20} color={isDark ? MONO.black : MONO.white} />}
                    <Text style={[styles.fontSans, { fontSize: 14, color: toast.type === 'error' ? MONO.white : (isDark ? MONO.black : MONO.white), marginLeft: 12, flex: 1 }]}>{toast.message}</Text>
                    <TouchableOpacity onPress={() => setToast(prev => ({ ...prev, visible: false }))}>
                        <X size={18} color={toast.type === 'error' ? MONO.white : (isDark ? MONO.black : MONO.white)} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        if (!id) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            const planData = await HopinService.fetchPlanById(id);
            setPlan(planData);

            if (user && planData) {
                const membership = planData.members?.find(m => m.userId === user.id);
                setMyMembership(membership || null);
            }
        } catch (error) {
            console.error('Error fetching plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestToJoin = async () => {
        if (!plan) return;
        setActionLoading(true);
        try {
            const result = await HopinService.requestToJoin(plan.id);
            if (result.success) {
                setMyMembership({ status: 'PENDING' } as PlanMember);
                showToast('Request sent! The host will review it.', 'success');
            } else {
                showToast(result.error || 'Failed to send request', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAcceptInvite = async () => {
        if (!plan) return;
        setActionLoading(true);
        try {
            const result = await HopinService.respondToInvite(plan.id, true);
            if (result.success) {
                fetchData();
                showToast('You have joined this event!', 'success');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectInvite = async () => {
        if (!plan) return;
        setActionLoading(true);
        try {
            const result = await HopinService.respondToInvite(plan.id, false);
            if (result.success) {
                setMyMembership({ status: 'REJECTED' } as PlanMember);
                showToast('Invitation declined', 'success');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const openMaps = () => {
        if (plan?.locationLink) {
            Linking.openURL(plan.locationLink);
        } else if (plan?.latitude && plan?.longitude) {
            Linking.openURL(`https://www.google.com/maps?q=${plan.latitude},${plan.longitude}`);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: bg }}>
                <ActivityIndicator size="large" color={textPrimary} />
            </View>
        );
    }

    if (!plan) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: bg }}>
                <Text style={[styles.fontSerif, { fontSize: 24, color: textPrimary }]}>Not Found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-6 px-8 py-4 rounded-full" style={{ backgroundColor: accent }}>
                    <Text style={[styles.fontMono, { fontSize: 12, color: isDark ? MONO.black : MONO.white, letterSpacing: 2 }]}>GO BACK</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const mediaUrls = plan.mediaUrls ? JSON.parse(plan.mediaUrls) : [];
    const heroImage = mediaUrls[0] || `https://picsum.photos/seed/${plan.id}/800/600`;
    const tags = plan.slashes ? JSON.parse(plan.slashes) : [];
    const acceptedMembers = plan.members?.filter(m => m.status === 'ACCEPTED' || m.status === 'VERIFIED') || [];
    const isCreator = currentUserId === plan.creatorId;

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
            time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    };

    const dateInfo = plan.date ? formatDate(plan.date) : null;

    // Action button config
    const getActionConfig = () => {
        if (isCreator) return { text: 'YOU ARE HOSTING', disabled: true };
        if (!myMembership) return { text: 'REQUEST ACCESS', disabled: false, action: handleRequestToJoin };
        switch (myMembership.status) {
            case 'PENDING': return { text: 'PENDING APPROVAL', disabled: true };
            case 'INVITED': return { text: 'ACCEPT INVITATION', disabled: false, action: handleAcceptInvite, showReject: true };
            case 'ACCEPTED': return { text: 'YOU ARE IN', disabled: true, code: myMembership.verificationCode };
            case 'VERIFIED': return { text: 'VERIFIED', disabled: true };
            case 'REJECTED': return { text: 'DECLINED', disabled: true };
            default: return { text: 'REQUEST ACCESS', disabled: false, action: handleRequestToJoin };
        }
    };

    const actionConfig = getActionConfig();

    return (
        <View className="flex-1" style={{ backgroundColor: bg }}>
            <Toast />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Hero */}
                <View style={{ height: 420 }}>
                    <Image source={{ uri: heroImage }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.95)'] as const}
                        locations={[0, 0.3, 1]}
                        className="absolute inset-0"
                    />

                    {/* Header */}
                    <SafeAreaView className="absolute top-0 left-0 right-0">
                        <View className="flex-row items-center justify-between px-5 py-3">
                            <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                <ChevronLeft size={24} color={MONO.white} />
                            </TouchableOpacity>
                            <View className="flex-row">
                                <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} className="w-12 h-12 rounded-full items-center justify-center mr-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                    <Heart size={20} color={MONO.white} fill={isFavorite ? MONO.white : 'transparent'} />
                                </TouchableOpacity>
                                <TouchableOpacity className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                    <Share2 size={20} color={MONO.white} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>

                    {/* Title overlay */}
                    <View className="absolute bottom-0 left-0 right-0 p-6">
                        {dateInfo && (
                            <View className="flex-row items-end mb-4">
                                <View className="items-center mr-4 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                                    <Text style={[styles.fontCondensed, { fontSize: 36, color: MONO.white, lineHeight: 36 }]}>{dateInfo.day}</Text>
                                    <Text style={[styles.fontMono, { fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 2 }]}>{dateInfo.month}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text style={[styles.fontSans, { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }]}>{dateInfo.weekday}</Text>
                                    <Text style={[styles.fontMono, { fontSize: 16, color: MONO.white, letterSpacing: 1 }]}>{dateInfo.time}</Text>
                                </View>
                            </View>
                        )}
                        <Text style={[styles.fontMono, { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginBottom: 8 }]}>
                            {plan.type} EVENT
                        </Text>
                        <Text style={[styles.fontSerif, { fontSize: 36, color: MONO.white, lineHeight: 40 }]} numberOfLines={2}>
                            {plan.title}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View className="px-6 py-8" style={{ backgroundColor: bg }}>
                    {/* Attendees */}
                    <View className="flex-row items-center mb-8 pb-8" style={{ borderBottomWidth: 1, borderBottomColor: isDark ? MONO.gray800 : MONO.gray200 }}>
                        <View className="flex-row">
                            {acceptedMembers.slice(0, 5).map((m, i) => (
                                <View key={m.id} className="rounded-full border-2 overflow-hidden" style={{ width: 40, height: 40, marginLeft: i > 0 ? -12 : 0, borderColor: bg }}>
                                    <Image source={{ uri: m.user?.profile?.avatarUrl || 'https://via.placeholder.com/50' }} className="w-full h-full" />
                                </View>
                            ))}
                        </View>
                        <View className="flex-1 ml-4">
                            <Text style={[styles.fontCondensed, { fontSize: 28, color: textPrimary }]}>{acceptedMembers.length}</Text>
                            <Text style={[styles.fontSans, { fontSize: 13, color: textSecondary }]}>Attending</Text>
                        </View>
                        <View className="items-center px-4 py-2 rounded-full" style={{ borderWidth: 1, borderColor: isDark ? MONO.gray700 : MONO.gray300 }}>
                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 1 }]}>
                                {plan.maxSize ? `${acceptedMembers.length}/${plan.maxSize}` : 'OPEN'}
                            </Text>
                        </View>
                    </View>

                    {/* Host */}
                    {plan.creator && (
                        <View className="flex-row items-center mb-8">
                            <Image source={{ uri: plan.creator.profile?.avatarUrl || 'https://via.placeholder.com/50' }} className="w-16 h-16 rounded-2xl" />
                            <View className="flex-1 ml-4">
                                <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 4 }]}>HOSTED BY</Text>
                                <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary }]}>{plan.creator.profile?.displayName || plan.creator.name}</Text>
                            </View>
                            <Star size={16} color={textSecondary} />
                        </View>
                    )}

                    {/* About */}
                    {plan.description && (
                        <View className="mb-8">
                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 3, marginBottom: 12 }]}>ABOUT</Text>
                            <Text style={[styles.fontSans, { fontSize: 16, color: textPrimary, lineHeight: 26 }]}>{plan.description}</Text>
                        </View>
                    )}

                    {/* Location */}
                    {plan.location && (
                        <TouchableOpacity onPress={openMaps} className="flex-row items-center p-5 rounded-2xl mb-4" style={{ backgroundColor: cardBg }}>
                            <MapPin size={20} color={textSecondary} />
                            <View className="flex-1 mx-4">
                                <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 2, marginBottom: 2 }]}>LOCATION</Text>
                                <Text style={[styles.fontSans, { fontSize: 15, color: textPrimary }]} numberOfLines={1}>{plan.location}</Text>
                            </View>
                            <ExternalLink size={16} color={textSecondary} />
                        </TouchableOpacity>
                    )}

                    {/* Details grid */}
                    <View className="flex-row mb-8">
                        <View className="flex-1 p-5 rounded-2xl mr-2" style={{ backgroundColor: cardBg }}>
                            <Globe size={18} color={textSecondary} />
                            <Text style={[styles.fontCondensed, { fontSize: 20, color: textPrimary, marginTop: 12 }]}>{plan.visibility}</Text>
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1, marginTop: 2 }]}>VISIBILITY</Text>
                        </View>
                        <View className="flex-1 p-5 rounded-2xl ml-2" style={{ backgroundColor: cardBg }}>
                            <Users size={18} color={textSecondary} />
                            <Text style={[styles.fontCondensed, { fontSize: 20, color: textPrimary, marginTop: 12 }]}>{plan.type}</Text>
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1, marginTop: 2 }]}>TYPE</Text>
                        </View>
                    </View>

                    {/* Slashes */}
                    {tags.length > 0 && (
                        <View className="mb-8">
                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 3, marginBottom: 12 }]}>SLASHES</Text>
                            <View className="flex-row flex-wrap">
                                {tags.map((tag: string, i: number) => (
                                    <View key={i} className="px-4 py-2 rounded-full mr-2 mb-2" style={{ borderWidth: 1, borderColor: isDark ? MONO.gray700 : MONO.gray300 }}>
                                        <Text style={[styles.fontSans, { fontSize: 13, color: textSecondary }]}>/{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Ticket */}
                    {(actionConfig as any).code && (
                        <View className="rounded-3xl overflow-hidden mb-8" style={{ backgroundColor: accent }}>
                            <View className="p-6">
                                <View className="flex-row items-center mb-4">
                                    <Ticket size={20} color={isDark ? MONO.black : MONO.white} />
                                    <Text style={[styles.fontMono, { fontSize: 10, color: isDark ? MONO.gray600 : MONO.gray400, marginLeft: 12, letterSpacing: 2 }]}>YOUR TICKET</Text>
                                </View>
                                <View className="p-5 rounded-2xl items-center" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }}>
                                    <Text style={[styles.fontMono, { fontSize: 10, color: isDark ? MONO.gray600 : MONO.gray400, letterSpacing: 2, marginBottom: 8 }]}>VERIFICATION CODE</Text>
                                    <Text style={[styles.fontCondensed, { fontSize: 48, color: isDark ? MONO.black : MONO.white, letterSpacing: 8 }]}>{(actionConfig as any).code}</Text>
                                </View>
                                <Text style={[styles.fontSans, { fontSize: 12, color: isDark ? MONO.gray600 : MONO.gray400, textAlign: 'center', marginTop: 12 }]}>
                                    Show this code to the host at the event
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={{ height: 140 }} />
            </ScrollView>

            {/* Bottom action */}
            <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-6 pb-6" style={{ backgroundColor: bg }}>
                {(actionConfig as any).showReject && (
                    <TouchableOpacity onPress={handleRejectInvite} className="py-4 mb-3 items-center rounded-2xl" style={{ borderWidth: 1, borderColor: isDark ? MONO.gray700 : MONO.gray300 }}>
                        <Text style={[styles.fontMono, { fontSize: 12, color: textSecondary, letterSpacing: 2 }]}>DECLINE</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={actionConfig.action}
                    disabled={actionConfig.disabled || actionLoading}
                    className="py-5 items-center rounded-2xl"
                    style={{ backgroundColor: actionConfig.disabled ? cardBg : accent }}
                >
                    {actionLoading ? (
                        <ActivityIndicator color={isDark ? MONO.black : MONO.white} />
                    ) : (
                        <Text style={[styles.fontMono, { fontSize: 13, color: actionConfig.disabled ? textSecondary : (isDark ? MONO.black : MONO.white), letterSpacing: 3 }]}>
                            {actionConfig.text}
                        </Text>
                    )}
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

// Typography styles
const styles = StyleSheet.create({
    fontSerif: {
        fontFamily: 'System',
        fontWeight: '700',
    },
    fontSans: {
        fontFamily: 'System',
        fontWeight: '400',
    },
    fontMono: {
        fontFamily: 'System',
        fontWeight: '500',
    },
    fontCondensed: {
        fontFamily: 'System',
        fontWeight: '700',
    },
});
