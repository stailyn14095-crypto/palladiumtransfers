-- Migración para Flujo de Validación de Correcciones (Mutuo Acuerdo)
-- Fecha: 2026-04-21

CREATE TABLE public.time_correction_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id UUID REFERENCES public.driver_logs(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE, -- redundante pero útil para query
    requested_by VARCHAR(50) NOT NULL CHECK (requested_by IN ('ADMIN', 'DRIVER')),
    proposed_clock_in TIMESTAMPTZ,
    proposed_clock_out TIMESTAMPTZ,
    proposed_type VARCHAR(50) CHECK (proposed_type IN ('WORK', 'PAUSE')),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'APPROVED_BY_ADMIN', 'APPROVED_BY_DRIVER', 'REJECTED', 'APPLIED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255)
);

-- RLS
ALTER TABLE public.time_correction_requests ENABLE ROW LEVEL SECURITY;

-- Políticas
-- 1. Lectura: Todos (autenticados anon)
CREATE POLICY "Permitir lectura de peticiones"
    ON public.time_correction_requests
    FOR SELECT USING (true);

-- 2. Inserción: Cualquiera
CREATE POLICY "Permitir crear peticiones"
    ON public.time_correction_requests
    FOR INSERT WITH CHECK (true);

-- 3. Actualización: Cualquiera (para aceptar/rechazar)
CREATE POLICY "Permitir actualizar peticiones"
    ON public.time_correction_requests
    FOR UPDATE USING (true);

-- Notificar a Supabase Realtime si es necesario
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_correction_requests;
