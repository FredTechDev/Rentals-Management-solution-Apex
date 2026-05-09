DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'organizations' 
    AND TABLE_SCHEMA = 'public' 
    AND COLUMN_NAME = 'global_chat_enabled'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN global_chat_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;
