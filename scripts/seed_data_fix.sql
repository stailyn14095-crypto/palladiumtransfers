-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX BOOKING DATA
-- Matches the tariffs shown in your screenshot

-- 1. Clear existing incomplete tariffs
TRUNCATE TABLE public.tariffs RESTART IDENTITY CASCADE;

-- 2. Insert proper tariffs with origin and destination as seen in screenshot
INSERT INTO public.tariffs (origin, destination, class, base_price, type, name, created_at) VALUES
('ALICANTE AEROPUERTO (ALC)', 'Alacant/Alicante', 'Standard', 35.00, 'Fija', 'ALICANTE AEROPUERTO (ALC) - Alacant/Alicante', NOW()),
('ALICANTE AEROPUERTO (ALC)', 'Altea', 'Standard', 85.00, 'Fija', 'ALICANTE AEROPUERTO (ALC) - Altea', NOW()),
('ALICANTE AEROPUERTO (ALC)', 'Calp', 'Standard', 110.00, 'Fija', 'ALICANTE AEROPUERTO (ALC) - Calp', NOW()),
('ALICANTE AEROPUERTO (ALC)', 'Alfàs del Pi, l''', 'Standard', 75.00, 'Fija', 'ALICANTE AEROPUERTO (ALC) - Alfàs del Pi, l''', NOW()),
('ALICANTE AEROPUERTO (ALC)', 'Benidorm', 'Standard', 65.00, 'Fija', 'ALICANTE AEROPUERTO (ALC) - Benidorm', NOW());

-- 3. Also populate municipalities table to ensure dropdowns have these names
INSERT INTO public.municipalities (name, type, cod_prov, created_at) VALUES
('ALICANTE AEROPUERTO (ALC)', 'aeropuerto', '03', NOW()),
('Alacant/Alicante', 'municipio', '03', NOW()),
('Altea', 'municipio', '03', NOW()),
('Calp', 'municipio', '03', NOW()),
('Alfàs del Pi, l''', 'municipio', '03', NOW()),
('Benidorm', 'municipio', '03', NOW());

-- 4. Enable RLS for public read
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access on tariffs" ON public.tariffs;
CREATE POLICY "Allow authenticated read access on tariffs" ON public.tariffs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read access on municipalities" ON public.municipalities;
CREATE POLICY "Allow authenticated read access on municipalities" ON public.municipalities FOR SELECT TO authenticated USING (true);
