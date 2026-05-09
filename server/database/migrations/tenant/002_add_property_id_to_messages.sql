DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'messages' 
    AND COLUMN_NAME = 'property_id'
    AND TABLE_SCHEMA = current_schema()
  ) THEN
    ALTER TABLE messages ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;
