-- ==============================================================================
-- Fix RLS Performance and Duplicates (Final Cleanup V2)
-- ==============================================================================
-- Description:
-- 1. Drops duplicate policies found by the linter.
-- 2. Re-creates policies using the optimized `(select auth.uid()::text)` syntax.
-- 3. Message Table: Consolidates redundant policies into a single "Participant" policy.
--    This is required to allow updating `isSaved` on received messages, which would
--    fail if we restricted updates only to the sender.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. User Table (Performance Fix)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON "User";

CREATE POLICY "Users can update own profile"
ON "User"
FOR UPDATE
TO authenticated
USING (id = (select auth.uid()::text))
WITH CHECK (id = (select auth.uid()::text));


-- ------------------------------------------------------------------------------
-- 2. Message Table (Duplicates, Performance & Functionality)
-- ------------------------------------------------------------------------------
-- Drop conflicting/redundant policies
DROP POLICY IF EXISTS "Users can update own messages" ON "Message";
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON "Message";

-- Create a SINGLE policy for updates (Covers both Editing own & Saving received)
-- We use EXISTS with Conversation to verify participation.
CREATE POLICY "Users can update messages in their conversations"
ON "Message"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Conversation" c
        WHERE c.id = "Message"."conversationId"
        AND (c."participantA" = (select auth.uid()::text) OR c."participantB" = (select auth.uid()::text))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Conversation" c
        WHERE c.id = "Message"."conversationId"
        AND (c."participantA" = (select auth.uid()::text) OR c."participantB" = (select auth.uid()::text))
    )
);


-- ------------------------------------------------------------------------------
-- 3. MessageTag Table (Performance Fix)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert tags for their messages or received messages" ON "MessageTag";

CREATE POLICY "Users can insert tags for their messages or received messages"
ON "MessageTag"
FOR INSERT
TO authenticated
WITH CHECK (
    "userId" = (select auth.uid()::text)
);


-- ------------------------------------------------------------------------------
-- 4. TriggerCollection Table (Duplicates & Performance)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own trigger collections" ON "TriggerCollection";
DROP POLICY IF EXISTS "Users can manage their own trigger collections" ON "TriggerCollection";

CREATE POLICY "Users can manage own trigger collections"
ON "TriggerCollection"
FOR ALL
TO authenticated
USING ("userId" = (select auth.uid()::text))
WITH CHECK ("userId" = (select auth.uid()::text));


-- ------------------------------------------------------------------------------
-- 5. Trigger Table (Duplicates & Performance)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own triggers" ON "Trigger";
DROP POLICY IF EXISTS "Users can manage their own triggers" ON "Trigger";

CREATE POLICY "Users can manage own triggers"
ON "Trigger"
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "TriggerCollection" tc
        WHERE tc.id = "Trigger"."collectionId"
        AND tc."userId" = (select auth.uid()::text)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "TriggerCollection" tc
        WHERE tc.id = "Trigger"."collectionId"
        AND tc."userId" = (select auth.uid()::text)
    )
);

COMMIT;
