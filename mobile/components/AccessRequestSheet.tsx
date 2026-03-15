// components/AccessRequestSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { X, Check, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { SlashService } from '../services/SlashService';

interface Props {
    visible: boolean;
    onClose: () => void;
    slashId: string;
    slashName: string;
    curatorUsername?: string;
    preSelectedPostId?: string;
    preSelectedPostTitle?: string;
    isPostCreation?: boolean;
}

export default function AccessRequestSheet({
    visible,
    onClose,
    slashId,
    slashName,
    curatorUsername,
    preSelectedPostId,
    preSelectedPostTitle,
    isPostCreation,
}: Props) {
    const [recentLills, setRecentLills] = useState<any[]>([]);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(preSelectedPostId || null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            setSelectedPostId(preSelectedPostId || null);
            setSubmitted(false);
            setNote('');
            loadRecentLills();
        }
    }, [visible]);

    const loadRecentLills = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('Post')
                .select(`
                    id, content,
                    lillData:Lill(thumbnailUrl),
                    postMedia:PostMedia(media:Media(url, type))
                `)
                .eq('userId', user.id)
                .eq('postType', 'LILL')
                .order('createdAt', { ascending: false })
                .limit(10);

            setRecentLills(data || []);
        } catch (e) {
            console.error('Load recent lills error:', e);
        }
        setLoading(false);
    };

    const getThumbnail = (lill: any) => {
        const thumb = lill.lillData?.thumbnailUrl || lill.lillData?.[0]?.thumbnailUrl;
        if (thumb) return thumb;
        const media = lill.postMedia?.[0]?.media;
        return media?.url || null;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const result = await SlashService.createAccessRequest(
            slashId,
            selectedPostId || undefined,
            note || undefined
        );

        setSubmitting(false);

        if (result.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSubmitted(true);
        }
    };

    const handleClose = () => {
        setSubmitted(false);
        setNote('');
        setSelectedPostId(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={st.overlay}>
                <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={handleClose} />
                <BlurView intensity={40} tint="dark" style={st.sheet}>
                    <View style={st.handle} />

                    <View style={st.headerRow}>
                        <Text style={st.headerTitle}>request to contribute</Text>
                        <TouchableOpacity onPress={handleClose} style={st.closeBtn}>
                            <X size={18} color="#555" />
                        </TouchableOpacity>
                    </View>

                    <View style={st.slashBanner}>
                        <Text style={st.slashLabel}>/{slashName}</Text>
                        {curatorUsername && (
                            <Text style={st.curatorLabel}>curated by @{curatorUsername}</Text>
                        )}
                    </View>

                    {/* Post-creation context */}
                    {isPostCreation && preSelectedPostTitle && (
                        <View style={st.contextBanner}>
                            <Text style={st.contextText}>
                                your lill is live -- add it to a locked slash?
                            </Text>
                        </View>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Lill selector */}
                        <Text style={st.label}>attach a lill (optional)</Text>
                        {loading ? (
                            <ActivityIndicator color="#555" style={{ marginVertical: 12 }} />
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.lillScroll}>
                                {recentLills.map(lill => {
                                    const thumb = getThumbnail(lill);
                                    const isSelected = selectedPostId === lill.id;
                                    return (
                                        <TouchableOpacity
                                            key={lill.id}
                                            onPress={() => {
                                                setSelectedPostId(isSelected ? null : lill.id);
                                                Haptics.selectionAsync();
                                            }}
                                            style={[st.lillThumb, isSelected && st.lillThumbSelected]}
                                        >
                                            {thumb ? (
                                                <Image source={{ uri: thumb }} style={st.lillImg} />
                                            ) : (
                                                <View style={st.lillPlaceholder}>
                                                    <Text style={st.lillPlaceholderText}>L</Text>
                                                </View>
                                            )}
                                            {isSelected && (
                                                <View style={st.selectedBadge}>
                                                    <Check size={10} color="#080808" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Note */}
                        <Text style={st.label}>note to curator (optional)</Text>
                        <TextInput
                            value={note}
                            onChangeText={t => setNote(t.slice(0, 200))}
                            placeholder="write a note to the curator -- optional"
                            placeholderTextColor="#2e2e2e"
                            style={st.noteInput}
                            multiline
                            maxLength={200}
                            editable={!submitted}
                        />
                        <Text style={st.charCount}>{note.length}/200</Text>

                        {/* Submit */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting || submitted}
                            style={[st.submitBtn, submitted && st.submitBtnSent]}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#080808" size="small" />
                            ) : (
                                <>
                                    <Send size={14} color={submitted ? '#4a8a4a' : '#080808'} />
                                    <Text style={[st.submitText, submitted && st.submitTextSent]}>
                                        {submitted ? 'request sent' : 'send request'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {submitted && curatorUsername && (
                            <Text style={st.sentNote}>request sent to @{curatorUsername}</Text>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerTitle: { color: '#eee', fontSize: 12, fontWeight: '700' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    slashBanner: { backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: '#1c1c1c' },
    slashLabel: { color: '#c8383a', fontSize: 14, fontWeight: '700' },
    curatorLabel: { color: '#2e2e2e', fontSize: 9, marginTop: 2 },
    contextBanner: { backgroundColor: '#0e1a0e', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: '#1a2a1a' },
    contextText: { color: '#4a8a4a', fontSize: 9 },
    label: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
    lillScroll: { marginBottom: 8 },
    lillThumb: { width: 60, height: 40, borderRadius: 6, marginRight: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#1c1c1c' },
    lillThumbSelected: { borderColor: '#eee', borderWidth: 2 },
    lillImg: { width: '100%', height: '100%' },
    lillPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1c1c1c', alignItems: 'center', justifyContent: 'center' },
    lillPlaceholderText: { color: '#333', fontSize: 14, fontWeight: '700' },
    selectedBadge: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
    noteInput: { color: '#eee', fontSize: 12, backgroundColor: '#0a0a0a', borderRadius: 10, borderWidth: 0.5, borderColor: '#1c1c1c', padding: 12, minHeight: 60, textAlignVertical: 'top' },
    charCount: { color: '#1e1e1e', fontSize: 9, textAlign: 'right', marginTop: 2 },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eee', borderRadius: 10, paddingVertical: 14, marginTop: 16 },
    submitBtnSent: { backgroundColor: '#0e1a0e', borderWidth: 0.5, borderColor: '#1a2a1a' },
    submitText: { color: '#080808', fontSize: 12, fontWeight: '700' },
    submitTextSent: { color: '#4a8a4a' },
    sentNote: { color: '#2e2e2e', fontSize: 9, textAlign: 'center', marginTop: 8 },
});
