-- Migración: Fichajes Digitales (Normativa 2025-2026)
-- Implementación de Geolocalización y Audit Trail

-- 1. Asegurarnos de que existe la tabla driver_logs
CREATE TABLE IF NOT EXISTS public.driver_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    type TEXT DEFAULT 'WORK',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Añadir campos para geolocalización y dispositivos a driver_logs
ALTER TABLE public.driver_logs 
ADD COLUMN IF NOT EXISTS clock_in_location TEXT,
ADD COLUMN IF NOT EXISTS clock_out_location TEXT,
ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 3. Crear tabla de auditoría (Audit Trail inmutable)
CREATE TABLE IF NOT EXISTS public.driver_logs_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id UUID REFERENCES public.driver_logs(id) ON DELETE CASCADE,
    operation TEXT NOT NULL, -- 'UPDATE' o 'DELETE'
    old_clock_in TIMESTAMPTZ,
    new_clock_in TIMESTAMPTZ,
    old_clock_out TIMESTAMPTZ,
    new_clock_out TIMESTAMPTZ,
    old_type TEXT,
    new_type TEXT,
    modified_by TEXT, -- Email o ID del admin/usuario que modificó
    reason TEXT NOT NULL,
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en la tabla de auditoría
ALTER TABLE public.driver_logs_audit ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para auditoría (solo lectura para administradores, o inserción permitida)
CREATE POLICY "Allow authenticated access to driver_logs_audit" ON public.driver_logs_audit FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Crear un trigger para registrar modificaciones automáticamente en driver_logs
-- Esto garantiza la inalterabilidad sin rastro.

CREATE OR REPLACE FUNCTION log_driver_logs_modifications()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Solo registrar si han cambiado los campos críticos de horario o tipo
        IF OLD.clock_in IS DISTINCT FROM NEW.clock_in OR 
           OLD.clock_out IS DISTINCT FROM NEW.clock_out OR 
           OLD.type IS DISTINCT FROM NEW.type THEN
            
            INSERT INTO public.driver_logs_audit(
                log_id, operation, 
                old_clock_in, new_clock_in, 
                old_clock_out, new_clock_out,
                old_type, new_type,
                modified_by, reason
            ) VALUES (
                NEW.id, 'UPDATE',
                OLD.clock_in, NEW.clock_in,
                OLD.clock_out, NEW.clock_out,
                OLD.type, NEW.type,
                current_setting('request.jwt.claims', true)::json->>'email', -- Intentar extraer el email del JWT si está disponible
                COALESCE(current_setting('app.audit_reason', true), 'Modificación administrativa') -- Razón inyectada por la app, por defecto genérica
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.driver_logs_audit(
            log_id, operation, 
            old_clock_in, new_clock_in, 
            old_clock_out, new_clock_out,
            old_type, new_type,
            modified_by, reason
        ) VALUES (
            OLD.id, 'DELETE',
            OLD.clock_in, NULL,
            OLD.clock_out, NULL,
            OLD.type, NULL,
            current_setting('request.jwt.claims', true)::json->>'email',
            COALESCE(current_setting('app.audit_reason', true), 'Eliminación administrativa')
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si existe para recrearlo
DROP TRIGGER IF EXISTS trigger_driver_logs_audit ON public.driver_logs;

-- Crear el trigger
CREATE TRIGGER trigger_driver_logs_audit
AFTER UPDATE OR DELETE ON public.driver_logs
FOR EACH ROW EXECUTE FUNCTION log_driver_logs_modifications();
