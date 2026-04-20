-- Migration: Vehicle Expenses Table
-- Date: 2026-04-20
-- Source: create_vehicle_expenses.sql

CREATE TABLE IF NOT EXISTS public.vehicle_expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurar RLS
ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
DROP POLICY IF EXISTS "Allow authenticated access to vehicle_expenses" ON public.vehicle_expenses;
CREATE POLICY "Allow authenticated access to vehicle_expenses" 
    ON public.vehicle_expenses FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
