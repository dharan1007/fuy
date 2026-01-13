import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft, Globe, Users, Lock, Plus, BookOpen } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const { width } = Dimensions.get('window');

interface ChapterFormProps {
    onBack: () => void;
}

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
}

export default function ChapterForm({ onBack }: ChapterFormProps) {
    const { isDark } = useTheme();
    const { session } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: 50,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const newMedia: MediaItem[] = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.type === 'video' ? 'video' : 'image',
            }));
            setMedia(prev => [...prev, ...newMedia]);
        }
    };

    const removeMedia = (index: number) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }
        if (media.length === 0) {
            Alert.alert('Error', 'Please add at least one media item');
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

            const uploadedMedia: { url: string; type: 'IMAGE' | 'VIDEO' }[] = [];
            for (let i = 0; i < media.length; i++) {
                setUploadProgress(((i + 1) / media.length) * 80);
                const item = media[i];
                const result = item.type === 'video'
                    ? await MediaUploadService.uploadVideo(item.uri)
                    : await MediaUploadService.uploadImage(item.uri);
                uploadedMedia.push({ url: result.url, type: item.type === 'video' ? 'VIDEO' : 'IMAGE' });
            }

            setUploadProgress(90);

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'CHAPTER',
                    content: description || title,
                    visibility,
                    chapterData: { title, description },
                    mediaUrls: uploadedMedia.map(m => m.url),
                    mediaTypes: uploadedMedia.map(m => m.type),
                }),
            });

            setUploadProgress(100);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create chapter');
            }

            Alert.alert('Done', 'Posted successfully', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderMediaItem = (item: MediaItem, index: number) => (
        <View key={index} style={{ width: 80, height: 80, marginRight: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            {item.type === 'video' ? (
                <Video source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode={ResizeMode.COVER} shouldPlay={false} />
            ) : (
                <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            )}
            <TouchableOpacity
                onPress={() => removeMedia(index)}
                style={{ position: 'absolute', top: 2, right: 2, backgroundColor: '#000', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
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
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>New Chapter</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Multi-media collection</Text>
                </View>
                <BookOpen size={24} color="rgba(255,255,255,0.3)" />
            </View>

            {/* Title */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>TITLE</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Chapter title..."
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
                    placeholder="What is this chapter about..."
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
                        minHeight: 100,
                        textAlignVertical: 'top',
                        fontSize: 15,
                    }}
                />
            </View>

            {/* Media */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>MEDIA ({media.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        onPress={pickMedia}
                        style={{
                            width: 80,
                            height: 80,
                            marginRight: 8,
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
                    {media.map((item, index) => renderMediaItem(item, index))}
                </ScrollView>
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
                disabled={loading || !title.trim() || media.length === 0}
                style={{
                    backgroundColor: '#fff',
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginBottom: 40,
                    opacity: loading || !title.trim() || media.length === 0 ? 0.3 : 1,
                }}
            >
                {loading ? (
                    <ActivityIndicator color="#000" />
                ) : (
                    <Text style={{ color: '#000', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>POST CHAPTER</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
