import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { EnConstruccion, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Configuración" };

export default async function Page() {
  await requireRole("admin");
  return (
    <>
      <PageHeader title="Configuración" />
      <EnConstruccion fase={2} detalle="Opciones generales, por ejemplo si el taller ve todas las órdenes o solo las asignadas." />
    </>
  );
}
