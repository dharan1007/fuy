-- Add type and mediaUrl columns to Message table to support media sharing
ALTER TABLE "Message" ADD COLUMN "type" text DEFAULT 'text';
ALTER TABLE "Message" ADD COLUMN "mediaUrl" text;
