-- Añadir campos para el formulario de Fichar Entrada a driver_logs
ALTER TABLE public.driver_logs ADD COLUMN IF NOT EXISTS start_km integer;
ALTER TABLE public.driver_logs ADD COLUMN IF NOT EXISTS vehicle_condition text;
ALTER TABLE public.driver_logs ADD COLUMN IF NOT EXISTS fuel_level text;
ALTER TABLE public.driver_logs ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.driver_logs ADD COLUMN IF NOT EXISTS incidence_notes text;

-- Asegurar que existe el bucket para fotos si no estaba creado
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver_photos', 'driver_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de seguridad para el bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'driver_photos' );

CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'driver_photos' AND auth.role() IN ('authenticated', 'anon') );
