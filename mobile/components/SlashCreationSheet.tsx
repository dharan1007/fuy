// components/SlashCreationSheet.tsx
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SlashService, Slash } from '../services/SlashService';

interface Props {
    visible: boolean;
    onClose: () => void;
    onCreated: (slash: Slash) => void;
    prefillName?: string;
}

export default function SlashCreationSheet({ visible, onClose, onCreated, prefillName }: Props) {
    const [name, setName] = useState(prefillName || '');
    const [accessMode, setAccessMode] = useState<'open' | 'locked'>('open');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [existingSlash, setExistingSlash] = useState<Slash | null>(null);
    const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const sanitizeName = (input: string): string => {
        return input
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 32);
    };

    const handleNameChange = (text: string) => {
        const sanitized = sanitizeName(text);
        setName(sanitized);
        setNameError(null);
        setExistingSlash(null);

        if (checkTimer.current) clearTimeout(checkTimer.current);
        if (sanitized.length > 1) {
            checkTimer.current = setTimeout(async () => {
                const result = await SlashService.searchSlashes(sanitized, 1);
                if (result.success && result.data && result.data.length > 0) {
                    const exact = result.data.find(s => s.name === sanitized);
                    if (exact) {
                        setNameError('slash already exists -- tap to view it');
                        setExistingSlash(exact);
                    }
                }
            }, 500);
        }
    };

    const handleSubmit = async () => {
        if (!name || name.length < 2) {
            setNameError('name must be at least 2 characters');
            return;
        }
        if (existingSlash) return;

        Keyboard.dismiss();
        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const result = await SlashService.createSlash(name, accessMode, description || undefined);
        setSubmitting(false);

        if (result.success && result.data) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onCreated(result.data);
            // Reset
            setName('');
            setDescription('');
            setAccessMode('open');
            onClose();
        } else {
            setNameError(result.error || 'failed to create slash');
        }
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setAccessMode('open');
        setNameError(null);
        setExistingSlash(null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={st.overlay}>
                <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={handleClose} />
                <BlurView intensity={40} tint="dark" style={st.sheet}>
                    <View style={st.handle} />

                    {/* Header */}
                    <View style={st.headerRow}>
                        <Text style={st.headerTitle}>create slash</Text>
                        <TouchableOpacity onPress={handleClose} style={st.closeBtn}>
                            <X size={18} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {/* Name Input */}
                    <Text style={st.label}>slash name</Text>
                    <View style={st.nameRow}>
                        <Text style={st.prefix}>/</Text>
                        <TextInput
                            value={name}
                            onChangeText={handleNameChange}
                            placeholder="enter-name"
                            placeholderTextColor="#2e2e2e"
                            style={st.nameInput}
                            maxLength={32}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Text style={st.charCount}>{name.length}/32</Text>
                    </View>
                    {nameError && (
                        <Text style={st.errorText}>{nameError}</Text>
                    )}

                    {/* Access Toggle */}
                    <Text style={st.label}>access</Text>
                    <View style={st.toggleRow}>
                        <TouchableOpacity
                            onPress={() => { setAccessMode('open'); Haptics.selectionAsync(); }}
                            style={[st.togglePill, accessMode === 'open' && st.togglePillActive]}
                        >
                            <Text style={[st.toggleText, accessMode === 'open' && st.toggleTextActive]}>open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setAccessMode('locked'); Haptics.selectionAsync(); }}
                            style={[st.togglePill, accessMode === 'locked' && st.togglePillLocked]}
                        >
                            <Text style={[st.toggleText, accessMode === 'locked' && st.toggleTextLocked]}>locked</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Description */}
                    <Text style={st.label}>description (optional)</Text>
                    <TextInput
                        value={description}
                        onChangeText={t => setDescription(t.slice(0, 120))}
                        placeholder="what is this slash about?"
                        placeholderTextColor="#2e2e2e"
                        style={st.descInput}
                        multiline
                        maxLength={120}
                    />
                    <Text style={st.charCountRight}>{description.length}/120</Text>

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting || !name || !!existingSlash}
                        style={[st.submitBtn, (submitting || !name || !!existingSlash) && st.submitBtnDisabled]}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#080808" size="small" />
                        ) : (
                            <Text style={st.submitText}>create slash</Text>
                        )}
                    </TouchableOpacity>
                </BlurView>
            </View>
        </Modal>
    );
}

const st = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { backgroundColor: '#0e0e0e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, overflow: 'hidden' },
    handle: { width: 40, height: 4, backgroundColor: '#1c1c1c', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { color: '#eee', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    label: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 10, borderWidth: 0.5, borderColor: '#1c1c1c', paddingHorizontal: 12 },
    prefix: { color: '#c8383a', fontSize: 16, fontWeight: '700', marginRight: 2 },
    nameInput: { flex: 1, color: '#eee', fontSize: 14, paddingVertical: 12 },
    charCount: { color: '#1e1e1e', fontSize: 9, fontFamily: 'monospace' },
    errorText: { color: '#c8383a', fontSize: 9, marginTop: 4 },
    toggleRow: { flexDirection: 'row', gap: 8 },
    togglePill: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0e0e0e', borderWidth: 0.5, borderColor: '#1c1c1c', alignItems: 'center' },
    togglePillActive: { backgroundColor: '#0e1a0e', borderColor: '#4a8a4a' },
    togglePillLocked: { backgroundColor: '#1a0e0e', borderColor: '#c8383a' },
    toggleText: { color: '#3a3a3a', fontSize: 10, fontWeight: '600' },
    toggleTextActive: { color: '#4a8a4a' },
    toggleTextLocked: { color: '#c8383a' },
    descInput: { color: '#eee', fontSize: 12, backgroundColor: '#0a0a0a', borderRadius: 10, borderWidth: 0.5, borderColor: '#1c1c1c', padding: 12, minHeight: 60, textAlignVertical: 'top' },
    charCountRight: { color: '#1e1e1e', fontSize: 9, textAlign: 'right', marginTop: 2 },
    submitBtn: { backgroundColor: '#eee', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    submitBtnDisabled: { opacity: 0.3 },
    submitText: { color: '#080808', fontSize: 12, fontWeight: '700' },
});
