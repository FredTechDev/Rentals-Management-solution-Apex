DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'price_per_unit'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN price_per_unit NUMERIC(12, 2) DEFAULT 500.00;
    ALTER TABLE public.organizations ADD COLUMN billing_cycle_months INT DEFAULT 1; -- 1 month, 3 months, 12 months etc.
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'next_billing_date'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN next_billing_date TIMESTAMPTZ;
    ALTER TABLE public.subscriptions ADD COLUMN last_billed_at TIMESTAMPTZ;
    ALTER TABLE public.subscriptions ADD COLUMN billable_units_at_last_bill INT DEFAULT 0;
  END IF;
END $$;
