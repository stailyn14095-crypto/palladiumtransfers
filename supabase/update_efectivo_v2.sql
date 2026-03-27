-- Update Efectivo Schema to v2
-- This script adds deduplication fields and improvements from the legacy prototype.

-- 1. Update efectivo_uber_records
ALTER TABLE public.efectivo_uber_records ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.efectivo_uber_records ADD COLUMN IF NOT EXISTS fecha_hora TEXT;

-- Update unique constraint for Uber (using transaction_id instead of period for better deduplication)
-- We first remove the old one if it exists.
ALTER TABLE public.efectivo_uber_records DROP CONSTRAINT IF EXISTS efectivo_uber_records_driver_name_period_cycle_id_key;
-- Note: In some Supabase setups, constraints might have different names. 
-- This one matches the standard naming in the previous schema.sql.

-- Add the new unique constraint
ALTER TABLE public.efectivo_uber_records ADD CONSTRAINT efectivo_uber_records_tx_cycle_unique UNIQUE (transaction_id, cycle_id);

-- 2. Update efectivo_vgd_records
-- Ensure vgd_id and cycle_id are unique together to prevent duplicates on re-upload
ALTER TABLE public.efectivo_vgd_records ADD CONSTRAINT efectivo_vgd_records_id_cycle_unique UNIQUE (vgd_id, cycle_id);

-- 3. Ensure RLS is disabled as requested by the previous fix script
ALTER TABLE public.efectivo_uber_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.efectivo_vgd_records DISABLE ROW LEVEL SECURITY;
