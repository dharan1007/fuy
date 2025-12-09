import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, Plus, X, Layers } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

interface XrayFormProps {
    onBack: () => void;
}

export default function XrayForm({ onBack }: XrayFormProps) {
    const { colors, isDark } = useTheme();
    const { session } = useAuth();
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [topLayer, setTopLayer] = useState<string | null>(null);
    const [bottomLayer, setBottomLayer] = useState<string | null>(null);
    const [scratchPattern, setScratchPattern] = useState('RANDOM');
    const [loading, setLoading] = useState(false);

    const pickImage = async (type: 'top' | 'bottom') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
            Alert.alert('Error', 'Please select both top and bottom layer images');
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

            // Upload both images
            const [topResult, bottomResult] = await Promise.all([
                MediaUploadService.uploadImage(topLayer, `xray_top_${Date.now()}.jpg`),
                MediaUploadService.uploadImage(bottomLayer, `xray_bottom_${Date.now()}.jpg`),
            ]);

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'XRAY',
                    content: description || 'Scratch to Reveal',
                    visibility,
                    xrayData: {
                        topLayerUrl: topResult.url,
                        topLayerType: 'IMAGE',
                        bottomLayerUrl: bottomResult.url,
                        bottomLayerType: 'IMAGE',
                        scratchPattern,
                    },
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create X-Ray');
            }

            Alert.alert('Success', 'X-Ray posted!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
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
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New X-Ray</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Scratch to reveal hidden content</Text>
                </View>
            </View>

            {/* Top Layer (Initial visible) */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Top Layer (Visible First)</Text>
                {topLayer ? (
                    <View className="relative" style={{ aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
                        <Image source={{ uri: topLayer }} style={{ width: '100%', height: '100%' }} />
                        <TouchableOpacity
                            onPress={() => setTopLayer(null)}
                            className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                        >
                            <X size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => pickImage('top')}
                        style={{
                            aspectRatio: 1,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#06b6d4',
                            borderStyle: 'dashed',
                        }}
                    >
                        <Plus size={48} color="#06b6d4" />
                        <Text style={{ color: '#06b6d4', marginTop: 8, fontWeight: '600' }}>Add Top Layer</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Bottom Layer (Revealed on scratch) */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Bottom Layer (Revealed)</Text>
                {bottomLayer ? (
                    <View className="relative" style={{ aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
                        <Image source={{ uri: bottomLayer }} style={{ width: '100%', height: '100%' }} />
                        <TouchableOpacity
                            onPress={() => setBottomLayer(null)}
                            className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                        >
                            <X size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => pickImage('bottom')}
                        style={{
                            aspectRatio: 1,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#06b6d4',
                            borderStyle: 'dashed',
                        }}
                    >
                        <Layers size={48} color="#06b6d4" />
                        <Text style={{ color: '#06b6d4', marginTop: 8, fontWeight: '600' }}>Add Hidden Layer</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Scratch Pattern */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Scratch Pattern</Text>
                <View className="flex-row gap-2">
                    {['RANDOM', 'GRID', 'CUSTOM'].map((pattern) => (
                        <TouchableOpacity
                            key={pattern}
                            onPress={() => setScratchPattern(pattern)}
                            className={`flex-1 py-3 rounded-xl items-center ${scratchPattern === pattern ? 'bg-cyan-500' : ''}`}
                            style={{ backgroundColor: scratchPattern === pattern ? '#06b6d4' : isDark ? '#1a1a1a' : '#f5f5f5' }}
                        >
                            <Text style={{ color: scratchPattern === pattern ? 'white' : colors.text, fontWeight: '600' }}>{pattern}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Description */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Caption</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What's hiding underneath?"
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
                disabled={loading || !topLayer || !bottomLayer}
                style={{
                    backgroundColor: topLayer && bottomLayer ? '#06b6d4' : colors.border,
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
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post X-Ray</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
