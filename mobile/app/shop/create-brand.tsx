import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { ShopService } from '../../services/ShopService';
import { uploadFileToR2 } from '../../lib/upload-helper';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera } from 'lucide-react-native';

export default function CreateBrandScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    const pickLogo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setUploading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const url = await uploadFileToR2(result.assets[0].uri, 'IMAGE', session?.access_token);
                if (url) setLogoUrl(url);
            } catch (error) {
                Alert.alert('Error', 'Failed to upload logo');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Enter a brand name');

        setSubmitting(true);
        try {
            const brand = await ShopService.createBrand({
                name: name.trim(),
                description: description.trim() || undefined,
                logoUrl: logoUrl || undefined,
            });

            if (brand) {
                Alert.alert('Success', 'Brand created!', [
                    { text: 'View', onPress: () => router.replace(`/shop/brand/${brand.slug}`) },
                    { text: 'Done', onPress: () => router.back() },
                ]);
            } else {
                Alert.alert('Error', 'Failed to create brand');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 16 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Create Brand</Text>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100, alignItems: 'center' }} showsVerticalScrollIndicator={false}>

                        {/* Logo */}
                        <TouchableOpacity
                            onPress={pickLogo}
                            disabled={uploading}
                            style={{
                                width: 100,
                                height: 100,
                                borderRadius: 50,
                                backgroundColor: inputBg,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                marginBottom: 24,
                            }}
                        >
                            {uploading ? (
                                <ActivityIndicator color={colors.text} />
                            ) : logoUrl ? (
                                <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <Camera size={28} color={subtleText} />
                            )}
                        </TouchableOpacity>

                        <View style={{ width: '100%' }}>
                            {/* Name */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Brand Name</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Your brand name"
                                placeholderTextColor={subtleText}
                                style={{ backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, marginBottom: 20 }}
                            />

                            {/* Description */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Description</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Tell people about your brand..."
                                placeholderTextColor={subtleText}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                style={{ backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, minHeight: 80, marginBottom: 24 }}
                            />

                            {/* Submit */}
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={submitting}
                                style={{ paddingVertical: 16, backgroundColor: colors.text, borderRadius: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
                            >
                                {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={{ fontSize: 15, fontWeight: '700', color: colors.background }}>Create Brand</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
