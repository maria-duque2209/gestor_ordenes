"use client";

import { createClient } from "@/lib/supabase/client";
import { BUCKET_FOTOS } from "@/lib/photos-constants";

export interface FotoPendiente {
  id: string;
  blob: Blob;
  preview: string;
  nombre: string;
  descripcion: string;
}

/**
 * Sube las fotos de una orden: primero el archivo a Storage y luego su
 * registro en order_photos. Devuelve los mensajes de error (vacío = todo bien).
 */
export async function subirFotos(orderId: string, fotos: FotoPendiente[]): Promise<string[]> {
  const supabase = createClient();
  const errores: string[] = [];

  for (const foto of fotos) {
    const path = `${orderId}/${crypto.randomUUID()}.jpg`;
    const { error: upError } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(path, foto.blob, { contentType: "image/jpeg", upsert: false });
    if (upError) {
      errores.push(`${foto.nombre}: ${upError.message}`);
      continue;
    }

    const { error: dbError } = await supabase
      .from("order_photos")
      .insert({ order_id: orderId, storage_path: path, descripcion: foto.descripcion.trim() || null });
    if (dbError) {
      await supabase.storage.from(BUCKET_FOTOS).remove([path]);
      errores.push(`${foto.nombre}: ${dbError.message}`);
    }
  }
  return errores;
}
