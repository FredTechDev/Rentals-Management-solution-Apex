DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'mpesa_shortcode'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN mpesa_shortcode TEXT;
    ALTER TABLE public.organizations ADD COLUMN mpesa_consumer_key TEXT;
    ALTER TABLE public.organizations ADD COLUMN mpesa_consumer_secret TEXT;
    ALTER TABLE public.organizations ADD COLUMN mpesa_passkey TEXT;
    ALTER TABLE public.organizations ADD COLUMN bank_details JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.organizations ADD COLUMN payment_methods TEXT[] DEFAULT '{"mpesa"}'::text[];
  END IF;
END $$;
