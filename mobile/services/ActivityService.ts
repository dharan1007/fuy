/**
 * ActivityService - Production Supabase CRUD for Activity Tracking
 *
 * Handles: saving activities, fetching history/feed, likes, comments,
 * friend tagging, group activities, and GPS point storage.
 */

import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { ActivitySession, GPSPoint, ActivityType } from './ActivityTrackingService';

// --- Types ---

export interface ActivityRecord {
    id: string;
    userId: string;
    activityType: string;
    distance: number;
    duration: number;
    calories: number;
    avgPace: number;
    avgSpeed?: number;
    elevationGain: number;
    startTime: string;
    endTime: string | null;
    privacyLevel: string;
    routeData: any;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    // Joined data
    user?: {
        id: string;
        name: string;
        profile?: { displayName: string; avatarUrl: string | null };
    };
    likeCount?: number;
    commentCount?: number;
    isLiked?: boolean;
    taggedUsers?: { userId: string; user?: any }[];
    points?: GPSPoint[];
}

export interface ActivityComment {
    id: string;
    activityId: string;
    userId: string;
    content: string;
    createdAt: string;
    user?: {
        name: string;
        profile?: { displayName: string; avatarUrl: string | null };
    };
}

export interface GroupActivityRecord {
    id: string;
    creatorId: string;
    name: string;
    activityType: string;
    inviteCode: string;
    status: string;
    createdAt: string;
    participants?: {
        userId: string;
        activityId: string | null;
        user?: any;
        activity?: ActivityRecord | null;
    }[];
}

// --- Service ---

export class ActivityService {

    // ================================================================
    // SAVE ACTIVITY (from tracking session)
    // ================================================================

    static async saveActivity(
        session: ActivitySession,
        description?: string
    ): Promise<string> {
        const activityId = Crypto.randomUUID();
        const now = new Date().toISOString();

        // 1. Insert activity record
        const { error: actError } = await supabase
            .from('Activity')
            .insert({
                id: activityId,
                userId: session.userId,
                activityType: session.activityType,
                distance: session.distance,
                duration: session.duration,
                calories: session.calories,
                avgPace: session.avgPace,
                elevationGain: session.elevationGain,
                startTime: new Date(session.startTime).toISOString(),
                endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
                privacyLevel: session.privacyLevel,
                routeData: null, // Points stored separately
                description: description || null,
                createdAt: now,
                updatedAt: now,
            });

        if (actError) {
            console.error('[ActivityService] Failed to save activity:', actError.message);
            throw actError;
        }

        // 2. Batch insert GPS points (chunked to avoid payload limits)
        if (session.points.length > 0) {
            await this.savePoints(activityId, session.points);
        }

        // 3. Tag users if any
        if (session.taggedUsers.length > 0) {
            await this.tagUsers(activityId, session.taggedUsers);
        }

        console.log('[ActivityService] Activity saved:', activityId);
        return activityId;
    }

    // Save GPS points in chunks of 500
    private static async savePoints(activityId: string, points: GPSPoint[]) {
        const CHUNK_SIZE = 500;

        for (let i = 0; i < points.length; i += CHUNK_SIZE) {
            const chunk = points.slice(i, i + CHUNK_SIZE).map((p, idx) => ({
                id: Crypto.randomUUID(),
                activityId,
                latitude: p.latitude,
                longitude: p.longitude,
                altitude: p.altitude,
                speed: p.speed,
                timestamp: p.timestamp,
                orderIndex: i + idx,
            }));

            const { error } = await supabase.from('ActivityPoint').insert(chunk);
            if (error) {
                console.error(`[ActivityService] Failed to save points chunk ${i}:`, error.message);
                // Continue with other chunks even if one fails
            }
        }
    }

    // ================================================================
    // FETCH ACTIVITIES
    // ================================================================

    // Get user's own activity history
    static async getUserActivities(
        userId: string,
        page: number = 0,
        limit: number = 20
    ): Promise<ActivityRecord[]> {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('Activity')
            .select(`
                *,
                user:User(id, name, profile:Profile(displayName, avatarUrl)),
                likeCount:ActivityLike(count),
                commentCount:ActivityComment(count),
                taggedUsers:ActivityTag(userId, user:User(id, name, profile:Profile(displayName, avatarUrl)))
            `)
            .eq('userId', userId)
            .order('createdAt', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('[ActivityService] Failed to fetch activities:', error.message);
            return [];
        }

        return (data || []).map(this.transformActivity);
    }

