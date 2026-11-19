import { z } from "zod";

/** Estado devuelto por las Server Actions de formularios (useActionState). */
export interface FormState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
  /** Cliente que ya tiene el documento introducido (alta o edición de clientes). */
  duplicadoId?: string;
}

/** Convierte un FormData a un objeto plano de strings (para reponer valores tras un error). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

/** Texto opcional: cadena vacía → null. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { data: z.infer<T>; state?: undefined } | { data?: undefined; state: FormState } {
  const values = formValues(formData);
  const result = schema.safeParse(values);
  if (!result.success) {
    return {
      state: {
        error: "Revisa los campos marcados.",
        fieldErrors: z.flattenError(result.error).fieldErrors as FormState["fieldErrors"],
        values,
      },
    };
  }
  return { data: result.data };
}
