-- =====================================================================
-- Gestor de Órdenes de Producción — esquema inicial
-- Tablas, enumeraciones, numeración secuencial e historial de auditoría
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enumeraciones
-- ---------------------------------------------------------------------
create type public.rol_usuario   as enum ('admin', 'ventas', 'taller');
create type public.tipo_producto as enum ('subwoofer', 'altavoz', 'otro');
create type public.estado_orden  as enum (
  'pendiente', 'en_produccion', 'control_calidad', 'terminada', 'entregada', 'cancelada'
);
create type public.prioridad_orden as enum ('baja', 'normal', 'alta', 'urgente');
create type public.unidad_medida   as enum ('cm', 'mm', 'in');

-- ---------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  email      text not null,
  rol        public.rol_usuario not null default 'taller',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Configuración general (clave/valor)
-- ---------------------------------------------------------------------
create table public.app_settings (
  clave       text primary key,
  valor       jsonb not null,
  descripcion text,
  updated_at  timestamptz not null default now()
);

insert into public.app_settings (clave, valor, descripcion) values
  ('taller_ver_todas', 'false'::jsonb,
   'Si es true, los usuarios de taller ven todas las órdenes; si es false, solo las asignadas.');

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (length(trim(nombre)) > 0),
  documento  text,
  telefono   text,
  email      text,
  direccion  text,
  notas      text,
  created_at timestamptz not null default now()
);

create index clients_nombre_idx    on public.clients (lower(nombre));
create index clients_documento_idx on public.clients (documento);

-- ---------------------------------------------------------------------
-- Órdenes
-- ---------------------------------------------------------------------
create sequence public.orders_numero_seq as bigint start with 1 increment by 1 no cycle;

create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  numero_seq           bigint not null unique,
  numero               text   not null unique,
  client_id            uuid   not null references public.clients (id) on delete restrict,
  tipo_producto        public.tipo_producto not null,
  descripcion          text,
  alto                 numeric(10, 2) check (alto is null or alto > 0),
  ancho                numeric(10, 2) check (ancho is null or ancho > 0),
  profundidad          numeric(10, 2) check (profundidad is null or profundidad > 0),
  unidad               public.unidad_medida not null default 'cm',
  color                text,
  material             text,
  especificaciones     jsonb not null default '{}'::jsonb,
  notas_especificaciones text,
  estado               public.estado_orden    not null default 'pendiente',
  prioridad            public.prioridad_orden not null default 'normal',
  fecha_inicio         date,
  fecha_entrega        date,
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint orders_fechas_chk check (
    fecha_inicio is null or fecha_entrega is null or fecha_entrega >= fecha_inicio
  )
);

create index orders_client_idx        on public.orders (client_id);
create index orders_estado_idx        on public.orders (estado);
create index orders_fecha_entrega_idx on public.orders (fecha_entrega);

create table public.order_assignees (
  order_id uuid not null references public.orders (id)   on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (order_id, user_id)
);
create index order_assignees_user_idx on public.order_assignees (user_id);

create table public.order_photos (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  storage_path text not null unique,
  descripcion  text,
  uploaded_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index order_photos_order_idx on public.order_photos (order_id);

-- Notas de avance (taller, ventas o admin)
create table public.order_notes (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null default auth.uid(),
  texto      text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now()
);
create index order_notes_order_idx on public.order_notes (order_id);

-- Historial de auditoría. Solo se escribe desde triggers (security definer).
create table public.order_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  accion     text not null,
  cambio     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index order_history_order_idx on public.order_history (order_id, created_at);

-- =====================================================================
-- Funciones auxiliares de permisos
-- =====================================================================

-- Rol del usuario actual (null si no existe o está inactivo)
create or replace function public.current_rol()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$
  select p.rol from public.profiles p where p.id = auth.uid() and p.activo
$$;

create or replace function public.taller_ve_todas()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select (s.valor)::boolean from public.app_settings s where s.clave = 'taller_ver_todas'), false)
$$;

