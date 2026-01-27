import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Save, User, MapPin, FileText, Briefcase, GraduationCap, Award, Star, Heart, X, Plus, Check, ChevronRight } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToR2 } from '../lib/upload-helper';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../lib/api';

// Types matching web ProfileFormData
interface ProfileFormData {
    // Basics
    displayName: string;
    dob: string;
    gender: string;
    height: string;
    weight: string;
    conversationStarter: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    coverType: 'IMAGE' | 'VIDEO' | null;

    // Professional
    achievements: string;
    skills: string[];
    workHistory: string;
    education: string;

    // Vibe
    city: string;
    interactionMode: 'Introvert' | 'Extrovert' | 'Ambivert' | '';
    bestVibeTime: string;
    vibeWithPeople: string;
    lifeIsLike: string;

    // Deep Dive
    values: string[];
    hardNos: string[];
    emotionalFit: string;
    pleaseDont: string;
    careAbout: string;
    protectiveAbout: string;
    distanceMakers: string;

    // Favorites
    topMovies: string[];
    topGenres: string[];
    topSongs: string[];
    topFoods: string[];
    topPlaces: string[];
    topGames: string[];
    currentlyInto: string[];
    dislikes: string[];
    icks: string[];
    goals: string;
    lifestyle: string;
    interactionTopics: string[];

    // Stalk Me
    stalkMe: string[];

    // Privacy
    isPrivate: boolean;
}

const initialData: ProfileFormData = {
    displayName: '',
    dob: '',
    gender: '',
    height: '',
    weight: '',
    conversationStarter: '',
    avatarUrl: null,
    coverUrl: null,
    coverType: null,
    achievements: '',
    skills: [],
    workHistory: '',
    education: '',
    city: '',
    interactionMode: '',
    bestVibeTime: '',
    vibeWithPeople: '',
    lifeIsLike: '',
    values: [],
    hardNos: [],
    emotionalFit: '',
    pleaseDont: '',
    careAbout: '',
    protectiveAbout: '',
    distanceMakers: '',
    topMovies: ['', '', ''],
    topGenres: ['', '', ''],
    topSongs: ['', '', ''],
    topFoods: ['', '', ''],
    topPlaces: ['', '', ''],
    topGames: ['', '', ''],
    currentlyInto: [],
    dislikes: [],
    icks: [],
    goals: '',
    lifestyle: '',
    interactionTopics: [],
    stalkMe: [],
    isPrivate: false,
};

const fillArray = (arr: any[] | undefined, length: number): string[] => {
    const a = arr || [];
    return [...a, ...Array(Math.max(0, length - a.length)).fill('')].slice(0, length);
};

