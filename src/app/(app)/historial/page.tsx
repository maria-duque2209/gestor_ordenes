import type { Metadata } from "next";
import { EnConstruccion, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Historial" };

export default function Page() {
  return (
    <>
      <PageHeader title="Historial" />
      <EnConstruccion fase={5} detalle="Órdenes terminadas y entregadas, filtrables y exportables." />
    </>
  );
}
