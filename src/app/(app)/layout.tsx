import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { AppNav } from "@/components/app-nav";

/**
 * Layout de las pantallas autenticadas. La sesión se lee dentro de un
 * <Suspense> (requisito de Cache Components): el esqueleto se muestra al
 * instante y el menú y el contenido llegan en streaming.
 */
export default function AppLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell modal={modal}>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const user = await getCurrentUser();
  const items = navForRole(user.rol);

  return (
    <div className="min-h-dvh lg:pl-72 print:pl-0">
      <AppNav user={user} items={items} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pt-8 print:max-w-none print:p-0">{children}</main>
      {/* Slot @modal: «Nueva orden» abierta desde la app */}
      {modal}
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-dvh lg:pl-72 print:pl-0">
      <div className="fixed inset-y-0 left-0 hidden w-72 bg-turbo-900 lg:block" />
      <div className="h-14 bg-turbo-900 lg:hidden" />
      <div className="hidden h-[72px] border-b border-slate-200 bg-white lg:block" />
      <div className="mx-auto max-w-7xl animate-pulse space-y-4 px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="h-8 w-56 rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-200" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
