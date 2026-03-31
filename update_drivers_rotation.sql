-- Añadir campos de configuración de turnos a la tabla Conductores
ALTER TABLE "public"."drivers"
ADD COLUMN IF NOT EXISTS "rotation" text DEFAULT 'MAÑANA_SIEMPRE',
ADD COLUMN IF NOT EXISTS "rest_day" text DEFAULT '1',
ADD COLUMN IF NOT EXISTS "pattern" text DEFAULT 'Siempre 1';
