"use server";

import { revalidatePath } from "next/cache";
import {
  dalCrearPreExamen,
  dalGuardarPreExamen,
  dalEliminarPreExamen,
  dalGetPreExamenes,
  dalGetPreExamenesPorAlumno,
  dalGetPreExamenSesiones,
  dalCrearPreExamenSesion,
  dalActualizarAlumnosPreExamenSesion,
  dalEliminarPreExamenSesion,
} from "@/lib/dal";
import {
  PreExamen,
  PreExamenSesion,
  CrearPreExamenInput,
  CrearPreExamenSesionInput,
} from "@/types";
import { ActionResponse } from "./asistencia.actions";

/**
 * Abrir/Crear una nueva fecha o mesa de pre-examen con los alumnos seleccionados
 */
export async function crearPreExamenSesionAction(
  data: CrearPreExamenSesionInput
): Promise<ActionResponse<PreExamenSesion>> {
  try {
    if (!data.fecha) {
      return {
        success: false,
        error: "Debe indicar la fecha de la mesa de pre-examen.",
      };
    }

    if (!data.alumnos_ids || data.alumnos_ids.length === 0) {
      return {
        success: false,
        error: "Debe seleccionar al menos un alumno para rendir el pre-examen.",
      };
    }

    const sesion = await dalCrearPreExamenSesion(data);

    revalidatePath("/pre-examen");
    revalidatePath("/admin/pre-examen");

    return {
      success: true,
      data: sesion,
    };
  } catch (err) {
    console.error("Error in crearPreExamenSesionAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al abrir la mesa de pre-examen.",
    };
  }
}

/**
 * Actualizar los alumnos convocados a una sesión existente de pre-examen
 */
export async function actualizarAlumnosSesionAction(
  sesionId: string,
  alumnosIds: string[]
): Promise<ActionResponse<PreExamenSesion>> {
  try {
    if (!sesionId) {
      return { success: false, error: "ID de sesión inválido." };
    }

    const updated = await dalActualizarAlumnosPreExamenSesion(sesionId, alumnosIds);
    if (!updated) {
      return { success: false, error: "No se encontró la sesión de pre-examen." };
    }

    revalidatePath("/pre-examen");
    revalidatePath("/admin/pre-examen");

    return {
      success: true,
      data: updated,
    };
  } catch (err) {
    console.error("Error in actualizarAlumnosSesionAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar la lista de alumnos.",
    };
  }
}

/**
 * Eliminar una sesión de pre-examen
 */
export async function eliminarPreExamenSesionAction(
  sesionId: string
): Promise<ActionResponse<void>> {
  try {
    if (!sesionId) {
      return { success: false, error: "ID de sesión inválido." };
    }

    await dalEliminarPreExamenSesion(sesionId);

    revalidatePath("/pre-examen");
    revalidatePath("/admin/pre-examen");

    return {
      success: true,
      data: undefined,
    };
  } catch (err) {
    console.error("Error in eliminarPreExamenSesionAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al eliminar la mesa de pre-examen.",
    };
  }
}

/**
 * Obtener todas las sesiones/fechas de pre-examen
 */
export async function getPreExamenSesionesAction(): Promise<ActionResponse<PreExamenSesion[]>> {
  try {
    const list = await dalGetPreExamenSesiones();
    return {
      success: true,
      data: list,
    };
  } catch (err) {
    console.error("Error in getPreExamenSesionesAction:", err);
    return {
      success: false,
      error: "Error al cargar las fechas de pre-examen.",
    };
  }
}

/**
 * Guardar/Actualizar la calificación reactiva de un alumno en la mesa de pre-examen (Upsert)
 */
export async function guardarPreExamenAction(
  data: CrearPreExamenInput
): Promise<ActionResponse<PreExamen>> {
  try {
    if (!data.alumno_id) {
      return {
        success: false,
        error: "Debe indicar el alumno a calificar.",
      };
    }

    if (!data.fecha) {
      return {
        success: false,
        error: "Debe indicar la fecha de la evaluación.",
      };
    }

    const resultado = await dalGuardarPreExamen(data);

    revalidatePath("/pre-examen");
    revalidatePath("/admin/pre-examen");
    revalidatePath("/admin/alumnos");
    revalidatePath("/profesor/metricas");

    return {
      success: true,
      data: resultado,
    };
  } catch (err) {
    console.error("Error in guardarPreExamenAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al guardar la calificación.",
    };
  }
}

/**
 * Registrar una nueva evaluación de pre-examen (alias de guardarPreExamenAction)
 */
export async function crearPreExamenAction(
  data: CrearPreExamenInput
): Promise<ActionResponse<PreExamen>> {
  return guardarPreExamenAction(data);
}

/**
 * Eliminar una evaluación de pre-examen individual
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