    // Get public activity feed (all users)
    static async getActivityFeed(
        page: number = 0,
        limit: number = 20,
        currentUserId?: string
    ): Promise<ActivityRecord[]> {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('Activity')
            .select(`
                *,
                user:User(id, name, profile:Profile(displayName, avatarUrl)),
                likeCount:ActivityLike(count),
                commentCount:ActivityComment(count),
                taggedUsers:ActivityTag(userId, user:User(id, name, profile:Profile(displayName, avatarUrl)))
            `)
            .eq('privacyLevel', 'public')
            .order('createdAt', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('[ActivityService] Failed to fetch feed:', error.message);
            return [];
        }

        return (data || []).map(this.transformActivity);
    }

    // Get single activity with full details including GPS points
    static async getActivityById(activityId: string): Promise<ActivityRecord | null> {
        const { data, error } = await supabase
            .from('Activity')
            .select(`
                *,
                user:User(id, name, profile:Profile(displayName, avatarUrl)),
                likeCount:ActivityLike(count),
                commentCount:ActivityComment(count),
                taggedUsers:ActivityTag(userId, user:User(id, name, profile:Profile(displayName, avatarUrl)))
            `)
            .eq('id', activityId)
            .single();

        if (error || !data) return null;

        const activity = this.transformActivity(data);

        // Fetch GPS points
        const { data: points } = await supabase
            .from('ActivityPoint')
            .select('latitude, longitude, altitude, speed, timestamp')
            .eq('activityId', activityId)
            .order('orderIndex', { ascending: true });

        if (points) {
            activity.points = points.map(p => ({
                latitude: p.latitude,
                longitude: p.longitude,
                altitude: p.altitude,
                speed: p.speed,
                timestamp: p.timestamp,
            }));
        }

        return activity;
    }

    private static transformActivity(raw: any): ActivityRecord {
        return {
            id: raw.id,
            userId: raw.userId,
            activityType: raw.activityType,
            distance: raw.distance,
            duration: raw.duration,
            calories: raw.calories,
            avgPace: raw.avgPace,
            elevationGain: raw.elevationGain,
            startTime: raw.startTime,
            endTime: raw.endTime,
            privacyLevel: raw.privacyLevel,
            routeData: raw.routeData,
            description: raw.description,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            user: raw.user ? {
                id: raw.user.id,
                name: raw.user.name,
                profile: raw.user.profile,
            } : undefined,
            likeCount: Array.isArray(raw.likeCount) ? raw.likeCount.length : 0,
            commentCount: Array.isArray(raw.commentCount) ? raw.commentCount.length : 0,
            taggedUsers: raw.taggedUsers || [],
        };
    }

    // ================================================================
    // DELETE
    // ================================================================

    static async deleteActivity(activityId: string): Promise<boolean> {
        // Points, tags, likes, comments cascade delete via FK
        const { error } = await supabase
            .from('Activity')
            .delete()
            .eq('id', activityId);

        if (error) {
            console.error('[ActivityService] Delete failed:', error.message);
            return false;
        }
        return true;
    }

    // ================================================================
    // LIKES
    // ================================================================

    static async toggleLike(activityId: string, userId: string): Promise<boolean> {
        // Check if already liked
        const { data: existing } = await supabase
            .from('ActivityLike')
            .select('id')
            .eq('activityId', activityId)
            .eq('userId', userId)
            .maybeSingle();

        if (existing) {
            // Unlike
            await supabase.from('ActivityLike').delete().eq('id', existing.id);
            return false;
        } else {
            // Like
            await supabase.from('ActivityLike').insert({
                id: Crypto.randomUUID(),
                activityId,
                userId,
                createdAt: new Date().toISOString(),
            });
            return true;
        }
    }

    // ================================================================
    // COMMENTS
    // ================================================================

    static async getComments(activityId: string): Promise<ActivityComment[]> {
        const { data, error } = await supabase
            .from('ActivityComment')
            .select(`
                *,
                user:User(name, profile:Profile(displayName, avatarUrl))
            `)
            .eq('activityId', activityId)
            .order('createdAt', { ascending: true });

        if (error) return [];
        return (data || []).map(c => ({
            id: c.id,
            activityId: c.activityId,
            userId: c.userId,
            content: c.content,
            createdAt: c.createdAt,
            user: c.user ? {
                name: c.user.name,
                profile: c.user.profile,
            } : undefined,
        }));
    }

