# Implementación Supabase

Se ha integrado Supabase en el proyecto para gestionar la autenticación y la base de datos de las secciones.

## Configuración Realizada

1.  **Cliente Supabase**: Configurado en `services/supabase.ts` usando las variables de entorno en `.env.local`.
2.  **Autenticación**:
    -   Se ha añadido una pantalla de Login/Registro (`components/Auth.tsx`).
    -   El acceso a la aplicación requiere estar autenticado.
    -   Puedes registrarte con un email y contraseña cualquiera (Supabase está configurado, asegúrate de confirmar el email si está activado, o desactivar "Confirm Email" en el panel de Supabase si es para desarrollo).
3.  **Base de Datos**:
    -   Se han creado las tablas para: `drivers`, `vehicles`, `bookings`, `flights`, `clients`, `tariffs`, `shifts`, `invoices`, `reports`, `profiles`.
    -   Se han habilitado políticas RLS (Row Level Security) para que solo los usuarios autenticados puedan leer/escribir.
4.  **Datos de Prueba (Seed)**:
    -   Se ha ejecutado un script SQL inicial para poblar la base de datos con datos de ejemplo (Conductores, Vehículos, Reservas, etc.).
    -   El script usado está en `seed.sql`.

## Cómo Probar

1.  Ejecuta la aplicación: `npm run dev`.
2.  Verás la pantalla de Login.
3.  Crea una cuenta nueva pulsando en "¿No tienes cuenta? Regístrate".
4.  Una vez dentro, verás el Dashboard con datos reales de la BBDD.
5.  Navega a las secciones (Reservas, Conductores, etc.) para ver los registros cargados desde Supabase.

## Notas

-   Las vistas ahora obtienen los datos de Supabase en lugar de usar datos estáticos.
-   Los botones de "Nuevo [Elemento]" están preparados visualmente, pero requerirán implementar los formularios de creación conectados a la función `addItem` del hook `useSupabaseData`.
