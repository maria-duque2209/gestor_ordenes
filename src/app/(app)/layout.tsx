import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { AppNav } from "@/components/app-nav";

/**
 * Layout de las pantallas autenticadas. La sesión se lee dentro de un
 * <Suspense> (requisito de Cache Components): el esqueleto se muestra al
 * instante y el menú y el contenido llegan en streaming.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const items = navForRole(user.rol);

  return (
    <div className="min-h-dvh lg:pl-64">
      <AppNav user={user} items={items} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-dvh lg:pl-64">
      <div className="fixed inset-y-0 left-0 hidden w-64 bg-slate-900 lg:block" />
      <div className="h-14 bg-slate-900 lg:hidden" />
      <div className="mx-auto max-w-7xl animate-pulse space-y-4 px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-32 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}
