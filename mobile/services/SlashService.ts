// services/SlashService.ts
// ============================================================
// MIGRATION SQL — Consolidate all from Parts 1A–1F
// ============================================================
/*
-- 1A: Slashes table
CREATE TABLE "Slash" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  "slashCode" CHAR(7) NOT NULL UNIQUE,
  "creatorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "accessMode" TEXT NOT NULL DEFAULT 'open' CHECK ("accessMode" IN ('open', 'locked')),
  description TEXT,
  "lillCount" INT DEFAULT 0,
  "contributorCount" INT DEFAULT 0,
  "clusterTheta" FLOAT,
  "clusterPhi" FLOAT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_slash_name ON "Slash"(name);
CREATE UNIQUE INDEX idx_slash_code ON "Slash"("slashCode");
CREATE INDEX idx_slash_creator ON "Slash"("creatorId");
CREATE INDEX idx_slashes_sphere ON "Slash"("lillCount" DESC);

-- RLS: Slash
ALTER TABLE "Slash" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slash_select" ON "Slash" FOR SELECT TO authenticated USING (true);
CREATE POLICY "slash_insert" ON "Slash" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "creatorId");
CREATE POLICY "slash_update" ON "Slash" FOR UPDATE TO authenticated USING (auth.uid() = "creatorId");
CREATE POLICY "slash_delete" ON "Slash" FOR DELETE TO authenticated USING (auth.uid() = "creatorId");

-- 1B: SlashPost junction table
CREATE TABLE "SlashPost" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slashId" UUID NOT NULL REFERENCES "Slash"(id) ON DELETE CASCADE,
  "postId" UUID NOT NULL REFERENCES "Post"(id) ON DELETE CASCADE,
  "contributorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "addedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("slashId", "postId")
);
CREATE INDEX idx_slash_posts_slash ON "SlashPost"("slashId");
CREATE INDEX idx_slash_posts_post ON "SlashPost"("postId");
CREATE INDEX idx_slash_posts_contributor ON "SlashPost"("contributorId");

-- RLS: SlashPost
ALTER TABLE "SlashPost" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slashpost_select" ON "SlashPost" FOR SELECT TO authenticated USING (true);
CREATE POLICY "slashpost_insert" ON "SlashPost" FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = "contributorId" AND (
    EXISTS (SELECT 1 FROM "Slash" WHERE id = "slashId" AND "accessMode" = 'open')
    OR EXISTS (SELECT 1 FROM "SlashContributor" WHERE "slashId" = "SlashPost"."slashId" AND "contributorId" = auth.uid())
  )
);
CREATE POLICY "slashpost_delete" ON "SlashPost" FOR DELETE TO authenticated USING (
  auth.uid() = "contributorId"
  OR EXISTS (SELECT 1 FROM "Slash" WHERE id = "slashId" AND "creatorId" = auth.uid())
);

-- 1C: SlashContributor table
CREATE TABLE "SlashContributor" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slashId" UUID NOT NULL REFERENCES "Slash"(id) ON DELETE CASCADE,
  "contributorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "approvedBy" UUID REFERENCES "User"(id),
  "approvedAt" TIMESTAMPTZ,
  UNIQUE("slashId", "contributorId")
);
CREATE INDEX idx_slash_contributors_slash ON "SlashContributor"("slashId");
CREATE INDEX idx_slash_contributors_user ON "SlashContributor"("contributorId");

-- RLS: SlashContributor
ALTER TABLE "SlashContributor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slashcontrib_select" ON "SlashContributor" FOR SELECT TO authenticated USING (true);
CREATE POLICY "slashcontrib_insert" ON "SlashContributor" FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM "Slash" WHERE id = "slashId" AND "creatorId" = auth.uid())
);
CREATE POLICY "slashcontrib_delete" ON "SlashContributor" FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM "Slash" WHERE id = "slashId" AND "creatorId" = auth.uid())
);

-- 1D: SlashAccessRequest table
CREATE TABLE "SlashAccessRequest" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slashId" UUID NOT NULL REFERENCES "Slash"(id) ON DELETE CASCADE,
  "requesterId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "curatorId" UUID NOT NULL REFERENCES "User"(id),
  "attachedPostId" UUID REFERENCES "Post"(id) ON DELETE SET NULL,
  "requesterNote" TEXT,
  "curatorNote" TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "resolvedAt" TIMESTAMPTZ,
  UNIQUE("slashId", "requesterId")
);
CREATE INDEX idx_sar_slash ON "SlashAccessRequest"("slashId");
CREATE INDEX idx_sar_requester ON "SlashAccessRequest"("requesterId");
CREATE INDEX idx_sar_curator ON "SlashAccessRequest"("curatorId");
CREATE INDEX idx_sar_status ON "SlashAccessRequest"(status);

-- RLS: SlashAccessRequest
ALTER TABLE "SlashAccessRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sar_select_requester" ON "SlashAccessRequest" FOR SELECT TO authenticated USING (auth.uid() = "requesterId" OR auth.uid() = "curatorId");
CREATE POLICY "sar_insert" ON "SlashAccessRequest" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "requesterId");

-- 1E: Alter Lill table
ALTER TABLE "Lill" ADD COLUMN "mainSlashId" UUID REFERENCES "Slash"(id) ON DELETE SET NULL;
ALTER TABLE "Lill" ADD COLUMN "bloomSlashes" UUID[] DEFAULT '{}';
ALTER TABLE "Lill" ADD COLUMN "bloomScript" TEXT;
ALTER TABLE "Lill" ADD COLUMN difficulty TEXT DEFAULT 'overview' CHECK (difficulty IN ('intro', 'overview', 'deep', 'expert'));
CREATE INDEX idx_lill_main_slash ON "Lill"("mainSlashId");
CREATE INDEX idx_lill_difficulty ON "Lill"(difficulty);

-- 1F: RPC Functions

-- accept_slash_request
CREATE OR REPLACE FUNCTION accept_slash_request(request_id UUID)
RETURNS VOID AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM "SlashAccessRequest" WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already resolved'; END IF;

  -- Update request
  UPDATE "SlashAccessRequest" SET status = 'approved', "resolvedAt" = NOW() WHERE id = request_id;

  -- Create contributor row
  INSERT INTO "SlashContributor" ("slashId", "contributorId", "approvedBy", "approvedAt")
  VALUES (req."slashId", req."requesterId", req."curatorId", NOW())
  ON CONFLICT ("slashId", "contributorId") DO NOTHING;

  -- Link attached post if present
  IF req."attachedPostId" IS NOT NULL THEN
    INSERT INTO "SlashPost" ("slashId", "postId", "contributorId")
    VALUES (req."slashId", req."attachedPostId", req."requesterId")
    ON CONFLICT ("slashId", "postId") DO NOTHING;

    UPDATE "Slash" SET "lillCount" = "lillCount" + 1 WHERE id = req."slashId";
  END IF;

  -- Increment contributor count
  UPDATE "Slash" SET "contributorCount" = "contributorCount" + 1, "updatedAt" = NOW() WHERE id = req."slashId";

  -- Fire notification
  INSERT INTO "Notification" ("userId", type, message, read, "createdAt", "postId")
  VALUES (req."requesterId", 'SLASH_ACCESS_APPROVED',
    'Your request to contribute to /' || (SELECT name FROM "Slash" WHERE id = req."slashId") || ' was approved',
    false, NOW(), request_id::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- reject_slash_request
CREATE OR REPLACE FUNCTION reject_slash_request(request_id UUID, note TEXT DEFAULT 'not aligned with the focus of this slash')
RETURNS VOID AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM "SlashAccessRequest" WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already resolved'; END IF;

  UPDATE "SlashAccessRequest"
  SET status = 'rejected', "resolvedAt" = NOW(), "curatorNote" = COALESCE(note, 'not aligned with the focus of this slash')
  WHERE id = request_id;

  INSERT INTO "Notification" ("userId", type, message, read, "createdAt", "postId")
  VALUES (req."requesterId", 'SLASH_ACCESS_REJECTED',
    'Your request to contribute to /' || (SELECT name FROM "Slash" WHERE id = req."slashId") || ' was not accepted',
    false, NOW(), request_id::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- remove_lill_from_slash
CREATE OR REPLACE FUNCTION remove_lill_from_slash(p_slash_id UUID, p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  post_creator UUID;
  slash_name TEXT;
BEGIN
  SELECT "contributorId" INTO post_creator FROM "SlashPost" WHERE "slashId" = p_slash_id AND "postId" = p_post_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT name INTO slash_name FROM "Slash" WHERE id = p_slash_id;

  DELETE FROM "SlashPost" WHERE "slashId" = p_slash_id AND "postId" = p_post_id;
  UPDATE "Slash" SET "lillCount" = GREATEST("lillCount" - 1, 0), "updatedAt" = NOW() WHERE id = p_slash_id;

  INSERT INTO "Notification" ("userId", type, message, read, "createdAt")
  VALUES (post_creator, 'SLASH_LILL_REMOVED',
    'Your lill was removed from /' || slash_name, false, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- remove_slash_contributor
CREATE OR REPLACE FUNCTION remove_slash_contributor(p_slash_id UUID, p_contributor_id UUID)
RETURNS VOID AS $$
DECLARE
  slash_name TEXT;
  removed_count INT;
BEGIN
  SELECT name INTO slash_name FROM "Slash" WHERE id = p_slash_id;

  DELETE FROM "SlashPost" WHERE "slashId" = p_slash_id AND "contributorId" = p_contributor_id;
  GET DIAGNOSTICS removed_count = ROW_COUNT;

  DELETE FROM "SlashContributor" WHERE "slashId" = p_slash_id AND "contributorId" = p_contributor_id;

  UPDATE "Slash" SET
    "contributorCount" = GREATEST("contributorCount" - 1, 0),
    "lillCount" = GREATEST("lillCount" - removed_count, 0),
    "updatedAt" = NOW()
  WHERE id = p_slash_id;

  INSERT INTO "Notification" ("userId", type, message, read, "createdAt")
  VALUES (p_contributor_id, 'SLASH_CONTRIBUTOR_REMOVED',
    'You were removed from /' || slash_name, false, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- toggle_slash_access
CREATE OR REPLACE FUNCTION toggle_slash_access(p_slash_id UUID, new_mode TEXT)
RETURNS VOID AS $$
DECLARE
  old_mode TEXT;
  req RECORD;
  contrib RECORD;
BEGIN
  SELECT "accessMode" INTO old_mode FROM "Slash" WHERE id = p_slash_id;
  UPDATE "Slash" SET "accessMode" = new_mode, "updatedAt" = NOW() WHERE id = p_slash_id;

  IF old_mode = 'locked' AND new_mode = 'open' THEN
    -- Approve all pending requests
    FOR req IN SELECT * FROM "SlashAccessRequest" WHERE "slashId" = p_slash_id AND status = 'pending' LOOP
      PERFORM accept_slash_request(req.id);
    END LOOP;
  ELSIF old_mode = 'open' AND new_mode = 'locked' THEN
    -- Notify all existing contributors
    FOR contrib IN SELECT "contributorId" FROM "SlashContributor" WHERE "slashId" = p_slash_id LOOP
      INSERT INTO "Notification" ("userId", type, message, read, "createdAt")
      VALUES (contrib."contributorId", 'SLASH_ACCESS_UNLOCKED',
        '/' || (SELECT name FROM "Slash" WHERE id = p_slash_id) || ' is now locked',
        false, NOW());
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- increment_lill_count helper
CREATE OR REPLACE FUNCTION increment_lill_count(p_slash_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE "Slash" SET "lillCount" = "lillCount" + 1, "updatedAt" = NOW() WHERE id = p_slash_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification type additions (if using TEXT field, no schema change needed)
-- If using enum:
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SLASH_ACCESS_REQUESTED';
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SLASH_ACCESS_APPROVED';
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SLASH_ACCESS_REJECTED';
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SLASH_LILL_REMOVED';
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SLASH_CONTRIBUTOR_REMOVED';
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SLASH_ACCESS_UNLOCKED';
*/

