-- ==========================================
-- SCRIPT DE CORRECIÓN DE SEGURIDAD SUPABASE
-- ==========================================
-- Este script resuelve las 23 advertencias de seguridad detectadas:
-- 1. Corrige el search_path de las funciones (Vulnerabilidad de secuestro de ruta).
-- 2. Endurece las políticas RLS eliminando accesos públicos y "Always True".
-- 3. Unifica el acceso para que solo usuarios AUTENTICADOS puedan operar.

BEGIN;

-- 1. CORREGIR FUNCIONES (search_path mutable)
-- Las funciones de seguridad deben tener un search_path fijo para evitar ataques de inyección.
ALTER FUNCTION public.handle_new_user SET search_path = public;
ALTER FUNCTION public.is_admin SET search_path = public;

-- 2. REFORZAR POLÍTICAS RLS (Eliminar "Always True" y Accesos Públicos)
-- Nota: Si usas inserción pública para un formulario de contacto, deberías crear una política específica.
-- Por ahora, restringiremos todo a usuarios autenticados para máximo nivel de seguridad.

-- bookings
DROP POLICY IF EXISTS "Authenticated users full access bookings" ON public.bookings;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.bookings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.bookings;
DROP POLICY IF EXISTS "Enable public insert" ON public.bookings;
CREATE POLICY "Authenticated access only" ON public.bookings FOR ALL USING (auth.role() = 'authenticated');

-- clients
DROP POLICY IF EXISTS "Authenticated users full access clients" ON public.clients;
CREATE POLICY "Authenticated access only" ON public.clients FOR ALL USING (auth.role() = 'authenticated');

-- driver_locations (PELIGRO: Era público)
DROP POLICY IF EXISTS "Public access to driver locations" ON public.driver_locations;
CREATE POLICY "Authenticated access only" ON public.driver_locations FOR ALL USING (auth.role() = 'authenticated');

-- driver_logs (PELIGRO: Era público)
DROP POLICY IF EXISTS "Public access to driver logs" ON public.driver_logs;
CREATE POLICY "Authenticated access only" ON public.driver_logs FOR ALL USING (auth.role() = 'authenticated');

-- drivers
DROP POLICY IF EXISTS "Authenticated users full access drivers" ON public.drivers;
CREATE POLICY "Authenticated access only" ON public.drivers FOR ALL USING (auth.role() = 'authenticated');

-- flights (PELIGRO: Era público en UPDATE)
DROP POLICY IF EXISTS "Enable public update access for flights" ON public.flights;
CREATE POLICY "Authenticated access only" ON public.flights FOR ALL USING (auth.role() = 'authenticated');

-- invoices
DROP POLICY IF EXISTS "Authenticated users full access invoices" ON public.invoices;
CREATE POLICY "Authenticated access only" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');

-- municipalities
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.municipalities;
CREATE POLICY "Authenticated access only" ON public.municipalities FOR ALL USING (auth.role() = 'authenticated');

-- service_extras
DROP POLICY IF EXISTS "Authenticated users full access service_extras" ON public.service_extras;
CREATE POLICY "Authenticated access only" ON public.service_extras FOR ALL USING (auth.role() = 'authenticated');

-- shifts
DROP POLICY IF EXISTS "Authenticated users full access shifts" ON public.shifts;
CREATE POLICY "Authenticated access only" ON public.shifts FOR ALL USING (auth.role() = 'authenticated');

-- system_settings
DROP POLICY IF EXISTS "Authenticated users can delete system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can update system_settings" ON public.system_settings;
CREATE POLICY "Authenticated access only" ON public.system_settings FOR ALL USING (auth.role() = 'authenticated');

-- tariffs
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tariffs;
CREATE POLICY "Authenticated access only" ON public.tariffs FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_expenses
DROP POLICY IF EXISTS "Authenticated users full access vehicle expenses" ON public.vehicle_expenses;
CREATE POLICY "Authenticated access only" ON public.vehicle_expenses FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_maintenance (PELIGRO: Era público)
DROP POLICY IF EXISTS "Public Access" ON public.vehicle_maintenance;
CREATE POLICY "Authenticated access only" ON public.vehicle_maintenance FOR ALL USING (auth.role() = 'authenticated');

-- vehicles
DROP POLICY IF EXISTS "Authenticated users full access vehicles" ON public.vehicles;
CREATE POLICY "Authenticated access only" ON public.vehicles FOR ALL USING (auth.role() = 'authenticated');

COMMIT;

-- ====================================================================
-- NOTA IMPORTANTE:
-- Para resolver el aviso "Leaked Password Protection Disabled":
-- 1. Ve a tu panel de Supabase: Authentication > Settings > Password Security.
-- 2. Activa "Enable leaked password protection".
-- ====================================================================