    static async addComment(
        activityId: string,
        userId: string,
        content: string
    ): Promise<ActivityComment | null> {
        const { data, error } = await supabase
            .from('ActivityComment')
            .insert({
                id: Crypto.randomUUID(),
                activityId,
                userId,
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .select(`
                *,
                user:User(name, profile:Profile(displayName, avatarUrl))
            `)
            .single();

        if (error || !data) return null;
        return {
            id: data.id,
            activityId: data.activityId,
            userId: data.userId,
            content: data.content,
            createdAt: data.createdAt,
            user: data.user ? {
                name: data.user.name,
                profile: data.user.profile,
            } : undefined,
        };
    }

    static async deleteComment(commentId: string): Promise<boolean> {
        const { error } = await supabase
            .from('ActivityComment')
            .delete()
            .eq('id', commentId);
        return !error;
    }

    // ================================================================
    // TAGGING
    // ================================================================

    static async tagUsers(activityId: string, userIds: string[]) {
        if (!userIds.length) return;

        const tags = userIds.map(userId => ({
            activityId,
            userId,
            createdAt: new Date().toISOString(),
        }));

        const { error } = await supabase.from('ActivityTag').insert(tags);
        if (error) {
            console.error('[ActivityService] Tag failed:', error.message);
        }
    }

    static async removeTag(activityId: string, userId: string) {
        await supabase
            .from('ActivityTag')
            .delete()
            .eq('activityId', activityId)
            .eq('userId', userId);
    }

    // ================================================================
    // GROUP ACTIVITIES
    // ================================================================

    static async createGroupActivity(
        creatorId: string,
        name: string,
        activityType: ActivityType
    ): Promise<GroupActivityRecord | null> {
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data, error } = await supabase
            .from('GroupActivity')
            .insert({
                id: Crypto.randomUUID(),
                creatorId,
                name,
                activityType,
                inviteCode,
                status: 'active',
                createdAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (error || !data) return null;

        // Creator auto-joins
        await supabase.from('GroupActivityParticipant').insert({
            groupActivityId: data.id,
            userId: creatorId,
            joinedAt: new Date().toISOString(),
        });

        return data as GroupActivityRecord;
    }

    static async joinGroupActivity(
        inviteCode: string,
        userId: string
    ): Promise<GroupActivityRecord | null> {
        const { data: group } = await supabase
            .from('GroupActivity')
            .select('*')
            .eq('inviteCode', inviteCode)
            .eq('status', 'active')
            .single();

        if (!group) return null;

        await supabase.from('GroupActivityParticipant').insert({
            groupActivityId: group.id,
            userId,
            joinedAt: new Date().toISOString(),
        });

        return group as GroupActivityRecord;
    }

    static async getGroupActivity(groupId: string): Promise<GroupActivityRecord | null> {
        const { data, error } = await supabase
            .from('GroupActivity')
            .select(`
                *,
                participants:GroupActivityParticipant(
                    userId,
                    activityId,
                    user:User(id, name, profile:Profile(displayName, avatarUrl)),
                    activity:Activity(id, distance, duration, calories)
                )
            `)
            .eq('id', groupId)
            .single();

        if (error || !data) return null;
        return data as GroupActivityRecord;
    }

    static async linkActivityToGroup(
        groupActivityId: string,
        userId: string,
        activityId: string
    ) {
        await supabase
            .from('GroupActivityParticipant')
            .update({ activityId })
            .eq('groupActivityId', groupActivityId)
            .eq('userId', userId);
    }

    static async getMyGroups(userId: string): Promise<GroupActivityRecord[]> {
        const { data, error } = await supabase
            .from('GroupActivityParticipant')
            .select(`
                groupActivity:GroupActivity(
                    *,
                    participants:GroupActivityParticipant(
                        userId,
                        user:User(id, name, profile:Profile(displayName, avatarUrl))
                    )
                )
            `)
            .eq('userId', userId);

        if (error || !data) return [];
        return data
            .map((d: any) => d.groupActivity)
            .filter(Boolean) as GroupActivityRecord[];
    }

    // ================================================================
    // SEARCH USERS (for tagging)
    // ================================================================

    static async searchUsers(query: string, limit: number = 10) {
        const { data, error } = await supabase
            .from('User')
            .select('id, name, profile:Profile(displayName, avatarUrl)')
            .or(`name.ilike.%${query}%`)
            .limit(limit);

        if (error) return [];
        return data || [];
    }
}
