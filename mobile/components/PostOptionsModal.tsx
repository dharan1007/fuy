import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Share, Dimensions, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { Copy, Flag, Ban, Trash, X, Share as ShareIcon, EyeOff, VolumeX, Ghost, PauseCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface PostOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    post: {
        id: string;
        user: { id: string; name: string };
        content?: string;
        postType?: string;
    } | null;
    onReport?: () => void;
    onDelete?: () => void;
    onBlock?: () => void;
}

export default function PostOptionsModal({ visible, onClose, post, onReport, onDelete, onBlock, onHide, onMute }: PostOptionsModalProps & { onHide?: () => void, onMute?: () => void }) {
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const [view, setView] = React.useState<'options' | 'report'>('options');
    const [reportReason, setReportReason] = React.useState<string | null>(null);
    const [reportDetails, setReportDetails] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    // Reset state when opening
    React.useEffect(() => {
        if (visible) {
            setView('options');
            setReportReason(null);
            setReportDetails('');
            setSubmitting(false);
        }
    }, [visible]);

    if (!post) return null;

    const isOwner = session?.user?.id === post.user.id;

    const handleCopyLink = async () => {
        const link = `https://fuymedia.org/post/${post.id}`;
        await Clipboard.setStringAsync(link);
        Alert.alert("Link Copied", "Post link copied to clipboard");
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
            Alert.alert("Error", "You must be logged in to hide posts.");
            return;
        }
        try {
            const { error } = await supabase
                .from('HiddenPost')
                .insert({
                    userId: session.user.id,
                    postId: post.id
                });
            if (error) throw error;
            Alert.alert("Post Hidden", "You won't see this post again.");
            if (onHide) onHide();
            onClose();
        } catch (e: any) {
            if (e.code === '23505') {
                Alert.alert("Already Hidden", "You have already hidden this post.");
                if (onHide) onHide();
                onClose();
            } else {
                console.error("Hide Error:", e);
                Alert.alert("Error", `Failed to hide post: ${e.message || 'Unknown error'}`);
            }
        }
    };

    const handleMute = async () => {
        if (!session?.user?.id) return;
        try {
            const { error } = await supabase
                .from('MutedUser')
                .insert({
                    muterId: session.user.id,
                    mutedUserId: post.user.id,
                    mutedTypes: JSON.stringify(["ALL"])
                });
            if (error) throw error;
            if (error) throw error;
            Alert.alert("Paused", `You have paused ${post.user.name}. You won't see their posts in your feed.`);
            if (onMute) onMute();
            onClose();
        } catch (e: any) {
            if (e.code === '23505') {
                Alert.alert("Paused", `You have already paused ${post.user.name}.`);
                if (onMute) onMute();
                onClose();
            } else {
                console.error("Pause Error:", e);
                Alert.alert("Error", `Failed to pause user: ${e.message || 'Unknown error'}`);
            }
        }
    };

    const handleRestrict = async () => {
        if (!session?.user?.id) return;
        try {
            const { error } = await supabase
                .from('MutedUser')
                .insert({
                    muterId: session.user.id,
                    mutedUserId: post.user.id,
                    mutedTypes: JSON.stringify(["ALL"])
                });
            if (error && (error as any).code !== '23505') throw error;
            Alert.alert("Ghosted", `${post.user.name} is now ghosted.`);
            if (onMute) onMute();
            onClose();
        } catch (e: any) {
            if (e.code === '23505') {
                // Even if already restricted (muted), show success message
                Alert.alert("Ghosted", `${post.user.name} is now ghosted.`);
                if (onMute) onMute();
                onClose();
            } else {
                console.error("Ghost Error:", e);
                Alert.alert("Error", `Failed to ghost user: ${e.message}`);
            }
        }
    };

    const handleBlock = () => {
        if (!session?.user?.id) return;
        Alert.alert(
            "Block User",
            `Are you sure you want to block ${post.user.name}? You won't see their posts anymore.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('BlockedUser')
                                .insert({
                                    blockerId: session.user.id,
                                    blockedId: post.user.id
                                });
                            if (error) throw error;
                            Alert.alert("Blocked", `You have blocked ${post.user.name}.`);
                            if (onBlock) onBlock();
                            onClose();
                        } catch (e: any) {
                            if (e.code === '23505') {
                                Alert.alert("Blocked", `You have already blocked ${post.user.name}.`);
                                if (onBlock) onBlock();
                                onClose();
                            } else {
                                console.error("Block Error:", e);
                                Alert.alert("Error", `Failed to block user: ${e.message}`);
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('Post').delete().eq('id', post.id);
                            if (error) throw error;
                            Alert.alert("Deleted", "Post has been deleted.");
                            if (onDelete) onDelete();
                            onClose();
                        } catch (e: any) {
                            Alert.alert("Error", `Failed to delete: ${e.message}`);
                        }
                    }
                }
            ]
        );
    };

    const submitReport = async () => {
        if (!reportReason) {
            Alert.alert("Required", "Please select a reason.");
            return;
        }
        if (!session?.user?.id) {
            Alert.alert("Error", "You must be logged in.");
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('Report')
                .insert({
                    reporterId: session.user.id,
                    postId: post.id,
                    reason: reportReason,
                    details: reportDetails,
                    status: 'PENDING'
                });

            if (error) throw error;
            Alert.alert("Reported", "Thank you. We will review this report.");
            if (onReport) onReport();
            onClose();
        } catch (error: any) {
            console.error("Report Error:", error);
            Alert.alert("Error", `Failed to report post: ${error.message || 'Unknown error'}`);
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
                                <TouchableOpacity style={[styles.optionItem, { backgroundColor: '#fee2e2' }]} onPress={handleDelete}>
                                    <Trash size={24} color="#ef4444" />
                                    <Text style={[styles.optionLabel, { color: '#ef4444' }]}>Delete</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity onPress={onClose} style={[styles.cancelButton, { borderTopColor: colors.border }]}>
                            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
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
