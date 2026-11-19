import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { EnConstruccion, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Clientes" };

export default async function Page() {
  await requireRole("admin", "ventas");
  return (
    <>
      <PageHeader title="Clientes" />
      <EnConstruccion fase={2} detalle="Alta, edición y búsqueda de clientes." />
    </>
  );
}
