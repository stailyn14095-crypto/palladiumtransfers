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

## Seguridad de la API y Permisos (Grants) - Mayo/Octubre 2026

A partir del 30 de mayo de 2026 (para nuevos proyectos) y del 30 de octubre de 2026 (para todos los proyectos existentes), Supabase introduce un cambio de seguridad crítico: **las tablas del esquema `public` ya no se exponen de forma implícita a la API de datos (PostgREST, supabase-js, GraphQL)**. Cada tabla nueva requiere permisos explícitos (`GRANT`).

### Solución Implementada en el Proyecto:

Para garantizar que el Palladium Operations Hub continúe funcionando sin interrupciones y sin requerir mantenimiento complejo manual por cada nueva tabla, hemos incorporado la migración `20260519100000_supabase_api_grants.sql` que realiza lo siguiente de manera automatizada:

1. **Permisos Existentes**: Otorga permisos explícitos de `SELECT` a `anon` y permisos de `SELECT, INSERT, UPDATE, DELETE` a `authenticated` y `service_role` en todas las tablas existentes en el esquema `public`.
2. **Permisos por Defecto para Futuras Tablas**: Configura privilegios por defecto (`ALTER DEFAULT PRIVILEGES`) en el esquema `public`. Esto significa que **cualquier tabla creada en futuras migraciones recibirá de forma automática estos mismos permisos**, por lo que no es estrictamente necesario escribir sentencias `GRANT` manuales en cada nueva migración de creación de tabla.

> [!NOTE]
> Las políticas RLS (Row Level Security) siguen siendo el mecanismo principal para controlar qué filas y acciones puede realizar cada usuario autenticado u anónimo. Los `GRANTs` de API solo habilitan que PostgREST e interactores externos reconozcan la tabla, pero la seguridad interna sigue regida estrictamente por RLS.

## Notas

-   Las vistas ahora obtienen los datos de Supabase de forma reactiva.
-   Toda la seguridad está gestionada por políticas RLS en el esquema `public`.
