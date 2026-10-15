"use server";

import { revalidatePath } from "next/cache";
import {
  dalAgregarAlumnoRecuperacion,
  dalFinalizarSesion,
  dalGetOrCreateSesionClase,
  dalInscribirAlumnoRapido,
  dalMarcarAsistencia,
  dalCerrarSesionClase,
} from "@/lib/dal";
import {
  AgregarRecuperacionSchema,
  InscribirAlumnoSchema,
  MarcarAsistenciaSchema,
} from "@/schemas";
import { Asistencia, AsistenciaEstado } from "@/types";

export type ActionResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; validationErrors?: Record<string, string[]> };

/**
 * Marcar o cambiar asistencia de un alumno (1-tap táctil)
 */
export async function marcarAsistenciaAction(
  sesionId: string,
  alumnoId: string,
  estado: AsistenciaEstado,
  esRecuperacion: boolean = false
): Promise<ActionResponse<Asistencia>> {
  try {
    const parseResult = MarcarAsistenciaSchema.safeParse({
      sesionId,
      alumnoId,
      estado,
      esRecuperacion,
    });

    if (!parseResult.success) {
      return {
        success: false,
        error: "Datos de asistencia inválidos",
        validationErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const asistencia = await dalMarcarAsistencia(
      parseResult.data.sesionId,
      parseResult.data.alumnoId,
      parseResult.data.estado,
      parseResult.data.esRecuperacion
    );

    revalidatePath(`/profesor/clases`);
    revalidatePath(`/profesor/clases/[id]/asistencia`, "page");
    revalidatePath(`/profesor/metricas`);
    revalidatePath(`/admin/dashboard`);

    return {
      success: true,
      data: asistencia,
      message: `Asistencia actualizada: ${estado}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al registrar asistencia";
    return { success: false, error: msg };
  }
}

/**
 * Iniciar sesión de tatami para la clase de hoy
 */
export async function iniciarSesionClaseAction(
  claseId: string
): Promise<ActionResponse<{ sesionId: string }>> {
  try {
    const sesion = await dalGetOrCreateSesionClase(claseId);
    revalidatePath(`/profesor/clases`);
    revalidatePath(`/profesor/clases/${claseId}/asistencia`);

    return {
      success: true,
      data: { sesionId: sesion.id },
      message: "Clase iniciada con éxito en el tatami",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al iniciar la clase";
    return { success: false, error: msg };
  }
}

/**
 * Finalizar sesión de tatami
 */
export async function finalizarSesionClaseAction(
  sesionId: string
): Promise<ActionResponse<void>> {
  try {
    await dalFinalizarSesion(sesionId);
    revalidatePath(`/profesor/clases`);
    revalidatePath(`/profesor/clases/[id]/asistencia`, "page");
    revalidatePath(`/profesor/metricas`);
    revalidatePath(`/admin/dashboard`);

    return {
      success: true,
      data: undefined,
      message: "Sesión de tatami finalizada correctamente",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al finalizar la sesión";
    return { success: false, error: msg };
  }
}

/**
 * Agregar alumno como Recuperación
 */
export async function agregarAlumnoRecuperacionAction(
  sesionId: string,
  alumnoId: string
): Promise<ActionResponse<Asistencia>> {
  try {
    const parseResult = AgregarRecuperacionSchema.safeParse({
      sesionId,
      alumnoId,
    });

    if (!parseResult.success) {
      return {
        success: false,
        error: "Parámetros inválidos para recuperación",
      };
    }

    const asistencia = await dalAgregarAlumnoRecuperacion(
      parseResult.data.sesionId,
      parseResult.data.alumnoId
    );

    revalidatePath(`/profesor/clases`);
    revalidatePath(`/profesor/clases/[id]/asistencia`, "page");
    revalidatePath(`/profesor/metricas`);

    return {
      success: true,
      data: asistencia,
      message: "Alumno de recuperación incorporado a la clase",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al agregar alumno de recuperación";
    return { success: false, error: msg };
  }
}

/**
 * Inscribir alumno rápido desde el tatami
 */
export async function inscribirAlumnoRapidoAction(
  formData: Record<string, unknown>
): Promise<ActionResponse<{ alumnoId: string }>> {
  try {
    const parseResult = InscribirAlumnoSchema.safeParse(formData);

    if (!parseResult.success) {
      return {
        success: false,
        error: "Por favor revisa los datos del nuevo alumno",
        validationErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const result = await dalInscribirAlumnoRapido(
      parseResult.data.claseId,
      parseResult.data
    );

    // Automáticamente marcar asistencia en la sesión si existe
    revalidatePath(`/profesor/clases`);
    revalidatePath(`/profesor/clases/[id]/asistencia`, "page");
    revalidatePath(`/profesor/metricas`);

    return {
      success: true,
      data: { alumnoId: result.alumno.id },
      message: `${result.alumno.nombre} ${result.alumno.apellido} inscripto exitosamente`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al inscribir alumno";
    return { success: false, error: msg };
  }
}

/**
 * Sincronizar cola de acciones offline (cuando vuelve la conexión en el tatami)
 */
export async function sincronizarAsistenciasOfflineAction(
  queue: Array<{
    sesionId: string;
    alumnoId: string;
    estado: AsistenciaEstado;
    esRecuperacion: boolean;
  }>
): Promise<ActionResponse<{ totalSincronizadas: number }>> {
  try {
    let count = 0;
    for (const item of queue) {
      const parsed = MarcarAsistenciaSchema.safeParse(item);
      if (parsed.success) {
        await dalMarcarAsistencia(
          parsed.data.sesionId,
          parsed.data.alumnoId,
          parsed.data.estado,
          parsed.data.esRecuperacion
        );
        count++;
      }
    }

    revalidatePath(`/profesor/clases`);
    revalidatePath(`/profesor/clases/[id]/asistencia`, "page");
    revalidatePath(`/profesor/metricas`);
    revalidatePath(`/admin/dashboard`);

    return {
      success: true,
      data: { totalSincronizadas: count },
      message: `Sincronizadas ${count} asistencias guardadas localmente`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al sincronizar cola offline";
    return { success: false, error: msg };
  }
}

/**
 * Cerrar/finalizar una clase abierta
 */
export async function cerrarClaseAction(
  sesionId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const sesion = await dalCerrarSesionClase(sesionId);

    revalidatePath(`/profesor/clases`);
    revalidatePath(`/profesor/clases/[id]/asistencia`, "page");
    revalidatePath(`/profesor/historial`);
    revalidatePath(`/admin/dashboard`);
    revalidatePath(`/admin/historial`);

    return {
      success: true,
      data: { id: sesion.id },
      message: "Clase finalizada con éxito",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al cerrar la clase";
    return { success: false, error: msg };
  }
}

