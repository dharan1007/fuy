-- Beta Security: Enable RLS on Post Type Tables
-- Run this migration before beta launch

-- ====================================
-- 1. ENABLE RLS ON NEW POST TYPE TABLES
-- ====================================

ALTER TABLE "public"."Lill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Fill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Aud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Chan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Xray" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BTS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Chapter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PullUpDown" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PullUpDownVote" ENABLE ROW LEVEL SECURITY;

-- ====================================
-- 2. LILL POLICIES (Short Videos)
-- ====================================

-- Anyone can view public lills (through Post visibility)
CREATE POLICY "Anyone can view lills" ON "public"."Lill"
FOR SELECT USING (true);

-- Users can only create lills for their own posts
CREATE POLICY "Users can create lills for own posts" ON "public"."Lill"
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."Post" p
        WHERE p.id = "postId"
        AND EXISTS (
            SELECT 1 FROM "public"."User" u 
            WHERE u.email = auth.email() AND u.id = p."userId"
        )
    )
);

-- Users can update their own lills
CREATE POLICY "Users can update own lills" ON "public"."Lill"
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM "public"."Post" p
        WHERE p.id = "postId"
        AND EXISTS (
            SELECT 1 FROM "public"."User" u 
            WHERE u.email = auth.email() AND u.id = p."userId"
        )
    )
);

-- Users can delete their own lills
CREATE POLICY "Users can delete own lills" ON "public"."Lill"
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM "public"."Post" p
        WHERE p.id = "postId"
        AND EXISTS (
            SELECT 1 FROM "public"."User" u 
            WHERE u.email = auth.email() AND u.id = p."userId"
        )
    )
);

-- ====================================
-- 3. FILL POLICIES (Long Videos)
-- ====================================

CREATE POLICY "Anyone can view fills" ON "public"."Fill"
FOR SELECT USING (true);

CREATE POLICY "Users can create fills for own posts" ON "public"."Fill"
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."Post" p
        WHERE p.id = "postId"
        AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId")
    )
);

CREATE POLICY "Users can update own fills" ON "public"."Fill"
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM "public"."Post" p
        WHERE p.id = "postId"
        AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId")
    )
);

CREATE POLICY "Users can delete own fills" ON "public"."Fill"
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM "public"."Post" p
        WHERE p.id = "postId"
        AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId")
    )
);

-- ====================================
-- 4. AUD POLICIES (Audio)
-- ====================================

CREATE POLICY "Anyone can view auds" ON "public"."Aud"
FOR SELECT USING (true);

CREATE POLICY "Users can create auds for own posts" ON "public"."Aud"
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can update own auds" ON "public"."Aud"
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can delete own auds" ON "public"."Aud"
FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

-- ====================================
-- 5. CHAN POLICIES (Channels)
-- ====================================

CREATE POLICY "Anyone can view chans" ON "public"."Chan"
FOR SELECT USING (true);

CREATE POLICY "Users can create chans for own posts" ON "public"."Chan"
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can update own chans" ON "public"."Chan"
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can delete own chans" ON "public"."Chan"
FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

-- ====================================
-- 6. XRAY POLICIES (Scratch Reveals)
-- ====================================

CREATE POLICY "Anyone can view xrays" ON "public"."Xray"
FOR SELECT USING (true);

CREATE POLICY "Users can create xrays for own posts" ON "public"."Xray"
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can update own xrays" ON "public"."Xray"
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can delete own xrays" ON "public"."Xray"
FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

-- ====================================
-- 7. BTS POLICIES (Behind The Scenes)
-- ====================================

CREATE POLICY "Anyone can view bts" ON "public"."BTS"
FOR SELECT USING (true);

CREATE POLICY "Users can create bts for own posts" ON "public"."BTS"
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can update own bts" ON "public"."BTS"
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can delete own bts" ON "public"."BTS"
FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

-- ====================================
-- 8. CHAPTER POLICIES (Collections)
-- ====================================

CREATE POLICY "Anyone can view chapters" ON "public"."Chapter"
FOR SELECT USING (true);

CREATE POLICY "Users can create chapters for own posts" ON "public"."Chapter"
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can update own chapters" ON "public"."Chapter"
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can delete own chapters" ON "public"."Chapter"
FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

-- ====================================
-- 9. PULLUPDOWN POLICIES (Polls)
-- ====================================

CREATE POLICY "Anyone can view polls" ON "public"."PullUpDown"
FOR SELECT USING (true);

CREATE POLICY "Users can create polls for own posts" ON "public"."PullUpDown"
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

-- Only poll owner can update (vote counts managed by votes table)
CREATE POLICY "Users can update own polls" ON "public"."PullUpDown"
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

CREATE POLICY "Users can delete own polls" ON "public"."PullUpDown"
FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."Post" p WHERE p.id = "postId" AND EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = p."userId"))
);

-- ====================================
-- 10. PULLUPDOWNVOTE POLICIES (Votes)
-- ====================================

-- Anyone can view votes
CREATE POLICY "Anyone can view votes" ON "public"."PullUpDownVote"
FOR SELECT USING (true);

-- Users can only vote once per poll (enforced by unique constraint)
CREATE POLICY "Authenticated users can vote" ON "public"."PullUpDownVote"
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = "userId")
);

-- Users can change their own vote
CREATE POLICY "Users can update own votes" ON "public"."PullUpDownVote"
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = "userId")
);

-- Users can remove their own vote
CREATE POLICY "Users can delete own votes" ON "public"."PullUpDownVote"
FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND u.id = "userId")
);
