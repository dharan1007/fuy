import { supabase, supabaseAdmin } from '../lib/supabase';

// Use admin client for writes (bypasses RLS), fallback to regular client
const getWriteClient = () => supabaseAdmin || supabase;

// Types
export interface Plan {
    id: string;
    title: string;
    description: string | null;
    type: 'SOLO' | 'COMMUNITY';
    location: string | null;
    locationLink: string | null;
    isLocationLocked: boolean;
    latitude: number | null;
    longitude: number | null;
    visibility: 'PRIVATE' | 'FOLLOWERS' | 'PUBLIC';
    date: string | null;
    maxSize: number | null;
    status: 'OPEN' | 'FULL' | 'COMPLETED' | 'CANCELLED';
    slashes: string | null;
    mediaUrls: string | null;
    creatorId: string;
    createdAt: string;
    creator?: {
        id: string;
        name: string;
        profile?: { avatarUrl: string | null; displayName: string | null };
    };
    members?: PlanMember[];
    _count?: { members: number };
    // Extended fields from joined queries
    myStatus?: string;
    myVerificationCode?: string | null;
    myIsVerified?: boolean;
}

export interface PlanMember {
    id: string;
    planId: string;
    userId: string;
    status: 'PENDING' | 'INVITED' | 'ACCEPTED' | 'REJECTED' | 'VERIFIED';
    verificationCode: string | null;
    isVerified: boolean;
    joinedAt: string;
    user?: {
        id: string;
        name: string;
        profile?: { avatarUrl: string | null; displayName: string | null };
    };
}

export interface CreatePlanData {
    title: string;
    description?: string;
    type: 'SOLO' | 'COMMUNITY';
    location?: string;
    locationLink?: string;
    isLocationLocked?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    visibility?: 'PRIVATE' | 'FOLLOWERS' | 'PUBLIC';
    date?: string;
    maxSize?: number;
    slashes?: string[];
    mediaUrls?: string[];
}

// Helper to get current user ID
async function getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
}

