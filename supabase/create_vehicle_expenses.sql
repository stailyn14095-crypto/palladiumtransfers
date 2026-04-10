-- ==========================================
-- CREATE VEHICLE EXPENSES TABLE
-- ==========================================
-- This table stores all operational expenses related to vehicles
-- (Fuel, Maintenance, Insurance, Tolls, ITV, etc.)

CREATE TABLE IF NOT EXISTS public.vehicle_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL, -- Assuming vehicles table uses UUIDs
    expense_type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_vehicle
        FOREIGN KEY (vehicle_id) 
        REFERENCES public.vehicles (id)
        ON DELETE CASCADE
);

-- Configurar RLS (Row Level Security)
ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;

-- Politicas RLS (Solo usuarios autenticados)
DROP POLICY IF EXISTS "Authenticated access only" ON public.vehicle_expenses;
CREATE POLICY "Authenticated access only" ON public.vehicle_expenses 
    FOR ALL 
    USING (auth.role() = 'authenticated');
