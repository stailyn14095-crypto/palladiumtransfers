-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- Enable public read access for authenticated users on tariffs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tariffs' AND policyname = 'Allow authenticated read access on tariffs'
    ) THEN
        CREATE POLICY "Allow authenticated read access on tariffs" 
        ON public.tariffs 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END
$$;

-- Enable public read access for authenticated users on municipalities
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'municipalities' AND policyname = 'Allow authenticated read access on municipalities'
    ) THEN
        CREATE POLICY "Allow authenticated read access on municipalities" 
        ON public.municipalities 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END
$$;

-- Enable public read access for authenticated users on service_extras
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_extras' AND policyname = 'Allow authenticated read access on service_extras'
    ) THEN
        CREATE POLICY "Allow authenticated read access on service_extras" 
        ON public.service_extras 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END
$$;
