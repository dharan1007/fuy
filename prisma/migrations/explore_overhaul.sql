-- ============================================
-- Explore Page Overhaul — Migration SQL
-- Run against your Supabase PostgreSQL database
-- All changes are additive (no destructive ops)
-- ============================================

-- 1B: New columns on Media table (MUST run before materialized view)
-- ============================================

ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "thumbnailBlurHash" TEXT;

CREATE INDEX IF NOT EXISTS idx_media_thumbnail ON "Media"("id") WHERE "thumbnailUrl" IS NOT NULL;


-- ============================================
-- 1A: Materialized View for Explore Feed
-- Pre-joins everything the explore page needs into a single queryable view.
-- Refreshed every 5 minutes via pg_cron.
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS explore_feed_view AS
SELECT
    p."id" AS id,
    p."createdAt" AS created_at,
    p."visibility" AS visibility,
    p."userId" AS user_id,
    p."postType" AS post_type,
    p."content" AS content,
    p."status" AS status,
    p."impressions" AS impressions,
    p."viewCount" AS view_count,
    -- First media item (by orderIndex)
    m."url" AS media_url,
    m."type" AS media_type,
    m."thumbnailUrl" AS thumbnail_url,
    m."thumbnailBlurHash" AS thumbnail_blur_hash,
    -- User info
    u."name" AS username,
    -- Profile info
    pr."displayName" AS display_name,
    pr."avatarUrl" AS avatar_url,
    pr."currentlyInto" AS currently_into,
    pr."tags" AS profile_tags,
    -- Aggregated slash tags
    COALESCE(st.tags, ARRAY[]::TEXT[]) AS tags,
    -- Engagement counts
    COALESCE(rc.like_count, 0) AS like_count,
    COALESCE(rc.save_count, 0) AS save_count
FROM "Post" p
JOIN "User" u ON u."id" = p."userId"
LEFT JOIN "Profile" pr ON pr."userId" = p."userId"
-- First media item via PostMedia join
LEFT JOIN LATERAL (
    SELECT med."url", med."type", med."thumbnailUrl", med."thumbnailBlurHash"
    FROM "PostMedia" pm
    JOIN "Media" med ON med."id" = pm."mediaId"
    WHERE pm."postId" = p."id"
    ORDER BY pm."orderIndex" ASC
    LIMIT 1
) m ON true
-- Aggregated slash tags
LEFT JOIN LATERAL (
    SELECT array_agg(DISTINCT s."tag") AS tags
    FROM "_PostToSlash" ps
    JOIN "Slash" s ON s."id" = ps."B"
    WHERE ps."A" = p."id"
) st ON true
-- Engagement: likes (W reactions) and saves (bookmarks)
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE r."type" = 'W') AS like_count,
        COUNT(*) FILTER (WHERE r."type" = 'SAVE') AS save_count
    FROM "Reaction" r
    WHERE r."postId" = p."id"
) rc ON true
WHERE p."visibility" = 'PUBLIC'
  AND p."status" = 'PUBLISHED';

-- Indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS explore_feed_view_id_idx ON explore_feed_view (id);
CREATE INDEX IF NOT EXISTS explore_feed_view_created_at_idx ON explore_feed_view (created_at DESC);
CREATE INDEX IF NOT EXISTS explore_feed_view_tags_idx ON explore_feed_view USING GIN (tags);
CREATE INDEX IF NOT EXISTS explore_feed_view_user_id_idx ON explore_feed_view (user_id);
CREATE INDEX IF NOT EXISTS explore_feed_view_like_count_idx ON explore_feed_view (like_count DESC);

-- pg_cron: Refresh every 5 minutes (requires pg_cron extension enabled in Supabase)
-- To enable: go to Supabase Dashboard > Database > Extensions > search "pg_cron" > Enable
-- Then uncomment and run the following two lines:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-explore-feed-view', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY explore_feed_view');
--
-- Until pg_cron is enabled, refresh the view manually when needed:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY explore_feed_view;


-- (1B columns already added above, before the materialized view)


-- ============================================
-- 1C: Tag Affinity Table
-- ============================================

CREATE TABLE IF NOT EXISTS "user_tag_affinity" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "tag" TEXT NOT NULL,
    "score" FLOAT DEFAULT 0,
    "interactionCount" INT DEFAULT 0,
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("userId", "tag")
);

CREATE INDEX IF NOT EXISTS idx_user_tag_affinity_score ON "user_tag_affinity"("userId", "score" DESC);

-- RLS for user_tag_affinity
ALTER TABLE "user_tag_affinity" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tag affinity" ON "user_tag_affinity"
    FOR ALL TO authenticated
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");


-- ============================================
-- 1D: Thumbnail Errors Table
-- ============================================

CREATE TABLE IF NOT EXISTS "thumbnail_errors" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "mediaId" TEXT,
    "filePath" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "thumbnail_errors" ENABLE ROW LEVEL SECURITY;

-- Service role only — no user access needed
CREATE POLICY "Service role only" ON "thumbnail_errors"
    FOR ALL TO service_role USING (true);


-- ============================================
-- Postgres Functions
-- ============================================

-- get_trending_tags: velocity-based trending from RecoFeedback + Slash
CREATE OR REPLACE FUNCTION get_trending_tags()
RETURNS TABLE(tag TEXT, velocity FLOAT) AS $$
    SELECT s."tag",
        COUNT(*) FILTER (WHERE rf."createdAt" > NOW() - INTERVAL '30 minutes') * 2.0 +
        COUNT(*) FILTER (WHERE rf."createdAt" > NOW() - INTERVAL '2 hours') AS velocity
    FROM "RecoFeedback" rf
    JOIN "_PostToSlash" ps ON rf."contentId" = ps."A"
    JOIN "Slash" s ON s."id" = ps."B"
    WHERE rf."score" > 0
    GROUP BY s."tag"
    ORDER BY velocity DESC
    LIMIT 8
$$ LANGUAGE SQL;

-- decay_tag_affinity: multiplies all scores by 0.95 for recency decay
CREATE OR REPLACE FUNCTION decay_tag_affinity(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE "user_tag_affinity"
    SET "score" = "score" * 0.95,
        "lastUpdated" = NOW()
    WHERE "userId" = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- upsert_tag_affinity: atomic insert-or-increment for tag scores
CREATE OR REPLACE FUNCTION upsert_tag_affinity(
    p_user_id TEXT, p_tag TEXT, p_score_delta FLOAT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO "user_tag_affinity" ("userId", "tag", "score", "interactionCount", "lastUpdated")
    VALUES (p_user_id, p_tag, p_score_delta, 1, NOW())
    ON CONFLICT ("userId", "tag") DO UPDATE SET
        "score" = "user_tag_affinity"."score" + p_score_delta,
        "interactionCount" = "user_tag_affinity"."interactionCount" + 1,
        "lastUpdated" = NOW();
END;
$$ LANGUAGE plpgsql;
