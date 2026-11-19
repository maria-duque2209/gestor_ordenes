"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { ROL_LABEL } from "@/lib/labels";
import type { NavItem } from "@/lib/nav";
import type { CurrentUser } from "@/lib/auth";
import { Icon } from "./icons";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ user, items }: { user: CurrentUser; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Principal">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBox = (
    <div className="border-t border-white/10 p-4">
      <p className="truncate text-sm font-medium text-white">{user.nombre || user.email}</p>
      <p className="truncate text-xs text-slate-400">
        {ROL_LABEL[user.rol]} · {user.email}
      </p>
      <Link
        href="/cuenta"
        onClick={() => setOpen(false)}
        className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
      >
        <Icon name="users" className="h-4 w-4" />
        Mi cuenta
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <Icon name="logout" className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-sm font-bold text-slate-900">
        OP
      </span>
      <span className="text-sm font-semibold text-white">Órdenes de Producción</span>
    </Link>
  );

  return (
    <>
      {/* Escritorio: barra lateral fija */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
        <div className="flex h-16 items-center px-6">{brand}</div>
        {links}
        {userBox}
      </aside>

      {/* Móvil: barra superior + panel deslizable */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-slate-900 px-4 lg:hidden">
        {brand}
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
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-slate-900">
            <div className="flex h-14 items-center justify-between px-4">
              {brand}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 rounded-lg p-2 text-slate-200 hover:bg-white/10"
                aria-label="Cerrar menú"
              >
                <Icon name="close" className="h-6 w-6" />
              </button>
            </div>
            {links}
            {userBox}
          </div>
        </div>
      )}
    </>
  );
}
