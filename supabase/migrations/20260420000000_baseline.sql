-- Baseline Migration: Reconstructing the core schema
-- Date: 2026-04-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tables Base
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    itv DATE,
    km INTEGER DEFAULT 0,
    last_service DATE,
    insurance_expiry DATE,
    status TEXT DEFAULT 'Operativo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    vehicle_plate TEXT REFERENCES public.vehicles(plate) ON DELETE SET NULL,
    avatar TEXT,
    status TEXT DEFAULT 'Off',
    compliance BOOLEAN DEFAULT true,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tariffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    base_price NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route TEXT,
    passenger TEXT,
    time TIMESTAMPTZ,
    status TEXT DEFAULT 'Pending',
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    assigned_driver_name TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number TEXT NOT NULL,
    origin TEXT,
    scheduled TIMESTAMPTZ,
    estimated TIMESTAMPTZ,
    delay INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Scheduled',
    passenger TEXT,
    pax_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    type TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'staff',
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple "Authenticated Access" policies for everything as a baseline
-- In a production environment, these should be more specific.
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('CREATE POLICY "Allow authenticated access to %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;
