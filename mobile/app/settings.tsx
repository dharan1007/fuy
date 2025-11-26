import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, User, Bell, Lock, Eye, Moon, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const router = useRouter();

    const renderSection = (title: string, items: any[]) => (
        <View className="mb-8">
            <Text className="text-slate-400 text-sm font-bold uppercase mb-3 px-4">{title}</Text>
            <BlurView intensity={20} tint="dark" className="rounded-3xl overflow-hidden border border-white/5 mx-4">
                {items.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        className={`flex-row items-center justify-between p-4 ${index < items.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className={`w-8 h-8 rounded-full items-center justify-center ${item.color}`}>
                                <item.icon color="white" size={16} />
                            </View>
                            <Text className="text-white text-base font-medium">{item.label}</Text>
                        </View>
                        {item.type === 'switch' ? (
                            <Switch
                                value={item.value}
                                trackColor={{ false: '#334155', true: '#4f46e5' }}
                                thumbColor="white"
                            />
                        ) : (
                            <ChevronRight color="#64748b" size={20} />
                        )}
                    </TouchableOpacity>
                ))}
            </BlurView>
        </View>
    );

    const accountItems = [
        { label: 'Edit Profile', icon: User, color: 'bg-blue-500' },
        { label: 'Notifications', icon: Bell, color: 'bg-rose-500' },
        { label: 'Privacy & Security', icon: Lock, color: 'bg-emerald-500' },
    ];

    const appearanceItems = [
        { label: 'Dark Mode', icon: Moon, color: 'bg-indigo-500', type: 'switch', value: true },
        { label: 'Eye Protection', icon: Eye, color: 'bg-amber-500', type: 'switch', value: false },
    ];

    const supportItems = [
        { label: 'Help & Support', icon: HelpCircle, color: 'bg-slate-500' },
        { label: 'Log Out', icon: LogOut, color: 'bg-red-500' },
    ];

    return (
        <View className="flex-1 bg-black">
            <LinearGradient
                colors={['#0f172a', '#1e293b']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1">
                <View className="px-6 pt-4 pb-6 flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-white/10">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white text-3xl font-bold">Settings</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {renderSection('Account', accountItems)}
                    {renderSection('Appearance', appearanceItems)}
                    {renderSection('Support', supportItems)}
                    <Text className="text-center text-slate-600 text-xs mb-8">Version 1.0.0</Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
