-- Migration: Update Efectivo Schema to v2
-- Date: 2026-04-20
-- Source: update_efectivo_v2.sql

-- 1. Update efectivo_uber_records
ALTER TABLE public.efectivo_uber_records ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.efectivo_uber_records ADD COLUMN IF NOT EXISTS fecha_hora TEXT;

-- Update unique constraint for Uber
ALTER TABLE public.efectivo_uber_records DROP CONSTRAINT IF EXISTS efectivo_uber_records_driver_name_period_cycle_id_key;
ALTER TABLE public.efectivo_uber_records ADD CONSTRAINT efectivo_uber_records_tx_cycle_unique UNIQUE (transaction_id, cycle_id);

-- 2. Update efectivo_vgd_records
ALTER TABLE public.efectivo_vgd_records ADD CONSTRAINT efectivo_vgd_records_id_cycle_unique UNIQUE (vgd_id, cycle_id);

-- 3. RLS handling (As per source file request)
-- Note: It is generally better to keep RLS enabled and use policies, 
-- but we follow the v2 script specification here.
ALTER TABLE public.efectivo_uber_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.efectivo_vgd_records DISABLE ROW LEVEL SECURITY;
