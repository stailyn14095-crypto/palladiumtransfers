-- Migration: Final Security Adjustments
-- Date: 2026-04-20
-- Sources: fix_security_warnings.sql, fix_security_vulnerabilities.sql

-- This script ensures RLS is enabled on all tables (except those explicitly disabled in previous migrations)
-- and applies a consistent policy for authenticated users.

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        -- Skip tables that we deliberately want without RLS if any, 
        -- but based on the project, we want everything secured for authenticated users.
    ) LOOP
        -- 1. Enable RLS for the table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        
        -- 2. Drop existing wide-open policies if they exist (to clean up)
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.%I;', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated access to %I" ON public.%I;', r.tablename, r.tablename);
        
        -- 3. Create a unified policy
        EXECUTE format('CREATE POLICY "Allow authenticated access" ON public.%I FOR ALL USING (auth.role() = ''authenticated'');', r.tablename);
        
    END LOOP;
END $$;
