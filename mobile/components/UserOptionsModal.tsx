
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Share, Dimensions, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { Copy, Flag, Ban, X, Share as ShareIcon, VolumeX, Ghost, PauseCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';

const { width } = Dimensions.get('window');

interface UserOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    user: {
        id: string;
        name: string;
        displayName?: string;
    } | null;
    onBlock?: () => void;
    onMute?: () => void;
}

export default function UserOptionsModal({ visible, onClose, user, onBlock, onMute }: UserOptionsModalProps) {
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const { showToast } = useToast();
    const [view, setView] = React.useState<'options' | 'report'>('options');
    const [reportReason, setReportReason] = React.useState<string | null>(null);
    const [reportDetails, setReportDetails] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    // Confirm Modal State
    const [confirmVisible, setConfirmVisible] = React.useState(false);
    const [confirmTitle, setConfirmTitle] = React.useState('');
    const [confirmMessage, setConfirmMessage] = React.useState('');
    const [confirmAction, setConfirmAction] = React.useState<() => void>(() => { });
    const [confirmDestructive, setConfirmDestructive] = React.useState(false);
    const [confirmButtonText, setConfirmButtonText] = React.useState('Confirm');

    React.useEffect(() => {
        if (visible) {
            setView('options');
            setReportReason(null);
            setReportDetails('');
            setSubmitting(false);
        }
    }, [visible]);

    if (!user) return null;

    const isSelf = session?.user?.id === user.id;
    const userName = user.displayName || user.name;

    const handleCopyLink = async () => {
        const link = `https://fuymedia.org/profile/${user.id}`;
        await Clipboard.setStringAsync(link);
        showToast("Profile Link Copied", "success");
        onClose();
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${userName} on Dvange: https://fuymedia.org/profile/${user.id}`,
                url: `https://fuymedia.org/profile/${user.id}`,
            });
        } catch (error) {
            console.error(error);
        }
        onClose();
    };

    const handleMute = async () => {
        if (!session?.user?.id) return;
        try {
            const { error } = await supabase
                .from('MutedUser')
                .insert({
                    id: Crypto.randomUUID(),
                    muterId: session.user.id,
                    mutedUserId: user.id,
                    mutedTypes: JSON.stringify(["ALL"]),
                    updatedAt: new Date().toISOString()
                });
            if (error) throw error;
            showToast(`Paused ${userName}`, "success");
            if (onMute) onMute();
            onClose();
        } catch (e: any) {
            if (e.code === '23505') {
                showToast(`Already paused ${userName}`, "info");
                onClose();
            } else {
                console.error("Pause Error:", e);
                showToast("Failed to pause user", "error");
            }
        }
    };

    const handleGhost = async () => {
        if (!session?.user?.id) return;
        try {
            // Reusing MutedUser with a specific flag or just treating it as restrict
            const { error } = await supabase
                .from('MutedUser')
                .insert({
                    id: Crypto.randomUUID(),
                    muterId: session.user.id,
                    mutedUserId: user.id,
                    mutedTypes: JSON.stringify(["RESTRICTED"]),
                    updatedAt: new Date().toISOString()
                });
            if (error && (error as any).code !== '23505') throw error;
            showToast(`${userName} is now ghosted`, "success");
            onClose();
        } catch (e: any) {
            console.error("Ghost Error:", e);
            showToast("Failed to ghost user", "error");
        }
    };

    const handleBlock = () => {
        if (!session?.user?.id) return;
        setConfirmTitle("Block User");
        setConfirmMessage(`Are you sure you want to block ${userName}? You won't see their posts or be able to interact with them.`);
        setConfirmDestructive(true);
        setConfirmButtonText("Block");
        setConfirmAction(() => async () => {
            try {
                const { error } = await supabase
                    .from('BlockedUser')
                    .insert({
                        id: Crypto.randomUUID(),
                        blockerId: session.user.id,
                        blockedId: user.id
                    });
                if (error) throw error;
                showToast(`Blocked ${userName}`, "success");
                if (onBlock) onBlock();
                onClose();
            } catch (e: any) {
                if (e.code === '23505') {
                    showToast(`Already blocked ${userName}`, "info");
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

    const submitReport = async () => {
        if (!reportReason) {
            showToast("Please select a reason", "error");
            return;
        }
        if (!session?.user?.id) return;
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('Report')
                .insert({
                    id: Crypto.randomUUID(),
                    reporterId: session.user.id,
                    reportedUserId: user.id,
                    reason: reportReason,
                    details: reportDetails,
                    target: 'USER',
                    status: 'PENDING',
                    updatedAt: new Date().toISOString()
                });

            if (error) throw error;
            showToast("User reported. We will review this account.", "success");
            onClose();
        } catch (error: any) {
            console.error("Report Error:", error);
            showToast("Failed to submit report", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const reportReasons = [
        "Spam",
        "Harassment & Bullying",
        "Hate Speech",
        "Impersonation",
        "Inappropriate Content",
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
                        <Text style={[styles.title, { color: colors.text }]}>Profile Options</Text>

                        <View style={styles.optionsGrid}>
                            <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleShare}>
                                <ShareIcon size={24} color={colors.text} />
                                <Text style={[styles.optionLabel, { color: colors.text }]}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleCopyLink}>
                                <Copy size={24} color={colors.text} />
                                <Text style={[styles.optionLabel, { color: colors.text }]}>Copy Link</Text>
                            </TouchableOpacity>

                            {!isSelf && (
                                <>
                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleMute}>
                                        <PauseCircle size={24} color={colors.text} />
                                        <Text style={[styles.optionLabel, { color: colors.text }]}>Pause</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.optionItem, { backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]} onPress={handleGhost}>
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
                        </View>

                        <TouchableOpacity onPress={onClose} style={[styles.cancelButton, { borderTopColor: colors.border }]}>
                            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, height: '70%' }]}>
                        <View style={styles.handle} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => setView('options')}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Report User</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={{ width: '100%', flex: 1 }}>
                            <Text style={{ color: colors.secondary, marginBottom: 16, fontSize: 13 }}>
                                Help us understand what's happening. Your report is anonymous.
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
                                <TextInput
                                    placeholder="Additional details..."
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
        justifyContent: 'space-between',
        marginBottom: 24,
        width: '100%',
        gap: 12
    },
    optionItem: {
        width: (width - 48 - 24) / 3,
        aspectRatio: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    optionLabel: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center'
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
