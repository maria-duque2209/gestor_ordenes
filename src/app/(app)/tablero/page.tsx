import type { Metadata } from "next";
import { EnConstruccion, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Tablero" };

export default function Page() {
  return (
    <>
      <PageHeader title="Tablero" />
      <EnConstruccion fase={4} detalle="Tablero Kanban por estado, con alertas de órdenes atrasadas o próximas a su fecha de entrega." />
    </>
  );
}
