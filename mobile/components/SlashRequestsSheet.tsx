// components/SlashRequestsSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { X, Check, Eye } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SlashService, SlashAccessRequestData } from '../services/SlashService';

interface Props {
    visible: boolean;
    onClose: () => void;
    slashId: string;
    onRequestResolved: () => void;
}

export default function SlashRequestsSheet({ visible, onClose, slashId, onRequestResolved }: Props) {
    const router = useRouter();
    const [requests, setRequests] = useState<SlashAccessRequestData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && slashId) loadRequests();
    }, [visible, slashId]);

    const loadRequests = async () => {
        setLoading(true);
        const result = await SlashService.getPendingRequests(slashId);
        if (result.success && result.data) {
            setRequests(result.data);
        }
        setLoading(false);
    };

    const handleAccept = async (req: SlashAccessRequestData) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Optimistic removal
        setRequests(prev => prev.filter(r => r.id !== req.id));
        onRequestResolved();

        const result = await SlashService.acceptRequest(req.id);
        if (!result.success) {
            // Revert on failure
            setRequests(prev => [...prev, req].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ));
        }
    };

    const handleReject = async (req: SlashAccessRequestData) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRequests(prev => prev.filter(r => r.id !== req.id));
        onRequestResolved();
        await SlashService.rejectRequest(req.id);
    };

    const handleViewLill = (postId: string) => {
        router.push(`/post/${postId}` as any);
    };

    const getDisplayName = (requester: any) => {
        const profile = requester?.profile;
        return profile?.displayName || requester?.name || 'unknown';
    };

    const getInitials = (name: string) => {
        return name.slice(0, 2).toUpperCase();
    };

    const getThumbnail = (post: any) => {
        if (!post?.postMedia?.length) return null;
        const media = post.postMedia[0]?.media;
        return media?.url || null;
    };

    const renderRequest = ({ item }: { item: SlashAccessRequestData }) => {
        const displayName = getDisplayName(item.requester);
        const avatarUrl = item.requester?.profile?.avatarUrl;
        const thumbnail = item.attachedPost ? getThumbnail(item.attachedPost) : null;
        const postCaption = item.attachedPost?.content?.slice(0, 40) || '';

        return (
            <View style={st.requestCard}>
                {/* User row */}
                <View style={st.userRow}>
                    <View style={st.avatar}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={st.avatarImg} />
                        ) : (
                            <Text style={st.avatarInitials}>{getInitials(displayName)}</Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={st.username}>{displayName}</Text>
                        <Text style={st.subtitle}>wants to contribute</Text>
                    </View>
                </View>

                {/* Attached post thumbnail */}
                {item.attachedPostId && thumbnail ? (
                    <TouchableOpacity onPress={() => handleViewLill(item.attachedPostId!)} style={st.thumbRow}>
                        <Image source={{ uri: thumbnail }} style={st.thumbnail} />
                        <Text style={st.thumbCaption} numberOfLines={1}>{postCaption}</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={st.noPost}>no lill attached</Text>
                )}

                {/* Note */}
                {item.requesterNote ? (
                    <View style={st.noteBlock}>
                        <Text style={st.noteText}>{item.requesterNote}</Text>
                    </View>
                ) : null}

                {/* Action row */}
                <View style={st.actionRow}>
                    <TouchableOpacity onPress={() => handleAccept(item)} style={st.acceptBtn}>
                        <Check size={12} color="#080808" />
                        <Text style={st.acceptText}>
                            {item.attachedPostId ? 'accept + add lill' : 'accept'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReject(item)} style={st.rejectBtn}>
                        <X size={12} color="#eee" />
                        <Text style={st.rejectText}>reject</Text>
                    </TouchableOpacity>
                    {item.attachedPostId && (
                        <TouchableOpacity onPress={() => handleViewLill(item.attachedPostId!)} style={st.viewBtn}>
                            <Eye size={12} color="#777" />
                            <Text style={st.viewText}>watch</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={st.overlay}>
                <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
                <BlurView intensity={40} tint="dark" style={st.sheet}>
                    <View style={st.handle} />
                    <View style={st.headerRow}>
                        <Text style={st.headerTitle}>pending requests</Text>
                        <TouchableOpacity onPress={onClose} style={st.closeBtn}>
                            <X size={18} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={st.center}>
                            <ActivityIndicator color="#555" />
                        </View>
                    ) : requests.length === 0 ? (
                        <View style={st.center}>
                            <Text style={st.emptyText}>no pending requests</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={requests}
                            keyExtractor={item => item.id}
                            renderItem={renderRequest}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </BlurView>
            </View>
        </Modal>
    );
}

const st = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { backgroundColor: '#0e0e0e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%', overflow: 'hidden' },
    handle: { width: 40, height: 4, backgroundColor: '#1c1c1c', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { color: '#eee', fontSize: 12, fontWeight: '700' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyText: { color: '#2e2e2e', fontSize: 10 },
    requestCard: { backgroundColor: '#0a0a0a', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: '#1c1c1c' },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1c1c1c', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImg: { width: 26, height: 26, borderRadius: 13 },
    avatarInitials: { color: '#555', fontSize: 9, fontWeight: '700' },
    username: { color: '#eee', fontSize: 10, fontWeight: '600' },
    subtitle: { color: '#2e2e2e', fontSize: 8 },
    thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 8, padding: 6, marginBottom: 8 },
    thumbnail: { width: 46, height: 46, borderRadius: 6, backgroundColor: '#1c1c1c' },
    thumbCaption: { flex: 1, color: '#777', fontSize: 9 },
    noPost: { color: '#2e2e2e', fontSize: 8, marginBottom: 8 },
    noteBlock: { backgroundColor: '#0e0e0e', borderRadius: 6, padding: 8, marginBottom: 8 },
    noteText: { color: '#444', fontSize: 8 },
    actionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    acceptText: { color: '#080808', fontSize: 9, fontWeight: '700' },
    rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: '#2a2a2a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    rejectText: { color: '#eee', fontSize: 9, fontWeight: '600' },
    viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
    viewText: { color: '#777', fontSize: 9 },
});
