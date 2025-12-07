import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, User, Bell, Lock, Eye, Moon, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
    const router = useRouter();
    const { mode, toggleTheme, colors } = useTheme();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        const { error } = await supabase.auth.signOut();
                        if (error) Alert.alert("Error", error.message);
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
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
                        disabled={item.type === 'switch'}
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
            label: 'Privacy & Security',
            icon: Lock,
            colorClass: 'bg-emerald-500',
            onPress: () => Alert.alert("Coming Soon", "Privacy settings will be available in the next update.")
        },
    ];

    const appearanceItems = [
        {
            label: 'Dark Mode',
            icon: Moon,
            colorClass: 'bg-indigo-500',
            type: 'switch',
            value: mode === 'dark',
            onValueChange: toggleTheme
        },
        {
            label: 'Eye Care Mode',
            icon: Eye,
            colorClass: 'bg-amber-500',
            type: 'switch',
            value: mode === 'eye-care',
            onValueChange: toggleTheme
        },
    ];

    const supportItems = [
        {
            label: 'Help & Support',
            icon: HelpCircle,
            colorClass: 'bg-slate-500',
            onPress: () => Alert.alert("Support", "Contact support@fuy.com")
        },
        {
            label: 'Log Out',
            icon: LogOut,
            colorClass: 'bg-red-500',
            onPress: handleLogout
        },
    ];

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0'] : ['#0f172a', '#1e293b']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1">
                {/* Header with pl-16 for ThemeToggle */}
                <View className="px-6 pt-4 pb-6 flex-row items-center gap-4 pl-16">
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
        </View>
    );
}
