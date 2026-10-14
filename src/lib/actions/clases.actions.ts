"use server";

import { revalidatePath } from "next/cache";
import { dalCrearClase } from "@/lib/dal";
import { CrearClaseSchema } from "@/schemas";
import { Clase } from "@/types";
import { ActionResponse } from "./asistencia.actions";

export async function crearClaseAction(
  formData: Record<string, unknown>
): Promise<ActionResponse<Clase>> {
  try {
    const parseResult = CrearClaseSchema.safeParse(formData);

    if (!parseResult.success) {
      return {
        success: false,
        error: "Datos de la clase inválidos",
        validationErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const clase = await dalCrearClase(parseResult.data);

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clases");
    revalidatePath("/profesor/clases");

    return {
      success: true,
      data: clase,
      message: `Clase "${clase.nombre}" creada con éxito`,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al crear la clase";
    return { success: false, error: msg };
  }
}
