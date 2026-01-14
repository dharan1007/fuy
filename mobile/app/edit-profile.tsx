import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Camera, Save, User, MapPin, FileText, Image as ImageIcon, Video, Lock, Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToR2 } from '../lib/upload-helper';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';

export default function EditProfileScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    const [form, setForm] = useState({
        displayName: '',
        bio: '',
        location: '',
        avatarUrl: '',
        coverImageUrl: '',
        coverVideoUrl: '',
        tags: '',
        isPrivate: false
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/(auth)/login');
                return;
            }

            const { data, error } = await supabase
                .from('Profile')
                .select('*')
                .eq('userId', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            if (data) {
                setForm({
                    displayName: data.displayName || '',
                    bio: data.bio || '',
                    location: data.location || '',
                    avatarUrl: data.avatarUrl || '',
                    coverImageUrl: data.coverImageUrl || '',
                    coverVideoUrl: data.coverVideoUrl || '',
                    tags: data.tags || '',
                    isPrivate: data.isPrivate || false
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const pickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                setUploadingAvatar(true);
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const url = await uploadFileToR2(
                        result.assets[0].uri,
                        'IMAGE',
                        session?.access_token
                    );
                    setForm(prev => ({ ...prev, avatarUrl: url }));
                } catch (uploadError: any) {
                    Alert.alert('Upload Error', uploadError.message);
                } finally {
                    setUploadingAvatar(false);
                }
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const pickCoverMedia = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                setUploadingCover(true);
                try {
                    const asset = result.assets[0];
                    const isVideo = asset.type === 'video';
                    const { data: { session } } = await supabase.auth.getSession();

                    const url = await uploadFileToR2(
                        asset.uri,
                        isVideo ? 'VIDEO' : 'IMAGE',
                        session?.access_token
                    );

                    if (isVideo) {
                        setForm(prev => ({ ...prev, coverVideoUrl: url, coverImageUrl: '' }));
                    } else {
                        setForm(prev => ({ ...prev, coverImageUrl: url, coverVideoUrl: '' }));
                    }
                } catch (uploadError: any) {
                    Alert.alert('Upload Error', uploadError.message);
                } finally {
                    setUploadingCover(false);
                }
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to pick media');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const updates = {
                userId: user.id,
                displayName: form.displayName,
                bio: form.bio,
                location: form.location,
                avatarUrl: form.avatarUrl,
                coverImageUrl: form.coverImageUrl,
                coverVideoUrl: form.coverVideoUrl,
                tags: form.tags,
                isPrivate: form.isPrivate
            };

            const { error } = await supabase
                .from('Profile')
                .upsert(updates);

            if (error) throw error;

            Alert.alert('Success', 'Profile updated successfully!');
            router.back();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const renderInput = (label: string, value: string, key: string, icon: any, multiline = false) => (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.secondary, fontSize: 10, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
            <View style={{
                flexDirection: 'row',
                alignItems: multiline ? 'flex-start' : 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: multiline ? 12 : 0,
                backgroundColor: colors.card
            }}>
                {icon && React.createElement(icon, { color: colors.secondary, size: 18 })}
                <TextInput
                    value={value}
                    onChangeText={(text) => setForm(prev => ({ ...prev, [key]: text }))}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor={colors.secondary}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    style={{
                        flex: 1,
                        marginLeft: 12,
                        color: colors.text,
                        fontSize: 15,
                        height: multiline ? 100 : 50,
                        textAlignVertical: multiline ? 'top' : 'center'
                    }}
                />
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 2 }}>EDIT PROFILE</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: saving ? 'rgba(255,255,255,0.1)' : '#fff',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#000" />}
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                    {/* Cover Media */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Cover Media</Text>
                        <TouchableOpacity
                            onPress={pickCoverMedia}
                            disabled={uploadingCover}
                            style={{
                                width: '100%',
                                height: 160,
                                borderRadius: 16,
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.1)',
                                overflow: 'hidden',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {uploadingCover ? (
                                <ActivityIndicator size="large" color="#fff" />
                            ) : form.coverVideoUrl ? (
                                <ExpoVideo
                                    source={{ uri: form.coverVideoUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    shouldPlay={false}
                                    isMuted
                                    resizeMode={ResizeMode.COVER}
                                />
                            ) : form.coverImageUrl ? (
                                <Image source={{ uri: form.coverImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Video size={32} color="rgba(255,255,255,0.3)" />
                                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>Tap to add cover</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Avatar */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
                            <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                {uploadingAvatar ? (
                                    <ActivityIndicator size="large" color="#fff" />
                                ) : form.avatarUrl ? (
                                    <Image source={{ uri: form.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <User size={40} color="rgba(255,255,255,0.3)" />
                                )}
                            </View>
                            <View style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: '#fff',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Camera size={16} color="#000" />
                            </View>
                        </TouchableOpacity>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>Tap to change avatar</Text>
                    </View>

                    {/* Form Fields */}
                    {renderInput('Display Name', form.displayName, 'displayName', User)}
                    {renderInput('Location', form.location, 'location', MapPin)}
                    {renderInput('Bio', form.bio, 'bio', FileText, true)}
                    {renderInput('Tags', form.tags, 'tags', Tag)}

                    {/* Private Account Toggle */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 16,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        marginBottom: 24
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Lock size={18} color="rgba(255,255,255,0.5)" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Private Account</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Only followers can see your posts</Text>
                            </View>
                        </View>
                        <Switch
                            value={form.isPrivate}
                            onValueChange={(val) => setForm(prev => ({ ...prev, isPrivate: val }))}
                            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.3)' }}
                            thumbColor={form.isPrivate ? '#fff' : 'rgba(255,255,255,0.5)'}
                        />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
