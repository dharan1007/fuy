import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { X, Upload, ArrowLeft, Globe, Users, Lock, Play } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { CompressionService } from '../../services/CompressionService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const MAX_DURATION = 60; // 1 minute max

interface LillFormProps {
    onBack: () => void;
}

export default function LillForm({ onBack }: LillFormProps) {
    const { colors, isDark } = useTheme();
    const { session } = useAuth();
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 0.8,
            videoMaxDuration: MAX_DURATION,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            // Check duration if available
            if (asset.duration && asset.duration > MAX_DURATION * 1000) {
                Alert.alert('Too Long', `Lills must be ${MAX_DURATION} seconds or less`);
                return;
            }
            setVideo(asset);
        }
    };

    const handleSubmit = async () => {
        if (!video) {
            Alert.alert('Error', 'Please select a video');
            return;
        }

        if (!session?.user?.email) {
            Alert.alert('Error', 'Please log in first');
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            // Get user ID from email
            const { data: userData } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!userData?.id) throw new Error('User not found');

            // Upload video to Cloudflare R2
            setUploadProgress(10);

            // Compress
            let fileUri = video.uri;
            try {
                fileUri = await CompressionService.compressVideo(video.uri);
            } catch (e) {
                console.warn('Compression failed, using original');
            }

            setUploadProgress(30);

            const uploadResult = await MediaUploadService.uploadVideo(
                fileUri,
                `lill_${Date.now()}.mp4`,
                (progress) => setUploadProgress(30 + progress.percentage * 0.5)
            );

            setUploadProgress(80);

            // Create post via API
            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'LILL',
                    content: description || 'New Lill',
                    visibility,
                    lillData: {
                        videoUrl: uploadResult.url,
                        duration: Math.min(video.duration ? Math.floor(video.duration / 1000) : 60, MAX_DURATION),
                        aspectRatio: '9:16',
                    },
                }),
            });

            setUploadProgress(100);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create Lill');
            }

            Alert.alert('Success', 'Lill posted!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
            style={{ columnGap: 8 }}
        >
            <Icon size={16} color={visibility === value ? 'white' : colors.text} />
            <Text style={{ color: visibility === value ? 'white' : colors.text, fontWeight: '600', marginLeft: 6 }}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            {/* Header */}
            <View className="flex-row items-center mb-6 z-50 relative">
                <TouchableOpacity
                    onPress={onBack}
                    className={`p-3 rounded-full mr-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New Lill</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Max {MAX_DURATION} seconds</Text>
                </View>
            </View>

            {/* Video Picker */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Video</Text>
                {video ? (
                    <View className="relative" style={{ aspectRatio: 9 / 16, borderRadius: 20, overflow: 'hidden', maxHeight: 400 }}>
                        <Video
                            source={{ uri: video.uri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isLooping
                        />
                        <TouchableOpacity
                            onPress={() => setVideo(null)}
                            className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                        >
                            <X size={16} color="white" />
                        </TouchableOpacity>
                        <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded">
                            <Text className="text-white text-xs">
                                {video.duration ? `${Math.floor(video.duration / 1000)}s` : 'Video selected'}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickVideo}
                        style={{
                            aspectRatio: 9 / 16,
                            maxHeight: 400,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#22c55e',
                            borderStyle: 'dashed',
                        }}
                    >
                        <Play size={48} color="#22c55e" />
                        <Text style={{ color: '#22c55e', marginTop: 12, fontWeight: '600' }}>Select Video</Text>
                        <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4 }}>9:16 vertical format</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Description */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Caption</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What's happening in this Lill?"
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={3}
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

            {/* Progress Bar */}
            {loading && (
                <View className="mb-4">
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-green-500"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </View>
                    <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                        Uploading... {Math.round(uploadProgress)}%
                    </Text>
                </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !video}
                className="shadow-lg"
                style={{
                    backgroundColor: video ? '#22c55e' : colors.border,
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
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post Lill</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
