import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, User, Bell, Lock, Eye, Moon, Sun, HelpCircle, LogOut, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import { FaceVerificationModal } from '../components/FaceVerificationModal';

export default function SettingsScreen() {
    const router = useRouter();
    const { mode, setMode, colors } = useTheme();
    const [loading, setLoading] = useState(false);

    const { showToast } = useToast();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    const handleLogout = async () => {
        setShowLogoutConfirm(false);
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) showToast(error.message, 'error');
        router.replace('/(auth)/login');
    };

    const renderSection = (title: string, items: any[]) => (
        <View className="mb-8">
            <Text className="text-sm font-bold uppercase mb-3 px-4" style={{ color: colors.secondary }}>{title}</Text>
            <BlurView
                intensity={mode === 'light' ? 40 : 20}
                tint={mode === 'light' ? 'light' : 'dark'}
                className="rounded-3xl overflow-hidden border mx-4"
                style={{ borderColor: colors.border, backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.05)' }}
            >
                {items.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        disabled={item.type === 'switch' && !item.onValueChange}
                        onPress={item.onPress}
                        className={`flex-row items-center justify-between p-4 ${index < items.length - 1 ? 'border-b' : ''}`}
                        style={{ borderColor: colors.border }}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className={`w-8 h-8 rounded-full items-center justify-center ${item.colorClass || ''}`} style={item.colorStyle}>
                                <item.icon color="white" size={16} />
                            </View>
                            <Text className="text-base font-medium" style={{ color: colors.text }}>{item.label}</Text>
                        </View>
                        {item.type === 'switch' ? (
                            <Switch
                                value={item.value}
                                onValueChange={item.onValueChange}
                                trackColor={{ false: '#334155', true: colors.primary }}
                                thumbColor="white"
                            />
                        ) : (
                            <ChevronRight color={colors.secondary} size={20} />
                        )}
                    </TouchableOpacity>
                ))}
            </BlurView>
        </View>
    );

    const [isVerified, setIsVerified] = useState(false);

    React.useEffect(() => {
        const checkVerification = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('User')
                    .select('isHumanVerified')
                    .eq('id', user.id)
                    .single();
                if (data?.isHumanVerified) setIsVerified(true);
            }
        };
        checkVerification();
    }, []);

    const accountItems = [
        {
            label: 'Edit Profile',
            icon: User,
            colorClass: 'bg-blue-500',
            onPress: () => router.push('/edit-profile')
        },
        {
            label: 'Notifications',
            icon: Bell,
            colorClass: 'bg-rose-500',
            onPress: () => router.push('/notifications')
        },
        {
            label: 'Safety & Privacy',
            icon: Lock,
            colorClass: 'bg-emerald-500',
            onPress: () => router.push('/safety')
        },
        {
            label: isVerified ? 'Identity Verified' : 'Verify Identity',
            icon: ShieldCheck,
            colorStyle: { backgroundColor: isVerified ? '#10B981' : '#DC2626' }, // Green if verified, Red if not
            onPress: () => {
                if (isVerified) {
                    showToast("Your identity is already verified", "success");
                } else {
                    setShowVerificationModal(true);
                }
            }
        },
        {
            label: 'Visibility & Preferences',
            icon: Eye,
            colorClass: 'bg-purple-500',
            onPress: () => router.push('/settings/visibility')
        },
    ];

    const appearanceItems = [
        {
            label: 'Dark Mode',
            icon: Moon,
            colorClass: 'bg-indigo-500',
            type: 'switch',
            value: mode === 'dark',
            onValueChange: (val: boolean) => setMode('dark')
        },
        {
            label: 'Light Mode',
            icon: Sun, // Import Sun!
            colorClass: 'bg-yellow-500',
            type: 'switch',
            value: mode === 'light',
            onValueChange: (val: boolean) => setMode('light')
        },
        {
            label: 'Eye Care Mode',
            icon: Eye,
            colorClass: 'bg-amber-500',
            type: 'switch',
            value: mode === 'eye-care',
            onValueChange: (val: boolean) => setMode('eye-care')
        },
    ];

    const supportItems = [
        {
            label: 'Help & Support',
            icon: HelpCircle,
            colorClass: 'bg-slate-500',

            onPress: () => showToast("Contact support@fuy.com", 'info')
        },
        {
            label: 'Log Out',
            icon: LogOut,
            colorClass: 'bg-red-500',
            onPress: () => setShowLogoutConfirm(true)
        },
    ];

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0'] : ['#0f172a', '#1e293b']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1">
                {/* Header - Removed pl-16 */}
                <View className="px-6 pt-4 pb-6 flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-3xl font-bold" style={{ color: colors.text }}>Settings</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {renderSection('Account', accountItems)}
                    {renderSection('Appearance', appearanceItems)}
                    {renderSection('Support', supportItems)}
                    <Text className="text-center text-xs mb-8" style={{ color: colors.secondary }}>Version 1.0.0</Text>
                </ScrollView>
            </SafeAreaView>

            <ConfirmModal
                visible={showLogoutConfirm}
                title="Log Out"
                message="Are you sure you want to log out of the universe?"
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
                confirmText="Log Out"
                isDestructive
            />

            <FaceVerificationModal
                visible={showVerificationModal}
                onClose={() => setShowVerificationModal(false)}
                onVerified={() => {
                    setShowVerificationModal(false);
                    showToast('Identity verified!', 'success');
                }}
            />
        </View >
    );
}