import { supabase } from '../lib/supabase';

// ============================================================
// Types
// ============================================================

export interface SlashServiceResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface Slash {
    id: string;
    name: string;
    slashCode: string;
    creatorId: string;
    accessMode: 'open' | 'locked';
    description: string | null;
    lillCount: number;
    contributorCount: number;
    clusterTheta: number | null;
    clusterPhi: number | null;
    createdAt: string;
    updatedAt: string;
    creator?: {
        id: string;
        name: string;
        profile?: { displayName: string; avatarUrl: string } | null;
    };
    pendingCount?: number;
}

export interface SlashContribution {
    id: string;
    slashId: string;
    contributorId: string;
    approvedAt: string | null;
    slash?: Slash;
}

export interface SlashAccessRequestData {
    id: string;
    slashId: string;
    requesterId: string;
    curatorId: string;
    attachedPostId: string | null;
    requesterNote: string | null;
    curatorNote: string | null;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    resolvedAt: string | null;
    requester?: {
        id: string;
        name: string;
        profile?: { displayName: string; avatarUrl: string } | null;
    };
    attachedPost?: {
        id: string;
        content: string | null;
        postMedia?: { media: { url: string; type: string } }[];
    };
}

export interface SphereSlash {
    id: string;
    name: string;
    slashCode: string;
    accessMode: 'open' | 'locked';
    lillCount: number;
    clusterTheta: number;
    clusterPhi: number;
    isInteracted: boolean;
}

