import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    StyleSheet,
    Modal,
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Search,
    Filter,
    Map,
    Calendar,
    Clock,
    MapPin,
    Users,
    Ticket,
    Grid,
    List,
    Plus,
    ChevronRight,
    ChevronLeft,
    Heart,
    ArrowRight,
    Bookmark,
    LayoutDashboard,
    Edit,
    Trash2,
    Check,
    X,
    CheckCircle
} from 'lucide-react-native';
import HopinService, { Plan, PlanMember } from '../../services/HopinService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Dark map style for styling the map in dark mode
const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

export default function HopinExploreScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'dashboard'>('map');
    const [dashboardTab, setDashboardTab] = useState<'hosting' | 'joined' | 'tickets'>('hosting');
    const [searchQuery, setSearchQuery] = useState('');
    const [allPlans, setAllPlans] = useState<Plan[]>([]);
    const [invitations, setInvitations] = useState<Plan[]>([]);
    const [createdPlans, setCreatedPlans] = useState<Plan[]>([]);
    const [joinedPlans, setJoinedPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchResults, setSearchResults] = useState<Plan[] | null>(null);

    // Verify Modal
    const [verifyModalVisible, setVerifyModalVisible] = useState(false);
    const [selectedPlanForVerify, setSelectedPlanForVerify] = useState<Plan | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Toast
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

    // Map pinned location for creating plan
    const [pinnedLocation, setPinnedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    const isDark = mode === 'dark';
    const bg = isDark ? MONO.gray900 : MONO.white;
    const cardBg = isDark ? MONO.gray800 : MONO.gray100;
    const textPrimary = isDark ? MONO.white : MONO.black;
    const textSecondary = isDark ? MONO.gray400 : MONO.gray600;
    const accent = isDark ? MONO.white : MONO.black;

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const timer = setTimeout(() => performSearch(), 400);
            return () => clearTimeout(timer);
        } else {
            setSearchResults(null);
        }
    }, [searchQuery]);

    // Auto-hide toast
    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => setToast({ ...toast, visible: false }), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const fetchAllData = async () => {
        try {
            const [publicPlans, invites, myPlans] = await Promise.all([
                HopinService.fetchPublicPlans(),
                HopinService.fetchInvitations(),
                HopinService.fetchMyPlans()
            ]);
            setAllPlans(publicPlans);
            setInvitations(invites);
            setCreatedPlans(myPlans.created);
            setJoinedPlans(myPlans.joined);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const performSearch = async () => {
        const results = await HopinService.searchPlans(searchQuery);
        setSearchResults(results);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAllData();
    }, []);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return { day: '--', month: '---', time: '--:--' };
        const d = new Date(dateString);
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    };

    const getMediaUrl = (plan: Plan) => {
        if (plan.mediaUrls) {
            try {
                const urls = JSON.parse(plan.mediaUrls);
                if (urls.length > 0) return urls[0];
            } catch { }
        }
        return `https://picsum.photos/seed/${plan.id}/600/400`;
    };

    const getAttendeeCount = (plan: Plan) => {
        return plan.members?.filter(m => m.status === 'ACCEPTED' || m.status === 'VERIFIED').length || 0;
    };

    const handleAction = async (memberId: string, action: 'ACCEPT' | 'REJECT') => {
        try {
            const result = await HopinService.manageRequest(memberId, action);
            if (result.success) {
                fetchAllData();
                showToast(action === 'ACCEPT' ? `Accepted! Code: ${result.code}` : 'Request declined');
            } else {
                showToast(result.error || 'Failed', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        }
    };

    const handleDelete = async (planId: string) => {
        try {
            const result = await HopinService.deletePlan(planId);
            if (result.success) {
                fetchAllData();
                showToast('Event deleted');
            } else {
                showToast(result.error || 'Failed to delete', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        }
    };

    const handleVerify = async () => {
        if (!selectedPlanForVerify || !verifyCode) return;
        setVerifyLoading(true);
        setVerifyResult(null);

        try {
            const result = await HopinService.verifyAttendee(selectedPlanForVerify.id, verifyCode);
            if (result.success) {
                if (result.alreadyVerified) {
                    setVerifyResult({ type: 'success', msg: 'Already verified' });
                } else {
                    setVerifyResult({ type: 'success', msg: `Verified: ${result.user?.name || 'User'}` });
                    fetchAllData();
                }
            } else {
                setVerifyResult({ type: 'error', msg: result.error || 'Invalid code' });
            }
        } catch (error) {
            setVerifyResult({ type: 'error', msg: 'Verification failed' });
        } finally {
            setVerifyLoading(false);
        }
    };

    // Get plans by category
    const suggestedPlans = [...allPlans].sort((a, b) => getAttendeeCount(b) - getAttendeeCount(a)).slice(0, 5);
    const upcomingPlans = allPlans.filter(p => p.date).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime()).slice(0, 8);
    const newestPlans = allPlans.slice(0, 10);

    const getPendingRequests = (plan: Plan) => plan.members?.filter(m => m.status === 'PENDING') || [];

    // ==================== RENDER COMPONENTS ====================

    // Toast Component
    const Toast = () => {
        if (!toast.visible) return null;
        return (
            <View className="absolute top-20 left-5 right-5 z-50">
                <View className="flex-row items-center p-4 rounded-2xl" style={{ backgroundColor: toast.type === 'success' ? (isDark ? MONO.white : MONO.black) : '#c00' }}>
                    {toast.type === 'success' ? (
                        <CheckCircle size={20} color={isDark ? MONO.black : MONO.white} />
                    ) : (
                        <X size={20} color={MONO.white} />
                    )}
                    <Text style={[styles.fontSans, { fontSize: 14, color: toast.type === 'success' ? (isDark ? MONO.black : MONO.white) : MONO.white, marginLeft: 12, flex: 1 }]}>
                        {toast.message}
                    </Text>
                    <TouchableOpacity onPress={() => setToast({ ...toast, visible: false })}>
                        <X size={18} color={toast.type === 'success' ? (isDark ? MONO.black : MONO.white) : MONO.white} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Large featured card
    const FeaturedCard = ({ plan }: { plan: Plan }) => {
        const dateInfo = formatDate(plan.date);
        const attendees = getAttendeeCount(plan);
        return (
            <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="mb-6" style={{ width: SCREEN_WIDTH - 40 }}>
                <View className="rounded-3xl overflow-hidden" style={{ height: 380 }}>
                    <Image source={{ uri: getMediaUrl(plan) }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)'] as const} locations={[0.3, 1]} className="absolute inset-0" />
                    <View className="absolute top-5 left-5 items-center p-3 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                        <Text style={[styles.fontCondensed, { fontSize: 28, color: MONO.black, lineHeight: 28 }]}>{dateInfo.day}</Text>
                        <Text style={[styles.fontMono, { fontSize: 10, color: MONO.gray600, letterSpacing: 2 }]}>{dateInfo.month}</Text>
                    </View>
                    <View className="absolute top-5 right-5 flex-row items-center px-3 py-2 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                        <Users size={14} color={MONO.white} />
                        <Text style={[styles.fontMono, { fontSize: 12, color: MONO.white, marginLeft: 6 }]}>{attendees}</Text>
                    </View>
                    <View className="absolute bottom-0 left-0 right-0 p-6">
                        <Text style={[styles.fontMono, { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 }]}>{plan.type} EVENT</Text>
                        <Text style={[styles.fontSerif, { fontSize: 32, color: MONO.white, lineHeight: 36, marginBottom: 12 }]} numberOfLines={2}>{plan.title}</Text>
                        {plan.location && (
                            <View className="flex-row items-center">
                                <MapPin size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={[styles.fontSans, { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginLeft: 6 }]} numberOfLines={1}>{plan.location}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Compact list card
    const CompactCard = ({ plan }: { plan: Plan }) => {
        const dateInfo = formatDate(plan.date);
        const attendees = getAttendeeCount(plan);
        return (
            <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="flex-row items-center py-4" style={{ borderBottomWidth: 1, borderBottomColor: isDark ? MONO.gray800 : MONO.gray200 }}>
                <View className="w-14 mr-4 items-center">
                    <Text style={[styles.fontCondensed, { fontSize: 24, color: textPrimary }]}>{dateInfo.day}</Text>
                    <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>{dateInfo.month}</Text>
                </View>
                <View className="flex-1">
                    <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary, marginBottom: 4 }]} numberOfLines={1}>{plan.title}</Text>
                    <View className="flex-row items-center">
                        <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary }]}>{dateInfo.time}</Text>
                        <View className="flex-row items-center ml-3">
                            <Users size={12} color={textSecondary} />
                            <Text style={[styles.fontMono, { fontSize: 11, color: textSecondary, marginLeft: 4 }]}>{attendees}</Text>
                        </View>
                    </View>
                </View>
                <View className="w-16 h-16 rounded-xl overflow-hidden ml-3">
                    <Image source={{ uri: getMediaUrl(plan) }} className="w-full h-full" resizeMode="cover" />
                </View>
            </TouchableOpacity>
        );
    };

    // Grid card
    const GridCard = ({ plan }: { plan: Plan }) => {
        const dateInfo = formatDate(plan.date);
        const attendees = getAttendeeCount(plan);
        return (
            <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="mb-4" style={{ width: (SCREEN_WIDTH - 52) / 2 }}>
                <View className="rounded-2xl overflow-hidden" style={{ aspectRatio: 0.85 }}>
                    <Image source={{ uri: getMediaUrl(plan) }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)'] as const} locations={[0.4, 1]} className="absolute inset-0" />
                    <View className="absolute top-3 right-3 flex-row items-center px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <Users size={10} color={MONO.white} />
                        <Text style={[styles.fontMono, { fontSize: 10, color: MONO.white, marginLeft: 4 }]}>{attendees}</Text>
                    </View>
                    <View className="absolute bottom-0 left-0 right-0 p-4">
                        <Text style={[styles.fontMono, { fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 4 }]}>{dateInfo.month} {dateInfo.day}</Text>
                        <Text style={[styles.fontSerif, { fontSize: 16, color: MONO.white, lineHeight: 20 }]} numberOfLines={2}>{plan.title}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Invitation ticket with image
    const InviteTicket = ({ plan }: { plan: Plan }) => {
        const attendees = getAttendeeCount(plan);
        return (
            <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="mr-4 rounded-2xl overflow-hidden" style={{ width: 260 }}>
                <View style={{ height: 100 }}>
                    <Image source={{ uri: getMediaUrl(plan) }} className="w-full h-full" resizeMode="cover" />
                    <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                    <View className="absolute top-3 left-3 flex-row items-center">
                        <Ticket size={12} color={MONO.white} />
                        <Text style={[styles.fontMono, { fontSize: 9, color: MONO.white, marginLeft: 6, letterSpacing: 2 }]}>INVITATION</Text>
                    </View>
                    <View className="absolute top-3 right-3 flex-row items-center px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        <Users size={10} color={MONO.white} />
                        <Text style={[styles.fontMono, { fontSize: 10, color: MONO.white, marginLeft: 4 }]}>{attendees}</Text>
                    </View>
                </View>
                <View className="p-4" style={{ backgroundColor: isDark ? MONO.white : MONO.black }}>
                    <Text style={[styles.fontSerif, { fontSize: 16, color: isDark ? MONO.black : MONO.white, marginBottom: 8 }]} numberOfLines={2}>{plan.title}</Text>
                    <View className="flex-row items-center">
                        <Image source={{ uri: plan.creator?.profile?.avatarUrl || 'https://via.placeholder.com/40' }} className="w-6 h-6 rounded-full" />
                        <Text style={[styles.fontSans, { fontSize: 11, color: isDark ? MONO.gray600 : MONO.gray400, marginLeft: 8 }]}>from {plan.creator?.profile?.displayName || plan.creator?.name}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Dashboard hosting card
    const HostingCard = ({ plan }: { plan: Plan }) => {
        const pendingRequests = getPendingRequests(plan);
        const memberCount = plan.members?.filter(m => m.status === 'ACCEPTED' || m.status === 'VERIFIED').length || 0;
        const dateInfo = formatDate(plan.date);
        return (
            <View className="mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="p-4">
                    <View className="flex-row">
                        <View className="items-center mr-4">
                            <Text style={[styles.fontCondensed, { fontSize: 24, color: textPrimary }]}>{dateInfo.day}</Text>
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>{dateInfo.month}</Text>
                        </View>
                        <View className="flex-1">
                            <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary }]} numberOfLines={1}>{plan.title}</Text>
                            <View className="flex-row items-center mt-1">
                                <Users size={12} color={textSecondary} />
                                <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary, marginLeft: 4 }]}>{memberCount}</Text>
                            </View>
                        </View>
                        <View className="flex-row">
                            <TouchableOpacity onPress={() => router.push(`/hopin/create?edit=${plan.id}`)} className="w-9 h-9 rounded-xl items-center justify-center mr-1" style={{ backgroundColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                                <Edit size={14} color={textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(plan.id)} className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                                <Trash2 size={14} color={textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
                {pendingRequests.length > 0 && (
                    <View className="px-4 pb-4">
                        {pendingRequests.slice(0, 2).map(member => (
                            <View key={member.id} className="flex-row items-center py-2" style={{ borderTopWidth: 1, borderTopColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                                <Image source={{ uri: member.user?.profile?.avatarUrl || 'https://via.placeholder.com/32' }} className="w-8 h-8 rounded-full" />
                                <Text style={[styles.fontSans, { fontSize: 13, color: textPrimary, flex: 1, marginLeft: 10 }]}>{member.user?.name}</Text>
                                <TouchableOpacity onPress={() => handleAction(member.id, 'ACCEPT')} className="w-8 h-8 rounded-lg items-center justify-center mr-1" style={{ backgroundColor: accent }}>
                                    <Check size={14} color={isDark ? MONO.black : MONO.white} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleAction(member.id, 'REJECT')} className="w-8 h-8 rounded-lg items-center justify-center" style={{ borderWidth: 1, borderColor: textSecondary }}>
                                    <X size={14} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => { setSelectedPlanForVerify(plan); setVerifyCode(''); setVerifyResult(null); setVerifyModalVisible(true); }} className="flex-row items-center justify-center py-3 mt-2 rounded-xl" style={{ backgroundColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                            <Search size={14} color={textSecondary} />
                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, marginLeft: 8, letterSpacing: 1 }]}>VERIFY</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Dashboard joined card
    const JoinedCard = ({ plan }: { plan: any }) => {
        const dateInfo = formatDate(plan.date);
        return (
            <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                <View className="p-4">
                    <View className="flex-row">
                        <View className="items-center mr-4">
                            <Text style={[styles.fontCondensed, { fontSize: 24, color: textPrimary }]}>{dateInfo.day}</Text>
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>{dateInfo.month}</Text>
                        </View>
                        <View className="flex-1">
                            <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary }]} numberOfLines={1}>{plan.title}</Text>
                            {plan.creator && (
                                <View className="flex-row items-center mt-1">
                                    <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary }]}>by {plan.creator.name}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    {plan.myStatus === 'ACCEPTED' && plan.myVerificationCode && (
                        <View className="mt-3 p-3 rounded-xl items-center" style={{ backgroundColor: accent }}>
                            <Text style={[styles.fontMono, { fontSize: 9, color: isDark ? MONO.gray600 : MONO.gray400, letterSpacing: 2 }]}>YOUR CODE</Text>
                            <Text style={[styles.fontCondensed, { fontSize: 28, color: isDark ? MONO.black : MONO.white, letterSpacing: 4 }]}>{plan.myVerificationCode}</Text>
                        </View>
                    )}
                    {plan.myStatus === 'PENDING' && (
                        <View className="mt-3 p-3 rounded-xl items-center flex-row justify-center" style={{ borderWidth: 1, borderColor: textSecondary }}>
                            <Clock size={14} color={textSecondary} />
                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, marginLeft: 8, letterSpacing: 1 }]}>PENDING</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // Section header
    const SectionHeader = ({ title, count }: { title: string; count?: number }) => (
        <View className="flex-row items-end justify-between px-5 mb-4 mt-8">
            <View>
                <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 3, marginBottom: 4 }]}>{count ? `${count} EVENTS` : 'SECTION'}</Text>
                <Text style={[styles.fontSerif, { fontSize: 28, color: textPrimary }]}>{title}</Text>
            </View>
        </View>
    );

    // Map view with react-native-maps
    const MapViewComponent = () => {
        const plansWithLocation = allPlans.filter(p => p.latitude && p.longitude);
        const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

        const handleMapLongPress = (e: any) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setPinnedLocation({ latitude, longitude });
            setSelectedPlan(null);
        };

        const handleCreateAtPin = () => {
            if (pinnedLocation) {
                router.push(`/hopin/create?lat=${pinnedLocation.latitude}&lng=${pinnedLocation.longitude}`);
            }
        };

        return (
            <View className="flex-1">
                <MapView
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={{ flex: 1 }}
                    initialRegion={{
                        latitude: 20.5937,
                        longitude: 78.9629,
                        latitudeDelta: 25,
                        longitudeDelta: 25,
                    }}
                    customMapStyle={isDark ? darkMapStyle : []}
                    onLongPress={handleMapLongPress}
                    onPress={() => { setSelectedPlan(null); setPinnedLocation(null); }}
                >
                    {plansWithLocation.map(plan => (
                        <Marker
                            key={plan.id}
                            coordinate={{
                                latitude: plan.latitude!,
                                longitude: plan.longitude!,
                            }}
                            onPress={() => { setSelectedPlan(plan); setPinnedLocation(null); }}
                        >
                            <View className="items-center">
                                <View className="p-2 rounded-full" style={{ backgroundColor: accent }}>
                                    <MapPin size={16} color={isDark ? MONO.black : MONO.white} />
                                </View>
                            </View>
                        </Marker>
                    ))}
                    {pinnedLocation && (
                        <Marker coordinate={pinnedLocation}>
                            <View className="items-center">
                                <View className="p-3 rounded-full" style={{ backgroundColor: isDark ? MONO.white : MONO.black, borderWidth: 3, borderColor: isDark ? MONO.gray600 : MONO.gray300 }}>
                                    <Plus size={20} color={isDark ? MONO.black : MONO.white} />
                                </View>
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Pinned location - create card */}
                {pinnedLocation && !selectedPlan && (
                    <View className="absolute bottom-28 left-5 right-5">
                        <TouchableOpacity
                            onPress={handleCreateAtPin}
                            className="p-5 rounded-2xl flex-row items-center justify-between"
                            style={{ backgroundColor: accent }}
                        >
                            <View>
                                <Text style={[styles.fontMono, { fontSize: 9, color: isDark ? MONO.gray600 : MONO.gray300, letterSpacing: 2 }]}>CREATE EVENT HERE</Text>
                                <Text style={[styles.fontSerif, { fontSize: 18, color: isDark ? MONO.black : MONO.white }]}>New Plan at Pin</Text>
                                <Text style={[styles.fontMono, { fontSize: 10, color: isDark ? MONO.gray500 : MONO.gray400, marginTop: 4 }]}>
                                    {pinnedLocation.latitude.toFixed(4)}, {pinnedLocation.longitude.toFixed(4)}
                                </Text>
                            </View>
                            <Plus size={24} color={isDark ? MONO.black : MONO.white} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setPinnedLocation(null)} className="absolute top-2 right-2 p-2">
                            <X size={16} color={isDark ? MONO.gray600 : MONO.gray300} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Selected plan card */}
                {selectedPlan && !pinnedLocation && (
                    <View className="absolute bottom-28 left-5 right-5">
                        <TouchableOpacity
                            onPress={() => router.push(`/hopin/${selectedPlan.id}`)}
                            className="rounded-2xl overflow-hidden"
                            style={{ backgroundColor: cardBg }}
                        >
                            <View className="flex-row">
                                <View style={{ width: 100, height: 100 }}>
                                    <Image source={{ uri: getMediaUrl(selectedPlan) }} className="w-full h-full" resizeMode="cover" />
                                </View>
                                <View className="flex-1 p-4">
                                    <Text style={[styles.fontSerif, { fontSize: 16, color: textPrimary }]} numberOfLines={1}>{selectedPlan.title}</Text>
                                    {selectedPlan.location && (
                                        <View className="flex-row items-center mt-2">
                                            <MapPin size={12} color={textSecondary} />
                                            <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary, marginLeft: 6 }]} numberOfLines={1}>{selectedPlan.location}</Text>
                                        </View>
                                    )}
                                    <View className="flex-row items-center mt-2">
                                        <Users size={12} color={textSecondary} />
                                        <Text style={[styles.fontMono, { fontSize: 11, color: textSecondary, marginLeft: 6 }]}>{getAttendeeCount(selectedPlan)} attending</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedPlan(null)} className="p-4">
                                    <X size={18} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Suggested events overlay */}
                {suggestedPlans.length > 0 && !selectedPlan && !pinnedLocation && (
                    <View className="absolute bottom-24 left-0 right-0">
                        <View className="px-5 mb-3">
                            <Text style={[styles.fontMono, { fontSize: 10, color: MONO.white, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>LONG PRESS TO PIN A LOCATION</Text>
                        </View>
                        <FlatList
                            data={suggestedPlans}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => router.push(`/hopin/${item.id}`)} className="mr-3 rounded-2xl overflow-hidden" style={{ width: 200, backgroundColor: cardBg }}>
                                    <View style={{ height: 80 }}><Image source={{ uri: getMediaUrl(item) }} className="w-full h-full" resizeMode="cover" /></View>
                                    <View className="p-3">
                                        <Text style={[styles.fontSerif, { fontSize: 14, color: textPrimary }]} numberOfLines={1}>{item.title}</Text>
                                        <View className="flex-row items-center mt-1">
                                            <Users size={10} color={textSecondary} />
                                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, marginLeft: 4 }]}>{getAttendeeCount(item)}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingHorizontal: 20 }}
                        />
                    </View>
                )}
            </View>
        );
    };

    // Dashboard view (replaces tickets tab)
    const DashboardView = () => (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 130, paddingHorizontal: 20, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />} keyboardShouldPersistTaps="handled">
            {/* Sub tabs */}
            <View className="flex-row mb-6 rounded-xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                {(['hosting', 'joined', 'tickets'] as const).map(tab => (
                    <TouchableOpacity key={tab} onPress={() => setDashboardTab(tab)} className="flex-1 py-3 items-center" style={{ backgroundColor: dashboardTab === tab ? accent : 'transparent' }}>
                        <Text style={[styles.fontMono, { fontSize: 10, letterSpacing: 1, color: dashboardTab === tab ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>
                            {tab.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Create button */}
            <TouchableOpacity onPress={() => router.push('/hopin/create')} className="p-5 rounded-2xl mb-6 flex-row items-center justify-between" style={{ backgroundColor: accent }}>
                <View>
                    <Text style={[styles.fontMono, { fontSize: 9, color: isDark ? MONO.gray600 : MONO.gray300, letterSpacing: 2 }]}>HOST AN EVENT</Text>
                    <Text style={[styles.fontSerif, { fontSize: 20, color: isDark ? MONO.black : MONO.white }]}>Create New</Text>
                </View>
                <Plus size={24} color={isDark ? MONO.black : MONO.white} />
            </TouchableOpacity>

            {dashboardTab === 'hosting' && (
                <>
                    {createdPlans.length === 0 ? (
                        <View className="items-center py-16">
                            <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary }]}>No events yet</Text>
                            <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginTop: 4 }]}>Create your first event</Text>
                        </View>
                    ) : (
                        createdPlans.map(plan => <HostingCard key={plan.id} plan={plan} />)
                    )}
                </>
            )}

            {dashboardTab === 'joined' && (
                <>
                    {joinedPlans.length === 0 ? (
                        <View className="items-center py-16">
                            <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary }]}>No joined events</Text>
                            <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginTop: 4 }]}>Explore events to join</Text>
                        </View>
                    ) : (
                        joinedPlans.map(plan => <JoinedCard key={plan.id} plan={plan} />)
                    )}
                </>
            )}

            {dashboardTab === 'tickets' && (
                <>
                    {invitations.length === 0 && joinedPlans.filter(p => p.myStatus === 'ACCEPTED').length === 0 ? (
                        <View className="items-center py-16">
                            <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary }]}>No tickets</Text>
                            <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginTop: 4 }]}>Your event tickets will appear here</Text>
                        </View>
                    ) : (
                        <>
                            {invitations.length > 0 && (
                                <>
                                    <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>INVITATIONS</Text>
                                    {invitations.map(plan => <CompactCard key={plan.id} plan={plan} />)}
                                </>
                            )}
                            {joinedPlans.filter(p => p.myStatus === 'ACCEPTED' && p.myVerificationCode).map(plan => <JoinedCard key={plan.id} plan={plan} />)}
                        </>
                    )}
                </>
            )}
        </ScrollView>
    );

    // Explore view
    const ExploreView = () => (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />} contentContainerStyle={{ paddingTop: 130 }} keyboardShouldPersistTaps="handled">
            <View className="px-5 mb-4">
                <View className="flex-row items-center px-4 py-3 rounded-xl" style={{ backgroundColor: cardBg }}>
                    <Search size={18} color={textSecondary} />
                    <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." placeholderTextColor={textSecondary} className="flex-1 mx-3" style={[styles.fontSans, { fontSize: 15, color: textPrimary }]} />
                    <Filter size={16} color={textSecondary} />
                </View>
            </View>
            {invitations.length > 0 && !searchResults && (
                <>
                    <SectionHeader title="Invitations" count={invitations.length} />
                    <FlatList data={invitations} horizontal showsHorizontalScrollIndicator={false} renderItem={({ item }) => <InviteTicket plan={item} />} keyExtractor={item => item.id} contentContainerStyle={{ paddingHorizontal: 20 }} />
                </>
            )}
            {!searchResults && suggestedPlans.length > 0 && (
                <>
                    <SectionHeader title="Popular" count={suggestedPlans.length} />
                    <View className="px-5">{suggestedPlans.slice(0, 3).map(plan => <FeaturedCard key={plan.id} plan={plan} />)}</View>
                </>
            )}
            {!searchResults && newestPlans.length > 0 && (
                <>
                    <SectionHeader title="Discover" count={newestPlans.length} />
                    <View className="px-5 flex-row flex-wrap justify-between">{newestPlans.slice(0, 6).map(plan => <GridCard key={plan.id} plan={plan} />)}</View>
                </>
            )}
            {searchResults && (
                <>
                    <SectionHeader title="Results" count={searchResults.length} />
                    <View className="px-5">
                        {searchResults.length === 0 ? <Text style={[styles.fontSans, { fontSize: 16, color: textSecondary, textAlign: 'center', paddingVertical: 40 }]}>No events found</Text> : searchResults.map(plan => <CompactCard key={plan.id} plan={plan} />)}
                    </View>
                </>
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );

    // ==================== MAIN RENDER ====================

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: bg }}>
                <ActivityIndicator size="large" color={textPrimary} />
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: bg }}>
            <Toast />
            {activeTab === 'map' && <MapViewComponent />}
            {activeTab === 'explore' && <ExploreView />}
            {activeTab === 'dashboard' && <DashboardView />}

            {/* Tab bar */}
            <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
                <View className="mx-5 mb-4">
                    <View className="flex-row rounded-full overflow-hidden" style={{ backgroundColor: accent }}>
                        {[{ key: 'map', icon: Map, label: 'MAP' }, { key: 'explore', icon: Grid, label: 'EXPLORE' }, { key: 'dashboard', icon: LayoutDashboard, label: 'DASHBOARD' }].map(tab => (
                            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key as any)} className="flex-1 py-4 items-center" style={{ backgroundColor: activeTab === tab.key ? (isDark ? MONO.gray700 : MONO.gray200) : 'transparent' }}>
                                <tab.icon size={20} color={activeTab === tab.key ? textPrimary : (isDark ? MONO.gray600 : MONO.gray400)} />
                                <Text style={[styles.fontMono, { fontSize: 9, marginTop: 4, letterSpacing: 1, color: activeTab === tab.key ? textPrimary : (isDark ? MONO.gray600 : MONO.gray400) }]}>{tab.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </SafeAreaView>

            {/* Header */}
            <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0" style={{ backgroundColor: activeTab === 'map' ? 'transparent' : bg }}>
                <View className="flex-row items-center justify-between px-5 py-3">
                    <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: activeTab === 'map' ? 'rgba(0,0,0,0.3)' : cardBg }}>
                        <ChevronLeft size={24} color={activeTab === 'map' ? MONO.white : textPrimary} />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text style={[styles.fontMono, { fontSize: 10, color: activeTab === 'map' ? 'rgba(255,255,255,0.7)' : textSecondary, letterSpacing: 3 }]}>DISCOVER</Text>
                        <Text style={[styles.fontSerif, { fontSize: 28, color: activeTab === 'map' ? MONO.white : textPrimary }]}>Hopin</Text>
                    </View>
                    <View className="w-12" />
                </View>
            </SafeAreaView>

            {/* Verify Modal */}
            <Modal visible={verifyModalVisible} transparent animationType="fade" onRequestClose={() => setVerifyModalVisible(false)}>
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <View className="w-80 rounded-3xl p-6" style={{ backgroundColor: isDark ? MONO.gray800 : MONO.white }}>
                        <View className="flex-row items-center justify-between mb-6">
                            <Text style={[styles.fontSerif, { fontSize: 22, color: textPrimary }]}>Verify</Text>
                            <TouchableOpacity onPress={() => setVerifyModalVisible(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginBottom: 16 }]}>Enter the 7-digit code from attendee</Text>
                        <TextInput value={verifyCode} onChangeText={setVerifyCode} placeholder="0000000" placeholderTextColor={textSecondary} keyboardType="number-pad" maxLength={7} className="text-center py-5 rounded-2xl mb-4" style={[styles.fontCondensed, { fontSize: 32, letterSpacing: 8, backgroundColor: cardBg, color: textPrimary }]} />
                        <TouchableOpacity onPress={handleVerify} disabled={verifyLoading || verifyCode.length !== 7} className="py-4 rounded-2xl items-center mb-4" style={{ backgroundColor: verifyCode.length === 7 ? accent : cardBg }}>
                            {verifyLoading ? <ActivityIndicator color={isDark ? MONO.black : MONO.white} /> : <Text style={[styles.fontMono, { fontSize: 12, letterSpacing: 2, color: verifyCode.length === 7 ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>VERIFY</Text>}
                        </TouchableOpacity>
                        {verifyResult && (
                            <View className="p-4 rounded-2xl" style={{ backgroundColor: verifyResult.type === 'error' ? 'rgba(200,0,0,0.1)' : cardBg }}>
                                <Text style={[styles.fontSans, { fontSize: 14, color: verifyResult.type === 'error' ? '#c00' : textPrimary, textAlign: 'center' }]}>{verifyResult.msg}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    fontSerif: { fontFamily: 'System', fontWeight: '700' },
    fontSans: { fontFamily: 'System', fontWeight: '400' },
    fontMono: { fontFamily: 'System', fontWeight: '500' },
    fontCondensed: { fontFamily: 'System', fontWeight: '700' },
});
