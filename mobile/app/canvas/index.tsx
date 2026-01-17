import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, TextInput, Alert, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search, Calendar, FileText, Trash2, Globe, Users, Lock, Sparkles, Copy } from 'lucide-react-native';
import { CanvasService, JournalEntry } from '../../services/CanvasService';

export default function CanvasListScreen() {
    const { colors, mode } = useTheme();
    const router = useRouter();

    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [templates, setTemplates] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'my' | 'suggested'>('my');

    const fetchEntries = useCallback(async () => {
        try {
            const [myEntries, publicTemplates] = await Promise.all([
                CanvasService.fetchEntries(),
                CanvasService.fetchPublicTemplates(),
            ]);
            setEntries(myEntries);
            setTemplates(publicTemplates);
        } catch (error) {
            console.error('Failed to fetch entries:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchEntries();
    };

    const handleDelete = async (id: string) => {
        const entryToDelete = entries.find(e => e.id === id);
        if (!entryToDelete) return;

        setEntries(prev => prev.filter(e => e.id !== id));

        const success = await CanvasService.deleteEntry(id);
        if (!success) {
            setEntries(prev => [...prev, entryToDelete]);
            Alert.alert('Error', 'Failed to delete entry');
        }
    };

    const handleUseTemplate = (template: JournalEntry) => {
        Alert.alert(
            'Use This Template',
            'This will create a new canvas based on this template.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Use Template',
                    onPress: async () => {
                        // Create a copy with new IDs
                        const newEntry: Partial<JournalEntry> = {
                            content: template.content,
                            blocks: template.blocks?.map(b => ({
                                ...b,
                                id: Math.random().toString(36).slice(2) + Date.now().toString(36),
                                checklist: b.checklist?.map(c => ({
                                    ...c,
                                    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
                                    done: false,
                                })),
                            })),
                            mood: template.mood,
                            tags: template.tags,
                            visibility: 'PRIVATE',
                        };

                        const result = await CanvasService.saveEntry(newEntry);
                        if (result) {
                            router.push(`/canvas/${result.id}`);
                        } else {
                            Alert.alert('Error', 'Failed to create canvas from template');
                        }
                    },
                },
            ]
        );
    };

    const handleCreateNew = () => {
        router.push('/canvas/new');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getEntryPreview = (entry: JournalEntry): string => {
        if (entry.content) return entry.content.slice(0, 80);
        if (entry.blocks && entry.blocks.length > 0) {
            const textBlock = entry.blocks.find(b => b.type === 'TEXT' && b.text);
            if (textBlock?.text) return textBlock.text.slice(0, 80);
        }
        return 'Empty canvas';
    };

    const getVisibilityIcon = (visibility?: string) => {
        switch (visibility) {
            case 'PUBLIC': return <Globe size={12} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />;
            case 'FOLLOWERS': return <Users size={12} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />;
            default: return <Lock size={12} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />;
        }
    };

    const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

    const filteredEntries = entries.filter(entry => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const preview = getEntryPreview(entry).toLowerCase();
        const tags = (entry.tags || []).join(' ').toLowerCase();
        return preview.includes(query) || tags.includes(query);
    });

    const renderMyEntry = ({ item }: { item: JournalEntry }) => {
        const preview = getEntryPreview(item);
        const mood = item.mood;
        const blockCount = item.blocks?.length || 0;

        return (
            <TouchableOpacity
                onPress={() => router.push(`/canvas/${item.id}`)}
                onLongPress={() => {
                    Alert.alert('Delete Canvas', 'Are you sure you want to delete this canvas?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
                    ]);
                }}
                style={{
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 10,
                }}
            >
                {/* Header Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Calendar size={12} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                        <Text style={{ fontSize: 11, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            {formatDate(item.createdAt)}
                        </Text>
                        {getVisibilityIcon(item.visibility)}
                    </View>
                    {mood && <Text style={{ fontSize: 16 }}>{mood}</Text>}
                </View>

                {/* Preview Text */}
                <Text numberOfLines={2} style={{ fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 8 }}>
                    {preview}
                </Text>

                {/* Footer Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {blockCount > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                <FileText size={10} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                                <Text style={{ fontSize: 10, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                                    {blockCount}
                                </Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Trash2 size={14} color={mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTemplate = ({ item }: { item: JournalEntry }) => {
        const preview = getEntryPreview(item);
        const userName = item.user?.profile?.displayName || item.user?.name || 'User';
        const avatarUrl = item.user?.profile?.avatarUrl;

        return (
            <TouchableOpacity
                onPress={() => handleUseTemplate(item)}
                style={{
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 10,
                }}
            >
                {/* User Info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 10 }} />
                    ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 12, color: colors.text }}>{userName.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{userName}</Text>
                        <Text style={{ fontSize: 10, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>
                    {item.mood && <Text style={{ fontSize: 18 }}>{item.mood}</Text>}
                </View>

                {/* Preview Text */}
                <Text numberOfLines={2} style={{ fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 10 }}>
                    {preview}
                </Text>

                {/* Use Template Button */}
                <TouchableOpacity
                    onPress={() => handleUseTemplate(item)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor,
                        borderRadius: 10,
                        gap: 6,
                    }}
                >
                    <Copy size={14} color={colors.text} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Use as Template</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ArrowLeft size={18} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>Canvas</Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleCreateNew}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Plus size={18} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 10 }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('my')}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: activeTab === 'my' ? colors.text : borderColor,
                            backgroundColor: activeTab === 'my' ? (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                        }}
                    >
                        <Text style={{ fontSize: 13, fontWeight: activeTab === 'my' ? '600' : '400', color: colors.text }}>My Canvas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('suggested')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: activeTab === 'suggested' ? colors.text : borderColor,
                            backgroundColor: activeTab === 'suggested' ? (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                            gap: 6,
                        }}
                    >
                        <Sparkles size={14} color={colors.text} />
                        <Text style={{ fontSize: 13, fontWeight: activeTab === 'suggested' ? '600' : '400', color: colors.text }}>Suggested</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar (only for My Canvas) */}
                {activeTab === 'my' && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                            }}
                        >
                            <Search size={16} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search canvas..."
                                placeholderTextColor={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: colors.text }}
                            />
                        </View>
                    </View>
                )}

                {/* Content */}
                {activeTab === 'my' ? (
                    <FlatList
                        data={filteredEntries}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                        renderItem={renderMyEntry}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                                <Text style={{ fontSize: 15, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                                    No canvas entries yet
                                </Text>
                                <Text style={{ fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', marginTop: 4 }}>
                                    Tap + to create your first canvas
                                </Text>
                            </View>
                        }
                    />
                ) : (
                    <FlatList
                        data={templates}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                        renderItem={renderTemplate}
                        ListHeaderComponent={
                            <Text style={{ fontSize: 12, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', marginBottom: 12 }}>
                                Public canvas entries from people you follow
                            </Text>
                        }
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                                <Text style={{ fontSize: 15, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                                    No suggested templates yet
                                </Text>
                                <Text style={{ fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 }}>
                                    Follow more people to see their public canvas entries here
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
