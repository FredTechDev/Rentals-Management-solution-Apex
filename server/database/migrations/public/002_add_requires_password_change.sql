DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'users' 
    AND TABLE_SCHEMA = 'public' 
    AND COLUMN_NAME = 'requires_password_change'
  ) THEN
    ALTER TABLE public.users ADD COLUMN requires_password_change BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;
