-- Fix Security Lints
-- Addresses:
-- 1. security_definer_view: Makes usage_stats view respect RLS.
-- 2. function_search_path_mutable: Sets fixed search_path for functions.
-- 3. rls_disabled_in_public: Enables RLS on remaining public tables.

-- ====================================
-- 1. FIX SECURITY DEFINER VIEW
-- ====================================

-- Make usage_stats view respect the RLS policies of the invoker (the user)
-- instead of the view owner (postgres), preventing data leaks.
ALTER VIEW "public"."usage_stats" SET (security_invoker = true);

-- ====================================
-- 2. FIX MUTABLE SEARCH PATHS
-- ====================================

-- Set explicit search_path to 'public' to prevent search_path hijacking attacks.

ALTER FUNCTION "public"."check_upload_rate_limit"(text, text) SET search_path = 'public';

ALTER FUNCTION "public"."aggregate_daily_stats"() SET search_path = 'public';

ALTER FUNCTION "public"."check_usage_alerts"() SET search_path = 'public';

ALTER FUNCTION "public"."get_usage_dashboard"() SET search_path = 'public';

-- ====================================
-- 3. ENABLE RLS ON MISSING TABLES
-- ====================================

-- A. Internal/System Tables (Usage Stats & Alerts)
-- These are primarily accessed by system functions (cron jobs) or admins.
-- Enabling RLS with no policies denies access to normal API users by default, which is secure.

ALTER TABLE "public"."DailyUsageStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UsageAlerts" ENABLE ROW LEVEL SECURITY;

-- If we ever need to view these from the frontend as an admin, we can add a policy like:
-- CREATE POLICY "Admins can view usage stats" ON "public"."DailyUsageStats" FOR SELECT USING (auth.uid() IN (...));
-- For now, implicit deny is safest.

-- B. Project Table
ALTER TABLE "public"."Project" ENABLE ROW LEVEL SECURITY;

-- Assuming Project is something users might need to read (e.g., specific project context)
-- Adding a basic authenticated view policy. If unused, this is still safer than open.
CREATE POLICY "Authenticated users can view projects" ON "public"."Project"
    FOR SELECT USING (auth.role() = 'authenticated');

-- C. _BrandCompetitors Table (Prisma Relation)
ALTER TABLE "public"."_BrandCompetitors" ENABLE ROW LEVEL SECURITY;

-- Since "Brand" table is public ("Anyone can view brands"), the relations should likely be public too.
CREATE POLICY "Anyone can view brand competitors" ON "public"."_BrandCompetitors"
    FOR SELECT USING (true);
