import { requireRole } from "@/lib/auth";
import { Modal } from "@/components/modal";
import { ClienteForm } from "@/app/(app)/clientes/cliente-form";

/** «Nuevo cliente» abierto desde la app: modal sobre la página actual. */
export default async function NuevoClienteModal() {
  await requireRole("admin", "ventas");
  return (
    <Modal title="Nuevo cliente" description="Nombre obligatorio; el documento no se puede repetir." size="md">
      <div className="card mb-5 p-5 sm:p-6">
        <ClienteForm enModal />
      </div>
    </Modal>
  );
}
