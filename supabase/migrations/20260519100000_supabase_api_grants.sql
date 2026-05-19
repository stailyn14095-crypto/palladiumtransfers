-- Migración: Asignación explícita de permisos (GRANTS) de la API para todas las tablas públicas
-- Fecha: 2026-05-19
-- Descripción: Garantiza la compatibilidad con las nuevas directivas de seguridad de Supabase para el esquema "public" (vigentes a partir del 30 de mayo de 2026 para nuevos proyectos y del 30 de octubre de 2026 para todos los existentes).

-- 1. Asignar permisos explícitos en las tablas existentes dentro del esquema 'public'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        -- Otorgar permiso SELECT al rol 'anon' (lectura pública controlada por políticas RLS)
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon;', r.tablename);
        
        -- Otorgar todos los privilegios estándar de manipulación de datos a 'authenticated' (usuarios logueados)
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', r.tablename);
        
        -- Otorgar todos los privilegios estándar de manipulación de datos a 'service_role' (scripts de backend / bypass RLS)
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role;', r.tablename);
    END LOOP;
END $$;

-- 2. Configurar privilegios por defecto (Default Privileges) para futuras tablas creadas en el esquema 'public'
-- Esto asegura que cualquier tabla que se cree en el futuro de forma automática reciba estos mismos permisos de API.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
