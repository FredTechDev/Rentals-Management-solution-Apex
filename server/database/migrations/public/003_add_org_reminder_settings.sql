DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'organizations' 
    AND TABLE_SCHEMA = 'public' 
    AND COLUMN_NAME = 'auto_reminders_enabled'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN auto_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE public.organizations ADD COLUMN reminder_settings JSONB NOT NULL DEFAULT '{"before_days": 3, "after_days": 3}'::jsonb;
  END IF;
END $$;
