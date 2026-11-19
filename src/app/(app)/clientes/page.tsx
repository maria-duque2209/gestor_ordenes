import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import type { Client } from "@/lib/types";

export const metadata: Metadata = { title: "Clientes" };

const POR_PAGINA = 25;

/** Quita los caracteres con significado especial en los filtros de PostgREST. */
function limpiarBusqueda(q: string) {
  return q.replace(/[,()*%\\:"]/g, " ").trim().slice(0, 100);
}

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  await requireRole("admin", "ventas");
  const sp = await searchParams;
  const q = limpiarBusqueda(typeof sp.q === "string" ? sp.q : "");
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const desde = (pagina - 1) * POR_PAGINA;

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, nombre, documento, telefono, email", { count: "exact" })
    .order("nombre")
    .range(desde, desde + POR_PAGINA - 1);
  if (q) {
    const p = `%${q}%`;
    query = query.or(`nombre.ilike.${p},documento.ilike.${p},telefono.ilike.${p},email.ilike.${p}`);
  }
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const clientes = (data ?? []) as Pick<Client, "id" | "nombre" | "documento" | "telefono" | "email">[];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("pagina", String(p));
    const s = params.toString();
    return s ? `/clientes?${s}` : "/clientes";
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description={q ? `${total} resultado(s) para «${q}»` : `${total} cliente(s)`}
        actions={
          <Link href="/clientes/nuevo" className="btn-primary">
            Nuevo cliente
          </Link>
        }
      />

      {sp.eliminado && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Cliente eliminado.
        </p>
      )}

      <form role="search" className="mb-4 flex gap-2" action="/clientes">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre, documento, teléfono o email"
          className="input"
          aria-label="Buscar clientes"
        />
        <button type="submit" className="btn-secondary shrink-0">
          Buscar
        </button>
      </form>

      {clientes.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-500">
          {q ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Tabla en pantallas medianas y grandes */}
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/clientes/${c.id}`} className="hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.documento ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Lista en móvil */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {clientes.map((c) => (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="block px-4 py-3 active:bg-slate-50">
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-sm text-slate-500">
                    {[c.documento, c.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          {pagina > 1 ? (
            <Link href={href(pagina - 1)} className="btn-secondary">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={href(pagina + 1)} className="btn-secondary">
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
