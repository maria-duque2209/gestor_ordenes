-- =====================================================================
-- Precios de las órdenes: precio, anticipo y saldo.
-- Van en una tabla aparte porque RLS filtra filas, no columnas: así el
-- taller (que sí ve la orden) no puede leer los importes.
-- =====================================================================

create table public.order_pricing (
  order_id   uuid primary key references public.orders (id) on delete cascade,
  precio     numeric(14, 2) not null default 0 check (precio >= 0),
  anticipo   numeric(14, 2) not null default 0 check (anticipo >= 0),
  saldo      numeric(14, 2) generated always as (precio - anticipo) stored,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint order_pricing_anticipo_chk check (anticipo <= precio)
);

create or replace function public.order_pricing_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger order_pricing_before_write
  before insert or update on public.order_pricing
  for each row execute function public.order_pricing_before_write();

-- Historial de precios (acción 'precio_actualizado', oculta para taller)
create or replace function public.order_pricing_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cambio jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_cambio := jsonb_build_object(
      'precio',   jsonb_build_object('antes', null, 'despues', new.precio),
      'anticipo', jsonb_build_object('antes', null, 'despues', new.anticipo)
    );
  else
    if new.precio is distinct from old.precio then
      v_cambio := v_cambio || jsonb_build_object(
        'precio', jsonb_build_object('antes', old.precio, 'despues', new.precio));
    end if;
    if new.anticipo is distinct from old.anticipo then
      v_cambio := v_cambio || jsonb_build_object(
        'anticipo', jsonb_build_object('antes', old.anticipo, 'despues', new.anticipo));
    end if;
    if v_cambio = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into public.order_history (order_id, user_id, accion, cambio)
  values (new.order_id, auth.uid(), 'precio_actualizado', v_cambio);
  return null;
end;
$$;

create trigger order_pricing_audit
  after insert or update on public.order_pricing
  for each row execute function public.order_pricing_audit();

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
alter table public.order_pricing enable row level security;

revoke all on public.order_pricing from anon;
grant select, insert, update, delete on public.order_pricing to authenticated;
revoke execute on function public.order_pricing_before_write() from anon, public, authenticated;
revoke execute on function public.order_pricing_audit()        from anon, public, authenticated;

create policy "pricing: admin y ventas leen"
  on public.order_pricing for select to authenticated
  using (public.current_rol() in ('admin', 'ventas'));

create policy "pricing: admin y ventas crean"
  on public.order_pricing for insert to authenticated
  with check (public.current_rol() in ('admin', 'ventas'));

create policy "pricing: admin y ventas editan"
  on public.order_pricing for update to authenticated
  using (public.current_rol() in ('admin', 'ventas'))
  with check (public.current_rol() in ('admin', 'ventas'));

create policy "pricing: admin borra"
  on public.order_pricing for delete to authenticated
  using (public.current_rol() = 'admin');

-- El taller no ve las entradas de precio en el historial.
drop policy "history: lectura" on public.order_history;
create policy "history: lectura"
  on public.order_history for select to authenticated
  using (
    public.puede_ver_orden(order_id)
    and (accion <> 'precio_actualizado' or public.current_rol() in ('admin', 'ventas'))
  );
