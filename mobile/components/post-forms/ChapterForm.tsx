import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { X, Upload, ArrowLeft, Globe, Users, Lock } from 'lucide-react-native';

const API_URL = 'http://10.0.2.2:3000'; // Android Emulator Loopback

interface ChapterFormProps {
    onBack: () => void;
}

export default function ChapterForm({ onBack }: ChapterFormProps) {
    const { colors, isDark } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [loading, setLoading] = useState(false);

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia(prev => [...prev, ...result.assets]);
        }
    };

    const removeMedia = (index: number) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFile = async (asset: ImagePicker.ImagePickerAsset) => {
        const formData = new FormData();
        formData.append('file', {
            uri: asset.uri,
            name: asset.fileName || 'upload.jpg',
            type: asset.mimeType || 'image/jpeg',
        } as any);
        
        const type = asset.type === 'video' ? 'video' : 'image';
        formData.append('type', type);

        const res = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return data.url;
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }
        if (media.length === 0) {
            Alert.alert('Error', 'Please select at least one image or video');
            return;
        }

        setLoading(true);
        try {
            const uploadedUrls = await Promise.all(media.map(uploadFile));
            const payload = {
                title,
                description,
                content: description,
                visibility,
                mediaUrls: uploadedUrls,
                mediaTypes: media.map(m => m.type === 'video' ? 'VIDEO' : 'IMAGE'),
            };

            const res = await fetch(`${API_URL}/api/posts/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create chapter');
            }

            Alert.alert('Success', 'Chapter created!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
            style={{ columnGap: 8 }}
        >
            <Icon size={16} color={visibility === value ? 'white' : colors.text} />
            <Text style={{ color: visibility === value ? 'white' : colors.text, fontWeight: '600', marginLeft: 6 }}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            {/* Header with explicit zIndex to prevent overlap issues */}
            <View className="flex-row items-center mb-6 z-50 relative">
                <TouchableOpacity 
                    onPress={onBack} 
                    className={`p-3 rounded-full mr-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New Chapter</Text>
            </View>

            {/* Form Fields */}
            <View className="space-y-6">
                <View>
                    <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Title</Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Chapter Title..."
                        placeholderTextColor={colors.secondary}
                        style={{
                            color: colors.text,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            padding: 16,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border
                        }}
                    />
                </View>

                <View>
                    <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Description</Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What's this chapter about?"
                        placeholderTextColor={colors.secondary}
                        multiline
                        numberOfLines={4}
                        style={{
                            color: colors.text,
                            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                            padding: 16,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            height: 120,
                            textAlignVertical: 'top'
                        }}
                    />
                </View>

                {/* Visibility Toggle */}
                <View>
                    <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Visibility</Text>
                    <View className="flex-row gap-2">
                        <VisibilityOption value="PUBLIC" label="Public" icon={Globe} />
                        <VisibilityOption value="FRIENDS" label="Friends" icon={Users} />
                        <VisibilityOption value="PRIVATE" label="Private" icon={Lock} />
                    </View>
                </View>

                <View>
                    <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Media</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                        <TouchableOpacity
                            onPress={pickMedia}
                            style={{
                                width: 100,
                                height: 100,
                                backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderStyle: 'dashed',
                                marginRight: 12
                            }}
                        >
                            <Upload size={24} color={colors.secondary} />
                            <Text style={{ color: colors.secondary, marginTop: 4, fontSize: 12, fontWeight: '600' }}>Add Media</Text>
                        </TouchableOpacity>

                        {media.map((asset, index) => (
                            <View key={index} className="relative mr-3" style={{ width: 100, height: 100 }}>
                                <Image source={{ uri: asset.uri }} style={{ width: 100, height: 100, borderRadius: 16 }} />
                                <TouchableOpacity
                                    onPress={() => removeMedia(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-sm"
                                >
                                    <X size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className="shadow-lg"
                    style={{
                        backgroundColor: colors.primary,
                        padding: 18,
                        borderRadius: 16,
                        alignItems: 'center',
                        marginTop: 12,
                        marginBottom: 40
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post Chapter</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
