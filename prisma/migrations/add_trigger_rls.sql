-- Final Robust Fix for Permissions & RLS
-- Run this in your Supabase SQL Editor

-- 1. Create helper function with explicit permissions
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(auth.jwt() ->> 'email');
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_user_id() TO service_role;

-- 2. Clean up existing policies
DROP POLICY IF EXISTS "TriggerCollection_select" ON "TriggerCollection";
DROP POLICY IF EXISTS "TriggerCollection_insert" ON "TriggerCollection";
DROP POLICY IF EXISTS "TriggerCollection_update" ON "TriggerCollection";
DROP POLICY IF EXISTS "TriggerCollection_delete" ON "TriggerCollection";
DROP POLICY IF EXISTS "TriggerCollection_own" ON "TriggerCollection";

DROP POLICY IF EXISTS "Trigger_select" ON "Trigger";
DROP POLICY IF EXISTS "Trigger_insert" ON "Trigger";
DROP POLICY IF EXISTS "Trigger_update" ON "Trigger";
DROP POLICY IF EXISTS "Trigger_delete" ON "Trigger";
DROP POLICY IF EXISTS "Trigger_own" ON "Trigger";

-- 3. Ensure Table Permissions (Critical for "permission denied" error)
GRANT ALL ON TABLE "TriggerCollection" TO authenticated;
GRANT ALL ON TABLE "TriggerCollection" TO service_role;
GRANT ALL ON TABLE "Trigger" TO authenticated;
GRANT ALL ON TABLE "Trigger" TO service_role;

-- 4. Enable RLS
ALTER TABLE "TriggerCollection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trigger" ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies

-- TriggerCollection
CREATE POLICY "TriggerCollection_select" ON "TriggerCollection"
  FOR SELECT USING ("userId" = get_my_user_id());

CREATE POLICY "TriggerCollection_insert" ON "TriggerCollection"
  FOR INSERT WITH CHECK ("userId" = get_my_user_id());

CREATE POLICY "TriggerCollection_update" ON "TriggerCollection"
  FOR UPDATE USING ("userId" = get_my_user_id());

CREATE POLICY "TriggerCollection_delete" ON "TriggerCollection"
  FOR DELETE USING ("userId" = get_my_user_id());

-- Trigger
CREATE POLICY "Trigger_select" ON "Trigger"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "TriggerCollection"
      WHERE "id" = "Trigger"."collectionId"
      AND "userId" = get_my_user_id()
    )
  );

CREATE POLICY "Trigger_insert" ON "Trigger"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TriggerCollection"
      WHERE "id" = "Trigger"."collectionId"
      AND "userId" = get_my_user_id()
    )
  );

CREATE POLICY "Trigger_update" ON "Trigger"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "TriggerCollection"
      WHERE "id" = "Trigger"."collectionId"
      AND "userId" = get_my_user_id()
    )
  );

CREATE POLICY "Trigger_delete" ON "Trigger"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "TriggerCollection"
      WHERE "id" = "Trigger"."collectionId"
      AND "userId" = get_my_user_id()
    )
  );
