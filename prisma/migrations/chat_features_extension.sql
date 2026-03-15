-- ============================================
-- Chat Feature Extensions - Migration SQL
-- Run against your Supabase PostgreSQL database
-- All changes are additive (no destructive ops)
-- ============================================

-- Feature 3: Chat Stack (batch messages)
-- Links messages that were sent as a stack/batch
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "stack_id" TEXT;
CREATE INDEX IF NOT EXISTS "Message_stack_id_idx" ON "Message"("stack_id");

-- Feature 5: /poll (interactive polls)
-- Stores individual votes for each poll option
CREATE TABLE IF NOT EXISTS "PollVotes" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "pollId" TEXT NOT NULL,
    "optionIndex" INT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("pollId", "userId")
);
CREATE INDEX IF NOT EXISTS "PollVotes_pollId_idx" ON "PollVotes"("pollId");

-- Feature 5: /eta (user location tracking for ETA estimation)
-- Stores the last-known location for each user (one row per user)
CREATE TABLE IF NOT EXISTS "user_locations" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("userId")
);

-- Feature 5: /sticky (pinned note in chat header)
-- Stores encrypted sticky note text per conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "sticky_note" TEXT;
