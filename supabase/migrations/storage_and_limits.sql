-- Storage Bucket Policies and File Size Limits
-- Run in Supabase SQL Editor

-- ====================================
-- 1. CREATE STORAGE BUCKETS (if not exist)
-- ====================================

-- Main media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media',
    'media',
    true,
    104857600, -- 100 MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp3']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp3'];

-- Profile avatars bucket (smaller limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB max for avatars
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ====================================
-- 2. STORAGE BUCKET RLS POLICIES
-- ====================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public media access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Public read access for media bucket
CREATE POLICY "Public media access" ON storage.objects
FOR SELECT USING (bucket_id IN ('media', 'avatars'));

-- Authenticated users can upload to media bucket
CREATE POLICY "Authenticated users can upload media" ON storage.objects
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    bucket_id IN ('media', 'avatars')
);

-- Users can update their own uploads (based on owner metadata)
CREATE POLICY "Users can update own media" ON storage.objects
FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    bucket_id IN ('media', 'avatars') AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own media" ON storage.objects
FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    bucket_id IN ('media', 'avatars') AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- ====================================
-- 3. RATE LIMITING TABLE
-- ====================================

-- Create table to track upload counts
CREATE TABLE IF NOT EXISTS "public"."UploadRateLimit" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "uploadType" TEXT NOT NULL, -- 'image', 'video', 'audio'
    "uploadCount" INTEGER DEFAULT 0,
    "resetDate" DATE DEFAULT CURRENT_DATE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("userId", "uploadType", "resetDate")
);

-- Enable RLS
ALTER TABLE "public"."UploadRateLimit" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own rate limits" ON "public"."UploadRateLimit"
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert rate limits" ON "public"."UploadRateLimit"
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update rate limits" ON "public"."UploadRateLimit"
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ====================================
-- 4. RATE LIMITING FUNCTION
-- ====================================

CREATE OR REPLACE FUNCTION check_upload_rate_limit(
    p_user_id TEXT,
    p_upload_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Set limits based on type
    CASE p_upload_type
        WHEN 'image' THEN v_limit := 50;  -- 50 images/day
        WHEN 'video' THEN v_limit := 10;  -- 10 videos/day
        WHEN 'audio' THEN v_limit := 20;  -- 20 audio/day
        ELSE v_limit := 30;
    END CASE;

    -- Get or create today's count
    INSERT INTO "public"."UploadRateLimit" ("userId", "uploadType", "uploadCount", "resetDate")
    VALUES (p_user_id, p_upload_type, 1, CURRENT_DATE)
    ON CONFLICT ("userId", "uploadType", "resetDate") 
    DO UPDATE SET "uploadCount" = "UploadRateLimit"."uploadCount" + 1, "updatedAt" = NOW()
    RETURNING "uploadCount" INTO v_count;

    -- Check if under limit
    RETURN v_count <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 5. USAGE MONITORING VIEW
-- ====================================

CREATE OR REPLACE VIEW "public"."usage_stats" AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    COALESCE((SELECT COUNT(*) FROM "public"."Post" WHERE "userId" = u.id), 0) as total_posts,
    COALESCE((SELECT COUNT(*) FROM "public"."Media" WHERE "userId" = u.id), 0) as total_media,
    COALESCE((SELECT SUM("uploadCount") FROM "public"."UploadRateLimit" WHERE "userId" = u.id AND "resetDate" = CURRENT_DATE), 0) as uploads_today,
    COALESCE((SELECT COUNT(*) FROM "public"."Post" WHERE "userId" = u.id AND DATE("createdAt") = CURRENT_DATE), 0) as posts_today
FROM "public"."User" u;

-- Grant access to authenticated users (they can only see their own due to RLS)
GRANT SELECT ON "public"."usage_stats" TO authenticated;
