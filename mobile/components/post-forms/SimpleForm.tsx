import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft, Globe, Users, Lock, Plus, Type, Image as ImageIcon, Slash } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';
import SuccessOverlay from '../SuccessOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { moderateContent, getModerationErrorMessage } from '../../lib/content-moderation';
import { analyzeMultipleImages, NudityAnalysisResult } from '../../lib/nudity-detection';
import NudityWarningModal from '../NudityWarningModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';
const MAX_MEDIA = 8;
const MAX_TEXT_LENGTH = 600;
const { width } = Dimensions.get('window');

interface SimpleFormProps {
    onBack: () => void;
    initialData?: any;
}

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
}

export default function SimpleForm({ onBack, initialData }: SimpleFormProps) {
    const { isDark } = useTheme();
    const { session } = useAuth();

    const [postMode, setPostMode] = useState<'MEDIA' | 'TEXT'>(initialData?.postMode || 'MEDIA');
    const [content, setContent] = useState(initialData?.content || '');
    const [visibility, setVisibility] = useState(initialData?.visibility || 'PUBLIC');
    const [media, setMedia] = useState<MediaItem[]>(initialData?.media || []);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [slashes, setSlashes] = useState<string[]>(initialData?.slashes || []);
    const [slashInput, setSlashInput] = useState('');
    const [productCode, setProductCode] = useState('');

    // Nudity detection state
    const [nudityResult, setNudityResult] = useState<NudityAnalysisResult | null>(null);
    const [showNudityWarning, setShowNudityWarning] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);

    const pickMedia = async () => {
        if (media.length >= MAX_MEDIA) {
            Alert.alert('Limit Reached', `Maximum ${MAX_MEDIA} items allowed`);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsMultipleSelection: true,
            selectionLimit: MAX_MEDIA - media.length,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const newMedia: MediaItem[] = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.type === 'video' ? 'video' : 'image',
            }));
            setMedia(prev => [...prev, ...newMedia].slice(0, MAX_MEDIA));
        }
    };

    const removeMedia = (index: number) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };

    const saveDraft = async () => {
        try {
            const draft = {
                id: `draft_${Date.now()}`,
                postType: 'SIMPLE',
                postMode,
                content,
                visibility,
                media: media.map(m => ({ ...m })),
                createdAt: new Date().toISOString(),
            };
            const existing = await AsyncStorage.getItem('postDrafts');
            const drafts = existing ? JSON.parse(existing) : [];
            drafts.unshift(draft);
            await AsyncStorage.setItem('postDrafts', JSON.stringify(drafts.slice(0, 20)));
            Alert.alert('Saved', 'Draft saved', [{ text: 'OK', onPress: onBack }]);
        } catch (e) {
            Alert.alert('Error', 'Failed to save draft');
        }
    };

    const handleSubmit = async () => {
        if (postMode === 'TEXT' && !content.trim()) {
            Alert.alert('Error', 'Please write something');
            return;
        }
        if (postMode === 'MEDIA' && media.length === 0) {
            Alert.alert('Error', 'Please add at least one photo or video');
            return;
        }

        if (!session?.user?.email) {
            Alert.alert('Error', 'Please log in first');
            return;
        }

        // Content Moderation: Check caption/text content
        if (content.trim()) {
            const moderationResult = moderateContent(content.trim());
            if (!moderationResult.isClean) {
                Alert.alert('Content Not Allowed', getModerationErrorMessage(moderationResult));
                return;
            }
        }

        // Nudity Detection: Check images/videos for inappropriate content
        if (postMode === 'MEDIA' && media.length > 0 && !pendingSubmit) {
            const imageUris = media.filter(m => m.type === 'image').map(m => m.uri);
            // For videos, we analyze the URI as well (filename-based detection)
            const videoUris = media.filter(m => m.type === 'video').map(m => m.uri);
            const allMediaUris = [...imageUris, ...videoUris];

            if (allMediaUris.length > 0) {
                const nudityCheck = await analyzeMultipleImages(allMediaUris);

                if (nudityCheck.classification === 'EXPLICIT') {
                    // Block explicit content completely
                    setNudityResult(nudityCheck);
                    setShowNudityWarning(true);
                    return;
                } else if (nudityCheck.classification === 'SUGGESTIVE') {
                    // Show warning for suggestive content
                    setNudityResult(nudityCheck);
                    setShowNudityWarning(true);
                    return;
                }
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

            let uploadedMedia: { url: string; type: 'IMAGE' | 'VIDEO' }[] = [];
            if (postMode === 'MEDIA') {
                for (let i = 0; i < media.length; i++) {
                    const item = media[i];
                    setUploadProgress(((i + 1) / media.length) * 80);

                    const result = item.type === 'video'
                        ? await MediaUploadService.uploadVideo(item.uri)
                        : await MediaUploadService.uploadImage(item.uri);

                    uploadedMedia.push({
                        url: result.url,
                        type: item.type === 'video' ? 'VIDEO' : 'IMAGE',
                    });
                }
            }

            setUploadProgress(90);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.fuymedia.org/',
                'Origin': 'https://www.fuymedia.org',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: userData.id,
                    postType: postMode === 'TEXT' ? 'SIMPLE_TEXT' : 'SIMPLE',
                    content: content.trim() || 'New post',
                    visibility,
                    mediaUrls: uploadedMedia.map(m => m.url),
                    mediaTypes: uploadedMedia.map(m => m.type),
                    slashes: slashes.filter(s => s.trim()),
                    taggedProductCode: productCode.trim() || null,
                    // Include nudity flag for admin notification
                    nudityFlag: pendingSubmit && nudityResult ? {
                        classification: nudityResult.classification,
                        categories: nudityResult.detectedCategories,
                    } : null,
                }),
            });

            setUploadProgress(100);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create post');
            }

            // Alert.alert('Done', 'Posted successfully', [{ text: 'OK', onPress: onBack }]);
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
        // Re-trigger submit with flag set
        setTimeout(() => handleSubmit(), 100);
    };

    const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => (
        <View style={{ width: (width - 56) / 4, aspectRatio: 1, margin: 2, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            {item.type === 'video' ? (
                <Video source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode={ResizeMode.COVER} shouldPlay={false} />
            ) : (
                <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            )}
            <TouchableOpacity
                onPress={() => removeMedia(index)}
                style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#000', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
            >
                <X size={10} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <ArrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>Share Content</Text>
                </View>
                <TouchableOpacity onPress={saveDraft} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12, letterSpacing: 0.5 }}>DRAFT</Text>
                </TouchableOpacity>
            </View>

            {/* Mode Toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <TouchableOpacity
                    onPress={() => setPostMode('MEDIA')}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 6, backgroundColor: postMode === 'MEDIA' ? '#fff' : 'transparent' }}
                >
                    <ImageIcon size={14} color={postMode === 'MEDIA' ? '#000' : 'rgba(255,255,255,0.4)'} />
                    <Text style={{ color: postMode === 'MEDIA' ? '#000' : 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 11, marginLeft: 6, letterSpacing: 0.5 }}>MEDIA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setPostMode('TEXT')}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 6, backgroundColor: postMode === 'TEXT' ? '#fff' : 'transparent' }}
                >
                    <Type size={14} color={postMode === 'TEXT' ? '#000' : 'rgba(255,255,255,0.4)'} />
                    <Text style={{ color: postMode === 'TEXT' ? '#000' : 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 11, marginLeft: 6, letterSpacing: 0.5 }}>TEXT ONLY</Text>
                </TouchableOpacity>
            </View>

            {/* Content Input */}
            <View style={{ marginBottom: 20 }}>
                <TextInput
                    value={content}
                    onChangeText={setContent}
                    placeholder={postMode === 'TEXT' ? "Write your thoughts..." : "Write a caption..."}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    numberOfLines={postMode === 'TEXT' ? 8 : 3}
                    maxLength={postMode === 'TEXT' ? MAX_TEXT_LENGTH : undefined}
                    style={{
                        color: '#fff',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        minHeight: postMode === 'TEXT' ? 160 : 80,
                        textAlignVertical: 'top',
                        fontSize: 15,
                        lineHeight: 22,
                    }}
                />
                {postMode === 'TEXT' && (
                    <Text style={{ color: content.length > 550 ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textAlign: 'right', marginTop: 8 }}>
                        {content.length}/{MAX_TEXT_LENGTH}
                    </Text>
                )}
            </View>

            {/* Media Grid */}
            {postMode === 'MEDIA' && (
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>MEDIA ({media.length}/{MAX_MEDIA})</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 }}>
                        {media.map((item, index) => <View key={`media-${index}`}>{renderMediaItem({ item, index })}</View>)}
                        {media.length < MAX_MEDIA && (
                            <TouchableOpacity
                                onPress={pickMedia}
                                style={{
                                    width: (width - 56) / 4,
                                    aspectRatio: 1,
                                    margin: 2,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderStyle: 'dashed',
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                }}
                            >
                                <Plus size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Visibility */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>VISIBILITY</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[{ value: 'PUBLIC', label: 'Public', Icon: Globe }, { value: 'FRIENDS', label: 'Friends', Icon: Users }, { value: 'PRIVATE', label: 'Private', Icon: Lock }].map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => setVisibility(opt.value)}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                backgroundColor: visibility === opt.value ? '#fff' : 'transparent',
                                borderColor: visibility === opt.value ? '#fff' : 'rgba(255,255,255,0.2)',
                            }}
                        >
                            <opt.Icon size={14} color={visibility === opt.value ? '#000' : 'rgba(255,255,255,0.5)'} />
                            <Text style={{ color: visibility === opt.value ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 11, marginLeft: 6 }}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Slashes */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>SLASHES</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12 }}>
                        <Slash size={16} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            value={slashInput}
                            onChangeText={setSlashInput}
                            placeholder="Add a slash tag..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            style={{ flex: 1, color: '#fff', paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 }}
                            onSubmitEditing={() => {
                                if (slashInput.trim() && !slashes.includes(slashInput.trim().toLowerCase())) {
                                    setSlashes([...slashes, slashInput.trim().toLowerCase()]);
                                    setSlashInput('');
                                }
                            }}
                            returnKeyType="done"
                        />
                        <TouchableOpacity
                            onPress={() => {
                                if (slashInput.trim() && !slashes.includes(slashInput.trim().toLowerCase())) {
                                    setSlashes([...slashes, slashInput.trim().toLowerCase()]);
                                    setSlashInput('');
                                }
                            }}
                            style={{ padding: 8 }}
                        >
                            <Plus size={18} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>
                </View>
                {slashes.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {slashes.map((slash, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginRight: 4 }}>/</Text>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{slash}</Text>
                                <TouchableOpacity onPress={() => setSlashes(slashes.filter((_, i) => i !== idx))} style={{ marginLeft: 8 }}>
                                    <X size={12} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Product Tagging */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>TAG PRODUCT</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16 }}>
                    <Image source={{ uri: 'https://via.placeholder.com/30' }} style={{ width: 16, height: 16, tintColor: 'rgba(255,255,255,0.4)' }} />
                    <TextInput
                        value={productCode}
                        onChangeText={setProductCode}
                        placeholder="Enter 12-digit Product Code (e.g. A1B2-C3D4-E5F6)"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ flex: 1, color: '#fff', paddingVertical: 14, paddingHorizontal: 12, fontSize: 14 }}
                        maxLength={14}
                    />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 6, paddingHorizontal: 4 }}>
                    Link a product to your post to display a shop pill.
                </Text>
            </View>

            {/* Progress */}
            {loading && (
                <View style={{ marginBottom: 16 }}>
                    <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
                        <View style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#fff' }} />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 8, textAlign: 'center', letterSpacing: 0.5 }}>
                        UPLOADING {Math.round(uploadProgress)}%
                    </Text>
                </View>
            )}

            {/* Submit */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || (postMode === 'MEDIA' && media.length === 0) || (postMode === 'TEXT' && !content.trim())}
                style={{
                    backgroundColor: '#fff',
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginBottom: 40,
                    opacity: loading || (postMode === 'MEDIA' && media.length === 0) || (postMode === 'TEXT' && !content.trim()) ? 0.3 : 1,
                }}
            >
                {loading ? (
                    <ActivityIndicator color="#000" />
                ) : (
                    <Text style={{ color: '#000', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>POST</Text>
                )}
            </TouchableOpacity>

            <SuccessOverlay
                visible={showSuccess}
                message="Posted Successfully!"
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
