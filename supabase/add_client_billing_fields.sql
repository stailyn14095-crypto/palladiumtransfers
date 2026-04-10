-- Migración para añadir los campos necesarios para facturación española
-- Ley del IVA y Reglamento de Facturación (RD 1619/2012)

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS cif TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Opcionalmente, agregar comentarios a las columnas
COMMENT ON COLUMN public.clients.legal_name IS 'Nombre legal o Razón Social (necesario para facturación)';
COMMENT ON COLUMN public.clients.cif IS 'NIF o CIF del cliente (necesario para facturación)';
COMMENT ON COLUMN public.clients.address IS 'Dirección o domicilio fiscal';
COMMENT ON COLUMN public.clients.postal_code IS 'Código postal';
COMMENT ON COLUMN public.clients.city IS 'Ciudad o municipio';
