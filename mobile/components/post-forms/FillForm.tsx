import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft, Globe, Users, Lock, Film, Play, Slash, Plus } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';
import { analyzeImageForNudity, NudityAnalysisResult } from '../../lib/nudity-detection';
import NudityWarningModal from '../NudityWarningModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';
const { width } = Dimensions.get('window');

interface FillFormProps {
    onBack: () => void;
}

export default function FillForm({ onBack }: FillFormProps) {
    const { isDark } = useTheme();
    const { session } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [slashes, setSlashes] = useState<string[]>([]);
    const [slashInput, setSlashInput] = useState('');

    // Nudity detection state
    const [nudityResult, setNudityResult] = useState<NudityAnalysisResult | null>(null);
    const [showNudityWarning, setShowNudityWarning] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);

    const pickVideo = async () => {
        try {
            // Fix deprecation: Use string array or MediaType enum if available. 
            // Using ['videos'] is the modern standard for Expo ImagePicker.
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                // Direct assignment without compression (Compressor requires native rebuild)
                setVideo(asset);

                // Warn if file is huge? Optional.
                if (asset.fileSize && asset.fileSize > 200 * 1024 * 1024) {
                    Alert.alert("Large Video", "This video is large and may take longer to process.");
                }
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to select video');
            console.error(e);
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

        // Nudity Detection: Check video for inappropriate content
        if (!pendingSubmit) {
            const nudityCheck = await analyzeImageForNudity(video.uri);

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
            const { data: userData } = await supabase.from('User').select('id').eq('email', session.user.email).single();
            if (!userData?.id) throw new Error('User not found');

            setUploadProgress(20);
            const uploadResult = await MediaUploadService.uploadVideo(video.uri, `fill_${Date.now()}.mp4`);
            setUploadProgress(80);

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'FILL',
                    content: description || title,
                    visibility,
                    mediaUrls: [uploadResult.url],
                    mediaTypes: ['VIDEO'],
                    fillData: {
                        videoUrl: uploadResult.url,
                        title,
                        duration: video.duration ? Math.floor(video.duration / 1000) : 0,
                        aspectRatio: '16:9',
                    },
                    slashes: slashes.filter(s => s.trim()),
                }),
            });

            setUploadProgress(100);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed');
            setPendingSubmit(false);
            setNudityResult(null);
            Alert.alert('Done', 'Posted successfully', [{ text: 'OK', onPress: onBack }]);
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

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <ArrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>New Fill</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Long-form horizontal video</Text>
                </View>
                <Film size={24} color="rgba(255,255,255,0.3)" />
            </View>

            {/* Video Preview */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>VIDEO</Text>
                {video ? (
                    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Video source={{ uri: video.uri }} style={{ width: '100%', height: '100%' }} resizeMode={ResizeMode.COVER} shouldPlay={false} />
                        <TouchableOpacity
                            onPress={() => setVideo(null)}
                            style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#000', borderRadius: 14, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                        >
                            <X size={14} color="#fff" />
                        </TouchableOpacity>
                        <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{video.duration ? formatDuration(video.duration) : 'Ready'}</Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickVideo}
                        style={{
                            width: '100%',
                            aspectRatio: 16 / 9,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: 'rgba(255,255,255,0.3)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                        }}
                    >
                        <Play size={40} color="rgba(255,255,255,0.5)" />
                        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontWeight: '600', fontSize: 13 }}>Select Video</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>16:9 horizontal</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Title */}
            <View style={{ marginBottom: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>TITLE</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Video title..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                        color: '#fff',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        fontSize: 15,
                    }}
                />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>DESCRIPTION</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe your video..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    numberOfLines={4}
                    style={{
                        color: '#fff',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        minHeight: 80,
                        textAlignVertical: 'top',
                        fontSize: 15,
                    }}
                />
            </View>

            {/* Visibility */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>VISIBILITY</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[{ value: 'PUBLIC', label: 'Public', Icon: Globe }, { value: 'FRIENDS', label: 'Friends', Icon: Users }, { value: 'PRIVATE', label: 'Private', Icon: Lock }].map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => setVisibility(opt.value)}
                            style={{
                                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                padding: 12, borderRadius: 8, borderWidth: 1,
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
                        <TextInput value={slashInput} onChangeText={setSlashInput} placeholder="Add a slash tag..." placeholderTextColor="rgba(255,255,255,0.3)" style={{ flex: 1, color: '#fff', paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 }} onSubmitEditing={() => { if (slashInput.trim() && !slashes.includes(slashInput.trim().toLowerCase())) { setSlashes([...slashes, slashInput.trim().toLowerCase()]); setSlashInput(''); } }} returnKeyType="done" />
                        <TouchableOpacity onPress={() => { if (slashInput.trim() && !slashes.includes(slashInput.trim().toLowerCase())) { setSlashes([...slashes, slashInput.trim().toLowerCase()]); setSlashInput(''); } }} style={{ padding: 8 }}>
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

            {/* Progress */}
            {loading && (
                <View style={{ marginBottom: 16 }}>
                    <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
                        <View style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#fff' }} />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 8, textAlign: 'center', letterSpacing: 0.5 }}>UPLOADING {Math.round(uploadProgress)}%</Text>
                </View>
            )}

            {/* Submit */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !video || !title.trim()}
                style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 40, opacity: loading || !video || !title.trim() ? 0.3 : 1 }}
            >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>POST FILL</Text>}
            </TouchableOpacity>

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
        </ScrollView>
    );
}
