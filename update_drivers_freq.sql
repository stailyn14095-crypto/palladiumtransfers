-- Añadir columna para la frecuencia de rotación (semanas)
ALTER TABLE "public"."drivers"
ADD COLUMN IF NOT EXISTS "rotation_freq" integer DEFAULT 2;
