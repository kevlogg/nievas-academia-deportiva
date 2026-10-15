"use server";

import { revalidatePath } from "next/cache";
import {
  dalCrearClase,
  dalCrearListaAlumnos,
  dalActualizarListaAlumnos,
  dalEliminarListaAlumnos,
} from "@/lib/dal";
import { CrearClaseSchema, CrearListaAlumnosSchema } from "@/schemas";
import { Clase, ListaAlumnos } from "@/types";
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
    revalidatePath("/profesor/historial");
    revalidatePath("/admin/historial");

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

export async function crearListaAlumnosAction(
  formData: Record<string, unknown>
): Promise<ActionResponse<ListaAlumnos>> {
  try {
    const parseResult = CrearListaAlumnosSchema.safeParse(formData);

    if (!parseResult.success) {
      return {
        success: false,
        error: "Datos de la lista de alumnos inválidos",
        validationErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const lista = await dalCrearListaAlumnos(parseResult.data);

    revalidatePath("/profesor/clases");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clases");

    return {
      success: true,
      data: lista,
      message: `Lista de alumnos "${lista.nombre}" creada con éxito (${lista.alumnos_ids.length} alumnos)`,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al crear la lista de alumnos";
    return { success: false, error: msg };
  }
}

export async function actualizarListaAlumnosAction(
  listaId: string,
  formData: Record<string, unknown>
): Promise<ActionResponse<ListaAlumnos>> {
  try {
    const parseResult = CrearListaAlumnosSchema.safeParse(formData);

    if (!parseResult.success) {
      return {
        success: false,
        error: "Datos de la lista de alumnos inválidos",
        validationErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const lista = await dalActualizarListaAlumnos(listaId, parseResult.data);

    revalidatePath("/profesor/clases");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clases");

    return {
      success: true,
      data: lista,
      message: `Lista "${lista.nombre}" actualizada con éxito`,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al actualizar la lista de alumnos";
    return { success: false, error: msg };
  }
}

export async function eliminarListaAlumnosAction(
  listaId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const res = await dalEliminarListaAlumnos(listaId);

    revalidatePath("/profesor/clases");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clases");

    return {
      success: true,
      data: res,
      message: "Lista de alumnos eliminada con éxito",
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al eliminar la lista de alumnos";
    return { success: false, error: msg };
  }
}
