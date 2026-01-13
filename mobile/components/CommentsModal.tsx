import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, FlatList, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Send, User, Heart } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        profile?: { avatarUrl?: string; displayName?: string };
    };
    likes: number;
    isLiked: boolean;
}

interface CommentsModalProps {
    visible: boolean;
    onClose: () => void;
    postId: string | null;
}

export default function CommentsModal({ visible, onClose, postId }: CommentsModalProps) {
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = useCallback(async () => {
        if (!postId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('PostComment')
                .select(`
                    id,
                    content,
                    createdAt,
                    user:User (
                        id,
                        name,
                        profile:Profile (avatarUrl, displayName)
                    ),
                    likes:CommentReaction (id, userId)
                `)
                .eq('postId', postId)
                .order('createdAt', { ascending: false });

            if (error) throw error;

            const userId = session?.user?.id;
            const transformed = (data || []).map((c: any) => {
                const userObj = Array.isArray(c.user) ? c.user[0] : c.user;
                const profileObj = userObj?.profile && Array.isArray(userObj.profile) ? userObj.profile[0] : userObj?.profile;
                const likesArray = c.likes || [];
                return {
                    id: c.id,
                    content: c.content,
                    createdAt: c.createdAt,
                    user: { ...userObj, profile: profileObj },
                    likes: likesArray.length,
                    isLiked: userId ? likesArray.some((l: any) => l.userId === userId) : false,
                };
            });

            setComments(transformed);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    }, [postId, session?.user?.id]);

    useEffect(() => {
        if (visible && postId) {
            fetchComments();
        }
    }, [visible, postId, fetchComments]);

    const handleSubmit = async () => {
        if (!newComment.trim() || !postId || !session?.user?.id) return;
        setSubmitting(true);
        try {
            // Get internal user ID
            const { data: userData } = await supabase.from('User').select('id').eq('email', session.user.email).single();
            if (!userData?.id) throw new Error('User not found');

            const { error } = await supabase.from('PostComment').insert({
                postId,
                userId: userData.id,
                content: newComment.trim(),
            });

            if (error) throw error;
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Error posting comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLike = async (commentId: string, isLiked: boolean) => {
        if (!session?.user?.id) return;
        try {
            const { data: userData } = await supabase.from('User').select('id').eq('email', session.user.email).single();
            if (!userData?.id) return;

            if (isLiked) {
                await supabase.from('CommentReaction').delete().eq('commentId', commentId).eq('userId', userData.id);
            } else {
                await supabase.from('CommentReaction').insert({ commentId, userId: userData.id });
            }

            // Optimistic update
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, isLiked: !isLiked, likes: c.likes + (isLiked ? -1 : 1) } : c));
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    };

    const formatTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `${days}d`;
    };

    const renderComment = ({ item }: { item: Comment }) => {
        const avatar = item.user?.profile?.avatarUrl;
        const name = item.user?.profile?.displayName || item.user?.name || 'Anonymous';

        return (
            <View style={styles.commentItem}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <User size={16} color="rgba(255,255,255,0.5)" />
                    </View>
                )}
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={[styles.commentName, { color: colors.text }]}>{name}</Text>
                        <Text style={[styles.commentTime, { color: colors.secondary }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>{item.content}</Text>
                </View>
                <TouchableOpacity onPress={() => handleLike(item.id, item.isLiked)} style={styles.likeBtn}>
                    <Heart size={16} color={item.isLiked ? '#ef4444' : colors.secondary} fill={item.isLiked ? '#ef4444' : 'transparent'} />
                    {item.likes > 0 && <Text style={[styles.likeCount, { color: colors.secondary }]}>{item.likes}</Text>}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.overlay}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </TouchableOpacity>

                <View style={[styles.sheet, { backgroundColor: colors.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <View style={styles.headerRow}>
                            <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Comments List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={colors.text} />
                        </View>
                    ) : comments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.secondary }]}>No comments yet</Text>
                            <Text style={[styles.emptySubtext, { color: colors.secondary }]}>Be the first to comment</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={comments}
                            renderItem={renderComment}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}

                    {/* Input */}
                    <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
                        <TextInput
                            value={newComment}
                            onChangeText={setNewComment}
                            placeholder="Add a comment..."
                            placeholderTextColor={colors.secondary}
                            style={[styles.input, { color: colors.text, backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a' }]}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!newComment.trim() || submitting}
                            style={[styles.sendBtn, (!newComment.trim() || submitting) && { opacity: 0.5 }]}
                        >
                            {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { height: height * 0.65, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    header: { paddingHorizontal: 20, paddingTop: 12 },
    handle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '700' },
    closeBtn: { padding: 4 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 16, fontWeight: '600' },
    emptySubtext: { fontSize: 13, marginTop: 4 },
    listContent: { paddingHorizontal: 20, paddingBottom: 16 },
    commentItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    avatarPlaceholder: { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
    commentContent: { flex: 1 },
    commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    commentName: { fontSize: 13, fontWeight: '600', marginRight: 8 },
    commentTime: { fontSize: 11 },
    commentText: { fontSize: 14, lineHeight: 20 },
    likeBtn: { alignItems: 'center', justifyContent: 'center', paddingLeft: 12 },
    likeCount: { fontSize: 10, marginTop: 2 },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 12 },
    input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, fontSize: 15, maxHeight: 100 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
