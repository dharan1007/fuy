import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft, Globe, Users, Lock, Film } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const MAX_DURATION = 18000; // 5 hours in seconds

interface FillFormProps {
    onBack: () => void;
}

export default function FillForm({ onBack }: FillFormProps) {
    const { colors, isDark } = useTheme();
    const { session } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setVideo(result.assets[0]);
        }
    };

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m ${seconds % 60}s`;
    };

    const handleSubmit = async () => {
        if (!video) {
            Alert.alert('Error', 'Please select a video');
            return;
        }
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }
        if (!session?.user?.email) {
            Alert.alert('Error', 'Please log in first');
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const { data: userData } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!userData?.id) throw new Error('User not found');

            setUploadProgress(20);
            const uploadResult = await MediaUploadService.uploadVideo(
                video.uri,
                `fill_${Date.now()}.mp4`,
                (progress) => setUploadProgress(20 + progress.percentage * 0.6)
            );

            setUploadProgress(80);

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'FILL',
                    content: description || title,
                    visibility,
                    fillData: {
                        videoUrl: uploadResult.url,
                        duration: video.duration ? Math.floor(video.duration / 1000) : 0,
                        aspectRatio: '16:9',
                    },
                }),
            });

            setUploadProgress(100);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create Fill');
            }

            Alert.alert('Success', 'Fill posted!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-red-500 border-red-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
        >
            <Icon size={16} color={visibility === value ? 'white' : colors.text} />
            <Text style={{ color: visibility === value ? 'white' : colors.text, fontWeight: '600', marginLeft: 6 }}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            <View className="flex-row items-center mb-6">
                <TouchableOpacity
                    onPress={onBack}
                    className={`p-3 rounded-full mr-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New Fill</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Long-form video (max 5 hours)</Text>
                </View>
            </View>

            {/* Video Picker */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Video</Text>
                {video ? (
                    <View className="relative" style={{ aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden' }}>
                        <Video
                            source={{ uri: video.uri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                        />
                        <TouchableOpacity
                            onPress={() => setVideo(null)}
                            className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                        >
                            <X size={16} color="white" />
                        </TouchableOpacity>
                        <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded">
                            <Text className="text-white text-xs">
                                {video.duration ? formatDuration(video.duration) : 'Video selected'}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickVideo}
                        style={{
                            aspectRatio: 16 / 9,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#ef4444',
                            borderStyle: 'dashed',
                        }}
                    >
                        <Film size={48} color="#ef4444" />
                        <Text style={{ color: '#ef4444', marginTop: 12, fontWeight: '600' }}>Select Video</Text>
                        <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4 }}>16:9 horizontal format</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Title */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Title</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Video title..."
                    placeholderTextColor={colors.secondary}
                    style={{
                        color: colors.text,
                        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                />
            </View>

            {/* Description */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Description</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe your video..."
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={4}
                    style={{
                        color: colors.text,
                        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        height: 100,
                        textAlignVertical: 'top'
                    }}
                />
            </View>

            {/* Visibility */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Visibility</Text>
                <View className="flex-row gap-2">
                    <VisibilityOption value="PUBLIC" label="Public" icon={Globe} />
                    <VisibilityOption value="FRIENDS" label="Friends" icon={Users} />
                    <VisibilityOption value="PRIVATE" label="Private" icon={Lock} />
                </View>
            </View>

            {/* Progress */}
            {loading && (
                <View className="mb-4">
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View className="h-full bg-red-500" style={{ width: `${uploadProgress}%` }} />
                    </View>
                    <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                        Uploading... {Math.round(uploadProgress)}%
                    </Text>
                </View>
            )}

            {/* Submit */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !video || !title.trim()}
                style={{
                    backgroundColor: video && title.trim() ? '#ef4444' : colors.border,
                    padding: 18,
                    borderRadius: 16,
                    alignItems: 'center',
                    marginBottom: 40,
                    opacity: loading ? 0.6 : 1,
                }}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post Fill</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
