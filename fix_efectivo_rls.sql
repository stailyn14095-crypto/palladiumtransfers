-- Este script deshabilita temporalmente el "Row Level Security" (RLS) en las nuevas tablas
-- del Cuadre de Efectivo para permitir que la aplicación pueda leer y escribir datos.
-- Puedes ejecutar esto en la pestaña "SQL Editor" de tu proyecto en Supabase.

ALTER TABLE efectivo_cycles DISABLE ROW LEVEL SECURITY;
ALTER TABLE efectivo_aliases DISABLE ROW LEVEL SECURITY;
ALTER TABLE efectivo_initial_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE efectivo_uber_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE efectivo_vgd_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE efectivo_entrega_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE efectivo_expense_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE efectivo_upload_history DISABLE ROW LEVEL SECURITY;
