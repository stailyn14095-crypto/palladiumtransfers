-- This script enables Row-Level Security (RLS) for all tables in the public schema
-- and creates a default policy that allows full access to all authenticated users.
-- This is a response to the security vulnerability "Table publicly accessible".

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- 1. Enable RLS for the table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        
        -- 2. Drop existing wide-open policies if they exist
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.%I;', r.tablename);
        
        -- 3. Create a policy that allows all operations (SELECT, INSERT, UPDATE, DELETE) 
        -- but ONLY for authenticated users.
        EXECUTE format('CREATE POLICY "Allow full access to authenticated users" ON public.%I FOR ALL USING (auth.role() = ''authenticated'');', r.tablename);
        
        RAISE NOTICE 'Applied RLS and authenticated policy to table: %', r.tablename;
    END LOOP;
END $$;
