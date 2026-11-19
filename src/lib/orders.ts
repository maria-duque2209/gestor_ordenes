import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_FOTOS } from "@/lib/photos-constants";
import type { CurrentUser } from "@/lib/auth";
import type { Client, Order, OrderPhoto, OrderPricing, Profile } from "@/lib/types";

export type Responsable = Pick<Profile, "id" | "nombre" | "email" | "rol">;

export interface OrdenDetalle extends Order {
  cliente: Pick<Client, "id" | "nombre" | "documento" | "telefono" | "email" | "direccion">;
  creador: Pick<Profile, "nombre"> | null;
  responsables: Responsable[];
  precio: OrderPricing | null;
  fotos: (OrderPhoto & { url: string | null; autor: string | null })[];
}

/** Carga una orden con todo lo necesario para el detalle, el formulario o el PDF. RLS decide si se ve. */
export async function getOrden(id: string, user: CurrentUser): Promise<OrdenDetalle | null> {
  const supabase = await createClient();
  const verPrecio = user.rol === "admin" || user.rol === "ventas";

  const [ordenRes, fotosRes, precioRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `*,
         cliente:clients (id, nombre, documento, telefono, email, direccion),
         creador:profiles!orders_created_by_fkey (nombre),
         asignaciones:order_assignees (usuario:profiles (id, nombre, email, rol))`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_photos")
      .select("*, autor:profiles (nombre)")
      .eq("order_id", id)
      .order("created_at"),
    verPrecio
      ? supabase.from("order_pricing").select("*").eq("order_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (ordenRes.error || !ordenRes.data) return null;
  const { asignaciones, ...orden } = ordenRes.data as Order & {
    cliente: OrdenDetalle["cliente"];
    creador: OrdenDetalle["creador"];
    asignaciones: { usuario: Responsable | null }[];
  };

  const fotosRaw = (fotosRes.data ?? []) as (OrderPhoto & { autor: { nombre: string } | null })[];
  let urls: Record<string, string> = {};
  if (fotosRaw.length) {
    const { data: firmadas } = await supabase.storage
      .from(BUCKET_FOTOS)
      .createSignedUrls(
        fotosRaw.map((f) => f.storage_path),
        60 * 60,
      );
    urls = Object.fromEntries(
      (firmadas ?? [])
        .filter((s) => s.signedUrl && s.path)
        .map((s) => [s.path as string, s.signedUrl as string]),
    );
  }

  return {
    ...orden,
    responsables: asignaciones
      .map((a) => a.usuario)
      .filter((u): u is Responsable => !!u)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    precio: (precioRes.data as OrderPricing | null) ?? null,
    fotos: fotosRaw.map(({ autor, ...f }) => ({ ...f, url: urls[f.storage_path] ?? null, autor: autor?.nombre ?? null })),
  };
}

/** Usuarios activos que se pueden asignar como responsables. */
export async function getUsuariosAsignables(): Promise<Responsable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nombre, email, rol")
    .eq("activo", true)
    .order("nombre");
  return (data ?? []) as Responsable[];
}

export type ClienteOpcion = Pick<Client, "id" | "nombre" | "documento" | "telefono">;

export async function getClientesOpciones(): Promise<ClienteOpcion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, nombre, documento, telefono")
    .order("nombre")
    .limit(2000);
  return (data ?? []) as ClienteOpcion[];
}
