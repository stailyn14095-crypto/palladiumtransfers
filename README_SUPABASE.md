# Implementación Supabase

Se ha integrado Supabase en el proyecto para gestionar la autenticación y la base de datos de las secciones.

## Configuración Realizada

1.  **Cliente Supabase**: Configurado en `services/supabase.ts` usando las variables de entorno en `.env.local`.
2.  **Autenticación**:
    -   Se ha añadido una pantalla de Login/Registro (`components/Auth.tsx`).
    -   El acceso a la aplicación requiere estar autenticado.
3.  **Base de Datos y Migraciones**:
    -   Se ha estandarizado el historial de la base de datos en `supabase/migrations/` para soportar la **integración oficial con GitHub** (disponible desde Abril 2026 en todos los planes).
    -   Se han reconstruido las tablas base: `drivers`, `vehicles`, `bookings`, `flights`, `clients`, `tariffs`, `shifts`, `invoices`, `reports`, `profiles`.
    -   Se han habilitado políticas RLS (Row Level Security) globales para acceso autenticado.

## Integración con GitHub (CI/CD)

A partir de Abril 2026, Supabase permite desplegar migraciones automáticamente desde GitHub. Para activarlo:

1.  Ve al **Dashboard de Supabase** -> **Project Settings** -> **Integrations**.
2.  Busca **GitHub** y conecta tu repositorio `palladium-operations-hub`.
3.  Selecciona la rama `main` para despliegues automáticos.
4.  A partir de ahora, cada vez que hagas `git push` de nuevos archivos en `supabase/migrations/`, Supabase los aplicará automáticamente a tu base de datos de producción.

## Gestión de Base de Datos Local

Para añadir cambios a la base de datos:

1.  **Crear Migración**: `npx supabase migration new nombre_de_la_migracion`
2.  **Escribir SQL**: Edita el archivo generado en `supabase/migrations/`.
3.  **Desplegar**: Simplemente haz commit y push a GitHub.

## Datos de Prueba (Seed)

El script `seed.sql` contiene datos iniciales para desarrollo. Puedes aplicarlo manualmente desde el editor SQL de Supabase si necesitas resetear el entorno de pruebas.

## Notas

-   Las vistas ahora obtienen los datos de Supabase de forma reactiva.
-   Toda la seguridad está gestionada por políticas RLS en el esquema `public`.
