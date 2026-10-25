"use server";

import { revalidatePath } from "next/cache";
import {
  dalCrearTorneo,
  dalActualizarTorneo,
  dalEliminarTorneo,
  dalGetTorneoById,
} from "@/lib/dal";
import { Torneo, TipoMedalla } from "@/types";
import { ActionResponse } from "./asistencia.actions";

export interface CrearTorneoInput {
  nombre: string;
  fecha: string;
  lugar?: string | null;
  descripcion?: string | null;
  participaciones: Array<{
    alumno_id: string;
    categoria?: string | null;
    puesto_premio: string;
    medalla?: TipoMedalla | null;
    notas?: string | null;
  }>;
}

/**
 * Crear un nuevo torneo con sus competidores y premios
 */
export async function crearTorneoAction(
  data: CrearTorneoInput
): Promise<ActionResponse<Torneo>> {
  try {
    if (!data.nombre || data.nombre.trim().length < 3) {
      return {
        success: false,
        error: "El nombre del torneo debe tener al menos 3 caracteres.",
      };
    }

    if (!data.fecha) {
      return {
        success: false,
        error: "Debe especificar la fecha del torneo.",
      };
    }

    const nuevoTorneo = await dalCrearTorneo(data);

    revalidatePath("/admin/torneos");
    revalidatePath("/admin/alumnos");
    revalidatePath("/profesor/metricas");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      data: nuevoTorneo,
    };
  } catch (err) {
    console.error("Error in crearTorneoAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al registrar el torneo.",
    };
  }
}

/**
 * Actualizar torneo y sus competidores
 */
export async function actualizarTorneoAction(
  torneoId: string,
  data: CrearTorneoInput
): Promise<ActionResponse<Torneo>> {
  try {
    if (!torneoId) {
      return {
        success: false,
        error: "ID de torneo no proporcionado.",
      };
    }

    if (!data.nombre || data.nombre.trim().length < 3) {
      return {
        success: false,
        error: "El nombre del torneo debe tener al menos 3 caracteres.",
      };
    }

    const torneoActualizado = await dalActualizarTorneo(torneoId, data);

    revalidatePath("/admin/torneos");
    revalidatePath("/admin/alumnos");
    revalidatePath("/profesor/metricas");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      data: torneoActualizado,
    };
  } catch (err) {
    console.error("Error in actualizarTorneoAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar el torneo.",
    };
  }
}

/**
 * Eliminar torneo
 */
export async function eliminarTorneoAction(
  torneoId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    if (!torneoId) {
      return {
        success: false,
        error: "ID de torneo no proporcionado.",
      };
    }

    await dalEliminarTorneo(torneoId);

    revalidatePath("/admin/torneos");
    revalidatePath("/admin/alumnos");
    revalidatePath("/profesor/metricas");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (err) {
    console.error("Error in eliminarTorneoAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al eliminar el torneo.",
    };
  }
}
