-- Usage Monitoring and Alerting Functions
-- Creates functions to track and monitor app usage

-- ====================================
-- 1. DAILY USAGE SUMMARY TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS "public"."DailyUsageStats" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "date" DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    "totalUsers" INTEGER DEFAULT 0,
    "activeUsers" INTEGER DEFAULT 0,
    "newUsers" INTEGER DEFAULT 0,
    "totalPosts" INTEGER DEFAULT 0,
    "totalMessages" INTEGER DEFAULT 0,
    "totalUploads" INTEGER DEFAULT 0,
    "storageUsedMB" NUMERIC DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- 2. DAILY STATS AGGREGATION FUNCTION
-- ====================================

CREATE OR REPLACE FUNCTION aggregate_daily_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO "public"."DailyUsageStats" (
        "date",
        "totalUsers",
        "activeUsers",
        "newUsers",
        "totalPosts",
        "totalMessages",
        "totalUploads"
    )
    VALUES (
        CURRENT_DATE,
        (SELECT COUNT(*) FROM "public"."User"),
        (SELECT COUNT(DISTINCT "userId") FROM "public"."Post" WHERE DATE("createdAt") = CURRENT_DATE),
        (SELECT COUNT(*) FROM "public"."User" WHERE DATE("createdAt") = CURRENT_DATE),
        (SELECT COUNT(*) FROM "public"."Post" WHERE DATE("createdAt") = CURRENT_DATE),
        (SELECT COUNT(*) FROM "public"."Message" WHERE DATE("createdAt") = CURRENT_DATE),
        (SELECT COALESCE(SUM("uploadCount"), 0) FROM "public"."UploadRateLimit" WHERE "resetDate" = CURRENT_DATE)
    )
    ON CONFLICT ("date") DO UPDATE SET
        "totalUsers" = EXCLUDED."totalUsers",
        "activeUsers" = EXCLUDED."activeUsers",
        "newUsers" = EXCLUDED."newUsers",
        "totalPosts" = EXCLUDED."totalPosts",
        "totalMessages" = EXCLUDED."totalMessages",
        "totalUploads" = EXCLUDED."totalUploads";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 3. USAGE ALERT THRESHOLDS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS "public"."UsageAlerts" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "alertType" TEXT NOT NULL, -- 'storage', 'posts', 'users', 'uploads'
    "threshold" INTEGER NOT NULL, -- threshold value
    "currentValue" INTEGER DEFAULT 0,
    "isTriggered" BOOLEAN DEFAULT false,
    "lastTriggeredAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Insert default thresholds
INSERT INTO "public"."UsageAlerts" ("alertType", "threshold") VALUES
    ('storage_mb', 900),      -- Alert at 900MB (near 1GB limit)
    ('daily_posts', 1000),    -- Alert at 1000 posts/day
    ('daily_users', 500),     -- Alert at 500 active users/day
    ('daily_uploads', 2000)   -- Alert at 2000 uploads/day
ON CONFLICT DO NOTHING;

-- ====================================
-- 4. CHECK ALERTS FUNCTION
-- ====================================

CREATE OR REPLACE FUNCTION check_usage_alerts()
RETURNS TABLE (
    alert_type TEXT,
    threshold INTEGER,
    current_value INTEGER,
    is_critical BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua."alertType",
        ua."threshold",
        CASE ua."alertType"
            WHEN 'daily_posts' THEN (SELECT COUNT(*)::INTEGER FROM "public"."Post" WHERE DATE("createdAt") = CURRENT_DATE)
            WHEN 'daily_users' THEN (SELECT COUNT(DISTINCT "userId")::INTEGER FROM "public"."Post" WHERE DATE("createdAt") = CURRENT_DATE)
            WHEN 'daily_uploads' THEN (SELECT COALESCE(SUM("uploadCount"), 0)::INTEGER FROM "public"."UploadRateLimit" WHERE "resetDate" = CURRENT_DATE)
            ELSE 0
        END as current_val,
        CASE ua."alertType"
            WHEN 'daily_posts' THEN (SELECT COUNT(*) FROM "public"."Post" WHERE DATE("createdAt") = CURRENT_DATE) > ua."threshold"
            WHEN 'daily_users' THEN (SELECT COUNT(DISTINCT "userId") FROM "public"."Post" WHERE DATE("createdAt") = CURRENT_DATE) > ua."threshold"
            WHEN 'daily_uploads' THEN (SELECT COALESCE(SUM("uploadCount"), 0) FROM "public"."UploadRateLimit" WHERE "resetDate" = CURRENT_DATE) > ua."threshold"
            ELSE false
        END as is_crit
    FROM "public"."UsageAlerts" ua;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 5. GET USAGE DASHBOARD DATA
-- ====================================

CREATE OR REPLACE FUNCTION get_usage_dashboard()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'today', json_build_object(
            'posts', (SELECT COUNT(*) FROM "public"."Post" WHERE DATE("createdAt") = CURRENT_DATE),
            'messages', (SELECT COUNT(*) FROM "public"."Message" WHERE DATE("createdAt") = CURRENT_DATE),
            'newUsers', (SELECT COUNT(*) FROM "public"."User" WHERE DATE("createdAt") = CURRENT_DATE),
            'uploads', (SELECT COALESCE(SUM("uploadCount"), 0) FROM "public"."UploadRateLimit" WHERE "resetDate" = CURRENT_DATE)
        ),
        'totals', json_build_object(
            'users', (SELECT COUNT(*) FROM "public"."User"),
            'posts', (SELECT COUNT(*) FROM "public"."Post"),
            'conversations', (SELECT COUNT(*) FROM "public"."Conversation")
        ),
        'postsByType', (
            SELECT json_object_agg("postType", count)
            FROM (SELECT "postType", COUNT(*) as count FROM "public"."Post" GROUP BY "postType") t
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_usage_dashboard() TO authenticated;
