import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Dimensions, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft, Camera as CameraIcon, Image as ImageIcon, Type, Send, Clock, Globe, Users, Lock, Save } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';
const { width, height } = Dimensions.get('window');

interface ClockFormProps {
    onBack: () => void;
}

type MediaType = { uri: string; type: 'image' | 'video' };

const DURATION_OPTIONS = [1, 6, 12, 24, 48];

export default function ClockForm({ onBack }: ClockFormProps) {
    const { session } = useAuth();
    const [media, setMedia] = useState<MediaType | null>(null);
    const [caption, setCaption] = useState('');
    const [duration, setDuration] = useState(24);
    const [visibility, setVisibility] = useState('PUBLIC');
    const [loading, setLoading] = useState(false);

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
        }
    };

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
        }
    };

    const clearMedia = () => {
        setMedia(null);
        setCaption('');
    };

    const handleSubmit = async (asDraft = false) => {
        if (!media) {
            Alert.alert('Error', 'Please capture or select media');
            return;
        }
        if (!session?.user?.email) {
            Alert.alert('Error', 'Please log in first');
            return;
        }

        setLoading(true);
        try {
            const { data: userData } = await supabase.from('User').select('id').eq('email', session.user.email).single();
            if (!userData?.id) throw new Error('User not found');

            const uploadResult = media.type === 'video'
                ? await MediaUploadService.uploadVideo(media.uri, `clock_${Date.now()}.mp4`)
                : await MediaUploadService.uploadImage(media.uri, `clock_${Date.now()}.jpg`);

            const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'CLOCK',
                    content: caption || 'New Story',
                    visibility,
                    status: asDraft ? 'DRAFT' : 'PUBLISHED',
                    clockData: {
                        mediaUrl: uploadResult.url,
                        mediaType: media.type === 'video' ? 'VIDEO' : 'IMAGE',
                        duration,
                        expiresAt,
                    },
                    mediaUrls: [uploadResult.url],
                    mediaTypes: [media.type === 'video' ? 'VIDEO' : 'IMAGE'],
                }),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Failed');
            Alert.alert('Done', asDraft ? 'Saved as draft' : 'Story posted', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <Clock size={20} color="#fff" />
                    <Text style={styles.titleText}>New Story</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {/* Media Section */}
            <View style={styles.mediaSection}>
                <Text style={styles.sectionLabel}>MEDIA</Text>
                {media ? (
                    <View style={styles.previewWrapper}>
                        {media.type === 'video' ? (
                            <Video source={{ uri: media.uri }} style={styles.preview} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted />
                        ) : (
                            <Image source={{ uri: media.uri }} style={styles.preview} resizeMode="cover" />
                        )}
                        <TouchableOpacity onPress={clearMedia} style={styles.clearBtn}>
                            <X size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.pickersRow}>
                        <TouchableOpacity onPress={takePhoto} style={styles.pickerBtn}>
                            <CameraIcon size={32} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.pickerLabel}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickFromGallery} style={styles.pickerBtn}>
                            <ImageIcon size={32} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.pickerLabel}>Gallery</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Caption */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>CAPTION</Text>
                <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Add a caption..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={styles.captionInput}
                    multiline
                    maxLength={150}
                />
            </View>

            {/* Duration */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>EXPIRES AFTER</Text>
                <View style={styles.durationRow}>
                    {DURATION_OPTIONS.map(h => (
                        <TouchableOpacity
                            key={h}
                            onPress={() => setDuration(h)}
                            style={[styles.durationBtn, duration === h && styles.durationBtnActive]}
                        >
                            <Text style={[styles.durationText, duration === h && styles.durationTextActive]}>{h}h</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Visibility */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>VISIBILITY</Text>
                <View style={styles.visRow}>
                    {[
                        { value: 'PUBLIC', label: 'Public', Icon: Globe },
                        { value: 'FRIENDS', label: 'Friends', Icon: Users },
                        { value: 'PRIVATE', label: 'Only Me', Icon: Lock },
                    ].map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => setVisibility(opt.value)}
                            style={[styles.visBtn, visibility === opt.value && styles.visBtnActive]}
                        >
                            <opt.Icon size={14} color={visibility === opt.value ? '#000' : 'rgba(255,255,255,0.5)'} />
                            <Text style={[styles.visText, visibility === opt.value && styles.visTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={() => handleSubmit(true)}
                    disabled={loading || !media}
                    style={[styles.draftBtn, (!media || loading) && styles.btnDisabled]}
                >
                    <Save size={16} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.draftText}>Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleSubmit(false)}
                    disabled={loading || !media}
                    style={[styles.postBtn, (!media || loading) && styles.btnDisabled]}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <Text style={styles.postText}>POST STORY</Text>
                            <Send size={16} color="#000" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
                <Clock size={14} color="rgba(255,255,255,0.3)" />
                <Text style={styles.infoText}>Stories disappear after {duration} hours</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { padding: 20, paddingBottom: 60 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    backBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titleText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    mediaSection: { marginBottom: 20 },
    sectionLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },

    previewWrapper: { width: '100%', aspectRatio: 9 / 16, maxHeight: 320, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
    preview: { width: '100%', height: '100%' },
    clearBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

    pickersRow: { flexDirection: 'row', gap: 12 },
    pickerBtn: { flex: 1, aspectRatio: 1, maxHeight: 140, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', gap: 8 },
    pickerLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },

    section: { marginBottom: 20 },
    captionInput: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 15, minHeight: 60, textAlignVertical: 'top' },

    durationRow: { flexDirection: 'row', gap: 8 },
    durationBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    durationBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
    durationText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
    durationTextActive: { color: '#000' },

    visRow: { flexDirection: 'row', gap: 8 },
    visBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    visBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
    visText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
    visTextActive: { color: '#000' },

    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    draftBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' },
    draftText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
    postBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, backgroundColor: '#fff' },
    postText: { color: '#000', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
    btnDisabled: { opacity: 0.4 },

    infoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 },
    infoText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});
