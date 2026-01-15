import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, Search, Layers, Plus } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';
const { width } = Dimensions.get('window');

interface XrayFormProps {
    onBack: () => void;
}

export default function XrayForm({ onBack }: XrayFormProps) {
    const { isDark } = useTheme();
    const { session } = useAuth();
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [topLayer, setTopLayer] = useState<string | null>(null);
    const [bottomLayer, setBottomLayer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const pickImage = async (type: 'top' | 'bottom') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            if (type === 'top') setTopLayer(result.assets[0].uri);
            else setBottomLayer(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!topLayer || !bottomLayer) {
            Alert.alert('Error', 'Please select both layers');
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

            setUploadProgress(30);
            const [topResult, bottomResult] = await Promise.all([
                MediaUploadService.uploadImage(topLayer),
                MediaUploadService.uploadImage(bottomLayer),
            ]);
            setUploadProgress(80);

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'XRAY',
                    content: description || 'Scratch to Reveal',
                    visibility,
                    mediaUrls: [topResult.url, bottomResult.url],
                    mediaTypes: ['IMAGE', 'IMAGE'],
                    mediaVariants: ['xray-bottom', 'xray-top'], // Swapped to match Feed.tsx logic: Bottom=Cover, Top=Content
                    xrayData: {
                        topLayerUrl: topResult.url,
                        topLayerType: 'IMAGE',
                        bottomLayerUrl: bottomResult.url,
                        bottomLayerType: 'IMAGE',
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

    const ImagePicker_ = ({ uri, onPick, onClear, label, icon: Icon }: { uri: string | null; onPick: () => void; onClear: () => void; label: string; icon: any }) => (
        <View style={{ flex: 1, marginHorizontal: 4 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 10, letterSpacing: 1 }}>{label}</Text>
            {uri ? (
                <View style={{ aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <TouchableOpacity
                        onPress={onClear}
                        style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#000', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                    >
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>X</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={onPick}
                    style={{ aspectRatio: 1, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                    <Icon size={24} color="rgba(255,255,255,0.4)" />
                    <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 11, fontWeight: '600' }}>Add</Text>
                </TouchableOpacity>
            )}
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
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>New Xray</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Scratch to reveal hidden content</Text>
                </View>
                <Search size={24} color="rgba(255,255,255,0.3)" />
            </View>

            {/* Layers */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>LAYERS</Text>
                <View style={{ flexDirection: 'row', marginHorizontal: -4 }}>
                    <ImagePicker_ uri={topLayer} onPick={() => pickImage('top')} onClear={() => setTopLayer(null)} label="TOP (VISIBLE)" icon={Plus} />
                    <ImagePicker_ uri={bottomLayer} onPick={() => pickImage('bottom')} onClear={() => setBottomLayer(null)} label="HIDDEN (REVEAL)" icon={Layers} />
                </View>
            </View>

            {/* Caption */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>CAPTION</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What is hidden underneath..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 80, textAlignVertical: 'top', fontSize: 15 }}
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
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1, backgroundColor: visibility === opt.value ? '#fff' : 'transparent', borderColor: visibility === opt.value ? '#fff' : 'rgba(255,255,255,0.2)' }}
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
                disabled={loading || !topLayer || !bottomLayer}
                style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 40, opacity: loading || !topLayer || !bottomLayer ? 0.3 : 1 }}
            >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>POST XRAY</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}
