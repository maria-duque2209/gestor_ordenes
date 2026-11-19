"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { ROL_LABEL } from "@/lib/labels";
import { NAV_SECTION_LABEL, type NavItem, type NavSection } from "@/lib/nav";
import type { CurrentUser } from "@/lib/auth";
import { Icon } from "./icons";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function iniciales(texto: string) {
  const partes = texto.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Migas de pan a partir de la ruta: /ordenes/<id>/editar → Órdenes / Detalle / Editar. */
function migas(pathname: string, items: NavItem[]): { label: string; href?: string }[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [{ label: "Panel" }];
  const base = items.find((i) => i.href === `/${segs[0]}`);
  const out: { label: string; href?: string }[] = [
    { label: base?.label ?? (segs[0] === "cuenta" ? "Mi cuenta" : segs[0]), href: `/${segs[0]}` },
  ];
  segs.slice(1).forEach((s, i) => {
    const href = `/${segs.slice(0, i + 2).join("/")}`;
    const label = s === "nueva" || s === "nuevo" ? "Nuevo registro" : s === "editar" ? "Editar" : "Detalle";
    out.push({ label, href });
  });
  out[out.length - 1].href = undefined;
  return out;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-white/10 font-bold text-brand-200 ring-1 ring-white/15 ${
          compact ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
        }`}
      >
        OP
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold text-white">Órdenes de Producción</span>
        {!compact && (
          <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">Taller · Audio</span>
        )}
      </span>
    </Link>
  );
}

function BuscarOrden({ variant }: { variant: "dark" | "light" }) {
  const dark = variant === "dark";
  return (
    <form action="/ordenes" role="search" className="relative">
      <label htmlFor={`buscar-${variant}`} className="sr-only">
        Buscar orden por número
      </label>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id={`buscar-${variant}`}
        name="q"
        type="search"
        inputMode="search"
        placeholder="Buscar orden (OP-0012)"
        className={
          dark
            ? "w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-brand-300/60 focus:outline-none focus:ring-2 focus:ring-brand-300/20"
            : "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        }
      />
    </form>
  );
}

export function AppNav({ user, items }: { user: CurrentUser; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cerrar = () => setOpen(false);

  const secciones = (Object.keys(NAV_SECTION_LABEL) as NavSection[])
    .map((s) => ({ s, items: items.filter((i) => i.section === s) }))
    .filter((g) => g.items.length > 0);

  const links = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5" aria-label="Principal">
      {secciones.map(({ s, items: grupo }) => (
        <div key={s}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {NAV_SECTION_LABEL[s]}
          </p>
          <ul className="space-y-1">
            {grupo.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="relative">
                  {active && (
                    <span className="absolute -left-4 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brand-300" aria-hidden="true" />
                  )}
                  <Link
                    href={item.href}
                    onClick={cerrar}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-navy-700 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon} className={`h-5 w-5 ${active ? "text-brand-200" : "text-slate-400"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const nombre = user.nombre || user.email;
  const userBox = (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
          {iniciales(nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{nombre}</p>
          <p className="truncate text-xs text-slate-400">{ROL_LABEL[user.rol]}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/cuenta"
          onClick={cerrar}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <Icon name="users" className="h-4 w-4" />
          Mi cuenta
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            Salir
          </button>
        </form>
      </div>
    </div>
  );

  const sidebarBody = (
    <>
      <div className="px-4 pt-4">
        <BuscarOrden variant="dark" />
      </div>
      {links}
      {userBox}
    </>
  );

  const ruta = migas(pathname, items);

  return (
    <>
      {/* Escritorio: barra lateral fija */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-navy-900 lg:flex">
        <div className="flex h-[72px] items-center border-b border-white/10 px-6">
          <Brand />
        </div>
        {sidebarBody}
      </aside>

      {/* Escritorio: barra superior con migas y búsqueda */}
      <header className="sticky top-0 z-20 hidden h-[72px] items-center justify-between gap-6 border-b border-slate-200 bg-white/85 px-8 backdrop-blur lg:flex">
        <nav aria-label="Ruta" className="min-w-0">
          <ol className="flex items-center gap-2 text-sm">
            {ruta.map((m, i) => (
              <li key={i} className="flex min-w-0 items-center gap-2">
                {i > 0 && <span className="text-slate-300">/</span>}
                {m.href ? (
                  <Link href={m.href} className="truncate text-slate-500 hover:text-slate-900">
                    {m.label}
                  </Link>
                ) : (
                  <span className="truncate font-semibold text-slate-900" aria-current="page">
                    {m.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="w-80">
          <BuscarOrden variant="light" />
        </div>
      </header>

      {/* Móvil: barra superior + panel deslizable */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-navy-900 px-4 lg:hidden">
        <Brand compact />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-mr-2 rounded-lg p-2 text-slate-200 hover:bg-white/10"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-navy-950/60" aria-label="Cerrar menú" onClick={cerrar} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy-900">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <Brand compact />
              <button
                type="button"
                onClick={cerrar}
                className="-mr-2 rounded-lg p-2 text-slate-200 hover:bg-white/10"
                aria-label="Cerrar menú"
              >
                <Icon name="close" className="h-6 w-6" />
              </button>
            </div>
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
}
