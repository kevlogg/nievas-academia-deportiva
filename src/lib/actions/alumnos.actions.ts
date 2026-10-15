"use server";

import { revalidatePath } from "next/cache";
import {
  dalActualizarNotaPrivada,
  dalBuscarAlumnosGlobalParaRecuperacion,
  dalRegistrarGraduacion,
  dalActualizarCinturonAlumno,
} from "@/lib/dal";
import {
  ActualizarNotaPrivadaSchema,
  RegistrarGraduacionSchema,
} from "@/schemas";
import { Alumno, HistorialGraduacion, KarateBelt } from "@/types";
import { ActionResponse } from "./asistencia.actions";

/**
 * Registrar nueva graduación de cinto (Solo ADMIN / Headmaster)
 */
export async function registrarGraduacionAction(
  formData: Record<string, unknown>
): Promise<ActionResponse<HistorialGraduacion>> {
  try {
    const parseResult = RegistrarGraduacionSchema.safeParse(formData);

    if (!parseResult.success) {
      return {
        success: false,
        error: "Datos de graduación inválidos",
        validationErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const graduacion = await dalRegistrarGraduacion(
      parseResult.data.alumnoId,
      parseResult.data.nuevoCinturon,
      parseResult.data.observaciones
    );

    revalidatePath(`/admin/dashboard`);
    revalidatePath(`/admin/alumnos`);
    revalidatePath(`/profesor/metricas`);
    revalidatePath(`/profesor/clases/[id]/asistencia`, "page");

    return {
      success: true,
      data: graduacion,
      message: `¡Graduación registrada! Nuevo cinturón: ${parseResult.data.nuevoCinturon}`,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al registrar graduación";
    return { success: false, error: msg };
  }
}

/**
 * Actualizar nota confidencial privada (Solo ADMIN / Headmaster)
 */
export async function actualizarNotaPrivadaAction(
  alumnoId: string,
  notasPrivadas: string
): Promise<ActionResponse<Alumno>> {
  try {
    const parseResult = ActualizarNotaPrivadaSchema.safeParse({
      alumnoId,
      notasPrivadas,
    });

    if (!parseResult.success) {
      return {
        success: false,
        error: "Nota privada inválida",
      };
    }

    const alumno = await dalActualizarNotaPrivada(
      parseResult.data.alumnoId,
      parseResult.data.notasPrivadas
    );

    revalidatePath(`/admin/dashboard`);
    revalidatePath(`/admin/alumnos`);

    return {
      success: true,
      data: alumno,
      message: "Nota privada confidencial guardada",
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al actualizar nota privada";
    return { success: false, error: msg };
  }
}

/**
 * Buscar alumnos globales para el modal de recuperación
 */
export async function buscarAlumnosRecuperacionAction(
  query: string,
  sesionId: string
): Promise<ActionResponse<Alumno[]>> {
  try {
    const results = await dalBuscarAlumnosGlobalParaRecuperacion(
      query,
      sesionId
    );
    return {
      success: true,
      data: results,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al buscar alumnos";
    return { success: false, error: msg };
  }
}

/**
 * Actualizar cinturón de alumno directamente (por Admin o SuperAdmin)
 */
export async function actualizarCinturonAction(
  alumnoId: string,
  nuevoCinturon: KarateBelt
): Promise<ActionResponse<Alumno>> {
  try {
    const alumno = await dalActualizarCinturonAlumno(alumnoId, nuevoCinturon);

    revalidatePath("/profesor/clases");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/alumnos");
    revalidatePath("/profesor/metricas");
    revalidatePath("/profesor/clases/[id]/asistencia", "page");

    return {
      success: true,
      data: alumno,
      message: `Cinturón de ${alumno.nombre} ${alumno.apellido} actualizado a ${nuevoCinturon}`,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al actualizar cinturón";
    return { success: false, error: msg };
  }
}