// Session cache for contributor checks
const contributorCache: Map<string, boolean> = new Map();

// ============================================================
// SlashService
// ============================================================

export class SlashService {

    /**
     * Generate a unique 7-digit numeric code
     */
    private static generateSlashCode(uuid: string): string {
        const hex = uuid.replace(/-/g, '').slice(0, 14);
        const bigVal = BigInt('0x' + hex);
        const code = Number(bigVal % BigInt(9000000)) + 1000000;
        return code.toString();
    }

    /**
     * Create a new slash
     */
    static async createSlash(
        name: string,
        accessMode: 'open' | 'locked',
        description?: string
    ): Promise<SlashServiceResult<Slash>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'Not authenticated' };

            // Generate a unique 7-digit code with collision check
            let slashCode = '';
            let attempts = 0;
            while (attempts < 5) {
                const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
                slashCode = this.generateSlashCode(uuid);
                const { data: existing } = await supabase
                    .from('Slash')
                    .select('id')
                    .eq('slashCode', slashCode)
                    .maybeSingle();
                if (!existing) break;
                attempts++;
            }
            if (attempts >= 5) return { success: false, error: 'Failed to generate unique code' };

            // Random cluster coordinates for immediate sphere display
            const clusterTheta = Math.random() * 2 * Math.PI;
            const clusterPhi = Math.random() * Math.PI;

            const { data, error } = await supabase
                .from('Slash')
                .insert({
                    name: name.toLowerCase().replace(/\s+/g, '-'),
                    slashCode,
                    creatorId: user.id,
                    accessMode,
                    description: description || null,
                    clusterTheta,
                    clusterPhi,
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') return { success: false, error: 'Slash name already exists' };
                return { success: false, error: error.message };
            }

            return { success: true, data: data as Slash };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get a slash by ID with creator profile join
     */
    static async getSlashById(slashId: string): Promise<SlashServiceResult<Slash>> {
        try {
            const { data, error } = await supabase
                .from('Slash')
                .select(`*, creator:creatorId(id, name, profile:Profile(displayName, avatarUrl))`)
                .eq('id', slashId)
                .single();

            if (error) return { success: false, error: error.message };

            const creatorProfile = Array.isArray(data.creator?.profile) ? data.creator.profile[0] : data.creator?.profile;
            return {
                success: true,
                data: { ...data, creator: { ...data.creator, profile: creatorProfile } } as Slash,
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get a slash by its 7-digit code
     */
    static async getSlashByCode(code: string): Promise<SlashServiceResult<Slash>> {
        try {
            const { data, error } = await supabase
                .from('Slash')
                .select(`*, creator:creatorId(id, name, profile:Profile(displayName, avatarUrl))`)
                .eq('slashCode', code)
                .single();

            if (error) return { success: false, error: error.message };

            const creatorProfile = Array.isArray(data.creator?.profile) ? data.creator.profile[0] : data.creator?.profile;
            return {
                success: true,
                data: { ...data, creator: { ...data.creator, profile: creatorProfile } } as Slash,
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Search slashes by name with ilike matching
     */
    static async searchSlashes(query: string, limit: number = 20): Promise<SlashServiceResult<Slash[]>> {
        try {
            const { data, error } = await supabase
                .from('Slash')
                .select('*')
                .ilike('name', `%${query}%`)
                .order('lillCount', { ascending: false })
                .limit(limit);

            if (error) return { success: false, error: error.message };
            return { success: true, data: (data || []) as Slash[] };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get slashes for the Bloom sphere
     * User-interacted slashes first, then by lill count
     */
    static async getSphereSlashes(userId: string, limit: number = 80): Promise<SlashServiceResult<SphereSlash[]>> {
        try {
            // Fetch all slashes with sphere data
            const { data: allSlashes, error } = await supabase
                .from('Slash')
                .select('id, name, slashCode, accessMode, lillCount, clusterTheta, clusterPhi')
                .order('lillCount', { ascending: false })
                .limit(limit);

            if (error) return { success: false, error: error.message };
            if (!allSlashes || allSlashes.length === 0) return { success: true, data: [] };

            // Check which slashes the user has interacted with
            const slashIds = allSlashes.map(s => s.id);

            const [{ data: userPosts }, { data: userContribs }] = await Promise.all([
                supabase.from('SlashPost').select('slashId').eq('contributorId', userId).in('slashId', slashIds),
                supabase.from('SlashContributor').select('slashId').eq('contributorId', userId).in('slashId', slashIds),
            ]);

            const interactedIds = new Set<string>();
            (userPosts || []).forEach((p: any) => interactedIds.add(p.slashId));
            (userContribs || []).forEach((c: any) => interactedIds.add(c.slashId));

            const result: SphereSlash[] = allSlashes.map((s: any) => ({
                id: s.id,
                name: s.name,
                slashCode: s.slashCode,
                accessMode: s.accessMode,
                lillCount: s.lillCount,
                clusterTheta: s.clusterTheta ?? Math.random() * 2 * Math.PI,
                clusterPhi: s.clusterPhi ?? Math.random() * Math.PI,
                isInteracted: interactedIds.has(s.id),
            }));

            // Sort: interacted first, then by lillCount
            result.sort((a, b) => {
                if (a.isInteracted && !b.isInteracted) return -1;
                if (!a.isInteracted && b.isInteracted) return 1;
                return b.lillCount - a.lillCount;
            });

            return { success: true, data: result };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Create or update an access request for a locked slash
     */
    static async createAccessRequest(
        slashId: string,
        attachedPostId?: string,
        requesterNote?: string
    ): Promise<SlashServiceResult<SlashAccessRequestData>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'Not authenticated' };

            // Fetch the slash to get curator_id (creator)
            const { data: slash } = await supabase
                .from('Slash')
                .select('creatorId, name')
                .eq('id', slashId)
                .single();

            if (!slash) return { success: false, error: 'Slash not found' };

            const { data, error } = await supabase
                .from('SlashAccessRequest')
                .upsert({
                    slashId,
                    requesterId: user.id,
                    curatorId: slash.creatorId,
                    attachedPostId: attachedPostId || null,
                    requesterNote: requesterNote || null,
                    status: 'pending',
                }, { onConflict: 'slashId,requesterId' })
                .select()
                .single();

            if (error) return { success: false, error: error.message };

            // Fire notification to curator
            await supabase.from('Notification').insert({
                userId: slash.creatorId,
                type: 'SLASH_ACCESS_REQUESTED',
                message: `Someone wants to contribute to /${slash.name}`,
                read: false,
                postId: data.id, // store request id for reference
            });

            return { success: true, data: data as SlashAccessRequestData };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Accept a pending access request (calls RPC)
     */
    static async acceptRequest(requestId: string): Promise<SlashServiceResult<void>> {
        try {
            const { error } = await supabase.rpc('accept_slash_request', { request_id: requestId });
            if (error) return { success: false, error: error.message };
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Reject a pending access request (calls RPC)
     */
    static async rejectRequest(requestId: string, curatorNote?: string): Promise<SlashServiceResult<void>> {
        try {
            const { error } = await supabase.rpc('reject_slash_request', {
                request_id: requestId,
                note: curatorNote || null,
            });
            if (error) return { success: false, error: error.message };
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get pending requests for a slash
     */
    static async getPendingRequests(slashId: string): Promise<SlashServiceResult<SlashAccessRequestData[]>> {
        try {
            const { data, error } = await supabase
                .from('SlashAccessRequest')
                .select(`
                    *,
                    requester:requesterId(id, name, profile:Profile(displayName, avatarUrl)),
                    attachedPost:attachedPostId(id, content, postMedia:PostMedia(media:Media(url, type)))
                `)
                .eq('slashId', slashId)
                .eq('status', 'pending')
                .order('createdAt', { ascending: false });

            if (error) return { success: false, error: error.message };

            const mapped = (data || []).map((r: any) => {
                const reqProfile = Array.isArray(r.requester?.profile) ? r.requester.profile[0] : r.requester?.profile;
                return {
                    ...r,
                    requester: { ...r.requester, profile: reqProfile },
                } as SlashAccessRequestData;
            });

            return { success: true, data: mapped };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Remove a lill from a slash (calls RPC)
     */
    static async removeLillFromSlash(slashId: string, postId: string): Promise<SlashServiceResult<void>> {
        try {
            const { error } = await supabase.rpc('remove_lill_from_slash', {
                p_slash_id: slashId,
                p_post_id: postId,
            });
            if (error) return { success: false, error: error.message };
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Remove a contributor from a slash (calls RPC)
     */
    static async removeContributor(slashId: string, contributorId: string): Promise<SlashServiceResult<void>> {
        try {
            const { error } = await supabase.rpc('remove_slash_contributor', {
                p_slash_id: slashId,
                p_contributor_id: contributorId,
            });
            if (error) return { success: false, error: error.message };
            contributorCache.delete(`${slashId}:${contributorId}`);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Toggle slash access mode (calls RPC)
     */
    static async toggleAccess(slashId: string, newMode: 'open' | 'locked'): Promise<SlashServiceResult<void>> {
        try {
            const { error } = await supabase.rpc('toggle_slash_access', {
                p_slash_id: slashId,
                new_mode: newMode,
            });
            if (error) return { success: false, error: error.message };
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get all slashes created by a user, with pending request counts
     */
    static async getUserSlashes(userId: string): Promise<SlashServiceResult<Slash[]>> {
        try {
            const { data, error } = await supabase
                .from('Slash')
                .select('*')
                .eq('creatorId', userId)
                .order('createdAt', { ascending: false });

            if (error) return { success: false, error: error.message };

            // Fetch pending counts for each slash
            const slashIds = (data || []).map(s => s.id);
            let pendingMap: Record<string, number> = {};

            if (slashIds.length > 0) {
                const { data: pending } = await supabase
                    .from('SlashAccessRequest')
                    .select('slashId')
                    .in('slashId', slashIds)
                    .eq('status', 'pending');

                if (pending) {
                    pending.forEach((p: any) => {
                        pendingMap[p.slashId] = (pendingMap[p.slashId] || 0) + 1;
                    });
                }
            }

            const result = (data || []).map(s => ({
                ...s,
                pendingCount: pendingMap[s.id] || 0,
            })) as Slash[];

            return { success: true, data: result };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get all slashes a user contributes to
     */
    static async getUserContributions(userId: string): Promise<SlashServiceResult<SlashContribution[]>> {
        try {
            const { data, error } = await supabase
                .from('SlashContributor')
                .select(`
                    *,
                    slash:slashId(id, name, slashCode, accessMode, lillCount, contributorCount, createdAt)
                `)
                .eq('contributorId', userId)
                .order('approvedAt', { ascending: false });

            if (error) return { success: false, error: error.message };
            return { success: true, data: (data || []) as SlashContribution[] };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Check if a user is an approved contributor to a slash.
     * Cached in memory for the session.
     */
    static async isContributor(slashId: string, userId: string): Promise<boolean> {
        const cacheKey = `${slashId}:${userId}`;
        if (contributorCache.has(cacheKey)) return contributorCache.get(cacheKey)!;

        try {
            const { data } = await supabase
                .from('SlashContributor')
                .select('id')
                .eq('slashId', slashId)
                .eq('contributorId', userId)
                .maybeSingle();

            const result = !!data;
            contributorCache.set(cacheKey, result);
            return result;
        } catch {
            return false;
        }
    }

    /**
     * Get lills for a slash by difficulty
     */
    static async getSlashLills(
        slashId: string,
        difficulty: string,
        limit: number = 20
    ): Promise<SlashServiceResult<any[]>> {
        try {
            const { data, error } = await supabase
                .from('Lill')
                .select(`
                    id, postId, thumbnailUrl, duration, difficulty, bloomScript,
                    post:postId(id, content, userId,
                        user:User(name, profile:Profile(displayName, avatarUrl)),
                        postMedia:PostMedia(media:Media(url, type))
                    )
                `)
                .eq('mainSlashId', slashId)
                .eq('difficulty', difficulty)
                .order('createdAt', { ascending: false })
                .limit(limit);

            if (error) return { success: false, error: error.message };
            return { success: true, data: data || [] };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}
