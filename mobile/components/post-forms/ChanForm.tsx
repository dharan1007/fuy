import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, Tv, X, Image as ImageIcon, Slash, Plus } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';
import SuccessOverlay from '../SuccessOverlay';
import { analyzeMultipleImages, NudityAnalysisResult } from '../../lib/nudity-detection';
import NudityWarningModal from '../NudityWarningModal';
import PostPreview from '../PostPreview';
import { Eye, EyeOff } from 'lucide-react-native';
import MediaFilterSelector from '../MediaFilterSelector';
import UserTagSelector from '../UserTagSelector';
import { PostService, PostVisibility } from '../../services/PostService';
import FeedVideoPlayer from '../FeedVideoPlayer';


const EPISODE_MAX_DURATION = 600; // 10 minutes for episodes

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
    const [showSuccess, setShowSuccess] = useState(false);
    const [slashes, setSlashes] = useState<string[]>([]);
    const [slashInput, setSlashInput] = useState('');

    // Nudity detection state
    const [nudityResult, setNudityResult] = useState<NudityAnalysisResult | null>(null);
    const [showNudityWarning, setShowNudityWarning] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);

    // Preview state
    const [showPreview, setShowPreview] = useState(true);
    const [userName, setUserName] = useState('');
    const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);

    // Fetch user info for preview
    React.useEffect(() => {
        const fetchUser = async () => {
            if (!session?.user?.email) return;
            const { data } = await supabase
                .from('User')
                .select('name, avatar')
                .eq('email', session.user.email)
                .single();
            if (data) {
                setUserName(data.name || 'You');
                setUserAvatar(data.avatar || undefined);
            }
        };
        fetchUser();
    }, [session]);

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 0.8,
            videoMaxDuration: EPISODE_MAX_DURATION,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.duration && asset.duration > EPISODE_MAX_DURATION * 1000) {
                Alert.alert('Too Long', `Maximum ${EPISODE_MAX_DURATION} seconds allowed`);
                return;
            }
            setVideo(asset);
        }
    };

    const handlePickCover = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
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

        // Nudity Detection: Check video and cover for inappropriate content
        if (!pendingSubmit) {
            const mediaToCheck = [video.uri];
            if (coverImage) mediaToCheck.push(coverImage);

            const nudityCheck = await analyzeMultipleImages(mediaToCheck);

            if (nudityCheck.classification === 'EXPLICIT') {
                setNudityResult(nudityCheck);
                setShowNudityWarning(true);
                return;
            } else if (nudityCheck.classification === 'SUGGESTIVE') {
                setNudityResult(nudityCheck);
                setShowNudityWarning(true);
                return;
            }
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

            let mediaItems = [];
            // For Chan, the video is main content. Cover is just thumbnail/preview.
            // But existing logic pushed both to mediaUrls.
            // "mediaUrls: coverUrl ? [uploadResult.url, coverUrl] : [uploadResult.url]"
            // I will match this behavior.
            mediaItems.push({ uri: uploadResult.url, type: 'VIDEO', duration: video.duration ? Math.floor(video.duration / 1000) : 0 });
            if (coverUrl) mediaItems.push({ uri: coverUrl, type: 'IMAGE', duration: 0 });

            await PostService.createPost({
                userId: userData.id,
                postType: 'CHAN',
                content: episodeDescription || `${channelName} - ${episodeTitle || 'New Episode'}`,
                visibility: visibility as PostVisibility,
                media: mediaItems,
                chanData: {
                    channelName,
                    description: channelDescription,
                    coverImageUrl: coverUrl,
                    isLive,
                    videoUrl: uploadResult.url,
                    episodeTitle: episodeTitle || 'Episode 1',
                    duration: video.duration ? Math.floor(video.duration / 1000) : 0,
                },
                slashes: slashes.filter(s => s.trim()),
            });

            setUploadProgress(100);

            // Alert.alert('Success', 'Episode posted!', [{ text: 'OK', onPress: onBack }]);
            setShowSuccess(true);
            setPendingSubmit(false);
            setNudityResult(null);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle proceeding with suggestive content
    const handleProceedWithWarning = () => {
        setShowNudityWarning(false);
        setPendingSubmit(true);
        setTimeout(() => handleSubmit(), 100);
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

            {/* Post Preview Component */}
            <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>PREVIEW</Text>
                    <TouchableOpacity onPress={() => setShowPreview(!showPreview)} style={{ padding: 4 }}>
                        {showPreview ? <Eye size={16} color={colors.secondary} /> : <EyeOff size={16} color={colors.secondary} />}
                    </TouchableOpacity>
                </View>

                {showPreview && (
                    <PostPreview
                        userName={userName}
                        userAvatar={userAvatar}
                        content={`${channelName ? channelName + '\n' : ''}${episodeTitle ? episodeTitle + '\n' : ''}${episodeDescription}`}
                        media={[
                            ...(video ? [{ uri: video.uri, type: 'video' as const }] : []),
                            ...(coverImage ? [{ uri: coverImage, type: 'image' as const }] : [])
                        ]}
                        visibility={visibility}
                    />
                )}
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
                        onPress={handlePickCover}
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
                        <FeedVideoPlayer
                            url={video.uri}
                            isActive={false}
                            contentFit="cover"
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

            {/* Slashes */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Slashes</Text>
                <View className="flex-row items-center mb-3">
                    <View className="flex-row items-center flex-1 rounded-xl p-2" style={{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', borderWidth: 1, borderColor: colors.border }}>
                        <Slash size={16} color={colors.secondary} />
                        <TextInput value={slashInput} onChangeText={setSlashInput} placeholder="Add a slash tag..." placeholderTextColor={colors.secondary} style={{ flex: 1, color: colors.text, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 }} onSubmitEditing={() => { if (slashInput.trim() && !slashes.includes(slashInput.trim().toLowerCase())) { setSlashes([...slashes, slashInput.trim().toLowerCase()]); setSlashInput(''); } }} returnKeyType="done" />
                        <TouchableOpacity onPress={() => { if (slashInput.trim() && !slashes.includes(slashInput.trim().toLowerCase())) { setSlashes([...slashes, slashInput.trim().toLowerCase()]); setSlashInput(''); } }} style={{ padding: 8 }}>
                            <Plus size={18} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>
                </View>
                {slashes.length > 0 && (
                    <View className="flex-row flex-wrap gap-2">
                        {slashes.map((slash, idx) => (
                            <View key={idx} className="flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
                                <Text style={{ color: colors.secondary, fontSize: 12, marginRight: 4 }}>/</Text>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{slash}</Text>
                                <TouchableOpacity onPress={() => setSlashes(slashes.filter((_, i) => i !== idx))} style={{ marginLeft: 8 }}>
                                    <X size={12} color={colors.secondary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
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

            <SuccessOverlay
                visible={showSuccess}
                message="Episode Posted!"
                onFinish={onBack}
            />

            <NudityWarningModal
                visible={showNudityWarning}
                result={nudityResult}
                onClose={() => {
                    setShowNudityWarning(false);
                    setNudityResult(null);
                    setPendingSubmit(false);
                }}
                onProceed={nudityResult?.classification === 'SUGGESTIVE' ? handleProceedWithWarning : undefined}
                isSubmitting={loading}
            />
        </ScrollView >
    );
}
