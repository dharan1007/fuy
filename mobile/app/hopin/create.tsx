import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import {
    ChevronLeft,
    MapPin,
    Calendar,
    Slash,
    Image as ImageIcon,
    X,
    Users,
    Search,
    Plus,
    Clock,
    CheckCircle,
    AlertCircle
} from 'lucide-react-native';
import HopinService, { CreatePlanData } from '../../services/HopinService';
import { supabase } from '../../lib/supabase';

// Monochrome palette
const MONO = {
    black: '#000000',
    white: '#FFFFFF',
    gray100: '#F8F8F8',
    gray200: '#E8E8E8',
    gray300: '#D0D0D0',
    gray400: '#A0A0A0',
    gray500: '#707070',
    gray600: '#505050',
    gray700: '#303030',
    gray800: '#1A1A1A',
    gray900: '#0A0A0A',
};

export default function CreatePlanScreen() {
    const router = useRouter();
    const { edit, lat, lng } = useLocalSearchParams<{ edit?: string; lat?: string; lng?: string }>();
    const { colors, mode } = useTheme();

    const isDark = mode === 'dark';
    const bg = isDark ? MONO.gray900 : MONO.white;
    const cardBg = isDark ? MONO.gray800 : MONO.gray100;
    const textPrimary = isDark ? MONO.white : MONO.black;
    const textSecondary = isDark ? MONO.gray400 : MONO.gray600;
    const accent = isDark ? MONO.white : MONO.black;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!edit);

    // Form State
    const [planType, setPlanType] = useState<'SOLO' | 'COMMUNITY'>('SOLO');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [locationLink, setLocationLink] = useState('');
    const [latitude, setLatitude] = useState<number | null>(lat ? parseFloat(lat) : null);
    const [longitude, setLongitude] = useState<number | null>(lng ? parseFloat(lng) : null);
    const [date, setDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [maxSize, setMaxSize] = useState(10);
    const [visibility, setVisibility] = useState<'PRIVATE' | 'FOLLOWERS' | 'PUBLIC'>('PRIVATE');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [mediaItems, setMediaItems] = useState<{ uri: string; type: string }[]>([]);

    // Toast state
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info'; onDismiss?: () => void }>({ visible: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', onDismiss?: () => void) => {
        setToast({ visible: true, message, type, onDismiss });
    };

    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => {
                setToast(prev => ({ ...prev, visible: false }));
                if (toast.onDismiss) toast.onDismiss();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    // Toast Component
    const Toast = () => {
        if (!toast.visible) return null;
        return (
            <View className="absolute top-20 left-5 right-5 z-50">
                <View className="flex-row items-center p-4 rounded-2xl" style={{ backgroundColor: toast.type === 'error' ? '#c00' : accent }}>
                    {toast.type === 'error' ? (
                        <AlertCircle size={20} color={MONO.white} />
                    ) : (
                        <CheckCircle size={20} color={isDark ? MONO.black : MONO.white} />
                    )}
                    <Text style={[styles.fontSans, { fontSize: 14, color: toast.type === 'error' ? MONO.white : (isDark ? MONO.black : MONO.white), marginLeft: 12, flex: 1 }]}>
                        {toast.message}
                    </Text>
                    <TouchableOpacity onPress={() => { setToast(prev => ({ ...prev, visible: false })); if (toast.onDismiss) toast.onDismiss(); }}>
                        <X size={18} color={toast.type === 'error' ? MONO.white : (isDark ? MONO.black : MONO.white)} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Invite Users
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (edit) loadPlanForEdit();
    }, [edit]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const timer = setTimeout(() => searchUsers(), 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const loadPlanForEdit = async () => {
        if (!edit) return;
        try {
            const plan = await HopinService.fetchPlanById(edit);
            if (plan) {
                setPlanType(plan.type);
                setTitle(plan.title);
                setDescription(plan.description || '');
                setLocation(plan.location || '');
                setLocationLink(plan.locationLink || '');
                setDate(plan.date ? new Date(plan.date) : null);
                setMaxSize(plan.maxSize || 10);
                setVisibility(plan.visibility);
                if (plan.slashes) {
                    try { setTags(JSON.parse(plan.slashes)); } catch { }
                }
                if (plan.mediaUrls) {
                    try {
                        const urls = JSON.parse(plan.mediaUrls);
                        setMediaItems(urls.map((uri: string) => ({ uri, type: 'image' })));
                    } catch { }
                }
            }
        } catch (error) {
            console.error('Error loading plan:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const searchUsers = async () => {
        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from('User')
                .select('id, name, profile:Profile(avatarUrl)')
                .ilike('name', `%${searchQuery}%`)
                .limit(10);

            if (!error && data) {
                setSearchResults(data.filter(u => !selectedUsers.find(s => s.id === u.id)));
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleUser = (user: any) => {
        if (selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const pickMedia = async () => {
        if (mediaItems.length >= 5) {
            showToast('Maximum 5 media items', 'info');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: 5 - mediaItems.length,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newItems = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.type || 'image'
            }));
            setMediaItems(prev => [...prev, ...newItems].slice(0, 5));
        }
    };

    const removeMedia = (index: number) => {
        setMediaItems(prev => prev.filter((_, i) => i !== index));
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags(prev => [...prev, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            showToast('Please enter a title', 'error');
            return;
        }

        setLoading(true);
        try {
            const mediaUrls = mediaItems.map(m => m.uri);

            const planData: CreatePlanData = {
                title: title.trim(),
                description: description.trim() || undefined,
                type: planType,
                location: location.trim() || undefined,
                locationLink: locationLink.trim() || undefined,
                latitude: latitude || undefined,
                longitude: longitude || undefined,
                visibility,
                date: date ? date.toISOString() : undefined,
                maxSize: planType === 'COMMUNITY' ? maxSize : undefined,
                slashes: tags.length > 0 ? tags : undefined,
                mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            };

            let result;
            if (edit) {
                result = await HopinService.updatePlan(edit, planData);
            } else {
                result = await HopinService.createPlan(planData);
            }

            if (result.success) {
                if (!edit && planType === 'COMMUNITY' && selectedUsers.length > 0 && (result as any).plan) {
                    await HopinService.inviteUsers((result as any).plan.id, selectedUsers.map(u => u.id));
                }

                showToast(edit ? 'Event updated' : 'Event created', 'success', () => router.back());
            } else {
                showToast(result.error || 'Failed to save', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: bg }}>
                <ActivityIndicator size="large" color={textPrimary} />
            </View>
        );
    }

    // Date/Time selection helpers
    const getNextDays = () => {
        const days = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
            <Toast />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4">
                    <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: cardBg }}>
                        <ChevronLeft size={24} color={textPrimary} />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 3 }]}>
                            {edit ? 'EDITING' : 'NEW EVENT'}
                        </Text>
                        <Text style={[styles.fontSerif, { fontSize: 24, color: textPrimary }]}>
                            {edit ? 'Edit' : 'Create'}
                        </Text>
                    </View>
                    <View className="w-12" />
                </View>

                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                    {/* Type Selection */}
                    <View className="mb-8">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>TYPE</Text>
                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => setPlanType('SOLO')}
                                className="flex-1 py-5 rounded-2xl items-center mr-2"
                                style={{ backgroundColor: planType === 'SOLO' ? accent : cardBg }}
                            >
                                <Text style={[styles.fontCondensed, { fontSize: 18, color: planType === 'SOLO' ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>SOLO</Text>
                                <Text style={[styles.fontSans, { fontSize: 11, color: planType === 'SOLO' ? (isDark ? MONO.gray600 : MONO.gray400) : textSecondary, marginTop: 4 }]}>Just for me</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setPlanType('COMMUNITY')}
                                className="flex-1 py-5 rounded-2xl items-center ml-2"
                                style={{ backgroundColor: planType === 'COMMUNITY' ? accent : cardBg }}
                            >
                                <Text style={[styles.fontCondensed, { fontSize: 18, color: planType === 'COMMUNITY' ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>COMMUNITY</Text>
                                <Text style={[styles.fontSans, { fontSize: 11, color: planType === 'COMMUNITY' ? (isDark ? MONO.gray600 : MONO.gray400) : textSecondary, marginTop: 4 }]}>Invite others</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Title */}
                    <View className="mb-6">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>TITLE</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Event name"
                            placeholderTextColor={textSecondary}
                            className="py-4 px-5 rounded-2xl"
                            style={[styles.fontSerif, { fontSize: 20, backgroundColor: cardBg, color: textPrimary }]}
                        />
                    </View>

                    {/* Description */}
                    <View className="mb-6">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>DESCRIPTION</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What's the event about?"
                            placeholderTextColor={textSecondary}
                            multiline
                            numberOfLines={4}
                            className="py-4 px-5 rounded-2xl"
                            style={[styles.fontSans, { fontSize: 15, backgroundColor: cardBg, color: textPrimary, minHeight: 120, textAlignVertical: 'top' }]}
                        />
                    </View>

                    {/* Location */}
                    <View className="mb-6">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>LOCATION</Text>
                        <View className="flex-row items-center px-5 py-4 rounded-2xl" style={{ backgroundColor: cardBg }}>
                            <MapPin size={18} color={textSecondary} />
                            <TextInput
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Where?"
                                placeholderTextColor={textSecondary}
                                className="flex-1 ml-4"
                                style={[styles.fontSans, { fontSize: 15, color: textPrimary }]}
                            />
                        </View>
                        <TextInput
                            value={locationLink}
                            onChangeText={setLocationLink}
                            placeholder="Google Maps link (optional)"
                            placeholderTextColor={textSecondary}
                            className="mt-3 py-4 px-5 rounded-2xl"
                            style={[styles.fontSans, { fontSize: 14, backgroundColor: cardBg, color: textPrimary }]}
                        />
                    </View>

                    {/* Date & Time */}
                    <View className="mb-6">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>DATE & TIME</Text>
                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}
                                className="flex-1 flex-row items-center py-4 px-5 rounded-2xl mr-2"
                                style={{ backgroundColor: cardBg }}
                            >
                                <Calendar size={16} color={textSecondary} />
                                <Text style={[styles.fontSans, { fontSize: 14, color: date ? textPrimary : textSecondary, marginLeft: 12 }]}>
                                    {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}
                                className="flex-1 flex-row items-center py-4 px-5 rounded-2xl ml-2"
                                style={{ backgroundColor: cardBg }}
                            >
                                <Clock size={16} color={textSecondary} />
                                <Text style={[styles.fontSans, { fontSize: 14, color: date ? textPrimary : textSecondary, marginLeft: 12 }]}>
                                    {date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Time'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
                                {getNextDays().map((d, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => {
                                            const newDate = date ? new Date(date) : new Date();
                                            newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                            setDate(newDate);
                                            setShowDatePicker(false);
                                        }}
                                        className="items-center py-3 px-4 mr-2 rounded-2xl"
                                        style={{ backgroundColor: cardBg }}
                                    >
                                        <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>{d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</Text>
                                        <Text style={[styles.fontCondensed, { fontSize: 22, color: textPrimary, marginVertical: 4 }]}>{d.getDate()}</Text>
                                        <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary }]}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {showTimePicker && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
                                {times.map(time => (
                                    <TouchableOpacity
                                        key={time}
                                        onPress={() => {
                                            const [h, m] = time.split(':').map(Number);
                                            const newDate = date ? new Date(date) : new Date();
                                            newDate.setHours(h, m, 0, 0);
                                            setDate(newDate);
                                            setShowTimePicker(false);
                                        }}
                                        className="py-3 px-5 mr-2 rounded-2xl"
                                        style={{ backgroundColor: cardBg }}
                                    >
                                        <Text style={[styles.fontMono, { fontSize: 14, color: textPrimary, letterSpacing: 1 }]}>{time}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Media */}
                    <View className="mb-6">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>MEDIA (MAX 5)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {mediaItems.map((item, i) => (
                                <View key={i} className="w-24 h-24 rounded-2xl overflow-hidden mr-3 relative">
                                    <Image source={{ uri: item.uri }} className="w-full h-full" />
                                    <TouchableOpacity onPress={() => removeMedia(i)} className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                                        <X size={12} color={MONO.white} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {mediaItems.length < 5 && (
                                <TouchableOpacity onPress={pickMedia} className="w-24 h-24 rounded-2xl items-center justify-center" style={{ borderWidth: 2, borderColor: isDark ? MONO.gray700 : MONO.gray300, borderStyle: 'dashed' }}>
                                    <ImageIcon size={24} color={textSecondary} />
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>

                    {/* Visibility */}
                    <View className="mb-6">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>VISIBILITY</Text>
                        <View className="flex-row">
                            {(['PRIVATE', 'FOLLOWERS', 'PUBLIC'] as const).map(v => (
                                <TouchableOpacity
                                    key={v}
                                    onPress={() => setVisibility(v)}
                                    className="flex-1 py-4 rounded-2xl items-center mx-1"
                                    style={{ backgroundColor: visibility === v ? accent : cardBg }}
                                >
                                    <Text style={[styles.fontMono, { fontSize: 10, letterSpacing: 1, color: visibility === v ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>{v}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Community Options */}
                    {planType === 'COMMUNITY' && (
                        <>
                            {/* Max Size */}
                            <View className="mb-6">
                                <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>MAX PARTICIPANTS</Text>
                                <View className="flex-row items-center">
                                    <TouchableOpacity onPress={() => setMaxSize(Math.max(2, maxSize - 1))} className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: cardBg }}>
                                        <Text style={[styles.fontCondensed, { fontSize: 24, color: textPrimary }]}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.fontCondensed, { fontSize: 32, color: textPrimary, flex: 1, textAlign: 'center' }]}>{maxSize}</Text>
                                    <TouchableOpacity onPress={() => setMaxSize(Math.min(100, maxSize + 1))} className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: cardBg }}>
                                        <Text style={[styles.fontCondensed, { fontSize: 24, color: textPrimary }]}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Invite Users */}
                            <View className="mb-6">
                                <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>INVITE</Text>
                                {selectedUsers.length > 0 && (
                                    <View className="flex-row flex-wrap mb-3">
                                        {selectedUsers.map(u => (
                                            <TouchableOpacity key={u.id} onPress={() => toggleUser(u)} className="flex-row items-center px-3 py-2 rounded-full mr-2 mb-2" style={{ backgroundColor: cardBg }}>
                                                <Text style={[styles.fontSans, { fontSize: 13, color: textPrimary }]}>{u.name}</Text>
                                                <X size={14} color={textSecondary} style={{ marginLeft: 6 }} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <View className="flex-row items-center px-5 py-4 rounded-2xl" style={{ backgroundColor: cardBg }}>
                                    <Search size={18} color={textSecondary} />
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search users..."
                                        placeholderTextColor={textSecondary}
                                        className="flex-1 ml-4"
                                        style={[styles.fontSans, { fontSize: 15, color: textPrimary }]}
                                    />
                                </View>
                                {searchResults.length > 0 && (
                                    <View className="mt-2 rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                                        {searchResults.map(user => (
                                            <TouchableOpacity
                                                key={user.id}
                                                onPress={() => toggleUser(user)}
                                                className="flex-row items-center py-3 px-5"
                                                style={{ borderBottomWidth: 1, borderBottomColor: isDark ? MONO.gray700 : MONO.gray200 }}
                                            >
                                                <Image source={{ uri: user.profile?.avatarUrl || 'https://via.placeholder.com/40' }} className="w-8 h-8 rounded-full" />
                                                <Text style={[styles.fontSans, { fontSize: 14, color: textPrimary, marginLeft: 12 }]}>{user.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    {/* Slashes */}
                    <View className="mb-8">
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>SLASHES</Text>
                        {tags.length > 0 && (
                            <View className="flex-row flex-wrap mb-3">
                                {tags.map(tag => (
                                    <TouchableOpacity key={tag} onPress={() => setTags(tags.filter(t => t !== tag))} className="flex-row items-center px-4 py-2 rounded-full mr-2 mb-2" style={{ borderWidth: 1, borderColor: isDark ? MONO.gray600 : MONO.gray400 }}>
                                        <Text style={[styles.fontSans, { fontSize: 13, color: textSecondary }]}>/{tag}</Text>
                                        <X size={14} color={textSecondary} style={{ marginLeft: 6 }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <View className="flex-row items-center px-5 py-4 rounded-2xl" style={{ backgroundColor: cardBg }}>
                            <Slash size={18} color={textSecondary} />
                            <TextInput
                                value={tagInput}
                                onChangeText={setTagInput}
                                onSubmitEditing={addTag}
                                placeholder="Add slash"
                                placeholderTextColor={textSecondary}
                                className="flex-1 ml-4"
                                style={[styles.fontSans, { fontSize: 15, color: textPrimary }]}
                            />
                            {tagInput.trim() && (
                                <TouchableOpacity onPress={addTag}>
                                    <Plus size={20} color={textPrimary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Submit Button */}
                <View className="absolute bottom-0 left-0 right-0 px-5 pb-5" style={{ backgroundColor: bg }}>
                    <SafeAreaView edges={['bottom']}>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading || !title.trim()}
                            className="py-5 rounded-2xl items-center"
                            style={{ backgroundColor: title.trim() ? accent : cardBg }}
                        >
                            {loading ? (
                                <ActivityIndicator color={isDark ? MONO.black : MONO.white} />
                            ) : (
                                <Text style={[styles.fontMono, { fontSize: 13, letterSpacing: 3, color: title.trim() ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>
                                    {edit ? 'SAVE CHANGES' : 'CREATE EVENT'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Typography styles
const styles = StyleSheet.create({
    fontSerif: { fontFamily: 'System', fontWeight: '700' },
    fontSans: { fontFamily: 'System', fontWeight: '400' },
    fontMono: { fontFamily: 'System', fontWeight: '500' },
    fontCondensed: { fontFamily: 'System', fontWeight: '700' },
});
