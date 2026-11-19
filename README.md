# Órdenes de Producción

Aplicación web para crear, asignar, seguir e imprimir órdenes de producción de subwoofers y altavoces a medida.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Storage, RLS)

> Estado: **Fase 1 (base)**. Este README se completará en la Fase 7 con las instrucciones de uso y despliegue.

## Requisitos

- Node.js 22 o superior
- Un proyecto de [Supabase](https://supabase.com) (el plan gratuito sirve)

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crea un proyecto nuevo en supabase.com.
2. **Desactiva el registro público:** _Authentication → Sign In / Providers →_ desmarca _Allow new users to sign up_.
   Los usuarios los crea el administrador. Aunque alguien se registrara, su perfil quedaría inactivo.

### 2. Aplicar las migraciones

Opción A (sin instalar nada): en _SQL Editor_, ejecuta en orden el contenido de:

1. `supabase/migrations/20261119000001_esquema_inicial.sql`
2. `supabase/migrations/20261119000002_seguridad_rls.sql`
3. `supabase/migrations/20261119000003_precios.sql`
4. (opcional) `supabase/seed.sql`, con clientes de ejemplo

Opción B (CLI de Supabase):

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
```

### 3. Variables de entorno

Copia `.env.example` como `.env.local` y rellena los valores (_Project Settings → API Keys_):

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (o la anon key heredada) |
| `SUPABASE_SECRET_KEY` | Secret key (o service_role). **Solo servidor** |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la app |

### 4. Crear el primer administrador

```bash
npm install
npm run crear-admin -- admin@tuempresa.com "UnaContraseñaSegura" "Nombre Apellido"
```

### 5. Arrancar

```bash
npm run dev
```

Abre http://localhost:3000 e inicia sesión.

### Datos de demostración (opcional, solo desarrollo)

```bash
npm run seed:demo
```

Crea `admin@demo.local`, `ventas@demo.local`, `taller1@demo.local` y `taller2@demo.local` (contraseña `Demo1234!`), tres clientes y tres órdenes.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` / `npm run typecheck` | Linter y comprobación de tipos |
| `npm run test:db` | Prueba las migraciones, la numeración y los permisos (RLS) en un Postgres embebido (PGlite), sin Docker |
| `npm run crear-admin` | Crea o promueve un administrador |
| `npm run seed:demo` | Usuarios y órdenes de ejemplo |

## Seguridad y permisos

Los permisos se aplican en la base de datos (RLS) y también en la interfaz:

| | Admin | Ventas | Taller |
|---|:-:|:-:|:-:|
| Ver órdenes | todas | todas | asignadas (o todas, según la configuración `taller_ver_todas`) |
| Crear / editar órdenes | ✔ | ✔ | — |
| Cambiar estado | ✔ | ✔ (no cancela) | ✔ en sus órdenes (no cancela) |
| Cancelar / borrar órdenes | ✔ | — | — |
| Notas y fotos de avance | ✔ | ✔ | ✔ en sus órdenes |
| Ver / editar precio, anticipo y saldo | ✔ | ✔ | — |
| Crear / editar clientes | ✔ | ✔ | — |
| Usuarios y configuración | ✔ | — | — |

- El número de orden (`OP-0001`, `OP-0002`…) lo asigna un trigger con una `SEQUENCE`; no se puede fijar ni modificar a mano, y los usuarios no tienen acceso directo a la secuencia.
- Cada cambio (creación, estado, datos, responsables, fotos, notas, precios) queda en `order_history` con el usuario y la fecha. Solo lo escriben los triggers.
- Los precios están en una tabla aparte (`order_pricing`) porque RLS filtra filas y no columnas. Así el taller no puede leerlos aunque vea la orden, y tampoco ve los cambios de precio en el historial.
