-- =====================================================================
-- Row Level Security y almacenamiento de fotos
--   admin  : todo
--   ventas : clientes y órdenes (crear/editar), fotos, ver todo; no cancela
--   taller : ve órdenes asignadas (o todas si app_settings.taller_ver_todas),
--            cambia estado (vía cambiar_estado_orden), añade notas y fotos
-- =====================================================================

alter table public.profiles        enable row level security;
alter table public.app_settings    enable row level security;
alter table public.clients         enable row level security;
alter table public.orders          enable row level security;
alter table public.order_assignees enable row level security;
alter table public.order_photos    enable row level security;
alter table public.order_notes     enable row level security;
alter table public.order_history   enable row level security;

-- Permisos base: nada para anon; las políticas deciden para authenticated.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

-- Permisos explícitos (no dependen de la opción "Grant API access to new
-- tables automatically" del proyecto). service_role salta RLS y lo usan los
-- scripts del servidor (invitar usuarios, semillas).
grant usage on schema public to authenticated, service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on sequence public.orders_numero_seq from authenticated;
grant execute on function public.current_rol()                   to authenticated;
grant execute on function public.taller_ve_todas()               to authenticated;
grant execute on function public.puede_ver_orden(uuid)           to authenticated;
grant execute on function public.cambiar_estado_orden(uuid, public.estado_orden, text) to authenticated;

-- Funciones de trigger: no se llaman directamente.
revoke execute on function public.handle_new_user()       from authenticated;
revoke execute on function public.orders_before_insert()  from authenticated;
revoke execute on function public.orders_before_update()  from authenticated;
revoke execute on function public.orders_audit()          from authenticated;
revoke execute on function public.order_children_audit()  from authenticated;
revoke execute on function public.profiles_before_update() from authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "profiles: usuarios activos ven perfiles"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_rol() is not null);

create policy "profiles: admin actualiza"
  on public.profiles for update to authenticated
  using (public.current_rol() = 'admin')
  with check (public.current_rol() = 'admin');
-- Sin políticas de insert/delete: los perfiles los crea el trigger de auth.users
-- y se eliminan al borrar el usuario de Auth (service role).

-- ---------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------
create policy "settings: lectura"
  on public.app_settings for select to authenticated
  using (public.current_rol() is not null);

create policy "settings: admin actualiza"
  on public.app_settings for update to authenticated
  using (public.current_rol() = 'admin')
  with check (public.current_rol() = 'admin');

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
create policy "clients: lectura"
  on public.clients for select to authenticated
  using (public.current_rol() is not null);

create policy "clients: admin y ventas crean"
  on public.clients for insert to authenticated
  with check (public.current_rol() in ('admin', 'ventas'));

create policy "clients: admin y ventas editan"
  on public.clients for update to authenticated
  using (public.current_rol() in ('admin', 'ventas'))
  with check (public.current_rol() in ('admin', 'ventas'));

create policy "clients: admin borra"
  on public.clients for delete to authenticated
  using (public.current_rol() = 'admin');

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
create policy "orders: lectura según rol"
  on public.orders for select to authenticated
  using (public.puede_ver_orden(id));

create policy "orders: admin y ventas crean"
  on public.orders for insert to authenticated
  with check (public.current_rol() in ('admin', 'ventas'));

create policy "orders: admin y ventas editan"
  on public.orders for update to authenticated
  using (public.current_rol() in ('admin', 'ventas'))
  with check (public.current_rol() in ('admin', 'ventas'));

create policy "orders: admin borra"
  on public.orders for delete to authenticated
  using (public.current_rol() = 'admin');

-- ---------------------------------------------------------------------
-- order_assignees
-- ---------------------------------------------------------------------
create policy "assignees: lectura"
  on public.order_assignees for select to authenticated
  using (public.puede_ver_orden(order_id));

create policy "assignees: admin y ventas asignan"
  on public.order_assignees for insert to authenticated
  with check (public.current_rol() in ('admin', 'ventas'));

create policy "assignees: admin y ventas quitan"
  on public.order_assignees for delete to authenticated
  using (public.current_rol() in ('admin', 'ventas'));

-- ---------------------------------------------------------------------
-- order_photos
-- ---------------------------------------------------------------------
create policy "photos: lectura"
  on public.order_photos for select to authenticated
  using (public.puede_ver_orden(order_id));

create policy "photos: subir en órdenes visibles"
  on public.order_photos for insert to authenticated
  with check (public.puede_ver_orden(order_id) and uploaded_by = auth.uid());

create policy "photos: editar descripción (admin, ventas o autor)"
  on public.order_photos for update to authenticated
  using (public.current_rol() in ('admin', 'ventas') or uploaded_by = auth.uid())
  with check (public.puede_ver_orden(order_id));

create policy "photos: borrar (admin, ventas o autor)"
  on public.order_photos for delete to authenticated
  using (public.current_rol() in ('admin', 'ventas')
         or (uploaded_by = auth.uid() and public.puede_ver_orden(order_id)));

-- ---------------------------------------------------------------------
-- order_notes
-- ---------------------------------------------------------------------
create policy "notes: lectura"
  on public.order_notes for select to authenticated
  using (public.puede_ver_orden(order_id));

create policy "notes: añadir en órdenes visibles"
  on public.order_notes for insert to authenticated
  with check (public.puede_ver_orden(order_id) and user_id = auth.uid());

create policy "notes: admin borra"
  on public.order_notes for delete to authenticated
  using (public.current_rol() = 'admin');

-- ---------------------------------------------------------------------
-- order_history (solo lectura; lo escriben los triggers)
-- ---------------------------------------------------------------------
create policy "history: lectura"
  on public.order_history for select to authenticated
  using (public.puede_ver_orden(order_id));

revoke insert, update, delete on public.order_history from authenticated;

-- =====================================================================
-- Storage: bucket privado para fotos. Ruta: {order_id}/{archivo}
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-photos', 'order-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.storage_order_id(p_name text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function public.storage_order_id(text) to authenticated;

create policy "order-photos: lectura"
  on storage.objects for select to authenticated
  using (bucket_id = 'order-photos'
         and public.puede_ver_orden(public.storage_order_id(name)));

create policy "order-photos: subir"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'order-photos'
              and public.puede_ver_orden(public.storage_order_id(name)));

create policy "order-photos: borrar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'order-photos'
         and (public.current_rol() in ('admin', 'ventas') or owner_id = auth.uid()::text));
