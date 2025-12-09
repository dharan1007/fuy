import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, Music, Upload, X, Image as ImageIcon } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

interface AudFormProps {
    onBack: () => void;
}

export default function AudForm({ onBack }: AudFormProps) {
    const { colors, isDark } = useTheme();
    const { session } = useAuth();
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [audioName, setAudioName] = useState<string>('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled === false && result.assets?.[0]) {
                setAudioUri(result.assets[0].uri);
                setAudioName(result.assets[0].name);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick audio file');
        }
    };

    const pickCover = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!audioUri) {
            Alert.alert('Error', 'Please select an audio file');
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

        try {
            const { data: userData } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!userData?.id) throw new Error('User not found');

            // Upload audio to Cloudflare R2
            const audioResult = await MediaUploadService.uploadAudio(audioUri, audioName || `audio_${Date.now()}.mp3`);

            // Upload cover image if provided
            let coverUrl = null;
            if (coverImage) {
                const coverResult = await MediaUploadService.uploadImage(coverImage, `cover_${Date.now()}.jpg`);
                coverUrl = coverResult.url;
            }

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'AUD',
                    content: description || title,
                    visibility,
                    audData: {
                        audioUrl: audioResult.url,
                        duration: audioResult.duration || 0,
                        coverImageUrl: coverUrl,
                        title: title,
                        artist: artist || null,
                        genre: genre || null,
                    },
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create Aud');
            }

            Alert.alert('Success', 'Aud posted!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
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
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New Aud</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Audio with waveform</Text>
                </View>
            </View>

            {/* Audio Picker */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Audio File</Text>
                {audioUri ? (
                    <View
                        className="flex-row items-center p-4 rounded-2xl"
                        style={{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }}
                    >
                        <View className="w-12 h-12 rounded-xl items-center justify-center bg-indigo-500">
                            <Music size={24} color="white" />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{audioName}</Text>
                            <Text style={{ color: colors.secondary, fontSize: 12 }}>Tap to change</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setAudioUri(null); setAudioName(''); }}>
                            <X size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickAudio}
                        style={{
                            padding: 32,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#6366f1',
                            borderStyle: 'dashed',
                        }}
                    >
                        <Upload size={48} color="#6366f1" />
                        <Text style={{ color: '#6366f1', marginTop: 12, fontWeight: '600' }}>Select Audio</Text>
                        <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4 }}>MP3, WAV, etc.</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Cover Image */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Cover Art (Optional)</Text>
                {coverImage ? (
                    <View className="relative" style={{ width: 120, height: 120, borderRadius: 16, overflow: 'hidden' }}>
                        <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} />
                        <TouchableOpacity
                            onPress={() => setCoverImage(null)}
                            className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                        >
                            <X size={12} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickCover}
                        style={{
                            width: 120,
                            height: 120,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <ImageIcon size={32} color={colors.secondary} />
                        <Text style={{ color: colors.secondary, fontSize: 10, marginTop: 4 }}>Add Cover</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Title */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Title *</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Track title..."
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

            {/* Artist */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Artist</Text>
                <TextInput
                    value={artist}
                    onChangeText={setArtist}
                    placeholder="Artist name..."
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

            {/* Genre */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Genre</Text>
                <TextInput
                    value={genre}
                    onChangeText={setGenre}
                    placeholder="e.g. Pop, Rock, Electronic..."
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
                    placeholder="What's this about?"
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

            {/* Submit */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !audioUri || !title.trim()}
                style={{
                    backgroundColor: audioUri && title.trim() ? '#6366f1' : colors.border,
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
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post Aud</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
