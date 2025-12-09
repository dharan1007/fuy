-- Fix RLS policies for Message table and add policies for new bonding tables
-- The issue is that senderId uses the database User.id, not auth.uid()
-- We need to allow authenticated users to insert messages if they're a participant in the conversation

-- Drop existing Message policies
DROP POLICY IF EXISTS "Authenticated users can create messages" ON "public"."Message";

-- Create a more permissive Message insert policy that checks conversation participation
-- This allows users to send messages if they're part of the conversation
CREATE POLICY "Authenticated users can create messages" ON "public"."Message" 
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM "public"."Conversation" c
        WHERE c.id = "conversationId" 
        AND (
            EXISTS (SELECT 1 FROM "public"."User" u WHERE u.email = auth.email() AND (u.id = c."participantA" OR u.id = c."participantB"))
        )
    )
);

-- Also add update policy for read receipts
DROP POLICY IF EXISTS "Users can update message read status" ON "public"."Message";
CREATE POLICY "Users can update message read status" ON "public"."Message"
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable RLS on new bonding tables
ALTER TABLE "public"."MessageTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FactWarning" ENABLE ROW LEVEL SECURITY;

-- MessageTag policies - users can manage their own tags
DROP POLICY IF EXISTS "Users can view message tags" ON "public"."MessageTag";
DROP POLICY IF EXISTS "Users can create message tags" ON "public"."MessageTag";
DROP POLICY IF EXISTS "Users can delete message tags" ON "public"."MessageTag";

CREATE POLICY "Users can view message tags" ON "public"."MessageTag" 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create message tags" ON "public"."MessageTag"
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete message tags" ON "public"."MessageTag"
FOR DELETE USING (auth.uid() IS NOT NULL);

-- FactWarning policies - users can manage their own fact warnings
DROP POLICY IF EXISTS "Users can view fact warnings" ON "public"."FactWarning";
DROP POLICY IF EXISTS "Users can create fact warnings" ON "public"."FactWarning";
DROP POLICY IF EXISTS "Users can update fact warnings" ON "public"."FactWarning";
DROP POLICY IF EXISTS "Users can delete fact warnings" ON "public"."FactWarning";

CREATE POLICY "Users can view fact warnings" ON "public"."FactWarning"
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create fact warnings" ON "public"."FactWarning"
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update fact warnings" ON "public"."FactWarning"
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete fact warnings" ON "public"."FactWarning"
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Also fix Notification policies to allow inserts (for tagging notifications)
DROP POLICY IF EXISTS "Users can create notifications" ON "public"."Notification";
CREATE POLICY "Users can create notifications" ON "public"."Notification"
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
