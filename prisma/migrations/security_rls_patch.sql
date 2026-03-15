-- ============================================
-- Security Patch - RLS Policies
-- Use this to fix "RLS Disabled" errors in Supabase
-- ============================================

-- 1. Enable RLS on all target tables
ALTER TABLE "public"."SavedAudio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PollVotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_locations" ENABLE ROW LEVEL SECURITY;

-- 2. Policies for SavedAudio
-- Users can manage their own saved audio
CREATE POLICY "Users can manage their own saved audio" ON "public"."SavedAudio"
    FOR ALL USING (auth.uid()::text = "userId");

-- 3. Policies for PollVotes
-- Authenticated users can view all poll votes (to see results)
CREATE POLICY "Anyone can view poll results" ON "public"."PollVotes"
    FOR SELECT TO authenticated USING (true);

-- Users can only cast votes as themselves
CREATE POLICY "Users can cast their own votes" ON "public"."PollVotes"
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid()::text = "userId");

-- 4. Policies for user_locations
-- Users can manage (INSERT/UPDATE) their own location
CREATE POLICY "Users can manage their own location" ON "public"."user_locations"
    FOR ALL TO authenticated
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");

-- Critical for /eta feature: Users can see locations of other users
-- (In production, you'd restrict this to conversation partners, but this enables the feature now)
CREATE POLICY "Authenticated users can see locations" ON "public"."user_locations"
    FOR SELECT TO authenticated USING (true);
