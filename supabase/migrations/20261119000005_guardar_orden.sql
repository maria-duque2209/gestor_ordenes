-- =====================================================================
-- guardar_orden: crea o edita una orden en UNA transacción, junto con
-- (opcional) un cliente nuevo, sus responsables y su precio.
-- security invoker: se aplican las políticas RLS del usuario que llama.
-- =====================================================================

create or replace function public.guardar_orden(
  p_order_id      uuid,          -- null = crear
  p_orden         jsonb,         -- campos de la orden
  p_responsables  uuid[]  default '{}',
  p_cliente_nuevo jsonb   default null,  -- si viene, se crea y se usa
  p_precio        numeric default null,  -- null = no tocar el precio
  p_anticipo      numeric default null
)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_client uuid;
  v_id     uuid;
  v_numero text;
  v_resp   uuid[] := coalesce(p_responsables, '{}');
begin
  if coalesce(public.current_rol()::text, '') not in ('admin', 'ventas') then
    raise exception 'No tienes permiso para crear o editar órdenes' using errcode = '42501';
  end if;

  -- No asignar usuarios inactivos (los que ya estaban asignados se respetan)
  if exists (
    select 1 from unnest(v_resp) as r(uid)
    where not exists (select 1 from public.profiles p where p.id = r.uid and p.activo)
      and not exists (
        select 1 from public.order_assignees a where a.order_id = p_order_id and a.user_id = r.uid
      )
  ) then
    raise exception 'Algún responsable no existe o está inactivo' using errcode = '22023';
  end if;

  -- Cliente
  if p_cliente_nuevo is not null then
    insert into public.clients (nombre, documento, telefono, email, direccion)
    values (
      p_cliente_nuevo ->> 'nombre',
      nullif(trim(p_cliente_nuevo ->> 'documento'), ''),
      nullif(trim(p_cliente_nuevo ->> 'telefono'), ''),
      nullif(trim(lower(p_cliente_nuevo ->> 'email')), ''),
      nullif(trim(p_cliente_nuevo ->> 'direccion'), '')
    )
    returning id into v_client;
  else
    v_client := nullif(p_orden ->> 'client_id', '')::uuid;
  end if;

  if v_client is null then
    raise exception 'Selecciona o crea un cliente' using errcode = '22023';
  end if;

  if p_order_id is null then
    insert into public.orders (
      client_id, tipo_producto, descripcion, alto, ancho, profundidad, unidad,
      color, material, especificaciones, notas_especificaciones, prioridad,
      fecha_inicio, fecha_entrega
    ) values (
      v_client,
      (p_orden ->> 'tipo_producto')::public.tipo_producto,
      p_orden ->> 'descripcion',
      (p_orden ->> 'alto')::numeric,
      (p_orden ->> 'ancho')::numeric,
      (p_orden ->> 'profundidad')::numeric,
      coalesce((p_orden ->> 'unidad')::public.unidad_medida, 'cm'),
      p_orden ->> 'color',
      p_orden ->> 'material',
      coalesce(p_orden -> 'especificaciones', '{}'::jsonb),
      p_orden ->> 'notas_especificaciones',
      coalesce((p_orden ->> 'prioridad')::public.prioridad_orden, 'normal'),
      (p_orden ->> 'fecha_inicio')::date,
      (p_orden ->> 'fecha_entrega')::date
    )
    returning id, numero into v_id, v_numero;
  else
    update public.orders o set
      client_id              = v_client,
      tipo_producto          = (p_orden ->> 'tipo_producto')::public.tipo_producto,
      descripcion            = p_orden ->> 'descripcion',
      alto                   = (p_orden ->> 'alto')::numeric,
      ancho                  = (p_orden ->> 'ancho')::numeric,
      profundidad            = (p_orden ->> 'profundidad')::numeric,
      unidad                 = coalesce((p_orden ->> 'unidad')::public.unidad_medida, 'cm'),
      color                  = p_orden ->> 'color',
      material               = p_orden ->> 'material',
      especificaciones       = coalesce(p_orden -> 'especificaciones', '{}'::jsonb),
      notas_especificaciones = p_orden ->> 'notas_especificaciones',
      prioridad              = coalesce((p_orden ->> 'prioridad')::public.prioridad_orden, 'normal'),
      fecha_inicio           = (p_orden ->> 'fecha_inicio')::date,
      fecha_entrega          = (p_orden ->> 'fecha_entrega')::date
    where o.id = p_order_id
    returning o.id, o.numero into v_id, v_numero;

    if v_id is null then
      raise exception 'Orden no encontrada' using errcode = 'P0002';
    end if;
  end if;

  -- Responsables: dejar exactamente los indicados
  delete from public.order_assignees a
  where a.order_id = v_id and not (a.user_id = any (v_resp));

  insert into public.order_assignees (order_id, user_id)
  select v_id, r.uid from unnest(v_resp) as r(uid)
  on conflict do nothing;

  -- Precio
  if p_precio is not null then
    insert into public.order_pricing (order_id, precio, anticipo)
    values (v_id, p_precio, coalesce(p_anticipo, 0))
    on conflict (order_id) do update
      set precio = excluded.precio, anticipo = excluded.anticipo;
  end if;

  return jsonb_build_object('id', v_id, 'numero', v_numero);
end;
$$;

revoke execute on function public.guardar_orden(uuid, jsonb, uuid[], jsonb, numeric, numeric) from anon, public;
grant  execute on function public.guardar_orden(uuid, jsonb, uuid[], jsonb, numeric, numeric) to authenticated;

grant execute on function public.guardar_orden(uuid, jsonb, uuid[], jsonb, numeric, numeric) to service_role;
