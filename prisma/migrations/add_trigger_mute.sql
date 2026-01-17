-- Add muteWarnings to TriggerCollection table

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TriggerCollection' AND column_name = 'muteWarnings') THEN
        ALTER TABLE "TriggerCollection" ADD COLUMN "muteWarnings" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
