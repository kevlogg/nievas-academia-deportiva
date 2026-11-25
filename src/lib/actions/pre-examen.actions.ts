"use server";

import { revalidatePath } from "next/cache";
import {
  dalCrearPreExamen,
  dalEliminarPreExamen,
  dalGetPreExamenes,
  dalGetPreExamenesPorAlumno,
} from "@/lib/dal";
import { PreExamen, CrearPreExamenInput } from "@/types";
import { ActionResponse } from "./asistencia.actions";

/**
 * Registrar una nueva evaluación de pre-examen
 */
export async function crearPreExamenAction(
  data: CrearPreExamenInput
): Promise<ActionResponse<PreExamen>> {
  try {
    if (!data.alumno_id) {
      return {
        success: false,
        error: "Debe seleccionar un alumno para calificar el pre-examen.",
      };
    }

    if (!data.fecha) {
      return {
        success: false,
        error: "Debe indicar la fecha en que se realizó el pre-examen.",
      };
    }

    if (!data.kihon_nota || !data.kata_nota || !data.kumite_nota) {
      return {
        success: false,
        error: "Debe calificar las 3 instancias (Kihon, Kata y Kumite).",
      };
    }

    const nuevoPreExamen = await dalCrearPreExamen(data);

    revalidatePath("/pre-examen");
    revalidatePath("/admin/pre-examen");
    revalidatePath("/admin/alumnos");
    revalidatePath("/profesor/metricas");

    return {
      success: true,
      data: nuevoPreExamen,
    };
  } catch (err) {
    console.error("Error in crearPreExamenAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al registrar la evaluación del pre-examen.",
    };
  }
}

/**
 * Eliminar una evaluación de pre-examen
 */
export async function eliminarPreExamenAction(
  preExamenId: string
): Promise<ActionResponse<void>> {
  try {
    if (!preExamenId) {
      return {
        success: false,
        error: "ID de pre-examen no proporcionado.",
      };
    }

    await dalEliminarPreExamen(preExamenId);

    revalidatePath("/pre-examen");
    revalidatePath("/admin/pre-examen");
    revalidatePath("/admin/alumnos");

    return {
      success: true,
      data: undefined,
    };
  } catch (err) {
    console.error("Error in eliminarPreExamenAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al eliminar el pre-examen.",
    };
  }
}

/**
 * Obtener todos los pre-exámenes
 */
export async function getPreExamenesAction(): Promise<ActionResponse<PreExamen[]>> {
  try {
    const list = await dalGetPreExamenes();
    return {
      success: true,
      data: list,
    };
  } catch (err) {
    console.error("Error in getPreExamenesAction:", err);
    return {
      success: false,
      error: "Error al cargar la lista de pre-exámenes.",
    };
  }
}
