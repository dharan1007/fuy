-- FIX TRIGGER SCHEMA AND CACHE
-- Run this in Supabase SQL Editor

-- 1. Ensure TriggerCollection has updatedAt
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TriggerCollection' AND column_name = 'updatedAt') THEN
        ALTER TABLE "TriggerCollection" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 2. Ensure Trigger has updatedAt
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trigger' AND column_name = 'updatedAt') THEN
        ALTER TABLE "Trigger" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 3. Reload Schema Cache (Fixes PGRST204)
NOTIFY pgrst, 'reload config';
