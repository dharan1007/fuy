// components/SlashManagementSheet.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Copy, Trash2, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { SlashService, Slash } from '../services/SlashService';
import SlashRequestsSheet from './SlashRequestsSheet';

interface Props {
    visible: boolean;
    onClose: () => void;
    slash: Slash | null;
    onUpdated: (slash: Slash) => void;
    onDeleted: (slashId: string) => void;
}

export default function SlashManagementSheet({ visible, onClose, slash, onUpdated, onDeleted }: Props) {
    const [editName, setEditName] = useState('');
    const [accessMode, setAccessMode] = useState<'open' | 'locked'>('open');
    const [toggling, setToggling] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (slash) {
            setEditName(slash.name);
            setAccessMode(slash.accessMode);
            setPendingCount((slash as any).pendingCount || 0);
        }
    }, [slash]);

    if (!slash) return null;

    const handleToggleAccess = async () => {
        const newMode = accessMode === 'open' ? 'locked' : 'open';
        setToggling(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const result = await SlashService.toggleAccess(slash.id, newMode);
        setToggling(false);

        if (result.success) {
            setAccessMode(newMode);
            if (newMode === 'open') setPendingCount(0);
            onUpdated({ ...slash, accessMode: newMode });
        }
    };

    const handleCopyCode = async () => {
        await Clipboard.setStringAsync(slash.slashCode);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDelete = () => {
        Alert.alert(
            `delete /${slash.name}?`,
            'this cannot be undone. all lills will be removed from this slash but not deleted.',
            [
                { text: 'cancel', style: 'cancel' },
                {
                    text: 'delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        const { error } = await (await import('../lib/supabase')).supabase
                            .from('Slash')
                            .delete()
                            .eq('id', slash.id);
                        setDeleting(false);
                        if (!error) {
                            onDeleted(slash.id);
                            onClose();
                        }
                    },
                },
            ]
        );
    };

    const handleRequestResolved = () => {
        setPendingCount(prev => Math.max(0, prev - 1));
    };

    return (
        <>
            <Modal visible={visible && !showRequests} transparent animationType="slide" onRequestClose={onClose}>
                <View style={st.overlay}>
                    <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
                    <BlurView intensity={40} tint="dark" style={st.sheet}>
                        <View style={st.handle} />

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Header */}
                            <View style={st.headerRow}>
                                <View>
                                    <Text style={st.headerTitle}>/{slash.name}</Text>
                                    <Text style={st.code}>{slash.slashCode}</Text>
                                </View>
                                <View style={[st.statusBadge, accessMode === 'locked' ? st.badgeLocked : st.badgeOpen]}>
                                    <Text style={[st.statusText, accessMode === 'locked' ? st.statusLocked : st.statusOpen]}>
                                        {accessMode}
                                    </Text>
                                </View>
                            </View>

                            {/* Stats */}
                            <View style={st.statsRow}>
                                <View style={st.statTile}>
                                    <Text style={st.statNum}>{slash.lillCount}</Text>
                                    <Text style={st.statLabel}>lills</Text>
                                </View>
                                <View style={st.statTile}>
                                    <Text style={st.statNum}>{slash.contributorCount}</Text>
                                    <Text style={st.statLabel}>contributors</Text>
                                </View>
                                <View style={[st.statTile, pendingCount > 0 && st.statTilePending]}>
                                    <Text style={[st.statNum, pendingCount > 0 && st.statNumPending]}>{pendingCount}</Text>
                                    <Text style={st.statLabel}>pending</Text>
                                </View>
                            </View>

                            {/* Settings */}
                            <Text style={st.sectionLabel}>settings</Text>

                            {/* Access toggle */}
                            <View style={st.settingRow}>
                                <Text style={st.settingLabel}>access mode</Text>
                                <TouchableOpacity
                                    onPress={handleToggleAccess}
                                    disabled={toggling}
                                    style={[st.accessToggle, accessMode === 'locked' ? st.accessToggleLocked : st.accessToggleOpen]}
                                >
                                    {toggling ? (
                                        <ActivityIndicator size="small" color="#eee" />
                                    ) : (
                                        <Text style={st.accessToggleText}>{accessMode === 'open' ? 'switch to locked' : 'switch to open'}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Code display */}
                            <View style={st.settingRow}>
                                <Text style={st.settingLabel}>slash code</Text>
                                <TouchableOpacity onPress={handleCopyCode} style={st.codeRow}>
                                    <Text style={st.codeDisplay}>{slash.slashCode}</Text>
                                    <Copy size={12} color="#555" />
                                </TouchableOpacity>
                            </View>

                            {/* Pending requests (if locked) */}
                            {accessMode === 'locked' && pendingCount > 0 && (
                                <>
                                    <Text style={st.sectionLabel}>pending requests</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowRequests(true)}
                                        style={st.reviewRow}
                                    >
                                        <Text style={st.reviewText}>review {pendingCount} request{pendingCount !== 1 ? 's' : ''}</Text>
                                        <ChevronRight size={14} color="#c8383a" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Danger zone */}
                            <Text style={[st.sectionLabel, { marginTop: 24 }]}>danger zone</Text>
                            <TouchableOpacity onPress={handleDelete} disabled={deleting} style={st.deleteBtn}>
                                <Trash2 size={14} color="#3a3a3a" />
                                <Text style={st.deleteText}>{deleting ? 'deleting...' : 'delete this slash'}</Text>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </BlurView>
                </View>
            </Modal>

            <SlashRequestsSheet
                visible={showRequests}
                onClose={() => setShowRequests(false)}
                slashId={slash.id}
                onRequestResolved={handleRequestResolved}
            />
        </>
    );
}

const st = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { backgroundColor: '#0e0e0e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '90%', overflow: 'hidden' },
    handle: { width: 40, height: 4, backgroundColor: '#1c1c1c', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    headerTitle: { color: '#eee', fontSize: 14, fontWeight: '700' },
    code: { color: '#2e2e2e', fontSize: 9, fontFamily: 'monospace', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeLocked: { backgroundColor: '#1a0e0e' },
    badgeOpen: { backgroundColor: '#0e1a0e' },
    statusText: { fontSize: 8, fontWeight: '700' },
    statusLocked: { color: '#c8383a' },
    statusOpen: { color: '#4a8a4a' },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statTile: { flex: 1, backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#1c1c1c' },
    statTilePending: { backgroundColor: '#1a0e0e', borderColor: '#2a1515' },
    statNum: { color: '#eee', fontSize: 16, fontWeight: '700' },
    statNumPending: { color: '#c8383a' },
    statLabel: { color: '#2e2e2e', fontSize: 8, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
    sectionLabel: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#1c1c1c' },
    settingLabel: { color: '#777', fontSize: 10 },
    accessToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 0.5 },
    accessToggleOpen: { borderColor: '#4a8a4a', backgroundColor: '#0e1a0e' },
    accessToggleLocked: { borderColor: '#c8383a', backgroundColor: '#1a0e0e' },
    accessToggleText: { color: '#eee', fontSize: 9, fontWeight: '600' },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    codeDisplay: { color: '#555', fontSize: 11, fontFamily: 'monospace' },
    reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a0e0e', borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: '#2a1515' },
    reviewText: { color: '#c8383a', fontSize: 10, fontWeight: '600' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    deleteText: { color: '#3a3a3a', fontSize: 10, fontWeight: '600' },
});
