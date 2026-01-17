-- Add editing support to Message table

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'isEdited') THEN
        ALTER TABLE "Message" ADD COLUMN "isEdited" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'updatedAt') THEN
        ALTER TABLE "Message" ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT NULL;
    END IF;
END $$;

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
