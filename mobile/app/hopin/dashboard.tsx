import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Modal,
    StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import {
    ChevronLeft,
    Plus,
    Calendar,
    MapPin,
    Users,
    Check,
    X,
    Edit,
    Trash2,
    Ticket,
    Clock,
    CheckCircle,
    Search,
    AlertCircle
} from 'lucide-react-native';
import HopinService, { Plan, PlanMember } from '../../services/HopinService';

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

export default function HopinDashboardScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [activeTab, setActiveTab] = useState<'hosting' | 'joined'>('hosting');
    const [createdPlans, setCreatedPlans] = useState<Plan[]>([]);
    const [joinedPlans, setJoinedPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Verification Modal
    const [verifyModalVisible, setVerifyModalVisible] = useState(false);
    const [selectedPlanForVerify, setSelectedPlanForVerify] = useState<Plan | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

    const isDark = mode === 'dark';
    const bg = isDark ? MONO.gray900 : MONO.white;
    const cardBg = isDark ? MONO.gray800 : MONO.gray100;
    const textPrimary = isDark ? MONO.white : MONO.black;
    const textSecondary = isDark ? MONO.gray400 : MONO.gray600;
    const accent = isDark ? MONO.white : MONO.black;

    // Toast state
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);

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
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const data = await HopinService.fetchMyPlans();
            setCreatedPlans(data.created);
            setJoinedPlans(data.joined);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
    };

    const handleAction = async (memberId: string, action: 'ACCEPT' | 'REJECT') => {
        try {
            const result = await HopinService.manageRequest(memberId, action);
            if (result.success) {
                fetchDashboard();
                if (action === 'ACCEPT') {
                    showToast(`Accepted! Code: ${result.code}`, 'success');
                } else {
                    showToast('Request declined', 'success');
                }
            } else {
                showToast(result.error || 'Failed', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        }
    };

    const confirmDelete = (planId: string) => {
        setPlanToDelete(planId);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        setDeleteModalVisible(false);
        const result = await HopinService.deletePlan(planToDelete);
        if (result.success) {
            fetchDashboard();
            showToast('Event deleted', 'success');
        } else {
            showToast(result.error || 'Failed to delete', 'error');
        }
        setPlanToDelete(null);
    };

    const handleVerify = async () => {
        if (!selectedPlanForVerify || !verifyCode) return;
        setVerifyLoading(true);
        setVerifyResult(null);

        try {
            const result = await HopinService.verifyAttendee(selectedPlanForVerify.id, verifyCode);
            if (result.success) {
                if (result.alreadyVerified) {
                    setVerifyResult({ type: 'info', msg: 'Already verified' });
                } else {
                    setVerifyResult({ type: 'success', msg: `Verified: ${result.user?.name || 'User'}` });
                    fetchDashboard();
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

    const formatDate = (dateString: string | null) => {
        if (!dateString) return { day: '--', month: '---' };
        const d = new Date(dateString);
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
        };
    };

    const getPendingRequests = (plan: Plan) => plan.members?.filter(m => m.status === 'PENDING') || [];

    // ==================== RENDER COMPONENTS ====================

    const HostingCard = ({ plan }: { plan: Plan }) => {
        const pendingRequests = getPendingRequests(plan);
        const memberCount = plan.members?.filter(m => m.status === 'ACCEPTED' || m.status === 'VERIFIED').length || 0;
        const dateInfo = formatDate(plan.date);

        return (
            <View className="mb-6 rounded-3xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                {/* Header */}
                <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="p-5">
                    <View className="flex-row">
                        <View className="items-center mr-4">
                            <Text style={[styles.fontCondensed, { fontSize: 28, color: textPrimary }]}>{dateInfo.day}</Text>
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>{dateInfo.month}</Text>
                        </View>
                        <View className="flex-1">
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 2, marginBottom: 4 }]}>{plan.type}</Text>
                            <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary }]} numberOfLines={1}>{plan.title}</Text>
                            <View className="flex-row items-center mt-2">
                                <Users size={12} color={textSecondary} />
                                <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary, marginLeft: 6 }]}>{memberCount} attending</Text>
                            </View>
                        </View>
                        <View className="flex-row">
                            <TouchableOpacity onPress={() => router.push(`/hopin/create?edit=${plan.id}`)} className="w-10 h-10 rounded-xl items-center justify-center mr-2" style={{ backgroundColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                                <Edit size={16} color={textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmDelete(plan.id)} className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                                <Trash2 size={16} color={textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                    <View className="px-5 pb-5">
                        <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>
                            {pendingRequests.length} PENDING REQUEST{pendingRequests.length > 1 ? 'S' : ''}
                        </Text>
                        {pendingRequests.map(member => (
                            <View key={member.id} className="flex-row items-center py-3" style={{ borderTopWidth: 1, borderTopColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                                <Image source={{ uri: member.user?.profile?.avatarUrl || 'https://via.placeholder.com/40' }} className="w-10 h-10 rounded-full" />
                                <Text style={[styles.fontSans, { fontSize: 14, color: textPrimary, flex: 1, marginLeft: 12 }]}>
                                    {member.user?.profile?.displayName || member.user?.name}
                                </Text>
                                <TouchableOpacity onPress={() => handleAction(member.id, 'ACCEPT')} className="w-10 h-10 rounded-xl items-center justify-center mr-2" style={{ backgroundColor: accent }}>
                                    <Check size={18} color={isDark ? MONO.black : MONO.white} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleAction(member.id, 'REJECT')} className="w-10 h-10 rounded-xl items-center justify-center" style={{ borderWidth: 1, borderColor: isDark ? MONO.gray600 : MONO.gray400 }}>
                                    <X size={18} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Verify Button */}
                <TouchableOpacity
                    onPress={() => {
                        setSelectedPlanForVerify(plan);
                        setVerifyCode('');
                        setVerifyResult(null);
                        setVerifyModalVisible(true);
                    }}
                    className="flex-row items-center justify-center py-4"
                    style={{ borderTopWidth: 1, borderTopColor: isDark ? MONO.gray700 : MONO.gray200 }}
                >
                    <Search size={16} color={textSecondary} />
                    <Text style={[styles.fontMono, { fontSize: 11, color: textSecondary, marginLeft: 8, letterSpacing: 1 }]}>VERIFY ATTENDEE</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const JoinedCard = ({ plan }: { plan: any }) => {
        const status = plan.myStatus;
        const code = plan.myVerificationCode;
        const isVerified = plan.myIsVerified;
        const dateInfo = formatDate(plan.date);

        return (
            <TouchableOpacity onPress={() => router.push(`/hopin/${plan.id}`)} className="mb-6 rounded-3xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                <View className="p-5">
                    <View className="flex-row">
                        <View className="items-center mr-4">
                            <Text style={[styles.fontCondensed, { fontSize: 28, color: textPrimary }]}>{dateInfo.day}</Text>
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>{dateInfo.month}</Text>
                        </View>
                        <View className="flex-1">
                            <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 2, marginBottom: 4 }]}>{plan.type}</Text>
                            <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary }]} numberOfLines={1}>{plan.title}</Text>
                            {plan.creator && (
                                <View className="flex-row items-center mt-2">
                                    <Image source={{ uri: plan.creator.profile?.avatarUrl || 'https://via.placeholder.com/20' }} className="w-5 h-5 rounded-full" />
                                    <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary, marginLeft: 6 }]}>by {plan.creator.name}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Status */}
                    <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                        {status === 'ACCEPTED' && !isVerified && code && (
                            <View className="p-4 rounded-2xl items-center" style={{ backgroundColor: accent }}>
                                <Text style={[styles.fontMono, { fontSize: 9, color: isDark ? MONO.gray600 : MONO.gray400, letterSpacing: 2, marginBottom: 8 }]}>YOUR CODE</Text>
                                <Text style={[styles.fontCondensed, { fontSize: 32, color: isDark ? MONO.black : MONO.white, letterSpacing: 6 }]}>{code}</Text>
                            </View>
                        )}
                        {status === 'ACCEPTED' && isVerified && (
                            <View className="flex-row items-center justify-center p-4 rounded-2xl" style={{ backgroundColor: isDark ? MONO.gray700 : MONO.gray200 }}>
                                <CheckCircle size={18} color={textPrimary} />
                                <Text style={[styles.fontMono, { fontSize: 11, color: textPrimary, marginLeft: 8, letterSpacing: 2 }]}>VERIFIED</Text>
                            </View>
                        )}
                        {status === 'PENDING' && (
                            <View className="flex-row items-center justify-center p-4 rounded-2xl" style={{ borderWidth: 1, borderColor: isDark ? MONO.gray600 : MONO.gray400 }}>
                                <Clock size={18} color={textSecondary} />
                                <Text style={[styles.fontMono, { fontSize: 11, color: textSecondary, marginLeft: 8, letterSpacing: 2 }]}>PENDING</Text>
                            </View>
                        )}
                        {status === 'INVITED' && (
                            <View className="flex-row items-center justify-center p-4 rounded-2xl" style={{ backgroundColor: accent }}>
                                <Ticket size={18} color={isDark ? MONO.black : MONO.white} />
                                <Text style={[styles.fontMono, { fontSize: 11, color: isDark ? MONO.black : MONO.white, marginLeft: 8, letterSpacing: 2 }]}>INVITED</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // ==================== MAIN RENDER ====================

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: bg }}>
                <ActivityIndicator size="large" color={textPrimary} />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
            <Toast />
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4">
                <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: cardBg }}>
                    <ChevronLeft size={24} color={textPrimary} />
                </TouchableOpacity>
                <View className="items-center">
                    <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 3 }]}>MY EVENTS</Text>
                    <Text style={[styles.fontSerif, { fontSize: 24, color: textPrimary }]}>Dashboard</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/hopin/create')} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: accent }}>
                    <Plus size={22} color={isDark ? MONO.black : MONO.white} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View className="flex-row mx-5 mb-6 rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                <TouchableOpacity onPress={() => setActiveTab('hosting')} className="flex-1 py-4 items-center" style={{ backgroundColor: activeTab === 'hosting' ? accent : 'transparent' }}>
                    <Text style={[styles.fontMono, { fontSize: 11, letterSpacing: 2, color: activeTab === 'hosting' ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>
                        HOSTING
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('joined')} className="flex-1 py-4 items-center" style={{ backgroundColor: activeTab === 'joined' ? accent : 'transparent' }}>
                    <Text style={[styles.fontMono, { fontSize: 11, letterSpacing: 2, color: activeTab === 'joined' ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>
                        JOINED
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <FlatList
                data={activeTab === 'hosting' ? createdPlans : joinedPlans}
                renderItem={({ item }) => activeTab === 'hosting' ? <HostingCard plan={item} /> : <JoinedCard plan={item} />}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />}
                ListEmptyComponent={
                    <View className="items-center py-20">
                        <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary, marginBottom: 8 }]}>No Events Yet</Text>
                        <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary }]}>
                            {activeTab === 'hosting' ? 'Create your first event' : 'Join an event to get started'}
                        </Text>
                    </View>
                }
            />

            {/* Verify Modal */}
            <Modal visible={verifyModalVisible} transparent animationType="fade" onRequestClose={() => setVerifyModalVisible(false)}>
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <View className="w-80 rounded-3xl p-6" style={{ backgroundColor: isDark ? MONO.gray800 : MONO.white }}>
                        <View className="flex-row items-center justify-between mb-6">
                            <Text style={[styles.fontSerif, { fontSize: 22, color: textPrimary }]}>Verify</Text>
                            <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                                <X size={24} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginBottom: 16 }]}>
                            Enter the 7-digit code from attendee
                        </Text>

                        <TextInput
                            value={verifyCode}
                            onChangeText={setVerifyCode}
                            placeholder="0000000"
                            placeholderTextColor={textSecondary}
                            keyboardType="number-pad"
                            maxLength={7}
                            className="text-center py-5 rounded-2xl mb-4"
                            style={[styles.fontCondensed, { fontSize: 32, letterSpacing: 8, backgroundColor: cardBg, color: textPrimary }]}
                        />

                        <TouchableOpacity
                            onPress={handleVerify}
                            disabled={verifyLoading || verifyCode.length !== 7}
                            className="py-4 rounded-2xl items-center mb-4"
                            style={{ backgroundColor: verifyCode.length === 7 ? accent : cardBg }}
                        >
                            {verifyLoading ? (
                                <ActivityIndicator color={isDark ? MONO.black : MONO.white} />
                            ) : (
                                <Text style={[styles.fontMono, { fontSize: 12, letterSpacing: 2, color: verifyCode.length === 7 ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>
                                    VERIFY
                                </Text>
                            )}
                        </TouchableOpacity>

                        {verifyResult && (
                            <View className="p-4 rounded-2xl" style={{ backgroundColor: verifyResult.type === 'error' ? 'rgba(200,0,0,0.1)' : cardBg }}>
                                <Text style={[styles.fontSans, { fontSize: 14, color: verifyResult.type === 'error' ? '#c00' : textPrimary, textAlign: 'center' }]}>
                                    {verifyResult.msg}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <View className="w-80 rounded-3xl p-6" style={{ backgroundColor: isDark ? MONO.gray800 : MONO.white }}>
                        <Text style={[styles.fontSerif, { fontSize: 22, color: textPrimary, marginBottom: 12 }]}>Delete Event</Text>
                        <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginBottom: 24 }]}>This cannot be undone. Are you sure?</Text>
                        <View className="flex-row">
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} className="flex-1 py-4 rounded-2xl items-center mr-2" style={{ borderWidth: 1, borderColor: textSecondary }}>
                                <Text style={[styles.fontMono, { fontSize: 12, color: textSecondary, letterSpacing: 1 }]}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} className="flex-1 py-4 rounded-2xl items-center" style={{ backgroundColor: '#c00' }}>
                                <Text style={[styles.fontMono, { fontSize: 12, color: MONO.white, letterSpacing: 1 }]}>DELETE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Typography styles
const styles = StyleSheet.create({
    fontSerif: { fontFamily: 'System', fontWeight: '700' },
    fontSans: { fontFamily: 'System', fontWeight: '400' },
    fontMono: { fontFamily: 'System', fontWeight: '500' },
    fontCondensed: { fontFamily: 'System', fontWeight: '700' },
});