export default function EditProfileScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isNewUser = params.newUser === 'true';
    const { colors } = useTheme();
    const { showToast } = useToast();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [data, setData] = useState<ProfileFormData>(initialData);

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingStalkMe, setUploadingStalkMe] = useState<number | null>(null); // Track which slot is uploading
    const [stalkMePreviews, setStalkMePreviews] = useState<string[]>(Array(11).fill(''));
    const [tagInput, setTagInput] = useState<Record<string, string>>({});

    const totalSteps = 6;

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        console.log('[EditProfile] Starting fetchProfile via Supabase...');

        try {
            console.log('[EditProfile] Getting user...');
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error('[EditProfile] User error:', userError);
                setLoading(false);
                return;
            }

            console.log('[EditProfile] User ID:', user.id);

            // Fetch profile directly from Supabase
            const { data: profile, error: profileError } = await supabase
                .from('Profile')
                .select('*')
                .eq('userId', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('[EditProfile] Profile fetch error:', profileError);
            }

            if (profile) {
                console.log('[EditProfile] Profile found, loading data...');
                console.log('[EditProfile] Profile stalkMe from DB:', profile.stalkMe);
                console.log('[EditProfile] Profile stalkMe type:', typeof profile.stalkMe);
                setIsEditing(true);
                const p = profile;

                // Parse stalkMe first
                let parsedStalkMe: string[] = [];
                if (p.stalkMe) {
                    try {
                        console.log('[EditProfile] Raw stalkMe:', p.stalkMe);
                        parsedStalkMe = typeof p.stalkMe === 'string' ? JSON.parse(p.stalkMe) : p.stalkMe;
                        console.log('[EditProfile] Parsed stalkMe:', parsedStalkMe);
                        if (!Array.isArray(parsedStalkMe)) parsedStalkMe = [];
                    } catch (parseErr) {
                        console.error('[EditProfile] Error parsing stalkMe:', parseErr);
                        parsedStalkMe = [];
                    }
                }

                // Set all data including stalkMe
                setData(prev => ({
                    ...prev,
                    displayName: p.displayName || '',
                    dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
                    gender: p.gender || '',
                    height: p.height || '',
                    weight: p.weight || '',
                    conversationStarter: p.conversationStarter || '',
                    avatarUrl: p.avatarUrl || null,
                    coverUrl: p.coverVideoUrl || p.coverImageUrl || null,
                    coverType: p.coverVideoUrl ? 'VIDEO' : (p.coverImageUrl ? 'IMAGE' : null),
                    achievements: p.achievements || '',
                    skills: p.skills || [],
                    workHistory: p.workHistory || '',
                    education: p.education || '',
                    city: p.city || '',
                    interactionMode: p.interactionMode || '',
                    bestVibeTime: p.bestVibeTime || '',
                    vibeWithPeople: p.vibeWithPeople || '',
                    lifeIsLike: p.lifeIsLike || '',
                    values: p.values || [],
                    hardNos: p.hardNos || [],
                    emotionalFit: p.emotionalFit || '',
                    pleaseDont: p.pleaseDont || '',
                    careAbout: p.careAbout || '',
                    protectiveAbout: p.protectiveAbout || '',
                    distanceMakers: p.distanceMakers || '',
                    topMovies: fillArray(p.topMovies, 3),
                    topGenres: fillArray(p.topGenres, 3),
                    topSongs: fillArray(p.topSongs, 3),
                    topFoods: fillArray(p.topFoods, 3),
                    topPlaces: fillArray(p.topPlaces, 3),
                    topGames: fillArray(p.topGames, 3),
                    currentlyInto: p.currentlyInto || [],
                    dislikes: p.dislikes || [],
                    icks: p.icks || [],
                    goals: p.goals || '',
                    lifestyle: p.lifestyle || '',
                    interactionTopics: p.interactionTopics || [],
                    isPrivate: p.isPrivate || false,
                    stalkMe: parsedStalkMe,
                }));

                // Set stalkMe previews
                if (parsedStalkMe.length > 0) {
                    const previews = Array(11).fill('');
                    parsedStalkMe.forEach((url: string, i: number) => {
                        if (i < 11 && url) {
                            previews[i] = url;
                            console.log(`[EditProfile] StalkMe preview ${i}:`, url);
                        }
                    });
                    console.log('[EditProfile] Setting stalkMePreviews:', previews.filter(Boolean).length, 'items');
                    setStalkMePreviews(previews);
                } else {
                    console.log('[EditProfile] parsedStalkMe is empty, not setting previews');
                }

                console.log('[EditProfile] Profile data loaded successfully');
            } else {
                console.log('[EditProfile] No profile found, starting with empty form');
            }
        } catch (e) {
            console.error('[EditProfile] Error in fetchProfile:', e);
        } finally {
            console.log('[EditProfile] fetchProfile complete, setting loading=false');
            setLoading(false);
        }
    };

    const isAdult = (dob: string) => {
        if (!dob) return false;
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age >= 18;
    };

    const handleNext = () => {
        if (step === 1) {
            if (!data.displayName) { showToast('Please enter your display name.', 'error'); return; }
            if (!data.dob) { showToast('Date of Birth is compulsory.', 'error'); return; }
            if (!isAdult(data.dob)) { showToast('You must be 18 years or older to use this app.', 'error'); return; }
            if (!data.gender) { showToast('Please select your gender.', 'error'); return; }
        }
        if (step < totalSteps) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else router.back();
    };

    // Auto-format DOB as DD-MM-YYYY while typing
    const formatDOB = (text: string) => {
        // Remove all non-numeric characters
        const numbers = text.replace(/\D/g, '');

        // Format as DD-MM-YYYY
        let formatted = '';
        if (numbers.length > 0) {
            formatted = numbers.substring(0, 2);
        }
        if (numbers.length > 2) {
            formatted += '-' + numbers.substring(2, 4);
        }
        if (numbers.length > 4) {
            formatted += '-' + numbers.substring(4, 8);
        }

        // Convert DD-MM-YYYY to YYYY-MM-DD for storage (when complete)
        if (numbers.length === 8) {
            const day = numbers.substring(0, 2);
            const month = numbers.substring(2, 4);
            const year = numbers.substring(4, 8);
            // Store as ISO format for database, but display as DD-MM-YYYY
            setData({ ...data, dob: `${year}-${month}-${day}` });
        } else {
            // Store the partial formatted value temporarily
            setData({ ...data, dob: formatted });
        }
    };

    // Format stored DOB (YYYY-MM-DD) for display as DD-MM-YYYY
    const displayDOB = (dob: string) => {
        if (!dob) return '';
        // If already in DD-MM format (partial input), return as is
        if (dob.match(/^\d{0,2}(-\d{0,2})?(-\d{0,4})?$/)) return dob;
        // If in YYYY-MM-DD format, convert to DD-MM-YYYY
        if (dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dob.split('-');
            return `${day}-${month}-${year}`;
        }
        return dob;
    };

    const handleSkip = () => { if (step < totalSteps) setStep(step + 1); };

    const pickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                setUploadingAvatar(true);
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const url = await uploadFileToR2(result.assets[0].uri, 'IMAGE', session?.access_token);
                    setData(prev => ({ ...prev, avatarUrl: url }));
                } catch (uploadError: any) {
                    const errMsg = uploadError?.message || '';
                    if (!errMsg.includes('deprecated') && !errMsg.includes('getInfoAsync')) {
                        showToast(errMsg || 'Upload failed', 'error');
                    }
                } finally {
                    setUploadingAvatar(false);
                }
            }
        } catch (e) {
            showToast('Failed to pick image', 'error');
        }
    };

    const pickCoverMedia = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                setUploadingCover(true);
                try {
                    const asset = result.assets[0];
                    const isVideo = asset.type === 'video';
                    const { data: { session } } = await supabase.auth.getSession();
                    const url = await uploadFileToR2(asset.uri, isVideo ? 'VIDEO' : 'IMAGE', session?.access_token);
                    setData(prev => ({ ...prev, coverUrl: url, coverType: isVideo ? 'VIDEO' : 'IMAGE' }));
                } catch (uploadError: any) {
                    const errMsg = uploadError?.message || '';
                    if (!errMsg.includes('deprecated') && !errMsg.includes('getInfoAsync')) {
                        showToast(errMsg || 'Upload failed', 'error');
                    }
                } finally {
                    setUploadingCover(false);
                }
            }
        } catch (e) {
            showToast('Failed to pick media', 'error');
        }
    };

    const pickStalkMeMedia = async (index: number) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                const newPreviews = [...stalkMePreviews];
                newPreviews[index] = result.assets[0].uri;
                setStalkMePreviews(newPreviews);
                setUploadingStalkMe(index); // Mark this slot as uploading

                try {
                    const asset = result.assets[0];
                    const isVideo = asset.type === 'video';
                    const { data: { session } } = await supabase.auth.getSession();
                    console.log('[EditProfile] Uploading stalkMe media at index:', index);
                    const url = await uploadFileToR2(asset.uri, isVideo ? 'VIDEO' : 'IMAGE', session?.access_token);
                    console.log('[EditProfile] StalkMe upload successful, URL:', url);

                    const newStalkMe = [...data.stalkMe];
                    while (newStalkMe.length <= index) newStalkMe.push('');
                    newStalkMe[index] = url;
                    console.log('[EditProfile] Updated stalkMe array:', newStalkMe);
                    setData(prev => ({ ...prev, stalkMe: newStalkMe }));
                    newPreviews[index] = url;
                    setStalkMePreviews(newPreviews);
                    showToast('Media uploaded successfully. Remember to save!', 'success');
                } catch (uploadError: any) {
                    const errMsg = uploadError?.message || '';
                    if (!errMsg.includes('deprecated') && !errMsg.includes('getInfoAsync')) {
                        showToast(errMsg || 'Upload failed', 'error');
                    } else {
                        console.warn('[EditProfile] Deprecation warning (ignored):', errMsg);
                    }
                } finally {
                    setUploadingStalkMe(null); // Clear uploading state
                }
            }
        } catch (e) {
            setUploadingStalkMe(null);
            showToast('Failed to pick media', 'error');
        }
    };

    const updateArrayItem = (field: keyof ProfileFormData, index: number, value: string) => {
        const arr = [...(data[field] as string[])];
        arr[index] = value;
        setData({ ...data, [field]: arr });
    };

    const addTag = (field: keyof ProfileFormData) => {
        const value = tagInput[field];
        if (!value?.trim()) return;
        const currentTags = data[field] as string[];
        if (!currentTags.includes(value.trim())) {
            setData({ ...data, [field]: [...currentTags, value.trim()] });
        }
        setTagInput(prev => ({ ...prev, [field]: '' }));
    };

    const removeTag = (field: keyof ProfileFormData, tagToRemove: string) => {
        const currentTags = data[field] as string[];
        setData({ ...data, [field]: currentTags.filter(t => t !== tagToRemove) });
    };

    const handleSubmit = async () => {
        // Block save during active uploads
        if (uploadingStalkMe !== null || uploadingAvatar || uploadingCover) {
            showToast('Please wait for uploads to complete', 'info');
            return;
        }

        console.log('[EditProfile] Starting handleSubmit via Supabase update...');
        setSaving(true);

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            const coverImageUrl = data.coverType === 'IMAGE' ? data.coverUrl : null;
            const coverVideoUrl = data.coverType === 'VIDEO' ? data.coverUrl : null;

            const profileData: Record<string, any> = {
                displayName: data.displayName || null,
                dob: data.dob ? new Date(data.dob).toISOString() : null,
                gender: data.gender || null,
                height: data.height || null,
                weight: data.weight || null,
                conversationStarter: data.conversationStarter || null,
                achievements: data.achievements || null,
                workHistory: data.workHistory || null,
                education: data.education || null,
                skills: data.skills || [],
                city: data.city || null,
                interactionMode: data.interactionMode || null,
                bestVibeTime: data.bestVibeTime || null,
                vibeWithPeople: data.vibeWithPeople || null,
                lifeIsLike: data.lifeIsLike || null,
                emotionalFit: data.emotionalFit || null,
                pleaseDont: data.pleaseDont || null,
                careAbout: data.careAbout || null,
                protectiveAbout: data.protectiveAbout || null,
                distanceMakers: data.distanceMakers || null,
                goals: data.goals || null,
                lifestyle: data.lifestyle || null,
                values: data.values || [],
                hardNos: data.hardNos || [],
                topMovies: data.topMovies.filter(x => x),
                topGenres: data.topGenres.filter(x => x),
                topSongs: data.topSongs.filter(x => x),
                topFoods: data.topFoods.filter(x => x),
                topPlaces: data.topPlaces.filter(x => x),
                topGames: data.topGames.filter(x => x),
                currentlyInto: data.currentlyInto || [],
                dislikes: data.dislikes || [],
                icks: data.icks || [],
                interactionTopics: data.interactionTopics || [],
                stalkMe: JSON.stringify(data.stalkMe.filter(x => x)),
                avatarUrl: data.avatarUrl || null,
                coverImageUrl,
                coverVideoUrl,
                isPrivate: data.isPrivate || false,
            };

            console.log('[EditProfile] StalkMe to save:', data.stalkMe);
            console.log('[EditProfile] StalkMe filtered:', data.stalkMe.filter(x => x));
            console.log('[EditProfile] Updating profile for user:', user.id);

            // Use upsert to create or update profile (fixes new user issue)
            const profileDataWithUserId = { ...profileData, userId: user.id };
            let { error: upsertError } = await supabase
                .from('Profile')
                .upsert(profileDataWithUserId, { onConflict: 'userId' });

            // Fix for missing public User record (Foreign Key Error)
            if (upsertError && upsertError.code === '23503') {
                console.log('[EditProfile] User record missing in public DB. Syncing...');
                try {
                    const API_URL = getApiUrl();
                    const { data: { session } } = await supabase.auth.getSession();
                    const syncRes = await fetch(`${API_URL}/api/user/sync`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session?.access_token}`
                        }
                    });

                    if (syncRes.ok) {
                        console.log('[EditProfile] Sync successful. Retrying save...');
                        const retry = await supabase
                            .from('Profile')
                            .upsert(profileDataWithUserId, { onConflict: 'userId' });
                        upsertError = retry.error;
                    } else {
                        console.error('[EditProfile] Sync failed:', await syncRes.text());
                    }
                } catch (syncErr) {
                    console.error('[EditProfile] Sync error:', syncErr);
                }
            }

            if (upsertError) {
                console.error('[EditProfile] Upsert error:', upsertError);
                // If RLS blocks update, try via API as fallback with retries
                if (upsertError.code === '42501') {
                    console.log('[EditProfile] RLS blocked, trying API fallback with retries...');
                    const { data: { session } } = await supabase.auth.getSession();
                    const API_URL = getApiUrl();

                    // Retry with exponential backoff - longer waits for rate limits
                    const maxRetries = 5;
                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        console.log(`[EditProfile] API attempt ${attempt}/${maxRetries}...`);

                        try {
                            const res = await fetch(`${API_URL}/api/profile`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session?.access_token}`
                                },
                                body: JSON.stringify(profileData),
                            });

                            console.log('[EditProfile] API response status:', res.status);

                            if (res.ok) {
                                console.log('[EditProfile] API save successful');
                                return; // Success - exit the retry loop
                            } else if (res.status === 429) {
                                // Rate limited - wait longer before retrying
                                const waitTime = Math.min(30000, Math.pow(2, attempt) * 3000); // 6s, 12s, 24s, 30s, 30s
                                console.log(`[EditProfile] Rate limited, waiting ${waitTime / 1000}s...`);
                                if (attempt < maxRetries) {
                                    await new Promise(resolve => setTimeout(resolve, waitTime));
                                    continue;
                                }
                                throw new Error('Rate limited. Please wait 30 seconds and try again.');
                            } else {
                                const errData = await res.json().catch(() => ({}));
                                throw new Error(errData.error || `Server error: ${res.status}`);
                            }
                        } catch (fetchErr: any) {
                            if (fetchErr.message?.includes('Rate limited') || fetchErr.message?.includes('Server error')) {
                                throw fetchErr;
                            }
                            console.error('[EditProfile] Fetch error:', fetchErr);
                            if (attempt < maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, 5000));
                                continue;
                            }
                            throw new Error('Network error. Check your connection.');
                        }
                    }
                } else {
                    throw new Error(upsertError.message);
                }
            }

            console.log('[EditProfile] Profile saved successfully');

            // Update user metadata to mark profile as completed
            await supabase.auth.updateUser({
                data: { profile_completed: true, display_name: data.displayName }
            });

            showToast(isEditing ? 'Profile updated!' : 'Profile created!', 'success');

            // For new users, go to home. For editing, go back
            if (isNewUser) {
                router.replace('/(tabs)');
            } else {
                router.back();
            }
        } catch (e: any) {
            console.error('[EditProfile] Save error:', e);
            showToast(e.message || 'Failed to save profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const renderTagInput = (label: string, field: keyof ProfileFormData, placeholder: string, isRed = false) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ color: isRed ? '#f87171' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', minHeight: 50 }}>
                {(data[field] as string[]).map((val, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isRed ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isRed ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.2)' }}>
                        <Text style={{ color: '#fff', fontSize: 13 }}>{val}</Text>
                        <TouchableOpacity onPress={() => removeTag(field, val)} style={{ marginLeft: 8 }}>
                            <X size={14} color={isRed ? '#f87171' : '#fff'} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TextInput
                    value={tagInput[field] || ''}
                    onChangeText={(text) => setTagInput(prev => ({ ...prev, [field]: text }))}
                    onSubmitEditing={() => addTag(field)}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{ flex: 1, minWidth: 100, color: '#fff', fontSize: 14 }}
                    returnKeyType="done"
                />
            </View>
        </View>
    );

    const renderTop3Input = (label: string, field: keyof ProfileFormData) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0, 1, 2].map(i => (
                    <TextInput
                        key={i}
                        value={(data[field] as string[])[i]}
                        onChangeText={(text) => updateArrayItem(field, i, text)}
                        placeholder={`#${i + 1}`}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, color: '#fff', fontSize: 13 }}
                    />
                ))}
            </View>
        </View>
    );

    const renderStep = () => {
        switch (step) {
            case 1: // Basics
                return (
                    <View>
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 }}>The Basics</Text>

                        {/* Avatar */}
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
                                <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                                    {uploadingAvatar ? <ActivityIndicator color="#fff" /> : data.avatarUrl ? <Image source={{ uri: data.avatarUrl }} style={{ width: '100%', height: '100%' }} /> : <User size={40} color="rgba(255,255,255,0.3)" />}
                                </View>
                                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={16} color="#000" />
                                </View>
                            </TouchableOpacity>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8 }}>Tap to upload avatar</Text>
                        </View>

                        {/* Cover */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Cover Media</Text>
                            <TouchableOpacity onPress={pickCoverMedia} disabled={uploadingCover} style={{ width: '100%', height: 140, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                {uploadingCover ? <ActivityIndicator color="#fff" size="large" /> : data.coverUrl ? (data.coverType === 'VIDEO' ? <ExpoVideo source={{ uri: data.coverUrl }} style={{ width: '100%', height: '100%' }} shouldPlay={false} isMuted resizeMode={ResizeMode.COVER} /> : <Image source={{ uri: data.coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />) : <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Tap to add cover</Text>}
                            </TouchableOpacity>
                        </View>

                        {/* Form Fields */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Display Name *</Text>
                                <TextInput value={data.displayName} onChangeText={t => setData({ ...data, displayName: t })} placeholder="Your Name" placeholderTextColor="rgba(255,255,255,0.3)" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff' }} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Date of Birth *</Text>
                                <TextInput value={displayDOB(data.dob)} onChangeText={formatDOB} placeholder="DD-MM-YYYY" placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="number-pad" maxLength={10} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff' }} />
                            </View>
                        </View>

                        {/* Gender */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Gender *</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {['Male', 'Female', 'Other'].map(g => (
                                    <TouchableOpacity key={g} onPress={() => setData({ ...data, gender: g })} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: data.gender === g ? '#fff' : 'rgba(255,255,255,0.1)', backgroundColor: data.gender === g ? '#fff' : 'rgba(255,255,255,0.03)', alignItems: 'center' }}>
                                        <Text style={{ color: data.gender === g ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Height</Text>
                                <TextInput value={data.height} onChangeText={t => setData({ ...data, height: t })} placeholder="5'10" placeholderTextColor="rgba(255,255,255,0.3)" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff' }} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Weight</Text>
                                <TextInput value={data.weight} onChangeText={t => setData({ ...data, weight: t })} placeholder="70kg" placeholderTextColor="rgba(255,255,255,0.3)" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff' }} />
                            </View>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Conversation Starter</Text>
                            <TextInput value={data.conversationStarter} onChangeText={t => setData({ ...data, conversationStarter: t })} placeholder="The first thing you should ask me is..." placeholderTextColor="rgba(255,255,255,0.3)" multiline numberOfLines={3} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff', height: 90, textAlignVertical: 'top' }} />
                        </View>
                    </View >
                );
            case 2: // Professional
                return (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 }}>My Professional Side</Text>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Work History / Current Work</Text>
                            <TextInput value={data.workHistory} onChangeText={t => setData({ ...data, workHistory: t })} placeholder="Where have you worked?" placeholderTextColor="rgba(255,255,255,0.3)" multiline numberOfLines={3} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff', height: 90, textAlignVertical: 'top' }} />
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Education</Text>
                            <TextInput value={data.education} onChangeText={t => setData({ ...data, education: t })} placeholder="University / High School" placeholderTextColor="rgba(255,255,255,0.3)" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff' }} />
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Achievements</Text>
                            <TextInput value={data.achievements} onChangeText={t => setData({ ...data, achievements: t })} placeholder="Proud moments..." placeholderTextColor="rgba(255,255,255,0.3)" multiline numberOfLines={3} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff', height: 90, textAlignVertical: 'top' }} />
                        </View>
                        {renderTagInput('Skills', 'skills', 'Java, Dancing, Leadership...')}
                    </ScrollView>
                );
            case 3: // Vibe
                return (
                    <View>
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 }}>My Vibe</Text>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>City</Text>
                            <TextInput value={data.city} onChangeText={t => setData({ ...data, city: t })} placeholder="Where are you based?" placeholderTextColor="rgba(255,255,255,0.3)" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff' }} />
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Interaction Mode</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {['Introvert', 'Ambivert', 'Extrovert'].map(mode => (
                                    <TouchableOpacity key={mode} onPress={() => setData({ ...data, interactionMode: mode as any })} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: data.interactionMode === mode ? '#fff' : 'rgba(255,255,255,0.1)', backgroundColor: data.interactionMode === mode ? '#fff' : 'rgba(255,255,255,0.03)', alignItems: 'center' }}>
                                        <Text style={{ color: data.interactionMode === mode ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{mode}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>With me life is like...</Text>
                            <TextInput value={data.lifeIsLike} onChangeText={t => setData({ ...data, lifeIsLike: t })} placeholder="A chaotic adventure? A calm Sunday morning?" placeholderTextColor="rgba(255,255,255,0.3)" multiline numberOfLines={3} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff', height: 90, textAlignVertical: 'top' }} />
                        </View>
                    </View>
                );
            case 4: // Deep Dive
                return (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 }}>Deep Dive</Text>
                        {renderTagInput('Values Targeted', 'values', 'Growth, Money, Art...')}
                        {renderTagInput("Hard No's", 'hardNos', 'Smoking, Late replies...', true)}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>Only people who can emotionally fit...</Text>
                            <TextInput value={data.emotionalFit} onChangeText={t => setData({ ...data, emotionalFit: t })} placeholder="..." placeholderTextColor="rgba(255,255,255,0.3)" multiline numberOfLines={3} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff', height: 80, textAlignVertical: 'top' }} />
                        </View>
                    </ScrollView>
                );
            case 5: // Favorites
                return (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 }}>Fun and Favorites</Text>
                        {renderTop3Input('Top 3 Movies', 'topMovies')}
                        {renderTop3Input('Top 3 Songs', 'topSongs')}
                        {renderTop3Input('Top 3 Genres', 'topGenres')}
                        {renderTop3Input('Top 3 Foods', 'topFoods')}
                        {renderTop3Input('Top 3 Places', 'topPlaces')}
                        {renderTop3Input('Top 3 Games', 'topGames')}
                    </ScrollView>
                );
            case 6: // Stalk Me
                return (
                    <View>
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Stalk Me Folder</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 20 }}>Wait for upload to complete before saving</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {Array.from({ length: 11 }).map((_, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => pickStalkMeMedia(i)}
                                    disabled={uploadingStalkMe !== null}
                                    style={{
                                        width: '23%',
                                        aspectRatio: 1,
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        borderWidth: uploadingStalkMe === i ? 2 : 1,
                                        borderColor: uploadingStalkMe === i ? '#fff' : 'rgba(255,255,255,0.1)',
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {uploadingStalkMe === i ? (
                                        <View style={{ alignItems: 'center' }}>
                                            <ActivityIndicator color="#fff" size="small" />
                                            <Text style={{ color: '#fff', fontSize: 8, marginTop: 4 }}>UPLOADING</Text>
                                        </View>
                                    ) : stalkMePreviews[i] ? (
                                        <Image source={{ uri: stalkMePreviews[i] }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>+{i + 1}</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* Privacy Toggle */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 24 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Private Account</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Only followers can see your posts</Text>
                                </View>
                            </View>
                            <Switch value={data.isPrivate} onValueChange={(val) => setData(prev => ({ ...prev, isPrivate: val }))} trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.3)' }} thumbColor={data.isPrivate ? '#fff' : 'rgba(255,255,255,0.5)'} />
                        </View>
                    </View>
                );
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>{isEditing ? 'Loading profile...' : 'Preparing setup...'}</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                    <TouchableOpacity onPress={handleBack} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{isNewUser ? 'PROFILE SETUP' : 'EDIT PROFILE'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Step {step} of {totalSteps}</Text>
                    </View>
                    {step > 1 && step < totalSteps ? (
                        <TouchableOpacity onPress={handleSkip} style={{ paddingHorizontal: 12 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>SKIP</Text>
                        </TouchableOpacity>
                    ) : <View style={{ width: 40 }} />}
                </View>

                {/* Content */}
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {renderStep()}
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer Navigation */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: '#000' }}>
                    <TouchableOpacity onPress={handleBack} style={{ paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Back</Text>
                    </TouchableOpacity>

                    {step === totalSteps ? (
                        <TouchableOpacity onPress={handleSubmit} disabled={saving} style={{ paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, backgroundColor: saving ? 'rgba(255,255,255,0.1)' : '#fff', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Check size={18} color="#000" />}
                            <Text style={{ color: saving ? '#fff' : '#000', fontWeight: '700' }}>{saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Complete Setup')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={handleNext} style={{ paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ color: '#000', fontWeight: '700' }}>Next</Text>
                            <ChevronRight size={18} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}
