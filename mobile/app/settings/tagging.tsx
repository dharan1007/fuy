import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, Users, UserCheck, UserX } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

type TaggingPrivacy = 'everyone' | 'followers' | 'none';

export default function TaggingSettingsScreen() {
    const router = useRouter();
    const { mode, colors } = useTheme();
    const { session } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [taggingPrivacy, setTaggingPrivacy] = useState<TaggingPrivacy>('followers');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        if (!session?.user?.email) return;
        try {
            const { data, error } = await supabase
                .from('User')
                .select('taggingPrivacy')
                .eq('email', session.user.email)
                .single();

            if (data?.taggingPrivacy) {
                setTaggingPrivacy(data.taggingPrivacy as TaggingPrivacy);
            }
        } catch (err) {
            console.error('Failed to fetch tagging settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (privacy: TaggingPrivacy) => {
        if (!session?.user?.email) return;
        setSaving(true);
        setTaggingPrivacy(privacy);

        try {
            const { error } = await supabase
                .from('User')
                .update({ taggingPrivacy: privacy })
                .eq('email', session.user.email);

            if (error) throw error;
            showToast('Tagging settings updated', 'success');
        } catch (err) {
            console.error('Failed to save tagging settings:', err);
            showToast('Failed to update settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const options: { value: TaggingPrivacy; label: string; description: string; icon: any }[] = [
        {
            value: 'everyone',
            label: 'Everyone',
            description: 'Anyone can tag you in their posts',
            icon: Users,
        },
        {
            value: 'followers',
            label: 'Followers Only',
            description: 'Only people you follow can tag you',
            icon: UserCheck,
        },
        {
            value: 'none',
            label: 'No One',
            description: 'Nobody can tag you in posts',
            icon: UserX,
        },
    ];

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0'] : ['#0f172a', '#1e293b']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-6 pt-4 pb-6 flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold" style={{ color: colors.text }}>Tagging Settings</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="px-4">
                    <Text className="text-sm mb-6 px-2" style={{ color: colors.secondary }}>
                        Control who can tag you in their posts. People who cannot tag you will see a message when they try.
                    </Text>

                    {loading ? (
                        <View className="py-12 items-center">
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : (
                        <BlurView
                            intensity={mode === 'light' ? 40 : 20}
                            tint={mode === 'light' ? 'light' : 'dark'}
                            className="rounded-3xl overflow-hidden border"
                            style={{ borderColor: colors.border, backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.05)' }}
                        >
                            {options.map((option, index) => (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => saveSettings(option.value)}
                                    disabled={saving}
                                    className={`flex-row items-center justify-between p-4 ${index < options.length - 1 ? 'border-b' : ''}`}
                                    style={{ borderColor: colors.border }}
                                >
                                    <View className="flex-row items-center gap-3 flex-1">
                                        <View className="w-10 h-10 rounded-full items-center justify-center bg-teal-500">
                                            <option.icon color="white" size={18} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-base font-semibold" style={{ color: colors.text }}>{option.label}</Text>
                                            <Text className="text-xs" style={{ color: colors.secondary }}>{option.description}</Text>
                                        </View>
                                    </View>
                                    {taggingPrivacy === option.value && (
                                        <View className="w-6 h-6 rounded-full bg-teal-500 items-center justify-center">
                                            <Check color="white" size={14} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </BlurView>
                    )}

                    <View className="h-20" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
