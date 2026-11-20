import { requireRole } from "@/lib/auth";
import { Modal } from "@/components/modal";
import { NuevoUsuarioForm } from "@/app/(app)/usuarios/nuevo/nuevo-usuario-form";

/** «Nuevo usuario» abierto desde la app: modal sobre la lista de usuarios. */
export default async function NuevoUsuarioModal() {
  await requireRole("admin");
  return (
    <Modal title="Nuevo usuario" description="Invítalo por email o créalo con una contraseña temporal." size="md">
      <div className="card mb-5 p-5 sm:p-6">
        <NuevoUsuarioForm enModal />
      </div>
    </Modal>
  );
}
