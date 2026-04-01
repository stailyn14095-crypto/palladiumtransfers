-- Script para añadir desfase de rotación a los conductores
-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE "public"."drivers" 
ADD COLUMN IF NOT EXISTS "rotation_offset" integer DEFAULT 0;
