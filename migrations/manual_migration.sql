-- Manual Migration for Post Social Features
-- Run this in your Supabase SQL Editor

-- Create PostLike table
CREATE TABLE IF NOT EXISTS "PostLike" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostLike_userId_postId_key" UNIQUE ("userId", "postId")
);

-- Create PostComment table
CREATE TABLE IF NOT EXISTS "PostComment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- Create PostShare table
CREATE TABLE IF NOT EXISTS "PostShare" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "toUserId" TEXT,
  "toGroupId" TEXT,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PostShare_pkey" PRIMARY KEY ("id")
);

-- Create Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "postId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for PostLike
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for PostComment
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for PostShare
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for PostLike
CREATE INDEX IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId");
CREATE INDEX IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");

-- Create indexes for PostComment
CREATE INDEX IF NOT EXISTS "PostComment_postId_idx" ON "PostComment"("postId");
CREATE INDEX IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId");

-- Create indexes for PostShare
CREATE INDEX IF NOT EXISTS "PostShare_postId_idx" ON "PostShare"("postId");
CREATE INDEX IF NOT EXISTS "PostShare_userId_idx" ON "PostShare"("userId");
CREATE INDEX IF NOT EXISTS "PostShare_toUserId_idx" ON "PostShare"("toUserId");
CREATE INDEX IF NOT EXISTS "PostShare_toGroupId_idx" ON "PostShare"("toGroupId");

-- Create indexes for Notification
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Generate cuid2-compatible IDs using gen_random_uuid for now
-- (Supabase uses UUID v4, which is compatible enough for our purposes)