// Generate 7-digit verification code
function generateVerificationCode(): string {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

// Generate cuid-like ID (compatible with Prisma's cuid())
// Format: c + timestamp(8 chars) + random(16 chars) = 25 chars like cmkxxxxxx...
function generateCuid(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    return 'cmk' + timestamp.slice(-5) + randomPart.substring(0, 17);
}


export const HopinService = {
    // ==================== FETCH PLANS (READ - uses regular client) ====================

    async fetchPublicPlans(bounds?: {
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
    }): Promise<Plan[]> {
        try {
            let query = supabase
                .from('Plan')
                .select(`
                    *,
                    creator:User!creatorId(id, name, profile:Profile(avatarUrl, displayName)),
                    members:PlanMember(id, userId, status, user:User(id, name, profile:Profile(avatarUrl)))
                `)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(50);

            if (bounds) {
                query = query
                    .gte('latitude', bounds.minLat)
                    .lte('latitude', bounds.maxLat)
                    .gte('longitude', bounds.minLng)
                    .lte('longitude', bounds.maxLng);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[HopinService] fetchPublicPlans error:', error);
            return [];
        }
    },

    async fetchMyPlans(): Promise<{ created: Plan[]; joined: Plan[] }> {
        try {
            const userId = await getCurrentUserId();

            // Plans I created
            const { data: created, error: createdError } = await supabase
                .from('Plan')
                .select(`
                    *,
                    members:PlanMember(
                        id, userId, status, verificationCode, isVerified,
                        user:User(id, name, profile:Profile(avatarUrl, displayName))
                    )
                `)
                .eq('creatorId', userId)
                .order('createdAt', { ascending: false });

            if (createdError) throw createdError;

            // Plans I joined
            const { data: memberRecords, error: joinedError } = await supabase
                .from('PlanMember')
                .select(`
                    status, verificationCode, isVerified,
                    plan:Plan(
                        *,
                        creator:User!creatorId(id, name, profile:Profile(avatarUrl, displayName))
                    )
                `)
                .eq('userId', userId)
                .neq('status', 'REJECTED');

            if (joinedError) throw joinedError;

            const joined = (memberRecords || [])
                .map((m: any) => ({
                    ...m.plan,
                    myStatus: m.status,
                    myVerificationCode: m.verificationCode,
                    myIsVerified: m.isVerified
                }))
                .filter((p: any) => p && p.creatorId !== userId);

            return {
                created: created || [],
                joined: joined || []
            };
        } catch (error) {
            console.error('[HopinService] fetchMyPlans error:', error);
            return { created: [], joined: [] };
        }
    },

    async fetchPlanById(planId: string): Promise<Plan | null> {
        try {
            const { data, error } = await supabase
                .from('Plan')
                .select(`
                    *,
                    creator:User!creatorId(id, name, profile:Profile(avatarUrl, displayName)),
                    members:PlanMember(
                        id, userId, status, verificationCode, isVerified,
                        user:User(id, name, profile:Profile(avatarUrl, displayName))
                    )
                `)
                .eq('id', planId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[HopinService] fetchPlanById error:', error);
            return null;
        }
    },

    async searchPlans(query: string): Promise<Plan[]> {
        try {
            const { data, error } = await supabase
                .from('Plan')
                .select(`
                    *,
                    creator:User!creatorId(id, name, profile:Profile(avatarUrl))
                `)
                .eq('visibility', 'PUBLIC')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
                .order('createdAt', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[HopinService] searchPlans error:', error);
            return [];
        }
    },

    async fetchInvitations(): Promise<Plan[]> {
        try {
            const userId = await getCurrentUserId();

            const { data, error } = await supabase
                .from('PlanMember')
                .select(`
                    plan:Plan(
                        *,
                        creator:User!creatorId(id, name, profile:Profile(avatarUrl, displayName))
                    )
                `)
                .eq('userId', userId)
                .eq('status', 'INVITED');

            if (error) throw error;
            return (data || []).map((m: any) => m.plan).filter(Boolean);
        } catch (error) {
            console.error('[HopinService] fetchInvitations error:', error);
            return [];
        }
    },

    // ==================== CREATE / UPDATE / DELETE (WRITE - uses admin client) ====================

    async createPlan(data: CreatePlanData): Promise<{ success: boolean; plan?: Plan; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            const { data: plan, error } = await writeClient
                .from('Plan')
                .insert({
                    id: generateCuid(),
                    title: data.title,
                    description: data.description || null,
                    type: data.type,
                    location: data.location || null,
                    locationLink: data.locationLink || null,
                    isLocationLocked: data.isLocationLocked || false,
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                    visibility: data.visibility || 'PRIVATE',
                    date: data.date ? new Date(data.date).toISOString() : null,
                    maxSize: data.maxSize || null,
                    slashes: data.slashes ? JSON.stringify(data.slashes) : null,
                    mediaUrls: data.mediaUrls ? JSON.stringify(data.mediaUrls) : null,
                    creatorId: userId,
                    status: 'OPEN',
                    updatedAt: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Add creator as member with ACCEPTED status
            await writeClient.from('PlanMember').insert({
                id: generateCuid(),
                planId: plan.id,
                userId: userId,
                status: 'ACCEPTED',
                verificationCode: generateVerificationCode(),
                isVerified: true // Creator is auto-verified
            });

            return { success: true, plan };
        } catch (error: any) {
            console.error('[HopinService] createPlan error:', error);
            return { success: false, error: error.message };
        }
    },

    async updatePlan(planId: string, data: Partial<CreatePlanData>): Promise<{ success: boolean; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            // Verify ownership
            const { data: plan } = await supabase
                .from('Plan')
                .select('creatorId')
                .eq('id', planId)
                .single();

            if (!plan || plan.creatorId !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            const updateData: any = { ...data };
            if (data.slashes) updateData.slashes = JSON.stringify(data.slashes);
            if (data.mediaUrls) updateData.mediaUrls = JSON.stringify(data.mediaUrls);
            if (data.date) updateData.date = new Date(data.date).toISOString();

            const { error } = await writeClient
                .from('Plan')
                .update(updateData)
                .eq('id', planId);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('[HopinService] updatePlan error:', error);
            return { success: false, error: error.message };
        }
    },

    async deletePlan(planId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            // Verify ownership
            const { data: plan } = await supabase
                .from('Plan')
                .select('creatorId')
                .eq('id', planId)
                .single();

            if (!plan || plan.creatorId !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            // Delete members first (foreign key constraint)
            await writeClient.from('PlanMember').delete().eq('planId', planId);

            const { error } = await writeClient.from('Plan').delete().eq('id', planId);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('[HopinService] deletePlan error:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== JOIN / MANAGE REQUESTS (WRITE - uses admin client) ====================

    async requestToJoin(planId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            // Check if already a member
            const { data: existing } = await supabase
                .from('PlanMember')
                .select('id, status')
                .eq('planId', planId)
                .eq('userId', userId)
                .single();

            if (existing) {
                return { success: false, error: `Already ${existing.status.toLowerCase()}` };
            }

            const { error } = await writeClient.from('PlanMember').insert({
                id: generateCuid(),
                planId,
                userId,
                status: 'PENDING'
            });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('[HopinService] requestToJoin error:', error);
            return { success: false, error: error.message };
        }
    },

    async manageRequest(memberId: string, action: 'ACCEPT' | 'REJECT'): Promise<{ success: boolean; code?: string; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            // Get member and plan
            const { data: member } = await supabase
                .from('PlanMember')
                .select('*, plan:Plan(creatorId, title)')
                .eq('id', memberId)
                .single();

            if (!member || member.plan.creatorId !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            if (action === 'REJECT') {
                await writeClient
                    .from('PlanMember')
                    .update({ status: 'REJECTED' })
                    .eq('id', memberId);
                return { success: true };
            }

            // ACCEPT - Generate 7-digit code
            const code = generateVerificationCode();

            await writeClient
                .from('PlanMember')
                .update({ status: 'ACCEPTED', verificationCode: code })
                .eq('id', memberId);

            return { success: true, code };
        } catch (error: any) {
            console.error('[HopinService] manageRequest error:', error);
            return { success: false, error: error.message };
        }
    },

    async verifyAttendee(planId: string, code: string): Promise<{ success: boolean; user?: any; alreadyVerified?: boolean; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            // Verify ownership
            const { data: plan } = await supabase
                .from('Plan')
                .select('creatorId')
                .eq('id', planId)
                .single();

            if (!plan || plan.creatorId !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            // Find member with code
            const { data: member } = await supabase
                .from('PlanMember')
                .select('*, user:User(id, name, profile:Profile(avatarUrl, displayName))')
                .eq('planId', planId)
                .eq('verificationCode', code)
                .eq('status', 'ACCEPTED')
                .single();

            if (!member) {
                return { success: false, error: 'Invalid code' };
            }

            if (member.isVerified) {
                return { success: true, alreadyVerified: true, user: member.user };
            }

            await writeClient
                .from('PlanMember')
                .update({ isVerified: true })
                .eq('id', member.id);

            return { success: true, user: member.user };
        } catch (error: any) {
            console.error('[HopinService] verifyAttendee error:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== INVITES (WRITE - uses admin client) ====================

    async inviteUsers(planId: string, userIds: string[]): Promise<{ success: boolean; invitedCount?: number; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            // Verify ownership
            const { data: plan } = await supabase
                .from('Plan')
                .select('creatorId')
                .eq('id', planId)
                .single();

            if (!plan || plan.creatorId !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            // Get existing members
            const { data: existingMembers } = await supabase
                .from('PlanMember')
                .select('userId')
                .eq('planId', planId);

            const existingIds = new Set((existingMembers || []).map(m => m.userId));
            const newIds = userIds.filter(id => !existingIds.has(id));

            if (newIds.length === 0) {
                return { success: true, invitedCount: 0 };
            }

            const { error } = await writeClient.from('PlanMember').insert(
                newIds.map(uid => ({
                    id: generateCuid(),
                    planId,
                    userId: uid,
                    status: 'INVITED'
                }))
            );

            if (error) throw error;
            return { success: true, invitedCount: newIds.length };
        } catch (error: any) {
            console.error('[HopinService] inviteUsers error:', error);
            return { success: false, error: error.message };
        }
    },

    async respondToInvite(planId: string, accept: boolean): Promise<{ success: boolean; code?: string; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            if (!accept) {
                // Rejecting invite
                const { error } = await writeClient
                    .from('PlanMember')
                    .update({ status: 'REJECTED' })
                    .eq('planId', planId)
                    .eq('userId', userId)
                    .eq('status', 'INVITED');

                if (error) throw error;
                return { success: true };
            }

            // Accepting invite - generate code and set to ACCEPTED
            const code = generateVerificationCode();

            const { error } = await writeClient
                .from('PlanMember')
                .update({
                    status: 'ACCEPTED',
                    verificationCode: code
                })
                .eq('planId', planId)
                .eq('userId', userId)
                .eq('status', 'INVITED');

            if (error) throw error;
            return { success: true, code };
        } catch (error: any) {
            console.error('[HopinService] respondToInvite error:', error);
            return { success: false, error: error.message };
        }
    },

    async cancelRequest(planId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            const { error } = await writeClient
                .from('PlanMember')
                .delete()
                .eq('planId', planId)
                .eq('userId', userId)
                .in('status', ['PENDING', 'INVITED']);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('[HopinService] cancelRequest error:', error);
            return { success: false, error: error.message };
        }
    }
};

export default HopinService;
