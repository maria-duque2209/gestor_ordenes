import type { Metadata } from "next";
import { EnConstruccion, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Órdenes" };

export default function Page() {
  return (
    <>
      <PageHeader title="Órdenes" />
      <EnConstruccion fase={3} detalle="Aquí estarán el listado de órdenes con filtros, la creación y la vista de detalle." />
    </>
  );
}