-- ¿El usuario actual puede ver la orden?
create or replace function public.puede_ver_orden(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.current_rol()
    when 'admin'  then true
    when 'ventas' then true
    when 'taller' then public.taller_ve_todas() or exists (
      select 1 from public.order_assignees a
      where a.order_id = p_order_id and a.user_id = auth.uid()
    )
    else false
  end
$$;

-- =====================================================================
-- Triggers
-- =====================================================================

-- Crear perfil al registrar un usuario en auth.users.
-- El rol se lee de raw_app_meta_data (solo lo puede fijar el service role),
-- nunca de raw_user_meta_data (que el propio usuario controla).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_rol public.rol_usuario;
begin
  begin
    v_rol := coalesce((new.raw_app_meta_data ->> 'rol')::public.rol_usuario, 'taller');
  exception when invalid_text_representation then
    v_rol := 'taller';
  end;

  -- Si el usuario no lo creó un administrador (sin rol en app_metadata),
  -- el perfil nace inactivo: un registro por cuenta propia no da acceso.
  insert into public.profiles (id, nombre, email, rol, activo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    v_rol,
    coalesce(new.raw_app_meta_data, '{}'::jsonb) ? 'rol'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Numeración: siempre la asigna la BD; no se puede fijar ni modificar a mano.
-- security definer: los usuarios no tienen acceso directo a la secuencia,
-- así nadie puede consumir números llamando a nextval() por su cuenta.
create or replace function public.orders_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.numero_seq := nextval('public.orders_numero_seq');
  new.numero     := 'OP-' || case
                      when new.numero_seq < 10000 then lpad(new.numero_seq::text, 4, '0')
                      else new.numero_seq::text
                    end;
  new.created_by := coalesce(auth.uid(), new.created_by);
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_before_insert
  before insert on public.orders
  for each row execute function public.orders_before_insert();

create or replace function public.orders_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.current_rol();
begin
  if new.numero is distinct from old.numero or new.numero_seq is distinct from old.numero_seq then
    raise exception 'El número de orden no se puede modificar';
  end if;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  -- Solo el administrador puede cancelar una orden o reabrir una cancelada.
  -- (auth.uid() es null cuando actúa el service role o un script del servidor.)
  if auth.uid() is not null and v_rol is distinct from 'admin'
     and new.estado is distinct from old.estado
     and (new.estado = 'cancelada' or old.estado = 'cancelada') then
    raise exception 'Solo un administrador puede cancelar o reabrir una orden';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_before_update
  before update on public.orders
  for each row execute function public.orders_before_update();

-- Historial de la orden
create or replace function public.orders_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old    jsonb;
  v_new    jsonb;
  v_cambio jsonb := '{}'::jsonb;
  v_key    text;
  v_ignorar text[] := array['updated_at', 'created_at', 'numero_seq'];
begin
  if tg_op = 'INSERT' then
    insert into public.order_history (order_id, user_id, accion, cambio)
    values (new.id, auth.uid(), 'creada',
            jsonb_build_object('numero', new.numero, 'estado', new.estado));
    return new;
  end if;

  v_old := to_jsonb(old);
  v_new := to_jsonb(new);

  for v_key in select jsonb_object_keys(v_new) loop
    if v_key = any (v_ignorar) then
      continue;
    end if;
    if v_new -> v_key is distinct from v_old -> v_key then
      v_cambio := v_cambio || jsonb_build_object(
        v_key, jsonb_build_object('antes', v_old -> v_key, 'despues', v_new -> v_key)
      );
    end if;
  end loop;

  if v_cambio = '{}'::jsonb then
    return new;
  end if;

  if v_cambio ? 'estado' then
    insert into public.order_history (order_id, user_id, accion, cambio)
    values (new.id, auth.uid(), 'cambio_estado', v_cambio -> 'estado');
    v_cambio := v_cambio - 'estado';
  end if;

  if v_cambio <> '{}'::jsonb then
    insert into public.order_history (order_id, user_id, accion, cambio)
    values (new.id, auth.uid(), 'edicion', v_cambio);
  end if;

  return new;
end;
$$;

create trigger orders_audit
  after insert or update on public.orders
  for each row execute function public.orders_audit();

-- Historial de responsables, fotos y notas
create or replace function public.order_children_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row    record;
  v_accion text;
  v_cambio jsonb;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;

  -- Si la orden entera se está borrando, no registrar los hijos.
  if not exists (select 1 from public.orders o where o.id = v_row.order_id) then
    return null;
  end if;

  case tg_table_name
    when 'order_assignees' then
      v_accion := case tg_op when 'INSERT' then 'responsable_asignado' else 'responsable_quitado' end;
      v_cambio := jsonb_build_object(
        'user_id', v_row.user_id,
        'nombre', (select p.nombre from public.profiles p where p.id = v_row.user_id)
      );
    when 'order_photos' then
      v_accion := case tg_op when 'INSERT' then 'foto_agregada' else 'foto_eliminada' end;
      v_cambio := jsonb_build_object('foto_id', v_row.id, 'descripcion', v_row.descripcion);
    when 'order_notes' then
      v_accion := case tg_op when 'INSERT' then 'nota_agregada' else 'nota_eliminada' end;
      v_cambio := jsonb_build_object('nota_id', v_row.id, 'texto', v_row.texto);
  end case;

  insert into public.order_history (order_id, user_id, accion, cambio)
  values (v_row.order_id, auth.uid(), v_accion, v_cambio);
  return null;
end;
$$;

create trigger order_assignees_audit
  after insert or delete on public.order_assignees
  for each row execute function public.order_children_audit();
create trigger order_photos_audit
  after insert or delete on public.order_photos
  for each row execute function public.order_children_audit();
create trigger order_notes_audit
  after insert or delete on public.order_notes
  for each row execute function public.order_children_audit();

-- Cambio de estado (lo usan taller, ventas y admin). Taller no tiene permiso
-- UPDATE directo sobre orders: solo puede cambiar el estado por esta vía.
create or replace function public.cambiar_estado_orden(
  p_order_id uuid,
  p_estado   public.estado_orden,
  p_nota     text default null
)
returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare
  v_rol   public.rol_usuario := public.current_rol();
  v_orden public.orders;
begin
  if v_rol is null then
    raise exception 'Usuario no autorizado';
  end if;
  if not public.puede_ver_orden(p_order_id) then
    raise exception 'No tienes acceso a esta orden';
  end if;

  update public.orders set estado = p_estado
  where id = p_order_id
  returning * into v_orden;

  if v_orden.id is null then
    raise exception 'Orden no encontrada';
  end if;

  if p_nota is not null and length(trim(p_nota)) > 0 then
    insert into public.order_notes (order_id, user_id, texto)
    values (p_order_id, auth.uid(), trim(p_nota));
  end if;

  return v_orden;
end;
$$;

-- No permitir que un usuario cambie su propio rol o estado (solo admin)
create or replace function public.profiles_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.id := old.id;
  new.email := old.email;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();
