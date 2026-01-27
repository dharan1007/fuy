import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { ShopService } from '../../services/ShopService';
import { uploadFileToR2 } from '../../lib/upload-helper';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, X, Check, Package, GraduationCap, BookOpen, LayoutTemplate, Globe, FileText } from 'lucide-react-native';

const PRODUCT_TYPES = [
    { id: 'COURSE', label: 'Course', icon: GraduationCap },
    { id: 'EBOOK', label: 'E-Book', icon: BookOpen },
    { id: 'TEMPLATE', label: 'Template', icon: LayoutTemplate },
    { id: 'HOPIN_PLAN', label: 'Hopin Plan', icon: Globe },
    { id: 'DIGITAL_ASSET', label: 'Asset', icon: FileText },
];

export default function SellScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [type, setType] = useState<'PHYSICAL' | 'COURSE' | 'EBOOK' | 'TEMPLATE' | 'HOPIN_PLAN' | 'DIGITAL_ASSET'>('COURSE');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 4 - images.length,
        });

        if (!result.canceled && result.assets.length > 0) {
            setUploading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const uploadedUrls: string[] = [];
                for (const asset of result.assets) {
                    const url = await uploadFileToR2(asset.uri, 'IMAGE', session?.access_token);
                    if (url) uploadedUrls.push(url);
                }
                setImages([...images, ...uploadedUrls]);
            } catch (error) {
                console.error('Upload error:', error);
                Alert.alert('Error', 'Failed to upload images');
            } finally {
                setUploading(false);
            }
        }
    };

    const generateUniqueCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code.match(/.{1,4}/g)?.join('-') || code;
    };

    const handleSubmit = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Enter a product name');
        if (!price || parseFloat(price) <= 0) return Alert.alert('Error', 'Enter a valid price');
        if (images.length === 0) return Alert.alert('Error', 'Add at least one image');

        setSubmitting(true);
        try {
            const product = await ShopService.createProduct({
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                type,
                images,
            });

            if (product) {
                const newCode = generateUniqueCode();
                Alert.alert(
                    'Success',
                    `Product listed!\n\nUnique Code: ${newCode}\n\n(Share this code for others to tag your product)`,
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Error', 'Failed to create product');
            }
        } catch (error) {
            console.error('Create error:', error);
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
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Sell on FUY</Text>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                        {/* Type Selector */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Type</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                            {PRODUCT_TYPES.map(pt => {
                                const Icon = pt.icon;
                                const isActive = type === pt.id;
                                return (
                                    <TouchableOpacity
                                        key={pt.id}
                                        onPress={() => setType(pt.id as any)}
                                        style={{
                                            flex: 1,
                                            alignItems: 'center',
                                            paddingVertical: 14,
                                            borderRadius: 10,
                                            backgroundColor: isActive ? colors.text : inputBg,
                                        }}
                                    >
                                        <Icon size={20} color={isActive ? colors.background : colors.text} />
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? colors.background : colors.text, marginTop: 4 }}>{pt.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Images */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Photos</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {images.map((uri, i) => (
                                    <View key={i} style={{ position: 'relative' }}>
                                        <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                                        <TouchableOpacity
                                            onPress={() => setImages(images.filter((_, idx) => idx !== i))}
                                            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X size={12} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {images.length < 4 && (
                                    <TouchableOpacity
                                        onPress={pickImage}
                                        disabled={uploading}
                                        style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: inputBg, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {uploading ? <ActivityIndicator color={colors.text} /> : <Camera size={24} color={subtleText} />}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {/* Name */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Product name"
                            placeholderTextColor={subtleText}
                            style={{ backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, marginBottom: 20 }}
                        />

                        {/* Description */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Description</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Describe your product..."
                            placeholderTextColor={subtleText}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            style={{ backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, minHeight: 80, marginBottom: 20 }}
                        />

                        {/* Price */}
                        <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Price</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 14, marginBottom: 24 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>$</Text>
                            <TextInput
                                value={price}
                                onChangeText={setPrice}
                                placeholder="0.00"
                                placeholderTextColor={subtleText}
                                keyboardType="decimal-pad"
                                style={{ flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 15, color: colors.text }}
                            />
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting}
                            style={{ paddingVertical: 16, backgroundColor: colors.text, borderRadius: 12, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
                        >
                            {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={{ fontSize: 15, fontWeight: '700', color: colors.background }}>Publish</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
