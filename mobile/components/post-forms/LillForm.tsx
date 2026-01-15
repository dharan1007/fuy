import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft, Globe, Users, Lock, Smartphone, Play } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';
const MAX_DURATION = 60;
const { width } = Dimensions.get('window');

interface LillFormProps {
    onBack: () => void;
}

export default function LillForm({ onBack }: LillFormProps) {
    const { isDark } = useTheme();
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
            if (asset.duration && asset.duration > MAX_DURATION * 1000) {
                Alert.alert('Too Long', `Maximum ${MAX_DURATION} seconds allowed`);
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
            const { data: userData } = await supabase.from('User').select('id').eq('email', session.user.email).single();
            if (!userData?.id) throw new Error('User not found');

            setUploadProgress(20);
            const uploadResult = await MediaUploadService.uploadVideo(video.uri, `lill_${Date.now()}.mp4`);
            setUploadProgress(80);

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'LILL',
                    content: description || 'New Lill',
                    visibility,
                    mediaUrls: [uploadResult.url],
                    mediaTypes: ['VIDEO'],
                    lillData: {
                        videoUrl: uploadResult.url,
                        duration: video.duration ? Math.floor(video.duration / 1000) : MAX_DURATION,
                        aspectRatio: '9:16',
                    },
                }),
            });

            setUploadProgress(100);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed');
            Alert.alert('Done', 'Posted successfully', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity onPress={onBack} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <ArrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>New Lill</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Vertical video (max {MAX_DURATION}s)</Text>
                </View>
                <Smartphone size={24} color="rgba(255,255,255,0.3)" />
            </View>

            {/* Video Preview */}
            <View style={{ marginBottom: 20, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1, alignSelf: 'flex-start' }}>VIDEO</Text>
                {video ? (
                    <View style={{ width: width * 0.5, aspectRatio: 9 / 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Video source={{ uri: video.uri }} style={{ width: '100%', height: '100%' }} resizeMode={ResizeMode.COVER} shouldPlay={false} />
                        <TouchableOpacity
                            onPress={() => setVideo(null)}
                            style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#000', borderRadius: 14, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                        >
                            <X size={14} color="#fff" />
                        </TouchableOpacity>
                        <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{video.duration ? `${Math.floor(video.duration / 1000)}s` : 'Ready'}</Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickVideo}
                        style={{
                            width: width * 0.5,
                            aspectRatio: 9 / 16,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: 'rgba(255,255,255,0.3)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                        }}
                    >
                        <Play size={32} color="rgba(255,255,255,0.5)" />
                        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontWeight: '600', fontSize: 13 }}>Select Video</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>9:16 vertical</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Caption */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>CAPTION</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe your Lill..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    numberOfLines={3}
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
                disabled={loading || !video}
                style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 40, opacity: loading || !video ? 0.3 : 1 }}
            >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>POST LILL</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}
