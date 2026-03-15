/**
 * /sticky sub-component: StickyNote
 *
 * Full-width card below the chat header with a warm amber tint.
 * Stored in the Conversation table as sticky_note text column (encrypted).
 * Cached in AsyncStorage for instant render.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { StickyNote as StickyNoteIcon, X, Check, Edit3 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChannelPool } from '../../lib/ChannelPool';
import { supabase } from '../../lib/supabase';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import * as Haptics from 'expo-haptics';

interface StickyNoteProps {
    roomId: string;
    conversationId: string;
    myPrivateKey: string | null;
    theirPublicKey: string | null;
    isMe?: boolean;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
    roomId,
    conversationId,
    myPrivateKey,
    theirPublicKey,
}) => {
    const [noteText, setNoteText] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Load cached sticky from AsyncStorage on mount
    useEffect(() => {
        AsyncStorage.getItem(`app:sticky:${roomId}`).then((cached) => {
            if (cached) setNoteText(cached);
        });

        // Also load from DB
        loadFromDB();
    }, [roomId, conversationId]);

    const loadFromDB = async () => {
        try {
            const { data } = await supabase
                .from('Conversation')
                .select('sticky_note')
                .eq('id', conversationId)
                .single();

            if (data?.sticky_note && myPrivateKey && theirPublicKey) {
                try {
                    const parsed = JSON.parse(data.sticky_note);
                    if (parsed.c && parsed.n) {
                        const opened = nacl.box.open(
                            util.decodeBase64(parsed.c),
                            util.decodeBase64(parsed.n),
                            util.decodeBase64(theirPublicKey),
                            util.decodeBase64(myPrivateKey)
                        );
                        if (opened) {
                            const decrypted = util.encodeUTF8(opened);
                            setNoteText(decrypted);
                            await AsyncStorage.setItem(`app:sticky:${roomId}`, decrypted);
                        }
                    }
                } catch {
                    // Not encrypted or parse error; use raw text
                    setNoteText(data.sticky_note);
                }
            } else if (!data?.sticky_note) {
                setNoteText(null);
                await AsyncStorage.removeItem(`app:sticky:${roomId}`);
            }
        } catch {
            // Column might not exist yet
        }
    };

    // Listen for sticky updates from partner
    useEffect(() => {
        if (!roomId) return;

        const unsubUpdate = ChannelPool.on(roomId, 'sticky:update', (payload: any) => {
            if (!myPrivateKey || !theirPublicKey) return;

            try {
                const opened = nacl.box.open(
                    util.decodeBase64(payload.c),
                    util.decodeBase64(payload.n),
                    util.decodeBase64(theirPublicKey),
                    util.decodeBase64(myPrivateKey)
                );
                if (opened) {
                    const decrypted = util.encodeUTF8(opened);
                    setNoteText(decrypted);
                    AsyncStorage.setItem(`app:sticky:${roomId}`, decrypted);
                }
            } catch { }
        });

        const unsubDismiss = ChannelPool.on(roomId, 'sticky:dismiss', () => {
            setNoteText(null);
            AsyncStorage.removeItem(`app:sticky:${roomId}`);
        });

        return () => {
            unsubUpdate();
            unsubDismiss();
        };
    }, [roomId, myPrivateKey, theirPublicKey]);

    const saveSticky = useCallback(async (text: string) => {
        if (!myPrivateKey || !theirPublicKey) return;

        setNoteText(text);
        await AsyncStorage.setItem(`app:sticky:${roomId}`, text);

        // Encrypt and save to DB
        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const ciphertext = nacl.box(
            util.decodeUTF8(text),
            nonce,
            util.decodeBase64(theirPublicKey),
            util.decodeBase64(myPrivateKey)
        );
        const encryptedJson = JSON.stringify({ 
            c: util.encodeBase64(ciphertext), 
            n: util.encodeBase64(nonce) 
        });

        try {
            await supabase
                .from('Conversation')
                .update({ sticky_note: encryptedJson })
                .eq('id', conversationId);
        } catch {
            // Column might not exist
        }

        // Broadcast to partner
        ChannelPool.emit(roomId, 'sticky:update', {
            c: util.encodeBase64(ciphertext),
            n: util.encodeBase64(nonce),
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCreateModal(false);
        setIsEditing(false);
    }, [roomId, conversationId, myPrivateKey, theirPublicKey]);

    const dismissSticky = useCallback(async () => {
        setNoteText(null);
        await AsyncStorage.removeItem(`app:sticky:${roomId}`);

        try {
            await supabase
                .from('Conversation')
                .update({ sticky_note: null })
                .eq('id', conversationId);
        } catch { }

        ChannelPool.emit(roomId, 'sticky:dismiss', {});
        Haptics.selectionAsync();
    }, [roomId, conversationId]);

    // Create Modal for writing a new sticky
    const renderCreateModal = () => (
        <Modal
            visible={showCreateModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCreateModal(false)}
        >
            <TouchableOpacity
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'flex-end',
                }}
                activeOpacity={1}
                onPress={() => setShowCreateModal(false)}
            >
                <View
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <StickyNoteIcon size={18} color="#F59E0B" />
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                                Pin a Note
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                            <X size={20} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        value={editText}
                        onChangeText={setEditText}
                        placeholder="Write a note to pin in this chat..."
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        multiline
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            borderRadius: 12,
                            padding: 14,
                            color: '#fff',
                            fontSize: 14,
                            minHeight: 80,
                            maxHeight: 150,
                            textAlignVertical: 'top',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.08)',
                        }}
                        autoFocus
                    />

                    <TouchableOpacity
                        onPress={() => editText.trim() && saveSticky(editText.trim())}
                        disabled={!editText.trim()}
                        style={{
                            marginTop: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: editText.trim() ? '#F59E0B' : 'rgba(255,255,255,0.05)',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: editText.trim() ? '#000' : 'rgba(255,255,255,0.3)', fontWeight: '700', fontSize: 14 }}>
                            Pin Note
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    if (!noteText) {
        return <>{renderCreateModal()}</>;
    }

    return (
        <>
            <View
                style={{
                    marginHorizontal: 12,
                    marginTop: 4,
                    marginBottom: 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.15)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <StickyNoteIcon size={14} color="#F59E0B" />
                <Text
                    style={{
                        flex: 1,
                        color: '#F59E0B',
                        fontSize: 12,
                        fontWeight: '500',
                    }}
                    numberOfLines={2}
                >
                    {noteText}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        setEditText(noteText);
                        setShowCreateModal(true);
                    }}
                    style={{ padding: 4 }}
                >
                    <Edit3 size={12} color="rgba(245, 158, 11, 0.6)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={dismissSticky} style={{ padding: 4 }}>
                    <X size={14} color="rgba(245, 158, 11, 0.5)" />
                </TouchableOpacity>
            </View>
            {renderCreateModal()}
        </>
    );
};

export default StickyNote;
