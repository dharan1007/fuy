import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Modal, Share, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Save, Camera, Eye, EyeOff, ChevronRight, ChevronDown, Share2, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToR2 } from '../../lib/upload-helper';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import ShareCardModal from '../../components/ShareCardModal';
import { useToast } from '../../context/ToastContext';

interface CardSettings {
    [key: string]: 'public' | 'followers';
}

export default function ProfileCardEditor() {
    const router = useRouter();
    const { session } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [dbUserId, setDbUserId] = useState<string | null>(null);

    // Profile data
    const [profile, setProfile] = useState({
        displayName: '',
        bio: '',
        dob: '',
        city: '',
        height: '',
        weight: '',
        conversationStarter: '',
        workHistory: '',
        education: '',
        achievements: '',
        skills: [] as string[],
        lifeIsLike: '',
        interactionMode: '',
        bestVibeTime: '',
        vibeWithPeople: '',
        careAbout: '',
        protectiveAbout: '',
        distanceMakers: '',
        emotionalFit: '',
        goals: '',
        lifestyle: '',
        topMovies: ['', '', ''],
        topSongs: ['', '', ''],
        topFoods: ['', '', ''],
        topGames: ['', '', ''],
        cardBackgroundUrl: null as string | null,
    });

    const [settings, setSettings] = useState<CardSettings>({});
    const [skillsInput, setSkillsInput] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showStalkMePicker, setShowStalkMePicker] = useState(false);
    const [stalkMeImages, setStalkMeImages] = useState<string[]>([]);
    const [profileCode, setProfileCode] = useState<string>('');
    const [previewIndex, setPreviewIndex] = useState(0);

    const steps = [
        { id: 'identity', title: 'Identity' },
        { id: 'professional', title: 'Professional' },
        { id: 'vibe', title: 'Vibe Check' },
        { id: 'deep', title: 'Deep Dive' },
        { id: 'favorites', title: 'Favorites' },
        { id: 'background', title: 'Card Design' },
    ];

    useEffect(() => {
        resolveUser();
    }, [session]);

    const resolveUser = async () => {
        if (session?.user?.email) {
            const { data } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();
            if (data) {
                setDbUserId(data.id);
                await loadProfile(data.id);
            }
        }
        setLoading(false);
    };

    const loadProfile = async (userId: string) => {
        const { data: p } = await supabase
            .from('Profile')
            .select('*')
            .eq('userId', userId)
            .single();

        if (p) {
            const parseArr = (val: any) => {
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch { return []; }
                }
                return [];
            };

            const fillArr = (arr: any, len: number) => {
                const parsed = parseArr(arr);
                while (parsed.length < len) parsed.push('');
                return parsed.slice(0, len);
            };

            setProfile({
                displayName: p.displayName || '',
                bio: p.bio || '',
                dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
                city: p.city || '',
                height: p.height || '',
                weight: p.weight || '',
                conversationStarter: p.conversationStarter || '',
                workHistory: p.workHistory || '',
                education: p.education || '',
                achievements: p.achievements || '',
                skills: parseArr(p.skills),
                lifeIsLike: p.lifeIsLike || '',
                interactionMode: p.interactionMode || '',
                bestVibeTime: p.bestVibeTime || '',
                vibeWithPeople: p.vibeWithPeople || '',
                careAbout: p.careAbout || '',
                protectiveAbout: p.protectiveAbout || '',
                distanceMakers: p.distanceMakers || '',
                emotionalFit: p.emotionalFit || '',
                goals: p.goals || '',
                lifestyle: p.lifestyle || '',
                topMovies: fillArr(p.topMovies, 3),
                topSongs: fillArr(p.topSongs, 3),
                topFoods: fillArr(p.topFoods, 3),
                topGames: fillArr(p.topGames, 3),
                cardBackgroundUrl: p.cardBackgroundUrl || null,
            });

            if (p.skills && p.skills.length > 0) {
                setSkillsInput(parseArr(p.skills).join(', '));
            }

            if (p.stalkMe) {
                setStalkMeImages(parseArr(p.stalkMe));
            }

            const cardSettings = typeof p.cardSettings === 'string'
                ? JSON.parse(p.cardSettings)
                : (p.cardSettings || {});
            setSettings(cardSettings);

            // Fetch profile card code
            const { data: card } = await supabase
                .from('ProfileCard')
                .select('uniqueCode')
                .eq('userId', userId)
                .single();
            if (card) setProfileCode(card.uniqueCode);
        }
    };

    const updateField = (field: string, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const toggleVisibility = (field: string) => {
        setSettings(prev => ({
            ...prev,
            [field]: prev[field] === 'followers' ? 'public' : 'followers',
        }));
    };

    const pickBackground = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            try {
                const url = await uploadFileToR2(result.assets[0].uri, 'IMAGE');
                if (url) updateField('cardBackgroundUrl', url);
            } catch (e) {
                console.error('Background upload error:', e);
            }
        }
    };

    const handleSave = async () => {
        if (!dbUserId) {
            showToast('User not found', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...profile,
                skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
                topMovies: profile.topMovies.filter(Boolean),
                topSongs: profile.topSongs.filter(Boolean),
                topFoods: profile.topFoods.filter(Boolean),
                topGames: profile.topGames.filter(Boolean),
                cardSettings: settings,
            };

            // 1. Update Profile
            const { error } = await supabase
                .from('Profile')
                .update(payload)
                .eq('userId', dbUserId);

            if (error) throw error;

            // 2. Upsert ProfileCard via Backend API (Bypasses RLS issues)
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/profile-card`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: {
                        sections: [
                            { id: 'identity', title: 'Identity', data: { bio: profile.bio, ...profile } },
                            { id: 'professional', title: 'Professional', data: profile },
                            { id: 'vibe', title: 'Vibe', data: profile },
                            { id: 'deep', title: 'Deep Dive', data: profile },
                            { id: 'favorites', title: 'Favorites', data: profile }
                        ],
                        settings: settings
                    },
                    theme: 'dark'
                })
            });

            if (!apiResponse.ok) {
                const errData = await apiResponse.json();
                throw new Error(errData.error || "Failed to create profile card");
            }

            const { card } = await apiResponse.json();
            if (card && card.uniqueCode) {
                setProfileCode(card.uniqueCode);
            }

            showToast('Profile card saved!', 'success');
            // Don't go back immediately so they can share
        } catch (e: any) {
            console.error('Save error:', e);
            showToast(e.message || 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-black">
                <ActivityIndicator color="#fff" size="large" />
            </View>
        );
    }

    const renderStep = () => {
        switch (currentStep) {
            case 0: // Identity
                return (
                    <View className="space-y-6">
                        <InputField label="DISPLAY NAME" value={profile.displayName} onChange={v => updateField('displayName', v)} placeholder="Your display name" />
                        <TextAreaField label="BIO" value={profile.bio} onChange={v => updateField('bio', v)} placeholder="Tell us about yourself..." visibility={settings.bio} onToggle={() => toggleVisibility('bio')} />
                        <InputField label="DATE OF BIRTH" value={profile.dob} onChange={v => updateField('dob', v)} placeholder="YYYY-MM-DD" />
                        <InputField label="CITY" value={profile.city} onChange={v => updateField('city', v)} placeholder="Where are you based?" visibility={settings.city} onToggle={() => toggleVisibility('city')} />
                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <InputField label="HEIGHT" value={profile.height} onChange={v => updateField('height', v)} placeholder="e.g. 5'10" visibility={settings.height} onToggle={() => toggleVisibility('height')} />
                            </View>
                            <View className="flex-1">
                                <InputField label="WEIGHT" value={profile.weight} onChange={v => updateField('weight', v)} placeholder="e.g. 70kg" visibility={settings.weight} onToggle={() => toggleVisibility('weight')} />
                            </View>
                        </View>
                        <TextAreaField label="CONVERSATION STARTER" value={profile.conversationStarter} onChange={v => updateField('conversationStarter', v)} placeholder="What should people ask you about?" visibility={settings.conversationStarter} onToggle={() => toggleVisibility('conversationStarter')} />
                    </View>
                );

            case 1: // Professional
                return (
                    <View className="space-y-6">
                        <TextAreaField label="WORK HISTORY" value={profile.workHistory} onChange={v => updateField('workHistory', v)} placeholder="Describe your career journey..." visibility={settings.workHistory} onToggle={() => toggleVisibility('workHistory')} />
                        <TextAreaField label="EDUCATION" value={profile.education} onChange={v => updateField('education', v)} placeholder="Where did you study?" visibility={settings.education} onToggle={() => toggleVisibility('education')} />
                        <TextAreaField label="ACHIEVEMENTS" value={profile.achievements} onChange={v => updateField('achievements', v)} placeholder="What are you proud of?" visibility={settings.achievements} onToggle={() => toggleVisibility('achievements')} />
                        <TextAreaField label="SKILLS (comma separated)" value={skillsInput} onChange={setSkillsInput} placeholder="e.g. Design, Coding, Music" visibility={settings.skills} onToggle={() => toggleVisibility('skills')} />
                    </View>
                );

            case 2: // Vibe
                return (
                    <View className="space-y-6">
                        <TextAreaField label="WITH ME LIFE IS LIKE..." value={profile.lifeIsLike} onChange={v => updateField('lifeIsLike', v)} placeholder="Complete this sentence..." visibility={settings.lifeIsLike} onToggle={() => toggleVisibility('lifeIsLike')} />

                        <View>
                            <Text className="text-white/40 text-xs font-black tracking-widest mb-3">INTERACTION STYLE</Text>
                            <View className="flex-row gap-3">
                                {['Introvert', 'Ambivert', 'Extrovert'].map(mode => (
                                    <TouchableOpacity
                                        key={mode}
                                        onPress={() => updateField('interactionMode', mode)}
                                        className={`flex-1 py-4 rounded-xl border ${profile.interactionMode === mode ? 'bg-white border-white' : 'bg-white/5 border-white/10'}`}
                                    >
                                        <Text className={`text-center font-black text-sm ${profile.interactionMode === mode ? 'text-black' : 'text-white/50'}`}>{mode}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <InputField label="BEST VIBE TIME" value={profile.bestVibeTime} onChange={v => updateField('bestVibeTime', v)} placeholder="e.g. Night Owl, Early Bird" visibility={settings.bestVibeTime} onToggle={() => toggleVisibility('bestVibeTime')} />
                        <TextAreaField label="IDEAL VIBE" value={profile.vibeWithPeople} onChange={v => updateField('vibeWithPeople', v)} placeholder="Describe people you vibe with..." visibility={settings.vibeWithPeople} onToggle={() => toggleVisibility('vibeWithPeople')} />
                    </View>
                );

            case 3: // Deep Dive
                return (
                    <View className="space-y-6">
                        <TextAreaField label="CARE ABOUT" value={profile.careAbout} onChange={v => updateField('careAbout', v)} placeholder="What truly matters to you?" visibility={settings.careAbout} onToggle={() => toggleVisibility('careAbout')} />
                        <TextAreaField label="PROTECTIVE ABOUT" value={profile.protectiveAbout} onChange={v => updateField('protectiveAbout', v)} placeholder="What do you guard closely?" visibility={settings.protectiveAbout} onToggle={() => toggleVisibility('protectiveAbout')} />
                        <TextAreaField label="DISTANCE MAKERS" value={profile.distanceMakers} onChange={v => updateField('distanceMakers', v)} placeholder="What creates distance?" visibility={settings.distanceMakers} onToggle={() => toggleVisibility('distanceMakers')} />
                        <TextAreaField label="EMOTIONAL FIT" value={profile.emotionalFit} onChange={v => updateField('emotionalFit', v)} placeholder="Who fits you emotionally?" visibility={settings.emotionalFit} onToggle={() => toggleVisibility('emotionalFit')} />
                    </View>
                );

            case 4: // Favorites
                return (
                    <View className="space-y-6">
                        <TextAreaField label="GOALS" value={profile.goals} onChange={v => updateField('goals', v)} placeholder="What are you working towards?" visibility={settings.goals} onToggle={() => toggleVisibility('goals')} />
                        <TextAreaField label="LIFESTYLE" value={profile.lifestyle} onChange={v => updateField('lifestyle', v)} placeholder="Describe your daily life..." visibility={settings.lifestyle} onToggle={() => toggleVisibility('lifestyle')} />

                        <Top3Input label="TOP 3 MOVIES" values={profile.topMovies} onChange={v => updateField('topMovies', v)} />
                        <Top3Input label="TOP 3 SONGS" values={profile.topSongs} onChange={v => updateField('topSongs', v)} />
                        <Top3Input label="TOP 3 FOODS" values={profile.topFoods} onChange={v => updateField('topFoods', v)} />
                        <Top3Input label="TOP 3 GAMES" values={profile.topGames} onChange={v => updateField('topGames', v)} />
                    </View>
                );

            case 5: // Background
                return (
                    <View className="space-y-6">
                        <Text className="text-white/60 text-sm font-bold text-center mb-4">Customize your card's background image</Text>

                        <TouchableOpacity onPress={pickBackground} className="items-center justify-center py-16 rounded-3xl border-2 border-dashed border-white/20 bg-white/5">
                            {profile.cardBackgroundUrl ? (
                                <View className="items-center">
                                    <Image source={{ uri: profile.cardBackgroundUrl }} className="w-32 h-48 rounded-2xl mb-4" />
                                    <Text className="text-white/40 text-xs font-black tracking-widest">TAP TO CHANGE</Text>
                                </View>
                            ) : (
                                <View className="items-center">
                                    <Camera color="rgba(255,255,255,0.4)" size={48} />
                                    <Text className="text-white/40 text-sm font-bold mt-4">Upload Background Image</Text>
                                    <Text className="text-white/20 text-xs mt-1">9:16 aspect ratio recommended</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {stalkMeImages.length > 0 && (
                            <View>
                                <Text className="text-white/60 text-sm font-bold text-center mb-4 mt-8">Or choose from Stalk Me</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-32">
                                    <View className="flex-row gap-3 px-2">
                                        {stalkMeImages.map((img, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => updateField('cardBackgroundUrl', img)}
                                                className={`rounded-xl overflow-hidden border-2 ${profile.cardBackgroundUrl === img ? 'border-white' : 'border-transparent'}`}
                                            >
                                                <Image source={{ uri: img }} className="w-20 h-28 bg-white/5" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                );
        }
    };

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
                    <TouchableOpacity onPress={() => router.back()} className="p-2">
                        <ChevronLeft color="#fff" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white font-black text-lg tracking-wide">EDIT CARD</Text>

                    <View className="flex-row gap-3">
                        <TouchableOpacity onPress={() => setShowPreview(true)} className="p-2 bg-white/10 rounded-full border border-white/10">
                            <Eye color="#fff" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowShareModal(true)} disabled={!profileCode} className="p-2 bg-white/10 rounded-full border border-white/10">
                            <Share2 color={profileCode ? "#fff" : "rgba(255,255,255,0.3)"} size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} disabled={saving} className="p-2 bg-white rounded-full">
                            {saving ? <ActivityIndicator color="#000" size="small" /> : <Save color="#000" size={20} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Step Indicator */}
                <View className="flex-row px-4 py-4 gap-2">
                    {steps.map((step, i) => (
                        <TouchableOpacity
                            key={step.id}
                            onPress={() => setCurrentStep(i)}
                            className="flex-1"
                        >
                            <View className={`h-1 rounded-full ${currentStep === i ? 'bg-white' : 'bg-white/20'}`} />
                            <Text className={`text-[8px] font-black tracking-wider text-center mt-2 ${currentStep === i ? 'text-white' : 'text-white/30'}`}>{step.title.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Content */}
                <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                    <View className="py-6">
                        {renderStep()}
                    </View>
                    <View className="h-20" />
                </ScrollView>

                {/* Navigation */}
                <View className="flex-row gap-4 px-4 py-4 border-t border-white/10">
                    <TouchableOpacity
                        onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className={`flex-1 py-4 rounded-xl border ${currentStep === 0 ? 'border-white/10' : 'border-white/30'}`}
                    >
                        <Text className={`text-center font-black tracking-widest text-sm ${currentStep === 0 ? 'text-white/20' : 'text-white'}`}>BACK</Text>
                    </TouchableOpacity>

                    {currentStep < steps.length - 1 ? (
                        <TouchableOpacity
                            onPress={() => setCurrentStep(currentStep + 1)}
                            className="flex-1 py-4 rounded-xl bg-white"
                        >
                            <Text className="text-center text-black font-black tracking-widest text-sm">NEXT</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={handleSave} disabled={saving} className="flex-1 py-4 rounded-xl bg-white">
                            <Text className="text-center text-black font-black tracking-widest text-sm">{saving ? 'SAVING...' : 'SAVE CARD'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>

            {/* Preview Modal */}
            <Modal visible={showPreview} animationType="fade" transparent>
                <View className="flex-1 bg-black/95 items-center justify-center p-4">
                    <TouchableOpacity onPress={() => setShowPreview(false)} className="absolute top-14 right-4 p-3 bg-white/10 rounded-full z-50">
                        <X color="#fff" size={24} />
                    </TouchableOpacity>

                    <Text className="text-white/50 text-xs font-black tracking-[0.3em] mb-6">CARD PREVIEW</Text>

                    {/* Mini Card Preview - Made Larger */}
                    <View className="w-[85%] aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/20">
                        {profile.cardBackgroundUrl && (
                            <Image source={{ uri: profile.cardBackgroundUrl }} className="absolute w-full h-full" style={{ opacity: 0.4 }} />
                        )}
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} className="absolute inset-0" />

                        <View className="flex-1 items-center justify-center p-6">
                            {previewIndex === 0 && (
                                <>
                                    <GlassBox style={{ width: '100%', alignItems: 'center' }}>
                                        <Text className="text-white text-xl font-black">{profile.displayName || 'You'}</Text>
                                        <Text className="text-white/50 text-sm mb-2">@{profile.displayName}</Text>
                                        {profile.bio ? (
                                            <Text className="text-white/90 text-sm text-center leading-5">{profile.bio}</Text>
                                        ) : null}
                                    </GlassBox>
                                    {profile.conversationStarter && (
                                        <GlassBox style={{ marginTop: 12, width: '100%' }}>
                                            <Text className="text-white/70 text-xs text-center italic">"{profile.conversationStarter}"</Text>
                                        </GlassBox>
                                    )}
                                </>
                            )}
                            {previewIndex === 1 && (
                                <GlassBox style={{ width: '100%' }}>
                                    <View>
                                        <Text className="text-white/40 text-[10px] font-black tracking-wider mb-2">WORK HISTORY</Text>
                                        <Text className="text-white text-sm font-bold leading-5">{profile.workHistory || 'No work history'}</Text>
                                    </View>
                                </GlassBox>
                            )}
                            {previewIndex === 2 && (
                                <GlassBox style={{ width: '100%' }}>
                                    <View className="mb-4">
                                        <Text className="text-white/40 text-[10px] font-black tracking-wider mb-2">LIFE IS LIKE...</Text>
                                        <Text className="text-white text-sm font-bold leading-5">"{profile.lifeIsLike || '...'}"</Text>
                                    </View>
                                    <View>
                                        <Text className="text-white/40 text-[10px] font-black tracking-wider mb-2">VIBE</Text>
                                        <Text className="text-white text-sm font-bold leading-5">{profile.interactionMode || 'Unknown'}</Text>
                                    </View>
                                </GlassBox>
                            )}
                            {previewIndex === 3 && (
                                <GlassBox style={{ width: '100%' }}>
                                    <View className="mb-4">
                                        <Text className="text-white/40 text-[10px] font-black tracking-wider mb-2">DEEP DIVE</Text>
                                        <Text className="text-white text-sm font-bold leading-5 mb-1">{profile.careAbout ? `Cares about: ${profile.careAbout}` : ''}</Text>
                                        <Text className="text-white text-sm font-bold leading-5">{profile.emotionalFit ? `Emotional fit: ${profile.emotionalFit}` : ''}</Text>
                                    </View>
                                </GlassBox>
                            )}
                            {previewIndex === 4 && (
                                <GlassBox style={{ width: '100%' }}>
                                    <View className="mb-4">
                                        <Text className="text-white/40 text-[10px] font-black tracking-wider mb-2">FAVORITES</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {profile.topMovies[0] && <Text className="text-white/80 text-xs bg-white/10 px-2 py-1 rounded">🎬 {profile.topMovies[0]}</Text>}
                                            {profile.topSongs[0] && <Text className="text-white/80 text-xs bg-white/10 px-2 py-1 rounded">🎵 {profile.topSongs[0]}</Text>}
                                            {profile.topFoods[0] && <Text className="text-white/80 text-xs bg-white/10 px-2 py-1 rounded">🍕 {profile.topFoods[0]}</Text>}
                                        </View>
                                    </View>
                                    {profile.goals && (
                                        <View>
                                            <Text className="text-white/40 text-[10px] font-black tracking-wider mb-2">GOALS</Text>
                                            <Text className="text-white text-sm font-bold leading-5">{profile.goals}</Text>
                                        </View>
                                    )}
                                </GlassBox>
                            )}
                        </View>

                        <View className="p-4 bg-white/5 border-t border-white/10 flex-row items-center justify-between">
                            <TouchableOpacity onPress={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0} className="p-2">
                                <ChevronLeft color={previewIndex === 0 ? "rgba(255,255,255,0.2)" : "#fff"} size={20} />
                            </TouchableOpacity>
                            <Text className="text-center text-white/50 text-[10px] uppercase font-bold tracking-widest w-40">
                                {previewIndex === 0 ? 'IDENTITY' : previewIndex === 1 ? 'PROFESSIONAL' : previewIndex === 2 ? 'VIBE' : previewIndex === 3 ? 'DEEP DIVE' : 'FAVORITES'} ({previewIndex + 1}/5)
                            </Text>
                            <TouchableOpacity onPress={() => setPreviewIndex(Math.min(4, previewIndex + 1))} disabled={previewIndex === 4} className="p-2">
                                <ChevronRight color={previewIndex === 4 ? "rgba(255,255,255,0.2)" : "#fff"} size={20} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Share Modal */}
            <ShareCardModal
                visible={showShareModal}
                onClose={() => setShowShareModal(false)}
                cardCode={profileCode}
                cardOwnerName={profile.displayName}
            />
        </View>
    );
}

// Sub-components
function InputField({ label, value, onChange, placeholder, visibility, onToggle }: any) {
    return (
        <View>
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white/40 text-xs font-black tracking-widest">{label}</Text>
                {onToggle && (
                    <TouchableOpacity onPress={onToggle} className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white/5">
                        {visibility === 'followers' ? <EyeOff color="rgba(255,255,255,0.4)" size={12} /> : <Eye color="rgba(255,255,255,0.4)" size={12} />}
                        <Text className="text-white/40 text-[10px] font-bold">{visibility === 'followers' ? 'Private' : 'Public'}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="rgba(255,255,255,0.2)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold"
            />
        </View>
    );
}

function TextAreaField({ label, value, onChange, placeholder, visibility, onToggle }: any) {
    return (
        <View>
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white/40 text-xs font-black tracking-widest">{label}</Text>
                {onToggle && (
                    <TouchableOpacity onPress={onToggle} className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white/5">
                        {visibility === 'followers' ? <EyeOff color="rgba(255,255,255,0.4)" size={12} /> : <Eye color="rgba(255,255,255,0.4)" size={12} />}
                        <Text className="text-white/40 text-[10px] font-bold">{visibility === 'followers' ? 'Private' : 'Public'}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="rgba(255,255,255,0.2)"
                multiline
                numberOfLines={4}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold min-h-[100px]"
                style={{ textAlignVertical: 'top' }}
            />
        </View>
    );
}

function Top3Input({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
    return (
        <View>
            <Text className="text-white/40 text-xs font-black tracking-widest mb-2">{label}</Text>
            <View className="space-y-2">
                {[0, 1, 2].map(i => (
                    <TextInput
                        key={i}
                        value={values[i] || ''}
                        onChangeText={text => {
                            const newValues = [...values];
                            newValues[i] = text;
                            onChange(newValues);
                        }}
                        placeholder={`#${i + 1}`}
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                    />
                ))}
            </View>
        </View>
    );
}

function GlassBox({ children, style }: { children: React.ReactNode; style?: any }) {
    return (
        <View className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10" style={style}>
            {children}
        </View>
    );
}
