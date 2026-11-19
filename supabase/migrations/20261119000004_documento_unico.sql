-- =====================================================================
-- Documento/NIT único por cliente.
-- Se compara normalizado (sin puntos, guiones, espacios, en mayúsculas),
-- de modo que '900.123.456-1' y '9001234561' cuentan como el mismo.
-- Los clientes sin documento no se ven afectados.
-- =====================================================================

alter table public.clients
  add column documento_normalizado text
  generated always as (
    nullif(regexp_replace(upper(coalesce(documento, '')), '[^0-9A-Z]', '', 'g'), '')
  ) stored;

drop index if exists public.clients_documento_idx;
create unique index clients_documento_unico on public.clients (documento_normalizado);
