import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { X, Trash2, FileEdit, Image as ImageIcon, Video, Music, BookOpen, Search, Clock, BarChart2 } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface Draft {
    id: string;
    postType: string;
    content?: string;
    visibility?: string;
    media?: any[];
    createdAt: string;
}

interface DraftsListProps {
    visible: boolean;
    onClose: () => void;
    onSelectDraft: (draft: Draft) => void;
}

const POST_TYPE_ICONS: Record<string, any> = {
    SIMPLE: ImageIcon,
    CHAPTER: BookOpen,
    XRAY: Search,
    LILL: Video,
    FILL: Video,
    AUD: Music,
    CLOCK: Clock,
    PULLUPDOWN: BarChart2,
};

export default function DraftsList({ visible, onClose, onSelectDraft }: DraftsListProps) {
    const { isDark } = useTheme();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            loadDrafts();
        }
    }, [visible]);

    const loadDrafts = async () => {
        setLoading(true);
        try {
            const stored = await AsyncStorage.getItem('postDrafts');
            if (stored) {
                setDrafts(JSON.parse(stored));
            } else {
                setDrafts([]);
            }
        } catch (e) {
            console.error('Failed to load drafts:', e);
            setDrafts([]);
        }
        setLoading(false);
    };

    const deleteDraft = async (id: string) => {
        Alert.alert('Delete Draft', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const updated = drafts.filter(d => d.id !== id);
                        await AsyncStorage.setItem('postDrafts', JSON.stringify(updated));
                        setDrafts(updated);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete draft');
                    }
                },
            },
        ]);
    };

    const clearAllDrafts = async () => {
        Alert.alert('Clear All', 'Delete all drafts?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await AsyncStorage.removeItem('postDrafts');
                        setDrafts([]);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to clear drafts');
                    }
                },
            },
        ]);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const renderDraft = ({ item }: { item: Draft }) => {
        const Icon = POST_TYPE_ICONS[item.postType] || FileEdit;

        return (
            <TouchableOpacity
                onPress={() => {
                    onSelectDraft(item);
                    onClose();
                }}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                }}
            >
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Icon size={20} color="rgba(255,255,255,0.6)" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                        {item.content || `Untitled ${item.postType}`}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>{item.postType}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{formatDate(item.createdAt)}</Text>
                        {item.media && item.media.length > 0 && (
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{item.media.length} media</Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity onPress={() => deleteDraft(item.id)} style={{ padding: 8 }}>
                    <Trash2 size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                    <TouchableOpacity onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>DRAFTS</Text>
                    <TouchableOpacity onPress={clearAllDrafts} disabled={drafts.length === 0} style={{ padding: 8 }}>
                        <Text style={{ color: drafts.length > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', fontWeight: '600', fontSize: 12, letterSpacing: 0.5 }}>CLEAR</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</Text>
                    </View>
                ) : drafts.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                        <FileEdit size={48} color="rgba(255,255,255,0.2)" />
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 16 }}>No Drafts</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8, fontSize: 13 }}>
                            Saved drafts appear here
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={drafts}
                        keyExtractor={item => item.id}
                        renderItem={renderDraft}
                        contentContainerStyle={{ padding: 16 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </Modal>
    );
}

