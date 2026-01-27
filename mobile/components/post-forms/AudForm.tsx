import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, Radio, Music, Upload, X, Image as ImageIcon, Slash, Plus } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';
import SuccessOverlay from '../SuccessOverlay';
import { analyzeImageForNudity, NudityAnalysisResult } from '../../lib/nudity-detection';
import NudityWarningModal from '../NudityWarningModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';
const { width } = Dimensions.get('window');

interface AudFormProps {
    onBack: () => void;
}

export default function AudForm({ onBack }: AudFormProps) {
    const { isDark } = useTheme();
    const { session } = useAuth();
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [audioName, setAudioName] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [slashes, setSlashes] = useState<string[]>([]);
    const [slashInput, setSlashInput] = useState('');

    // Nudity detection state
    const [nudityResult, setNudityResult] = useState<NudityAnalysisResult | null>(null);
    const [showNudityWarning, setShowNudityWarning] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false);

    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
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
            mediaTypes: ['images'],
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

        // Nudity Detection: Check cover image for inappropriate content
        if (coverImage && !pendingSubmit) {
            const nudityCheck = await analyzeImageForNudity(coverImage);

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

            setUploadProgress(30);
            const audioResult = await MediaUploadService.uploadAudio(audioUri, audioName || `audio_${Date.now()}.mp3`);

            let coverUrl = null;
            if (coverImage) {
                setUploadProgress(60);
                const coverResult = await MediaUploadService.uploadImage(coverImage);
                coverUrl = coverResult.url;
            }
            setUploadProgress(80);

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
                    postType: 'AUD',
                    content: description || title,
                    visibility,
                    audData: {
                        audioUrl: audioResult.url,
                        duration: audioResult.duration || 0,
                        coverImageUrl: coverUrl,
                        title,
                        artist: artist || null,
                        genre: genre || null,
                    },
                    mediaUrls: coverUrl ? [audioResult.url, coverUrl] : [audioResult.url],
                    mediaTypes: coverUrl ? ['AUDIO', 'IMAGE'] : ['AUDIO'],
                    mediaVariants: coverUrl ? ['sometrack', 'thumbnail'] : ['sometrack'],
                    slashes: slashes.filter(s => s.trim()),
                }),
            });

            setUploadProgress(100);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed');
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
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>New Aud</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Audio with waveform preview</Text>
                </View>
                <Radio size={24} color="rgba(255,255,255,0.3)" />
            </View>

            {/* Audio & Cover Row */}
            <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
                {/* Cover Art */}
                <View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 10, letterSpacing: 1 }}>COVER ART</Text>
                    {coverImage ? (
                        <View style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} />
                            <TouchableOpacity onPress={() => setCoverImage(null)} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#000', borderRadius: 8, padding: 2 }}>
                                <X size={10} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={pickCover} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <ImageIcon size={24} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Audio File */}
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 10, letterSpacing: 1 }}>AUDIO FILE</Text>
                    {audioUri ? (
                        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Music size={20} color="rgba(255,255,255,0.6)" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{audioName}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Ready to upload</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setAudioUri(null); setAudioName(''); }} style={{ padding: 4 }}>
                                <X size={16} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={pickAudio} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <Upload size={24} color="rgba(255,255,255,0.4)" />
                            <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 4, fontSize: 11, fontWeight: '600' }}>Select Audio</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Title */}
            <View style={{ marginBottom: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>TITLE</Text>
                <TextInput value={title} onChangeText={setTitle} placeholder="Track title..." placeholderTextColor="rgba(255,255,255,0.3)" style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 15 }} />
            </View>

            {/* Artist & Genre Row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>ARTIST</Text>
                    <TextInput value={artist} onChangeText={setArtist} placeholder="Artist..." placeholderTextColor="rgba(255,255,255,0.3)" style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 15 }} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>GENRE</Text>
                    <TextInput value={genre} onChangeText={setGenre} placeholder="Genre..." placeholderTextColor="rgba(255,255,255,0.3)" style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 15 }} />
                </View>
            </View>

            {/* Description */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>DESCRIPTION</Text>
                <TextInput value={description} onChangeText={setDescription} placeholder="About this track..." placeholderTextColor="rgba(255,255,255,0.3)" multiline style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 70, textAlignVertical: 'top', fontSize: 15 }} />
            </View>

            {/* Visibility */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>VISIBILITY</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[{ value: 'PUBLIC', label: 'Public', Icon: Globe }, { value: 'FRIENDS', label: 'Friends', Icon: Users }, { value: 'PRIVATE', label: 'Private', Icon: Lock }].map(opt => (
                        <TouchableOpacity key={opt.value} onPress={() => setVisibility(opt.value)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1, backgroundColor: visibility === opt.value ? '#fff' : 'transparent', borderColor: visibility === opt.value ? '#fff' : 'rgba(255,255,255,0.2)' }}>
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
            <TouchableOpacity onPress={handleSubmit} disabled={loading || !audioUri || !title.trim()} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 40, opacity: loading || !audioUri || !title.trim() ? 0.3 : 1 }}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>POST AUD</Text>}
            </TouchableOpacity>

            <SuccessOverlay
                visible={showSuccess}
                message="Aud Posted!"
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
