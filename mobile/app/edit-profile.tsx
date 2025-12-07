import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Camera, Save, User, MapPin, FileText, Image as ImageIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function EditProfileScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        displayName: '',
        bio: '',
        location: '',
        avatarUrl: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/(auth)/login');
                return;
            }

            const { data, error } = await supabase
                .from('Profile')
                .select('*')
                .eq('userId', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            if (data) {
                setForm({
                    displayName: data.displayName || '',
                    bio: data.bio || '',
                    location: data.location || '',
                    avatarUrl: data.avatarUrl || user.user_metadata?.avatar_url || ''
                });
            } else {
                setForm(prev => ({
                    ...prev,
                    displayName: user.user_metadata?.name || '',
                    avatarUrl: user.user_metadata?.avatar_url || ''
                }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setForm(prev => ({ ...prev, avatarUrl: base64Data }));
            }
        } catch (e) {
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const updates = {
                userId: user.id,
                displayName: form.displayName,
                bio: form.bio,
                location: form.location,
                avatarUrl: form.avatarUrl,
            };

            const { error } = await supabase
                .from('Profile')
                .upsert(updates);

            if (error) throw error;

            Alert.alert("Success", "Profile updated successfully!");
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const generateRandomAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        setForm(prev => ({
            ...prev,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}`
        }));
    };

    const renderInput = (label: string, value: string, key: string, icon: any, multiline = false) => (
        <View className="mb-5">
            <Text className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: colors.secondary }}>{label}</Text>
            <BlurView
                intensity={mode === 'light' ? 20 : 10}
                tint={mode === 'light' ? 'light' : 'dark'}
                className="flex-row items-center border rounded-2xl px-4 py-3 overflow-hidden"
                style={{ borderColor: colors.border, backgroundColor: colors.card }}
            >
                {icon && React.createElement(icon, { color: colors.secondary, size: 20 })}
                <TextInput
                    value={value}
                    onChangeText={(text) => setForm(prev => ({ ...prev, [key]: text }))}
                    placeholder={`Enter your ${label.toLowerCase()}`}
                    placeholderTextColor={colors.secondary}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    className={`flex-1 ml-3 text-base ${multiline ? 'h-24 text-top leading-6' : ''}`}
                    style={{ color: colors.text }}
                />
            </BlurView>
        </View>
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0'] : ['#000000', '#111111']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1">
                {/* Header with pl-16 for ThemeToggle */}
                <View className="px-6 pt-4 pb-2 flex-row justify-between items-center pl-16">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Edit Profile</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        className="p-2 rounded-full"
                        style={{ backgroundColor: saving ? colors.border : colors.primary }}
                    >
                        {saving ? <ActivityIndicator size="small" color="white" /> : <Save color="white" size={20} />}
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                    {/* Avatar Section */}
                    <View className="items-center mb-8">
                        <View className="relative">
                            <Image
                                source={{ uri: form.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=user' }}
                                className="w-28 h-28 rounded-full border-4"
                                style={{ borderColor: colors.card }}
                            />
                            <View className="absolute bottom-0 right-[-10px] flex-row gap-2">
                                <TouchableOpacity
                                    onPress={pickImage}
                                    className="p-2 rounded-full shadow-lg"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    <ImageIcon color="white" size={18} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={generateRandomAvatar}
                                    className="p-2 rounded-full shadow-lg"
                                    style={{ backgroundColor: colors.card }}
                                >
                                    <Camera color={colors.text} size={18} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text className="mt-3 text-sm" style={{ color: colors.secondary }}>Pick from gallery or randomize</Text>
                    </View>

                    {/* Form Fields */}
                    {renderInput('Display Name', form.displayName, 'displayName', User)}
                    {renderInput('Location', form.location, 'location', MapPin)}
                    {renderInput('Bio', form.bio || '', 'bio', FileText, true)}

                    <View className="h-10" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
