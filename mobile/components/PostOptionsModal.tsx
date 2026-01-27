
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Share, Dimensions, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { Copy, Flag, Ban, Trash, X, Share as ShareIcon, EyeOff, VolumeX, Ghost, PauseCircle, Slash } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto'; // Use expo-crypto for UUIDs
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';
import { getApiUrl } from '../lib/api';
import SlashesModal from './SlashesModal';

const { width } = Dimensions.get('window');

interface PostOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    post: {
        id: string;
        user: { id: string; name: string };
        content?: string;
        postType?: string;
        slashes?: string[]; // Added slashes property
    } | null;
    onReport?: () => void;
    onDelete?: () => void;
    onBlock?: () => void;
}

export default function PostOptionsModal({ visible, onClose, post, onReport, onDelete, onBlock, onHide, onMute }: PostOptionsModalProps & { onHide?: () => void, onMute?: () => void }) {
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const { showToast } = useToast();
    const [view, setView] = React.useState<'options' | 'report' | 'delete_confirm'>('options');
    const [reportReason, setReportReason] = React.useState<string | null>(null);
    const [reportDetails, setReportDetails] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [slashesModalVisible, setSlashesModalVisible] = React.useState(false);

    // Confirm Modal State
    const [confirmVisible, setConfirmVisible] = React.useState(false);
    const [confirmTitle, setConfirmTitle] = React.useState('');
    const [confirmMessage, setConfirmMessage] = React.useState('');
    const [confirmAction, setConfirmAction] = React.useState<() => void>(() => { });
    const [confirmDestructive, setConfirmDestructive] = React.useState(false);
    const [confirmButtonText, setConfirmButtonText] = React.useState('Confirm');

    // Reset state when opening
    React.useEffect(() => {
        if (visible) {
            setView('options');
            setReportReason(null);
            setReportDetails('');
            setSubmitting(false);
            setSlashesModalVisible(false); // Reset SlashesModal visibility
        }
    }, [visible]);

    if (!post) return null;

    const isOwner = session?.user?.id === post.user.id;

    const handleCopyLink = async () => {
        const link = `https://fuymedia.org/post/${post.id}`;
        await Clipboard.setStringAsync(link);
        showToast("Link Copied", "success");
        onClose();
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this post by ${post.user.name}: https://fuymedia.org/post/${post.id}`,
                url: `https://fuymedia.org/post/${post.id}`, // iOS only
            });
        } catch (error) {
            console.error(error);
        }
        onClose();
    };

    const handleHide = async () => {
        if (!session?.user?.id) {
            showToast("You must be logged in to hide posts", "error");
            return;
        }
        try {
            const { error } = await supabase
                .from('HiddenPost')
                .insert({
                    id: Crypto.randomUUID(),
                    userId: session.user.id,
                    postId: post.id
                });
            if (error) throw error;
            showToast("Post Hidden", "success");
            if (onHide) onHide();
            onClose();
        } catch (e: any) {
            if (e.code === '23505') {
                showToast("Post already hidden", "info");
                if (onHide) onHide();
                onClose();
            } else {
                console.error("Hide Error:", e);
                showToast("Failed to hide post", "error");
            }
        }
    };

    const handleMute = async () => {
        if (!session?.user?.id) return;
        try {
            const { error } = await supabase
                .from('MutedUser')
                .insert({
                    id: Crypto.randomUUID(),
                    muterId: session.user.id,
                    mutedUserId: post.user.id,
                    mutedTypes: JSON.stringify(["ALL"]),
                    updatedAt: new Date().toISOString()
                });
            if (error) throw error;
            showToast(`Paused ${post.user.name}`, "success");
            if (onMute) onMute();
            onClose();
        } catch (e: any) {
            if (e.code === '23505') {
                showToast(`Already paused ${post.user.name}`, "info");
                if (onMute) onMute();
                onClose();
            } else {
                console.error("Pause Error:", e);
                showToast("Failed to pause user", "error");
            }
        }
    };

    const handleRestrict = async () => {
        if (!session?.user?.id) return;
        try {
            const { error } = await supabase
                .from('MutedUser')
                .insert({
                    id: Crypto.randomUUID(),
                    muterId: session.user.id,
                    mutedUserId: post.user.id,
                    mutedTypes: JSON.stringify(["ALL"]),
                    updatedAt: new Date().toISOString()
                });
            if (error && (error as any).code !== '23505') throw error;
            showToast(`${post.user.name} is now ghosted`, "success");
            if (onMute) onMute();
            onClose();
        } catch (e: any) {
            if (e.code === '23505') {
                // Even if already restricted (muted), show success message
                showToast(`${post.user.name} is now ghosted`, "success");
                if (onMute) onMute();
                onClose();
            } else {
                console.error("Ghost Error:", e);
                showToast("Failed to ghost user", "error");
            }
        }
    };

    const handleBlock = () => {
        if (!session?.user?.id) return;
        setConfirmTitle("Block User");
        setConfirmMessage(`Are you sure you want to block ${post.user.name}? You won't see their posts anymore.`);
        setConfirmDestructive(true);
        setConfirmButtonText("Block");
        setConfirmAction(() => async () => {
            try {
                const { error } = await supabase
                    .from('BlockedUser')
                    .insert({
                        id: Crypto.randomUUID(),
                        blockerId: session.user.id,
                        blockedId: post.user.id,
                        updatedAt: new Date().toISOString()
                    });
                if (error) throw error;
                showToast(`Blocked ${post.user.name}`, "success");
                if (onBlock) onBlock();
                onClose();
            } catch (e: any) {
                if (e.code === '23505') {
                    showToast(`Already blocked ${post.user.name}`, "info");
                    if (onBlock) onBlock();
                    onClose();
                } else {
                    console.error("Block Error:", e);
                    showToast("Failed to block user", "error");
                }
            }
            setConfirmVisible(false);
        });
        setConfirmVisible(true);
    };

    const handleDelete = () => {
        setView('delete_confirm');
    };

    const confirmDelete = async () => {
        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("Not authenticated");

            // Optimistic update - notify parent immediately
            if (onDelete) onDelete();

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            // Use dynamic API URL
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/posts/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ postId: post.id }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to delete post");
            }

            onClose();

        } catch (e: any) {
            console.error("API Delete Error:", e);
            if (e.name === 'AbortError') {
                showToast("Server timeout. Check connection.", "error");
            } else {
                showToast(`Failed to delete: ${e.message}`, "error");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const submitReport = async () => {
        if (!reportReason) {
            showToast("Please select a reason", "error");
            return;
        }
        if (!session?.user?.id) {
            showToast("You must be logged in", "error");
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('Report')
                .insert({
                    id: Crypto.randomUUID(),
                    reporterId: session.user.id,
                    postId: post.id,
                    reason: reportReason,
                    details: reportDetails,
                    status: 'PENDING',
                    updatedAt: new Date().toISOString()
                });

            if (error) throw error;
            showToast("Report submitted successfully", "success");
            if (onReport) onReport();
            onClose();
        } catch (error: any) {
            console.error("Report Error:", error);
            showToast("Failed to report post", "error");
            // Don't close so they can retry
        } finally {
            setSubmitting(false);
        }
    };

    const reportReasons = [
        "Spam",
        "Harassment & Bullying",
        "Hate Speech",
        "Nudity or Sexual Activity",
        "False Information",
        "Scam or Fraud",
        "Violence",
        "Other"
    ];

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={styles.overlay}
            >
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                {view === 'options' ? (
                    <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.handle} />
                        <Text style={[styles.title, { color: colors.text }]}>Options</Text>

                        <View style={styles.optionsGrid}>
                            <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleShare}>
                                <ShareIcon size={24} color={colors.text} />
                                <Text style={[styles.optionLabel, { color: colors.text }]}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleCopyLink}>
                                <Copy size={24} color={colors.text} />
                                <Text style={[styles.optionLabel, { color: colors.text }]}>Link</Text>
                            </TouchableOpacity>

                            {!isOwner && (
                                <>
                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleHide}>
                                        <EyeOff size={24} color={colors.text} />
                                        <Text style={[styles.optionLabel, { color: colors.text }]}>Hide</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleMute}>
                                        <PauseCircle size={24} color={colors.text} />
                                        <Text style={[styles.optionLabel, { color: colors.text }]}>Pause</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleRestrict}>
                                        <Ghost size={24} color={colors.text} />
                                        <Text style={[styles.optionLabel, { color: colors.text }]}>Ghost</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={() => setView('report')}>
                                        <Flag size={24} color="#ef4444" />
                                        <Text style={[styles.optionLabel, { color: '#ef4444' }]}>Report</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleBlock}>
                                        <Ban size={24} color="#ef4444" />
                                        <Text style={[styles.optionLabel, { color: '#ef4444' }]}>Block</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {isOwner && (
                                <>
                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={() => setSlashesModalVisible(true)}>
                                        <Slash size={24} color={colors.text} />
                                        <Text style={[styles.optionLabel, { color: colors.text }]}>Slashes</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: '#fee2e2' }]} onPress={handleDelete}>
                                        <Trash size={24} color="#ef4444" />
                                        <Text style={[styles.optionLabel, { color: '#ef4444' }]}>Delete</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        <TouchableOpacity onPress={onClose} style={[styles.cancelButton, { borderTopColor: colors.border }]}>
                            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : view === 'delete_confirm' ? (
                    <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.handle} />
                        <View style={{ width: '100%', alignItems: 'center', paddingVertical: 16 }}>
                            <View style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor: '#fee2e2',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16
                            }}>
                                <Trash size={32} color="#ef4444" />
                            </View>
                            <Text style={[styles.title, { color: colors.text, marginBottom: 8 }]}>Delete Post?</Text>
                            <Text style={{ color: colors.secondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 24 }}>
                                Are you sure you want to delete this post? This action cannot be undone.
                            </Text>

                            <View style={{ width: '100%', gap: 12 }}>
                                <TouchableOpacity
                                    onPress={confirmDelete}
                                    disabled={submitting}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        borderRadius: 16,
                                        paddingVertical: 16,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 8,
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? (
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Deleting...</Text>
                                    ) : (
                                        <>
                                            <Trash size={18} color="white" />
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Yes, Delete</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setView('options')}
                                    disabled={submitting}
                                    style={{
                                        backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a',
                                        borderRadius: 16,
                                        paddingVertical: 16,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, height: '80%' }]}>
                        <View style={styles.handle} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => setView('options')}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Report Post</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={{ width: '100%', flex: 1 }}>
                            <Text style={{ color: colors.secondary, marginBottom: 16, fontSize: 13 }}>
                                Select a reason for reporting this post. Your report is anonymous.
                            </Text>

                            {reportReasons.map(reason => (
                                <TouchableOpacity
                                    key={reason}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border
                                    }}
                                    onPress={() => setReportReason(reason)}
                                >
                                    <View style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        borderWidth: 2,
                                        borderColor: reportReason === reason ? colors.primary : colors.secondary,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        {reportReason === reason && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                                    </View>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>{reason}</Text>
                                </TouchableOpacity>
                            ))}

                            <View style={{ marginTop: 20 }}>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Additional Details (Optional)</Text>
                                <TextInput
                                    placeholder="Add any extra info..."
                                    placeholderTextColor={colors.secondary}
                                    style={{
                                        backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a',
                                        borderRadius: 12,
                                        padding: 12,
                                        color: colors.text,
                                        height: 80,
                                        textAlignVertical: 'top'
                                    }}
                                    multiline
                                    value={reportDetails}
                                    onChangeText={setReportDetails}
                                />
                            </View>
                        </View>

                        <View style={{ width: '100%', marginTop: 24, paddingBottom: 24 }}>
                            <TouchableOpacity
                                onPress={submitReport}
                                disabled={submitting || !reportReason}
                                style={{
                                    backgroundColor: '#ef4444',
                                    borderRadius: 12,
                                    paddingVertical: 16,
                                    alignItems: 'center',
                                    opacity: (submitting || !reportReason) ? 0.5 : 1
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                                    {submitting ? "Submitting..." : "Submit Report"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onClose}
                                style={{
                                    marginTop: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </TouchableOpacity>

            <ConfirmModal
                visible={confirmVisible}
                title={confirmTitle}
                message={confirmMessage}
                onConfirm={confirmAction}
                onCancel={() => setConfirmVisible(false)}
                confirmText={confirmButtonText}
                isDestructive={confirmDestructive}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        width: '100%',
        alignItems: 'center'
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#ccc',
        borderRadius: 2,
        marginBottom: 16
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 24
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
        width: '100%'
    },
    optionItem: {
        width: (width - 48 - 32) / 3, // 3 columns
        aspectRatio: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    optionLabel: {
        fontSize: 12,
        fontWeight: '500'
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 16,
        alignItems: 'center',
        borderTopWidth: 1
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600'
    }
});
