import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput
} from 'react-native';
import { Heart, MessageCircle, Share2, MapPin, Timer, Activity } from 'lucide-react-native';
import { ActivityRecord, ActivityService, ActivityComment as CommentType } from '../../services/ActivityService';
import ActivityTrackingService from '../../services/ActivityTrackingService';
import ActivityMapView from './ActivityMapView';

interface ActivityFeedCardProps {
    activity: ActivityRecord;
    currentUserId: string;
    onTap: () => void;
    onLike: () => void;
    isDark?: boolean;
}

export function ActivityFeedCard({ activity, currentUserId, onTap, onLike, isDark = true }: ActivityFeedCardProps) {
    const colors = isDark ? {
        surface: '#161616',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accentSubtle: '#2A2A2A',
        like: '#EF4444',
    } : {
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accentSubtle: '#F0F0F0',
        like: '#EF4444',
    };

    const distKm = (activity.distance / 1000).toFixed(2);
    const duration = ActivityTrackingService.formatDuration(activity.duration);
    const displayName = activity.user?.profile?.displayName || activity.user?.name || 'User';
    const avatarChar = displayName.charAt(0).toUpperCase();

    const dateStr = new Date(activity.startTime).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
    });

    // Tagged users text
    const taggedText = activity.taggedUsers && activity.taggedUsers.length > 0
        ? ` with ${activity.taggedUsers.map(t => t.user?.name || 'someone').join(', ')}`
        : '';

    return (
        <TouchableOpacity
            onPress={onTap}
            style={[styles.feedCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
        >
            {/* User row */}
            <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: colors.accentSubtle }]}>
                    <Text style={[styles.avatarText, { color: colors.text }]}>{avatarChar}</Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                        {displayName}
                        <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>{taggedText}</Text>
                    </Text>
                    <Text style={[styles.userMeta, { color: colors.textTertiary }]}>
                        {ActivityTrackingService.getActivityLabel(activity.activityType as any)} -- {dateStr}
                    </Text>
                </View>
            </View>

            {/* Description */}
            {activity.description && (
                <Text style={[styles.description, { color: colors.text }]}>{activity.description}</Text>
            )}

            {/* Metrics Row */}
            <View style={[styles.metricsBar, { backgroundColor: colors.accentSubtle }]}>
                <View style={styles.metricItem}>
                    <MapPin size={12} color={colors.textTertiary} />
                    <Text style={[styles.metricText, { color: colors.text }]}>{distKm} km</Text>
                </View>
                <View style={styles.metricItem}>
                    <Timer size={12} color={colors.textTertiary} />
                    <Text style={[styles.metricText, { color: colors.text }]}>{duration}</Text>
                </View>
                <View style={styles.metricItem}>
                    <Activity size={12} color={colors.textTertiary} />
                    <Text style={[styles.metricText, { color: colors.text }]}>{activity.calories} cal</Text>
                </View>
            </View>

            {/* Map preview if points exist */}
            {activity.points && activity.points.length >= 2 && (
                <ActivityMapView
                    points={activity.points}
                    showUserLocation={false}
                    isDark={isDark}
                    style={styles.mapPreview}
                />
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity onPress={onLike} style={styles.actionBtn}>
                    <Heart
                        size={18}
                        color={activity.isLiked ? colors.like : colors.textTertiary}
                        fill={activity.isLiked ? colors.like : 'none'}
                    />
                    {(activity.likeCount || 0) > 0 && (
                        <Text style={[styles.actionCount, { color: colors.textSecondary }]}>{activity.likeCount}</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={onTap} style={styles.actionBtn}>
                    <MessageCircle size={18} color={colors.textTertiary} />
                    {(activity.commentCount || 0) > 0 && (
                        <Text style={[styles.actionCount, { color: colors.textSecondary }]}>{activity.commentCount}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

// --- Comment Section ---
interface CommentSectionProps {
    activityId: string;
    currentUserId: string;
    isDark?: boolean;
}

export function CommentSection({ activityId, currentUserId, isDark = true }: CommentSectionProps) {
    const colors = isDark ? {
        surface: '#161616',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accentSubtle: '#2A2A2A',
    } : {
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accentSubtle: '#F0F0F0',
    };

    const [comments, setComments] = useState<CommentType[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        loadComments();
    }, [activityId]);

    const loadComments = async () => {
        const data = await ActivityService.getComments(activityId);
        setComments(data);
    };

    const handleSend = async () => {
        if (!newComment.trim()) return;
        setLoading(true);
        const comment = await ActivityService.addComment(activityId, currentUserId, newComment.trim());
        if (comment) {
            setComments(prev => [...prev, comment]);
            setNewComment('');
        }
        setLoading(false);
    };

    return (
        <View style={styles.commentSection}>
            {comments.map(c => {
                const name = c.user?.profile?.displayName || c.user?.name || 'User';
                return (
                    <View key={c.id} style={styles.commentRow}>
                        <View style={[styles.commentAvatar, { backgroundColor: colors.accentSubtle }]}>
                            <Text style={[styles.commentAvatarText, { color: colors.text }]}>{name.charAt(0)}</Text>
                        </View>
                        <View style={styles.commentBody}>
                            <Text style={[styles.commentName, { color: colors.text }]}>{name}</Text>
                            <Text style={[styles.commentText, { color: colors.textSecondary }]}>{c.content}</Text>
                        </View>
                    </View>
                );
            })}

            <View style={[styles.commentInput, { backgroundColor: colors.accentSubtle }]}>
                <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.commentInputField, { color: colors.text }]}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    editable={!loading}
                />
                <TouchableOpacity onPress={handleSend} disabled={loading || !newComment.trim()}>
                    <Text style={[styles.sendBtn, { color: newComment.trim() ? colors.text : colors.textTertiary }]}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Feed Card
    feedCard: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
    },
    userMeta: {
        fontSize: 11,
        marginTop: 1,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
    },
    metricsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metricText: {
        fontSize: 12,
        fontWeight: '600',
    },
    mapPreview: {
        height: 120,
        borderRadius: 14,
        marginBottom: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 4,
    },
    actionCount: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Comments
    commentSection: {
        gap: 12,
        paddingTop: 8,
    },
    commentRow: {
        flexDirection: 'row',
        gap: 10,
    },
    commentAvatar: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentAvatarText: {
        fontSize: 11,
        fontWeight: '600',
    },
    commentBody: {
        flex: 1,
    },
    commentName: {
        fontSize: 12,
        fontWeight: '600',
    },
    commentText: {
        fontSize: 12,
        marginTop: 2,
    },
    commentInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
    },
    commentInputField: {
        flex: 1,
        fontSize: 13,
        padding: 0,
    },
    sendBtn: {
        fontSize: 13,
        fontWeight: '600',
    },
});
