-- Migration: Invoicing Module
-- Date: 2026-04-20
-- Source: create_invoices_module.sql

-- 1. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC DEFAULT 0.0,
    tax_rate NUMERIC DEFAULT 10.0,
    tax_amount NUMERIC DEFAULT 0.0,
    total_amount NUMERIC DEFAULT 0.0,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Paid', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Alter bookings table to link invoices
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- 3. RLS Policies
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users for invoices"
ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
