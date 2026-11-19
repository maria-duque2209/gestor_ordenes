import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { EnConstruccion, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Page() {
  await requireRole("admin");
  return (
    <>
      <PageHeader title="Usuarios" />
      <EnConstruccion fase={2} detalle="Invitar usuarios, asignar roles y desactivarlos." />
    </>
  );
}
