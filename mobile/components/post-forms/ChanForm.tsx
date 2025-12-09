import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, Tv, X, Image as ImageIcon } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

interface ChanFormProps {
    onBack: () => void;
}

export default function ChanForm({ onBack }: ChanFormProps) {
    const { colors, isDark } = useTheme();
    const { session } = useAuth();
    const [channelName, setChannelName] = useState('');
    const [channelDescription, setChannelDescription] = useState('');
    const [episodeTitle, setEpisodeTitle] = useState('');
    const [episodeDescription, setEpisodeDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(false);
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

    const pickCover = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!video) {
            Alert.alert('Error', 'Please select a video');
            return;
        }
        if (!channelName.trim()) {
            Alert.alert('Error', 'Please enter a channel name');
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

            // Upload video
            setUploadProgress(10);
            const uploadResult = await MediaUploadService.uploadVideo(
                video.uri,
                `chan_${Date.now()}.mp4`,
                (progress) => setUploadProgress(10 + progress.percentage * 0.6)
            );

            // Upload cover if provided
            let coverUrl = null;
            if (coverImage) {
                setUploadProgress(75);
                const coverResult = await MediaUploadService.uploadImage(coverImage, `chan_cover_${Date.now()}.jpg`);
                coverUrl = coverResult.url;
            }

            setUploadProgress(85);

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'CHAN',
                    content: episodeDescription || `${channelName} - ${episodeTitle || 'New Episode'}`,
                    visibility,
                    chanData: {
                        channelName,
                        description: channelDescription,
                        coverImageUrl: coverUrl,
                        isLive,
                        videoUrl: uploadResult.url,
                        episodeTitle: episodeTitle || 'Episode 1',
                        duration: video.duration ? Math.floor(video.duration / 1000) : 0,
                        thumbnail: coverUrl,
                    },
                }),
            });

            setUploadProgress(100);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create Chan');
            }

            Alert.alert('Success', 'Episode posted!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-yellow-500 border-yellow-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
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
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New Episode</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Channel content</Text>
                </View>
            </View>

            {/* Channel Name */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Channel Name *</Text>
                <TextInput
                    value={channelName}
                    onChangeText={setChannelName}
                    placeholder="My Channel"
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

            {/* Channel Description */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Channel Description</Text>
                <TextInput
                    value={channelDescription}
                    onChangeText={setChannelDescription}
                    placeholder="What's your channel about?"
                    placeholderTextColor={colors.secondary}
                    multiline
                    style={{
                        color: colors.text,
                        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        minHeight: 60,
                        textAlignVertical: 'top'
                    }}
                />
            </View>

            {/* Cover Image */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Channel Cover</Text>
                {coverImage ? (
                    <View className="relative" style={{ aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden' }}>
                        <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} />
                        <TouchableOpacity
                            onPress={() => setCoverImage(null)}
                            className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                        >
                            <X size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickCover}
                        style={{
                            aspectRatio: 16 / 9,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <ImageIcon size={32} color={colors.secondary} />
                        <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4 }}>Add Cover</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Episode Title */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Episode Title</Text>
                <TextInput
                    value={episodeTitle}
                    onChangeText={setEpisodeTitle}
                    placeholder="Episode 1"
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

            {/* Video Picker */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Episode Video *</Text>
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
                            borderColor: '#eab308',
                            borderStyle: 'dashed',
                        }}
                    >
                        <Tv size={48} color="#eab308" />
                        <Text style={{ color: '#eab308', marginTop: 12, fontWeight: '600' }}>Select Episode Video</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Is Live Toggle */}
            <View className="mb-6 flex-row items-center justify-between p-4 rounded-xl" style={{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Mark as Live Content</Text>
                <Switch
                    value={isLive}
                    onValueChange={setIsLive}
                    trackColor={{ false: colors.border, true: '#eab308' }}
                    thumbColor={isLive ? '#fff' : '#f4f3f4'}
                />
            </View>

            {/* Episode Description */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Episode Description</Text>
                <TextInput
                    value={episodeDescription}
                    onChangeText={setEpisodeDescription}
                    placeholder="What's in this episode?"
                    placeholderTextColor={colors.secondary}
                    multiline
                    style={{
                        color: colors.text,
                        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        minHeight: 80,
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
                        <View className="h-full bg-yellow-500" style={{ width: `${uploadProgress}%` }} />
                    </View>
                    <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                        Uploading... {Math.round(uploadProgress)}%
                    </Text>
                </View>
            )}

            {/* Submit */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !video || !channelName.trim()}
                style={{
                    backgroundColor: video && channelName.trim() ? '#eab308' : colors.border,
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
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post Episode</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
