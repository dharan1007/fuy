-- Add collaboration features for Canvas, Hopin, Breathing, etc.

-- Extend FeatureSession table with collaboration data
ALTER TABLE "FeatureSession"
ADD COLUMN IF NOT EXISTS "canvasData" TEXT, -- JSON: blocks, drawing state
ADD COLUMN IF NOT EXISTS "autoSaveEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "lastSavedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT,
ADD COLUMN IF NOT EXISTS "syncVersion" INTEGER DEFAULT 0;

-- Create CollaborationInvite table for messaging system
CREATE TABLE IF NOT EXISTS "CollaborationInvite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "featureType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | REJECTED | CANCELLED
  "messageId" TEXT,
  "conversationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "CollaborationInvite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FeatureSession" ("id") ON DELETE CASCADE,
  CONSTRAINT "CollaborationInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "CollaborationInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "CollaborationInvite_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE
);

-- Create indexes for CollaborationInvite
CREATE INDEX IF NOT EXISTS "CollaborationInvite_sessionId_idx" ON "CollaborationInvite"("sessionId");
CREATE INDEX IF NOT EXISTS "CollaborationInvite_fromUserId_idx" ON "CollaborationInvite"("fromUserId");
CREATE INDEX IF NOT EXISTS "CollaborationInvite_toUserId_idx" ON "CollaborationInvite"("toUserId");
CREATE INDEX IF NOT EXISTS "CollaborationInvite_conversationId_idx" ON "CollaborationInvite"("conversationId");
CREATE INDEX IF NOT EXISTS "CollaborationInvite_status_idx" ON "CollaborationInvite"("status");
CREATE INDEX IF NOT EXISTS "CollaborationInvite_createdAt_idx" ON "CollaborationInvite"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationInvite_sessionId_fromUserId_toUserId_idx" ON "CollaborationInvite"("sessionId", "fromUserId", "toUserId");

-- Create CollaborationUpdate table for tracking real-time changes
CREATE TABLE IF NOT EXISTS "CollaborationUpdate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "operation" TEXT NOT NULL, -- ADD_BLOCK | UPDATE_BLOCK | REMOVE_BLOCK | DRAW | SAVE
  "blockId" TEXT,
  "data" TEXT NOT NULL, -- JSON: the actual change data
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "synced" BOOLEAN DEFAULT false,
  CONSTRAINT "CollaborationUpdate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FeatureSession" ("id") ON DELETE CASCADE,
  CONSTRAINT "CollaborationUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Create indexes for CollaborationUpdate
CREATE INDEX IF NOT EXISTS "CollaborationUpdate_sessionId_idx" ON "CollaborationUpdate"("sessionId");
CREATE INDEX IF NOT EXISTS "CollaborationUpdate_userId_idx" ON "CollaborationUpdate"("userId");
CREATE INDEX IF NOT EXISTS "CollaborationUpdate_timestamp_idx" ON "CollaborationUpdate"("timestamp");
CREATE INDEX IF NOT EXISTS "CollaborationUpdate_synced_idx" ON "CollaborationUpdate"("synced");
CREATE INDEX IF NOT EXISTS "CollaborationUpdate_sessionId_timestamp_idx" ON "CollaborationUpdate"("sessionId", "timestamp");

-- Update FeatureSession indexes
CREATE INDEX IF NOT EXISTS "FeatureSession_lastModifiedBy_idx" ON "FeatureSession"("lastModifiedBy");
CREATE INDEX IF NOT EXISTS "FeatureSession_updatedAt_idx" ON "FeatureSession"("updatedAt");

-- Enable RLS on new tables (Supabase)
ALTER TABLE "CollaborationInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CollaborationUpdate" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CollaborationInvite
CREATE POLICY "CollaborationInvite_select_own" ON "CollaborationInvite"
  FOR SELECT USING (
    auth.uid()::text = "fromUserId" OR
    auth.uid()::text = "toUserId"
  );

CREATE POLICY "CollaborationInvite_insert_own" ON "CollaborationInvite"
  FOR INSERT WITH CHECK (auth.uid()::text = "fromUserId");

CREATE POLICY "CollaborationInvite_update_recipient" ON "CollaborationInvite"
  FOR UPDATE USING (auth.uid()::text = "toUserId")
  WITH CHECK (auth.uid()::text = "toUserId");

-- RLS Policies for CollaborationUpdate
CREATE POLICY "CollaborationUpdate_select_participants" ON "CollaborationUpdate"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "FeatureSessionParticipant"
      WHERE "sessionId" = "CollaborationUpdate"."sessionId"
      AND "userId" = auth.uid()::text
    )
  );

CREATE POLICY "CollaborationUpdate_insert_own" ON "CollaborationUpdate"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");
