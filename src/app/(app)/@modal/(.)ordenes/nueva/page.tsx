import { Suspense } from "react";
import { Modal } from "@/components/modal";
import { NuevaOrden, NuevaOrdenSkeleton } from "@/app/(app)/ordenes/nueva-orden";

/** «Nueva orden» abierta desde la app: se muestra en un modal sobre la página actual. */
export default function NuevaOrdenModal() {
  return (
    <Modal title="Nueva orden" description="El número se asigna automáticamente al guardar.">
      <Suspense fallback={<NuevaOrdenSkeleton />}>
        <NuevaOrden enModal />
      </Suspense>
    </Modal>
  );
}
