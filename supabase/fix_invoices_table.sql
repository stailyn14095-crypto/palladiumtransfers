-- Run this script to update the existing invoices table with the required columns for generating legal invoices.

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Also ensure bookings table has the invoice_id linkage
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
