import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    Dimensions,
    Modal,
    useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Save,
    Plus,
    Type,
    CheckSquare,
    ImageIcon,
    Video,
    Mic,
    PenTool,
    Trash2,
    GripVertical,
    Check,
    X,
    Camera,
    Globe,
    Users,
    Lock,
    ChevronUp,
    ChevronDown,
    Copy,
    Share2,
} from 'lucide-react-native';
import { CanvasService, JournalEntry, Block, CanvasVisibility } from '../../services/CanvasService';
import * as ImagePicker from 'expo-image-picker';
import { MediaUploadService } from '../../services/MediaUploadService';

function generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MOODS = ['', '🙂', '😀', '😐', '😟', '😢'];

export default function CanvasEditorScreen() {
    const { colors, mode } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isLandscape = screenWidth > screenHeight;

    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [entry, setEntry] = useState<Partial<JournalEntry>>({
        id: isNew ? undefined : id,
        content: '',
        blocks: [],
        mood: '',
        tags: [],
        visibility: 'PRIVATE',
    });

    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
    const isDirty = useRef(false);

    // Fetch entry if editing existing
    useEffect(() => {
        if (!isNew && id) {
            fetchEntry();
        }
    }, [id, isNew]);

    const fetchEntry = async () => {
        try {
            const entries = await CanvasService.fetchEntries();
            const found = entries.find(e => e.id === id);
            if (found) {
                setEntry(found);
            }
        } catch (error) {
            console.error('Failed to fetch entry:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (autoSaveTimer.current) {
            clearInterval(autoSaveTimer.current);
        }

        autoSaveTimer.current = setInterval(() => {
            if (isDirty.current && entry.id) {
                handleSave(true);
            }
        }, 5000);

        return () => {
            if (autoSaveTimer.current) {
                clearInterval(autoSaveTimer.current);
            }
        };
    }, [entry]);

    const handleSave = async (isAutoSave = false, visibility?: CanvasVisibility) => {
        if (!isAutoSave) setSaving(true);
        isDirty.current = false;

        const entryToSave = {
            ...entry,
            visibility: visibility || entry.visibility || 'PRIVATE',
        };

        const result = await CanvasService.saveEntry(entryToSave);
        if (result && !entry.id) {
            setEntry(prev => ({ ...prev, id: result.id }));
        }

        if (!isAutoSave) {
            setSaving(false);
            setShowSaveModal(false);
            if (result) {
                Alert.alert('Saved', 'Your canvas has been saved.');
            } else {
                Alert.alert('Error', 'Failed to save canvas.');
            }
        }
    };

    const updateEntry = (updates: Partial<JournalEntry>) => {
        isDirty.current = true;
        setEntry(prev => ({ ...prev, ...updates }));
    };

    const addBlock = (type: Block['type']) => {
        const newBlock: Block = {
            id: generateId(),
            type,
            text: type === 'TEXT' ? '' : undefined,
            checklist: type === 'CHECKLIST' ? [{ id: generateId(), text: '', done: false }] : undefined,
            drawing: type === 'DRAW' ? { paths: [], stroke: '#000', strokeWidth: 2 } : undefined,
        };

        updateEntry({ blocks: [...(entry.blocks || []), newBlock] });
        setShowBlockMenu(false);
        setEditingBlockId(newBlock.id);
    };

    const updateBlock = (blockId: string, updates: Partial<Block>) => {
        const blocks = (entry.blocks || []).map(b =>
            b.id === blockId ? { ...b, ...updates } : b
        );
        updateEntry({ blocks });
    };

    const deleteBlock = (blockId: string) => {
        const blocks = (entry.blocks || []).filter(b => b.id !== blockId);
        updateEntry({ blocks });
    };

    const moveBlock = (blockId: string, direction: 'up' | 'down') => {
        const blocks = [...(entry.blocks || [])];
        const index = blocks.findIndex(b => b.id === blockId);
        if (index < 0) return;

        if (direction === 'up' && index > 0) {
            [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
        } else if (direction === 'down' && index < blocks.length - 1) {
            [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
        }
        updateEntry({ blocks });
    };

    const duplicateBlock = (blockId: string) => {
        const blocks = [...(entry.blocks || [])];
        const index = blocks.findIndex(b => b.id === blockId);
        if (index < 0) return;

        const original = blocks[index];
        const duplicate: Block = {
            ...original,
            id: generateId(),
            checklist: original.checklist?.map(c => ({ ...c, id: generateId() })),
        };
        blocks.splice(index + 1, 0, duplicate);
        updateEntry({ blocks });
    };

    const handleImagePick = async (blockId: string) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            try {
                const uploadResult = await MediaUploadService.uploadMedia(result.assets[0].uri, 'IMAGE');
                updateBlock(blockId, { url: uploadResult.url });
            } catch (error) {
                Alert.alert('Error', 'Failed to upload image');
            }
        }
    };

    const handleVideoPick = async (blockId: string) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            videoMaxDuration: 60,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            try {
                const uploadResult = await MediaUploadService.uploadMedia(result.assets[0].uri, 'VIDEO');
                updateBlock(blockId, { url: uploadResult.url });
            } catch (error) {
                Alert.alert('Error', 'Failed to upload video');
            }
        }
    };

    const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

    const renderBlock = (block: Block, index: number) => {
        const isFirst = index === 0;
        const isLast = index === (entry.blocks?.length || 0) - 1;

        return (
            <View
                key={block.id}
                style={{
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor,
                    borderRadius: 16,
                    marginBottom: 12,
                    overflow: 'hidden',
                }}
            >
                {/* Block Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: borderColor,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase' }}>
                            {block.type}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {/* Move Up */}
                        <TouchableOpacity
                            onPress={() => moveBlock(block.id, 'up')}
                            disabled={isFirst}
                            style={{ padding: 4, opacity: isFirst ? 0.3 : 1 }}
                        >
                            <ChevronUp size={16} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                        </TouchableOpacity>
                        {/* Move Down */}
                        <TouchableOpacity
                            onPress={() => moveBlock(block.id, 'down')}
                            disabled={isLast}
                            style={{ padding: 4, opacity: isLast ? 0.3 : 1 }}
                        >
                            <ChevronDown size={16} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                        </TouchableOpacity>
                        {/* Duplicate */}
                        <TouchableOpacity onPress={() => duplicateBlock(block.id)} style={{ padding: 4 }}>
                            <Copy size={14} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                        </TouchableOpacity>
                        {/* Delete */}
                        <TouchableOpacity onPress={() => deleteBlock(block.id)} style={{ padding: 4 }}>
                            <Trash2 size={14} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Block Content */}
                <View style={{ padding: 14 }}>
                    {block.type === 'TEXT' && (
                        <TextInput
                            multiline
                            value={block.text || ''}
                            onChangeText={text => updateBlock(block.id, { text })}
                            placeholder="Write something..."
                            placeholderTextColor={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            style={{
                                fontSize: 15,
                                color: colors.text,
                                lineHeight: 22,
                                minHeight: 80,
                            }}
                        />
                    )}

                    {block.type === 'CHECKLIST' && (
                        <View>
                            {(block.checklist || []).map((item, i) => (
                                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            const checklist = [...(block.checklist || [])];
                                            checklist[i] = { ...item, done: !item.done };
                                            updateBlock(block.id, { checklist });
                                        }}
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: 6,
                                            borderWidth: 1.5,
                                            borderColor: item.done ? colors.text : borderColor,
                                            backgroundColor: item.done ? colors.text : 'transparent',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 10,
                                        }}
                                    >
                                        {item.done && <Check size={14} color={mode === 'dark' ? '#000' : '#fff'} />}
                                    </TouchableOpacity>
                                    <TextInput
                                        value={item.text}
                                        onChangeText={text => {
                                            const checklist = [...(block.checklist || [])];
                                            checklist[i] = { ...item, text };
                                            updateBlock(block.id, { checklist });
                                        }}
                                        placeholder="Task item..."
                                        placeholderTextColor={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                                        style={{
                                            flex: 1,
                                            fontSize: 14,
                                            color: item.done ? (mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)') : colors.text,
                                            textDecorationLine: item.done ? 'line-through' : 'none',
                                        }}
                                    />
                                    <TouchableOpacity
                                        onPress={() => {
                                            const checklist = (block.checklist || []).filter((_, idx) => idx !== i);
                                            updateBlock(block.id, { checklist });
                                        }}
                                        style={{ padding: 4 }}
                                    >
                                        <X size={14} color={mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity
                                onPress={() => {
                                    const checklist = [...(block.checklist || []), { id: generateId(), text: '', done: false }];
                                    updateBlock(block.id, { checklist });
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                            >
                                <Plus size={16} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                                <Text style={{ marginLeft: 8, fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Add item</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {block.type === 'IMAGE' && (
                        <View>
                            {block.url ? (
                                <TouchableOpacity onPress={() => handleImagePick(block.id)}>
                                    <Image source={{ uri: block.url }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="cover" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => handleImagePick(block.id)}
                                    style={{
                                        height: 120,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor,
                                        borderStyle: 'dashed',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Camera size={24} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                                    <Text style={{ marginTop: 8, fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Tap to add image</Text>
                                </TouchableOpacity>
                            )}
                            <TextInput
                                value={block.caption || ''}
                                onChangeText={caption => updateBlock(block.id, { caption })}
                                placeholder="Add caption..."
                                placeholderTextColor={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                                style={{ marginTop: 10, fontSize: 13, color: colors.text }}
                            />
                        </View>
                    )}

                    {block.type === 'VIDEO' && (
                        <View>
                            {block.url ? (
                                <View style={{ height: 180, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                                    <Video size={32} color={colors.text} />
                                    <Text style={{ marginTop: 8, color: colors.text, fontSize: 12 }}>Video uploaded</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => handleVideoPick(block.id)}
                                    style={{
                                        height: 120,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor,
                                        borderStyle: 'dashed',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Video size={24} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                                    <Text style={{ marginTop: 8, fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Tap to add video</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {block.type === 'AUDIO' && (
                        <View style={{ height: 80, borderRadius: 12, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                            <Mic size={24} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                            <Text style={{ marginTop: 8, fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Audio recording coming soon</Text>
                        </View>
                    )}

                    {block.type === 'DRAW' && (
                        <View style={{ height: 150, borderRadius: 12, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                            <PenTool size={24} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                            <Text style={{ marginTop: 8, fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Drawing canvas coming soon</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderSaveModal = () => (
        <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowSaveModal(false)}
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
            >
                <TouchableOpacity activeOpacity={1} style={{ width: '100%', maxWidth: 340, backgroundColor: colors.background, borderRadius: 20, padding: 20, borderWidth: 1, borderColor }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>Save Canvas</Text>

                    {/* Visibility Options */}
                    <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', marginBottom: 10, textTransform: 'uppercase' }}>
                        Who can see this?
                    </Text>

                    {/* Private */}
                    <TouchableOpacity
                        onPress={() => handleSave(false, 'PRIVATE')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 14,
                            borderWidth: 1,
                            borderColor,
                            borderRadius: 12,
                            marginBottom: 10,
                        }}
                    >
                        <Lock size={20} color={colors.text} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Only Me</Text>
                            <Text style={{ fontSize: 12, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Save privately</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Followers */}
                    <TouchableOpacity
                        onPress={() => handleSave(false, 'FOLLOWERS')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 14,
                            borderWidth: 1,
                            borderColor,
                            borderRadius: 12,
                            marginBottom: 10,
                        }}
                    >
                        <Users size={20} color={colors.text} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Followers Only</Text>
                            <Text style={{ fontSize: 12, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Share with people who follow you</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Public */}
                    <TouchableOpacity
                        onPress={() => handleSave(false, 'PUBLIC')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 14,
                            borderWidth: 1,
                            borderColor,
                            borderRadius: 12,
                        }}
                    >
                        <Globe size={20} color={colors.text} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Public</Text>
                            <Text style={{ fontSize: 12, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Anyone can view and use as template</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Cancel */}
                    <TouchableOpacity onPress={() => setShowSaveModal(false)} style={{ marginTop: 16, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Cancel</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: isLandscape ? 40 : 20, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {/* Mood Selector - Compact */}
                        {MOODS.slice(1).map((m, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => updateEntry({ mood: m })}
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: entry.mood === m ? colors.text : borderColor,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 14 }}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={() => setShowSaveModal(true)}
                        disabled={saving}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 18,
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor,
                            opacity: saving ? 0.5 : 1,
                            gap: 6,
                        }}
                    >
                        <Save size={16} color={colors.text} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Save</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content */}
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: isLandscape ? 40 : 20, paddingBottom: 120 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Title / Content Input */}
                        <TextInput
                            multiline
                            value={entry.content || ''}
                            onChangeText={content => updateEntry({ content })}
                            placeholder="What's on your mind today?"
                            placeholderTextColor={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            style={{
                                fontSize: 18,
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: 20,
                                minHeight: 50,
                            }}
                        />

                        {/* Blocks */}
                        {(entry.blocks || []).map(renderBlock)}

                        {/* Add Block Button */}
                        <TouchableOpacity
                            onPress={() => setShowBlockMenu(!showBlockMenu)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                                borderWidth: 1,
                                borderColor,
                                borderStyle: 'dashed',
                                borderRadius: 16,
                            }}
                        >
                            <Plus size={18} color={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                            <Text style={{ marginLeft: 8, fontSize: 13, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Add block</Text>
                        </TouchableOpacity>

                        {/* Block Menu */}
                        {showBlockMenu && (
                            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {[
                                    { type: 'TEXT' as const, icon: Type, label: 'Text' },
                                    { type: 'CHECKLIST' as const, icon: CheckSquare, label: 'List' },
                                    { type: 'IMAGE' as const, icon: ImageIcon, label: 'Image' },
                                    { type: 'VIDEO' as const, icon: Video, label: 'Video' },
                                    { type: 'AUDIO' as const, icon: Mic, label: 'Audio' },
                                    { type: 'DRAW' as const, icon: PenTool, label: 'Draw' },
                                ].map(({ type, icon: Icon, label }) => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => addBlock(type)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderWidth: 1,
                                            borderColor,
                                            borderRadius: 10,
                                            gap: 6,
                                        }}
                                    >
                                        <Icon size={14} color={colors.text} />
                                        <Text style={{ fontSize: 12, color: colors.text }}>{label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {renderSaveModal()}
        </View>
    );
}
