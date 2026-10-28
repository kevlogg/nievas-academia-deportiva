import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireProfesor,
} from "@/lib/auth/session";
import {
  Alumno,
  AlumnoSesionItem,
  Asistencia,
  AsistenciaEstado,
  Clase,
  HistorialGraduacion,
  Inscripcion,
  KarateBelt,
  ProfesorMetricasData,
  ProfesorMetricasCompletasData,
  SesionMetricaItem,
  AlumnoMetricaItem,
  AdminDashboardMetricsData,
  SesionClase,
  Usuario,
  ListaAlumnos,
  ClaseHistorialItem,
  ClaseAbiertaItem,
  AlertaDesercion,
  RegistroHistorialBaja,
  SUBCATEGORIAS_POR_CINTURON,
  CINTURON_POR_SUBCATEGORIA,
  FichaAlumnoData,
  FichaAlumnoAsistenciaItem,
  getGradoRank,
  ESCALAFON_KARATE,
  Torneo,
  TorneoParticipacion,
  TipoMedalla,
} from "@/types";
import {
  InscribirAlumnoInput,
  CrearClaseInput,
  CrearListaAlumnosInput,
} from "@/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getArgentinaDateTime } from "@/lib/utils";

// ======================================================================================
// ALMACÉN DE DATOS SEMILLA EN MEMORIA (FALLBACK SEED STORE)
// Garantiza resiliencia 100% ante desconexiones, demo offline y pruebas inmediatas
// ======================================================================================

const SEED_USUARIOS: Usuario[] = [];

const SEED_CLASES: Clase[] = [];

const SEED_ALUMNOS: Alumno[] = [];
const SEED_INSCRIPCIONES: Inscripcion[] = [];
const SEED_GRADUACIONES: HistorialGraduacion[] = [];
const SEED_SESIONES: SesionClase[] = [];
const SEED_ASISTENCIAS: Asistencia[] = [];
const SEED_LISTAS_ALUMNOS: ListaAlumnos[] = [];

const dbState = {
  usuarios: [...SEED_USUARIOS],
  clases: [...SEED_CLASES],
  alumnos: [...SEED_ALUMNOS],
  inscripciones: [...SEED_INSCRIPCIONES],
  graduaciones: [...SEED_GRADUACIONES],
  sesiones: [...SEED_SESIONES],
  asistencias: [...SEED_ASISTENCIAS],
  listas_alumnos: [...SEED_LISTAS_ALUMNOS],
  historial_bajas: [] as RegistroHistorialBaja[],
  torneos: [] as Torneo[],
  torneo_participaciones: [] as TorneoParticipacion[],
};

/**
 * Helper para obtener los senseis vinculados a un alumno (por clases o listas)
 */
export function getProfesoresForAlumno(alumnoId: string): { ids: string[]; nombres: string[] } {
  const profIdSet = new Set<string>();

  // 1. De inscripciones activas a clases
  const inscripciones = dbState.inscripciones.filter(
    (i) => i.alumno_id === alumnoId && i.activo
  );
  for (const insc of inscripciones) {
    const clase = dbState.clases.find((c) => c.id === insc.clase_id);
    if (clase && clase.profesor_id) {
      profIdSet.add(clase.profesor_id);
    }
  }

  // 2. De listas de alumnos
  const listas = dbState.listas_alumnos.filter((l) =>
    l.alumnos_ids.includes(alumnoId)
  );
  for (const l of listas) {
    if (l.creado_por_id) {
      profIdSet.add(l.creado_por_id);
    }
  }

  const ids = Array.from(profIdSet);
  const nombres = ids.map((id) => {
    const prof = dbState.usuarios.find((u) => u.id === id);
    return prof?.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim() || "Sensei";
  });

  return { ids, nombres };
}

// ======================================================================================
// DATA ACCESS LAYER (DAL) METHODS CON CONTROL DE ACCESO (RBAC)
// ======================================================================================

/**
 * Obtener clases asignadas al profesor logueado (o todas si es ADMIN)
 */
export async function dalGetProfesorClases(profesorId?: string): Promise<Clase[]> {
  const currentUser = await requireProfesor();
  const effectiveProfId =
    currentUser.rol === "ADMIN" ? profesorId || currentUser.id : currentUser.id;

  if (currentUser.rol === "ADMIN" && !profesorId) {
    // Admin puede ver todas las clases
    return dbState.clases.filter((c) => c.activa);
  }

  return dbState.clases.filter(
    (c) => c.profesor_id === effectiveProfId && c.activa
  );
}

/**
 * Helper para extraer profesores de la descripción: "[PROFS:id1,id2] Mi descripción"
 */
function parseProfesoresFromDescripcion(desc?: string | null): {
  profesoresIds: string[];
  cleanDescripcion: string;
} {
  if (!desc) return { profesoresIds: [], cleanDescripcion: "" };
  const match = desc.match(/^\[PROFS:([^\]]+)\]\s*([\s\S]*)$/i);
  if (match) {
    const ids = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    return { profesoresIds: ids, cleanDescripcion: match[2].trim() };
  }
  return { profesoresIds: [], cleanDescripcion: desc.trim() };
}

/**
 * Helper para verificar si un profesor tiene acceso a una clase (como creador o asignado a la lista)
 */
async function checkProfesorAccessToClase(
  supabase: any,
  profesorId: string,
  claseId: string,
  claseProfesorId: string,
  claseNombre?: string
): Promise<boolean> {
  if (claseProfesorId === profesorId) return true;
  try {
    if (claseNombre) {
      const { data: matchedList } = await supabase
        .from("listas_alumnos")
        .select("descripcion")
        .eq("nombre", claseNombre)
        .maybeSingle();
      if (matchedList?.descripcion) {
        const { profesoresIds } = parseProfesoresFromDescripcion(matchedList.descripcion);
        if (profesoresIds.includes(profesorId)) return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Obtener detalle de una clase específica
 */
export async function dalGetClaseById(claseId: string): Promise<Clase | null> {
  const currentUser = await requireProfesor();

  // 1. Intentar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbClase, error } = await supabase
      .from("clases")
      .select("*, profesor:usuarios(nombre_completo)")
      .eq("id", claseId)
      .maybeSingle();

    if (!error && dbClase) {
      if (currentUser.rol === "PROFESOR") {
        const hasAccess = await checkProfesorAccessToClase(
          supabase,
          currentUser.id,
          dbClase.id,
          dbClase.profesor_id,
          dbClase.nombre
        );
        if (!hasAccess) {
          throw new Error("No tienes permisos para ver esta clase");
        }
      }

      const { count: inscriptosCount } = await supabase
        .from("inscripciones")
        .select("*", { count: "exact", head: true })
        .eq("clase_id", claseId)
        .eq("activo", true);

      const claseObj: Clase = {
        id: dbClase.id,
        nombre: dbClase.nombre,
        profesor_id: dbClase.profesor_id,
        profesor_nombre:
          (dbClase.profesor as any)?.nombre_completo || currentUser.nombre_completo,
        dias_semana: dbClase.dias_semana || [1, 3, 5],
        hora_inicio: dbClase.hora_inicio || "18:00:00",
        hora_fin: dbClase.hora_fin || "19:00:00",
        cupo_maximo: dbClase.cupo_maximo || 30,
        activa: dbClase.activa ?? true,
        created_at: dbClase.created_at,
        total_inscriptos: inscriptosCount || 0,
      };

      if (!dbState.clases.some((c) => c.id === claseObj.id)) {
        dbState.clases.push(claseObj);
      }

      return claseObj;
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("No tienes permisos")) {
      throw err;
    }
    console.error("Error in dalGetClaseById Supabase:", err);
  }

  // 2. Fallback memoria
  const clase = dbState.clases.find((c) => c.id === claseId);
  if (!clase) return null;

  if (currentUser.rol === "PROFESOR" && clase.profesor_id !== currentUser.id) {
    throw new Error("No tienes permisos para ver esta clase");
  }

  return clase;
}

/**
 * Iniciar o recuperar la sesión de tatami del día para una clase
 */
export async function dalGetOrCreateSesionClase(
  claseId: string,
  fecha?: string
): Promise<SesionClase> {
  const currentUser = await requireProfesor();
  const targetFecha = fecha || new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  // 1. Intentar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbClase } = await supabase
      .from("clases")
      .select("*, profesor:usuarios(nombre_completo)")
      .eq("id", claseId)
      .maybeSingle();

    if (dbClase) {
      if (currentUser.rol === "PROFESOR") {
        const hasAccess = await checkProfesorAccessToClase(
          supabase,
          currentUser.id,
          dbClase.id,
          dbClase.profesor_id,
          dbClase.nombre
        );
        if (!hasAccess) {
          throw new Error("Solo el profesor asignado o un admin pueden iniciar esta clase");
        }
      }

      // Buscar sesión ABIERTA existente para esta clase
      const { data: existingSesion } = await supabase
        .from("sesiones_clase")
        .select("*")
        .eq("clase_id", claseId)
        .eq("estado", "ABIERTA")
        .order("hora_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSesion) {
        const sesionObj: SesionClase = {
          id: existingSesion.id,
          clase_id: existingSesion.clase_id,
          profesor_id: existingSesion.profesor_id,
          fecha: existingSesion.fecha,
          hora_apertura: existingSesion.hora_apertura,
          estado: existingSesion.estado,
          observaciones: existingSesion.observaciones,
          created_at: existingSesion.created_at,
          clase_nombre: dbClase.nombre,
        };
        if (!dbState.sesiones.some((s) => s.id === sesionObj.id)) {
          dbState.sesiones.push(sesionObj);
        }
        return sesionObj;
      }

      // Buscar sesión de la fecha objetivo
      const { data: dateSesion } = await supabase
        .from("sesiones_clase")
        .select("*")
        .eq("clase_id", claseId)
        .eq("fecha", targetFecha)
        .order("hora_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dateSesion) {
        const sesionObj: SesionClase = {
          id: dateSesion.id,
          clase_id: dateSesion.clase_id,
          profesor_id: dateSesion.profesor_id,
          fecha: dateSesion.fecha,
          hora_apertura: dateSesion.hora_apertura,
          estado: dateSesion.estado,
          observaciones: dateSesion.observaciones,
          created_at: dateSesion.created_at,
          clase_nombre: dbClase.nombre,
        };
        if (!dbState.sesiones.some((s) => s.id === sesionObj.id)) {
          dbState.sesiones.push(sesionObj);
        }
        return sesionObj;
      }

      // Crear nueva sesión en Supabase
      const { data: newSesion, error: errNew } = await supabase
        .from("sesiones_clase")
        .insert({
          clase_id: claseId,
          profesor_id: dbClase.profesor_id || currentUser.id,
          fecha: targetFecha,
          hora_apertura: now,
          estado: "ABIERTA",
          observaciones: "Sesión iniciada en tatami.",
        })
        .select()
        .single();

      if (!errNew && newSesion) {
        const { data: inscriptos } = await supabase
          .from("inscripciones")
          .select("alumno_id")
          .eq("clase_id", claseId)
          .eq("activo", true);

        if (inscriptos && inscriptos.length > 0) {
          const asistRows = inscriptos.map((ins: any) => ({
            sesion_id: newSesion.id,
            alumno_id: ins.alumno_id,
            estado: "AUSENTE",
            es_recuperacion: false,
            marcado_en: now,
          }));
          await supabase.from("asistencias").insert(asistRows);
        }

        const sesionObj: SesionClase = {
          id: newSesion.id,
          clase_id: newSesion.clase_id,
          profesor_id: newSesion.profesor_id,
          fecha: newSesion.fecha,
          hora_apertura: newSesion.hora_apertura,
          estado: newSesion.estado,
          observaciones: newSesion.observaciones,
          created_at: newSesion.created_at,
          clase_nombre: dbClase.nombre,
        };
        dbState.sesiones.push(sesionObj);
        return sesionObj;
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Solo el profesor asignado")) {
      throw err;
    }
    console.error("Error in dalGetOrCreateSesionClase Supabase:", err);
  }

  // 2. Fallback memoria
  const clase = dbState.clases.find((c) => c.id === claseId);
  if (!clase) {
    throw new Error("Clase no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && clase.profesor_id !== currentUser.id) {
    throw new Error("Solo el profesor asignado o un admin pueden iniciar esta clase");
  }

  let sesion = dbState.sesiones.find(
    (s) => s.clase_id === claseId && s.fecha === targetFecha
  );

  if (!sesion) {
    sesion = {
      id: "s" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
      clase_id: claseId,
      profesor_id: currentUser.id,
      fecha: targetFecha,
      hora_apertura: now,
      estado: "ABIERTA",
      observaciones: "",
      created_at: now,
      clase_nombre: clase.nombre,
    };
    dbState.sesiones.push(sesion);

    const inscriptos = dbState.inscripciones.filter(
      (ins) => ins.clase_id === claseId && ins.activo
    );

    for (const ins of inscriptos) {
      dbState.asistencias.push({
        id: "as" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
        sesion_id: sesion.id,
        alumno_id: ins.alumno_id,
        estado: "AUSENTE",
        es_recuperacion: false,
        marcado_en: now,
        created_at: now,
      });
    }
  }

  return sesion;
}

/**
 * Obtener lista completa de alumnos con su estado de asistencia para una sesión activa
 */
export async function dalGetSesionDetalle(
  sesionId: string
): Promise<{
  sesion: SesionClase;
  clase: Clase;
  items: AlumnoSesionItem[];
  isAdmin: boolean;
}> {
  const currentUser = await requireProfesor();

  // 1. Intentar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbSesion } = await supabase
      .from("sesiones_clase")
      .select("*, clase:clases(*)")
      .eq("id", sesionId)
      .maybeSingle();

    if (dbSesion && dbSesion.clase) {
      if (currentUser.rol === "PROFESOR") {
        const hasAccess = await checkProfesorAccessToClase(
          supabase,
          currentUser.id,
          dbSesion.clase_id,
          dbSesion.profesor_id,
          (dbSesion.clase as any)?.nombre || ""
        );
        if (!hasAccess) {
          throw new Error("No tienes permisos para gestionar la sesión de otro profesor");
        }
      }

      const sesionObj: SesionClase = {
        id: dbSesion.id,
        clase_id: dbSesion.clase_id,
        profesor_id: dbSesion.profesor_id,
        fecha: dbSesion.fecha,
        hora_apertura: dbSesion.hora_apertura,
        estado: dbSesion.estado,
        observaciones: dbSesion.observaciones,
        created_at: dbSesion.created_at,
        clase_nombre: dbSesion.clase.nombre,
      };

      const claseObj: Clase = {
        id: dbSesion.clase.id,
        nombre: dbSesion.clase.nombre,
        profesor_id: dbSesion.clase.profesor_id,
        profesor_nombre: currentUser.nombre_completo,
        dias_semana: dbSesion.clase.dias_semana || [1, 3, 5],
        hora_inicio: dbSesion.clase.hora_inicio || "18:00:00",
        hora_fin: dbSesion.clase.hora_fin || "19:00:00",
        cupo_maximo: dbSesion.clase.cupo_maximo || 30,
        activa: dbSesion.clase.activa ?? true,
        created_at: dbSesion.clase.created_at,
      };

      // Traer asistencias de la sesión
      const { data: dbAsistencias } = await supabase
        .from("asistencias")
        .select(`
          id,
          sesion_id,
          alumno_id,
          estado,
          es_recuperacion,
          marcado_en,
          created_at,
          alumno:alumnos(*)
        `)
        .eq("sesion_id", sesionId);

      let asistList = dbAsistencias || [];

      // Si no hay asistencias creadas aún, asociar alumnos inscriptos
      if (asistList.length === 0) {
        const { data: inscriptos } = await supabase
          .from("inscripciones")
          .select("alumno_id, alumno:alumnos(*)")
          .eq("clase_id", dbSesion.clase_id)
          .eq("activo", true);

        if (inscriptos && inscriptos.length > 0) {
          const now = new Date().toISOString();
          const rowsToInsert = inscriptos.map((ins: any) => ({
            sesion_id: sesionId,
            alumno_id: ins.alumno_id,
            estado: "AUSENTE",
            es_recuperacion: false,
            marcado_en: now,
          }));
          const { data: inserted } = await supabase
            .from("asistencias")
            .insert(rowsToInsert)
            .select("*, alumno:alumnos(*)");
          if (inserted) {
            asistList = inserted;
          }
        }
      }

      const items: AlumnoSesionItem[] = [];
      for (const a of asistList) {
        const rawAlumno = (a as any).alumno;
        if (rawAlumno) {
          const alumno: Alumno = {
            id: rawAlumno.id,
            nombre: rawAlumno.nombre,
            apellido: rawAlumno.apellido,
            fecha_nacimiento: rawAlumno.fecha_nacimiento,
            telefono_contacto: rawAlumno.telefono_contacto,
            contacto_emergencia: rawAlumno.contacto_emergencia,
            cinturon_actual: rawAlumno.cinturon_actual,
            estado: rawAlumno.estado,
            notas_privadas: currentUser.rol === "ADMIN" ? rawAlumno.notas_privadas : null,
            created_at: rawAlumno.created_at,
          };

          const { count: clasesEnCinto } = await supabase
            .from("asistencias")
            .select("*", { count: "exact", head: true })
            .eq("alumno_id", alumno.id)
            .in("estado", ["PRESENTE", "TARDE"]);

          items.push({
            alumno,
            asistenciaId: a.id,
            estado: a.estado as AsistenciaEstado,
            es_recuperacion: a.es_recuperacion || false,
            marcado_en: a.marcado_en,
            clases_en_cinturon: clasesEnCinto || 0,
          });
        }
      }

      if (!dbState.sesiones.some((s) => s.id === sesionObj.id)) {
        dbState.sesiones.push(sesionObj);
      }
      if (!dbState.clases.some((c) => c.id === claseObj.id)) {
        dbState.clases.push(claseObj);
      }

      return {
        sesion: sesionObj,
        clase: claseObj,
        items,
        isAdmin: currentUser.rol === "ADMIN",
      };
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("No tienes permisos")) {
      throw err;
    }
    console.error("Error in dalGetSesionDetalle Supabase:", err);
  }

  // 2. Fallback memoria
  const sesion = dbState.sesiones.find((s) => s.id === sesionId);
  if (!sesion) {
    throw new Error("Sesión no encontrada");
  }

  const clase = dbState.clases.find((c) => c.id === sesion.clase_id);
  if (!clase) {
    throw new Error("Clase vinculada no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && sesion.profesor_id !== currentUser.id) {
    throw new Error("No tienes permisos para gestionar la sesión de otro profesor");
  }

  const sessionAsistencias = dbState.asistencias.filter(
    (a) => a.sesion_id === sesionId
  );

  const items: AlumnoSesionItem[] = [];

  for (const a of sessionAsistencias) {
    const rawAlumno = dbState.alumnos.find((al) => al.id === a.alumno_id);
    if (rawAlumno) {
      const alumno: Alumno = {
        ...rawAlumno,
        notas_privadas:
          currentUser.rol === "ADMIN" ? rawAlumno.notas_privadas : null,
      };

      const graduacionActual = dbState.graduaciones
        .filter(
          (g) =>
            g.alumno_id === alumno.id && g.cinturon === alumno.cinturon_actual
        )
        .sort((x, y) => y.fecha_graduacion.localeCompare(x.fecha_graduacion))[0];

      const fechaCinto = graduacionActual
        ? graduacionActual.fecha_graduacion
        : "2026-01-01";

      const clasesEnCinto = dbState.asistencias.filter(
        (asist) =>
          asist.alumno_id === alumno.id &&
          asist.estado === "PRESENTE" &&
          asist.marcado_en >= fechaCinto
      ).length;

      items.push({
        alumno,
        asistenciaId: a.id,
        estado: a.estado,
        es_recuperacion: a.es_recuperacion,
        marcado_en: a.marcado_en,
        clases_en_cinturon: clasesEnCinto,
      });
    }
  }

  return {
    sesion,
    clase,
    items,
    isAdmin: currentUser.rol === "ADMIN",
  };
}

/**
 * Marcar asistencia táctil de 1-tap (PRESENTE / AUSENTE / TARDE)
 * Persiste inmediatamente en la base de datos Supabase
 */
export async function dalMarcarAsistencia(
  sesionId: string,
  alumnoId: string,
  estado: AsistenciaEstado,
  esRecuperacion: boolean = false
): Promise<Asistencia> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  // 1. Intentar en Supabase (UPSERT inmediato en tiempo real)
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbSesion } = await supabase
      .from("sesiones_clase")
      .select("id, clase_id, profesor_id, clase:clases(nombre)")
      .eq("id", sesionId)
      .maybeSingle();

    if (dbSesion) {
      if (currentUser.rol === "PROFESOR") {
        const hasAccess = await checkProfesorAccessToClase(
          supabase,
          currentUser.id,
          dbSesion.clase_id,
          dbSesion.profesor_id,
          (dbSesion.clase as any)?.nombre || ""
        );
        if (!hasAccess) {
          throw new Error("No tienes permisos para marcar asistencia en esta sesión");
        }
      }

      const { data: updatedAsist, error: errUpsert } = await supabase
        .from("asistencias")
        .upsert(
          {
            sesion_id: sesionId,
            alumno_id: alumnoId,
            estado,
            es_recuperacion: esRecuperacion,
            marcado_en: now,
          },
          { onConflict: "sesion_id,alumno_id" }
        )
        .select()
        .single();

      if (!errUpsert && updatedAsist) {
        let memAsist = dbState.asistencias.find(
          (a) => a.sesion_id === sesionId && a.alumno_id === alumnoId
        );
        if (memAsist) {
          memAsist.estado = estado;
          memAsist.marcado_en = now;
        } else {
          dbState.asistencias.push({
            id: updatedAsist.id,
            sesion_id: sesionId,
            alumno_id: alumnoId,
            estado,
            es_recuperacion: esRecuperacion,
            marcado_en: now,
            created_at: now,
          });
        }

        return {
          id: updatedAsist.id,
          sesion_id: sesionId,
          alumno_id: alumnoId,
          estado: updatedAsist.estado as AsistenciaEstado,
          es_recuperacion: updatedAsist.es_recuperacion,
          marcado_en: updatedAsist.marcado_en,
          created_at: updatedAsist.created_at,
        };
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("No tienes permisos")) {
      throw err;
    }
    console.error("Error in dalMarcarAsistencia Supabase:", err);
  }

  // 2. Fallback memoria
  const sesion = dbState.sesiones.find((s) => s.id === sesionId);
  if (!sesion) {
    throw new Error("Sesión no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && sesion.profesor_id !== currentUser.id) {
    throw new Error("No tienes permisos para marcar asistencia en esta sesión");
  }

  let asistencia = dbState.asistencias.find(
    (a) => a.sesion_id === sesionId && a.alumno_id === alumnoId
  );

  if (asistencia) {
    asistencia.estado = estado;
    asistencia.es_recuperacion = esRecuperacion || asistencia.es_recuperacion;
    asistencia.marcado_en = now;
  } else {
    asistencia = {
      id: "as" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
      sesion_id: sesionId,
      alumno_id: alumnoId,
      estado,
      es_recuperacion: esRecuperacion,
      marcado_en: now,
      created_at: now,
    };
    dbState.asistencias.push(asistencia);
  }

  return asistencia;
}

/**
 * Guardar/sincronizar de forma persistente y completa la lista de asistencias de una sesión.
 * Especialmente útil al editar clases cerradas o tras modificaciones manuales en tatami.
 */
export async function dalGuardarAsistenciasSesion(
  sesionId: string,
  asistencias: {
    alumnoId: string;
    estado: AsistenciaEstado;
    esRecuperacion?: boolean;
  }[]
): Promise<{ totalGuardadas: number }> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  // 1. Intentar en Supabase (UPSERT masivo)
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbSesion } = await supabase
      .from("sesiones_clase")
      .select("id, clase_id, profesor_id, clase:clases(nombre)")
      .eq("id", sesionId)
      .maybeSingle();

    if (dbSesion) {
      if (currentUser.rol === "PROFESOR") {
        const hasAccess = await checkProfesorAccessToClase(
          supabase,
          currentUser.id,
          dbSesion.clase_id,
          dbSesion.profesor_id,
          (dbSesion.clase as any)?.nombre || ""
        );
        if (!hasAccess) {
          throw new Error("No tienes permisos para modificar asistencias en esta sesión");
        }
      }

      if (asistencias.length > 0) {
        const rows = asistencias.map((a) => ({
          sesion_id: sesionId,
          alumno_id: a.alumnoId,
          estado: a.estado,
          es_recuperacion: a.esRecuperacion || false,
          marcado_en: now,
        }));

        const { error: errUpsert } = await supabase
          .from("asistencias")
          .upsert(rows, { onConflict: "sesion_id,alumno_id" });

        if (!errUpsert) {
          // Sincronizar en memoria
          for (const a of asistencias) {
            const memAsist = dbState.asistencias.find(
              (m) => m.sesion_id === sesionId && m.alumno_id === a.alumnoId
            );
            if (memAsist) {
              memAsist.estado = a.estado;
              memAsist.marcado_en = now;
              memAsist.es_recuperacion = a.esRecuperacion || false;
            } else {
              dbState.asistencias.push({
                id: "as-" + Math.random().toString(36).substring(2, 9),
                sesion_id: sesionId,
                alumno_id: a.alumnoId,
                estado: a.estado,
                es_recuperacion: a.esRecuperacion || false,
                marcado_en: now,
                created_at: now,
              });
            }
          }

          return { totalGuardadas: asistencias.length };
        } else {
          console.error("Error upserting asistencias in Supabase:", errUpsert);
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("No tienes permisos")) {
      throw err;
    }
    console.error("Error in dalGuardarAsistenciasSesion Supabase:", err);
  }

  // 2. Fallback memoria
  for (const a of asistencias) {
    const memAsist = dbState.asistencias.find(
      (m) => m.sesion_id === sesionId && m.alumno_id === a.alumnoId
    );
    if (memAsist) {
      memAsist.estado = a.estado;
      memAsist.marcado_en = now;
      memAsist.es_recuperacion = a.esRecuperacion || false;
    } else {
      dbState.asistencias.push({
        id: "as-" + Math.random().toString(36).substring(2, 9),
        sesion_id: sesionId,
        alumno_id: a.alumnoId,
        estado: a.estado,
        es_recuperacion: a.esRecuperacion || false,
        marcado_en: now,
        created_at: now,
      });
    }
  }

  return { totalGuardadas: asistencias.length };
}

/**
 * Buscar alumnos globales para agregar como Recuperación (excluyendo a los que ya están en la sesión)
 */
export async function dalBuscarAlumnosGlobalParaRecuperacion(
  query: string,
  sesionId: string
): Promise<Alumno[]> {
  await requireProfesor();

  const cleanQuery = query.toLowerCase().trim();
  const todos = await dalGetTodosAlumnos();
  const alumnosYaEnSesion = new Set(
    dbState.asistencias
      .filter((a) => a.sesion_id === sesionId)
      .map((a) => a.alumno_id)
  );

  return todos
    .filter((a) => a.estado === "ACTIVO" && !alumnosYaEnSesion.has(a.id))
    .filter(
      (a) =>
        a.nombre.toLowerCase().includes(cleanQuery) ||
        a.apellido.toLowerCase().includes(cleanQuery) ||
        a.cinturon_actual.toLowerCase().includes(cleanQuery)
    )
    .map((a) => ({
      ...a,
      notas_privadas: null, // Regla de RBAC: Oculto para profesores
    }))
    .slice(0, 15);
}

/**
 * Agregar alumno a la sesión activa como Recuperación
 */
export async function dalAgregarAlumnoRecuperacion(
  sesionId: string,
  alumnoId: string
): Promise<Asistencia> {
  const currentUser = await requireProfesor();
  const sesion = dbState.sesiones.find((s) => s.id === sesionId);
  if (!sesion) {
    throw new Error("Sesión no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && sesion.profesor_id !== currentUser.id) {
    throw new Error("No tienes permisos en esta sesión");
  }

  const alumno = dbState.alumnos.find((a) => a.id === alumnoId);
  if (!alumno) {
    throw new Error("Alumno no encontrado");
  }

  // Marcar como presente directamente con flag es_recuperacion
  return dalMarcarAsistencia(sesionId, alumnoId, "PRESENTE", true);
}

/**
 * Inscribir alumno rápido desde el tatami y vincularlo a la clase actual
 */
export async function dalInscribirAlumnoRapido(
  claseId: string,
  input: InscribirAlumnoInput,
  sesionId?: string
): Promise<{ alumno: Alumno; inscripcion: Inscripcion }> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  let generatedId = "a" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);
  let inscId = "ins" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);

  try {
    const supabase = await createServerSupabaseClient();

    // 1. Insertar alumno en public.alumnos
    const { data: dbAlumno, error: aErr } = await supabase
      .from("alumnos")
      .insert({
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        fecha_nacimiento: input.fechaNacimiento || "2015-01-01",
        telefono_contacto: input.telefonoContacto?.trim() || "Sin registrar",
        contacto_emergencia: input.contactoEmergencia?.trim() || "Sin registrar",
        cinturon_actual: input.cinturonActual || "Blanco",
        estado: "ACTIVO",
      })
      .select()
      .single();

    if (!aErr && dbAlumno) {
      generatedId = dbAlumno.id;
    }

    // 2. Insertar inscripción en public.inscripciones
    const { data: dbInsc } = await supabase
      .from("inscripciones")
      .upsert(
        {
          clase_id: claseId,
          alumno_id: generatedId,
          fecha_alta: now.split("T")[0],
          activo: true,
        },
        { onConflict: "clase_id,alumno_id" }
      )
      .select()
      .maybeSingle();

    if (dbInsc) {
      inscId = dbInsc.id;
    }

    // 3. Si hay sesión activa (o sesionId proporcionado), marcar asistencia PRESENTE de inmediato
    let targetSesionId = sesionId;
    if (!targetSesionId) {
      const { data: sesionActiva } = await supabase
        .from("sesiones_clase")
        .select("id")
        .eq("clase_id", claseId)
        .eq("estado", "ABIERTA")
        .order("hora_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sesionActiva) {
        targetSesionId = sesionActiva.id;
      }
    }

    if (targetSesionId) {
      await supabase.from("asistencias").upsert(
        {
          sesion_id: targetSesionId,
          alumno_id: generatedId,
          estado: "PRESENTE",
          es_recuperacion: false,
          marcado_en: now,
        },
        { onConflict: "sesion_id,alumno_id" }
      );
    }
  } catch (err) {
    console.error("Error in dalInscribirAlumnoRapido Supabase:", err);
  }

  const nuevoAlumno: Alumno = {
    id: generatedId,
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    fecha_nacimiento: input.fechaNacimiento || "2015-01-01",
    telefono_contacto: input.telefonoContacto?.trim() || "Sin registrar",
    contacto_emergencia: input.contactoEmergencia?.trim() || "Sin registrar",
    cinturon_actual: input.cinturonActual || "Blanco",
    estado: "ACTIVO",
    notas_privadas: null,
    profesores_ids: [currentUser.id],
    profesores_nombres: [
      currentUser.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim(),
    ],
    created_at: now,
  };

  const nuevaInscripcion: Inscripcion = {
    id: inscId,
    clase_id: claseId,
    alumno_id: generatedId,
    fecha_alta: now.split("T")[0],
    activo: true,
    created_at: now,
  };

  dbState.alumnos.unshift(nuevoAlumno);
  dbState.inscripciones.push(nuevaInscripcion);

  return { alumno: nuevoAlumno, inscripcion: nuevaInscripcion };
}

/**
 * Inscribir un alumno existente de la academia a una clase y marcarlo presente si la clase está abierta
 */
export async function dalInscribirAlumnoExistente(
  claseId: string,
  alumnoId: string,
  sesionId?: string
): Promise<{ alumno: Alumno; inscripcion: Inscripcion }> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  let alumnoFound: Alumno | undefined = dbState.alumnos.find((a) => a.id === alumnoId);
  let inscId = "ins" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);

  try {
    const supabase = await createServerSupabaseClient();

    if (!alumnoFound) {
      const { data: dbAlumno } = await supabase
        .from("alumnos")
        .select("*")
        .eq("id", alumnoId)
        .single();
      if (dbAlumno) {
        alumnoFound = {
          id: dbAlumno.id,
          nombre: dbAlumno.nombre,
          apellido: dbAlumno.apellido,
          fecha_nacimiento: dbAlumno.fecha_nacimiento,
          telefono_contacto: dbAlumno.telefono_contacto,
          contacto_emergencia: dbAlumno.contacto_emergencia,
          cinturon_actual: dbAlumno.cinturon_actual,
          estado: dbAlumno.estado,
          notas_privadas: null,
          created_at: dbAlumno.created_at,
        };
      }
    }

    // 1. Upsert inscripcion
    const { data: dbInsc } = await supabase
      .from("inscripciones")
      .upsert(
        {
          clase_id: claseId,
          alumno_id: alumnoId,
          fecha_alta: now.split("T")[0],
          activo: true,
        },
        { onConflict: "clase_id,alumno_id" }
      )
      .select()
      .maybeSingle();

    if (dbInsc) {
      inscId = dbInsc.id;
    }

    // 2. Si hay sesión activa o sesionId, marcar PRESENTE
    let targetSesionId = sesionId;
    if (!targetSesionId) {
      const { data: sesionActiva } = await supabase
        .from("sesiones_clase")
        .select("id")
        .eq("clase_id", claseId)
        .eq("estado", "ABIERTA")
        .order("hora_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sesionActiva) {
        targetSesionId = sesionActiva.id;
      }
    }

    if (targetSesionId) {
      await supabase.from("asistencias").upsert(
        {
          sesion_id: targetSesionId,
          alumno_id: alumnoId,
          estado: "PRESENTE",
          es_recuperacion: false,
          marcado_en: now,
        },
        { onConflict: "sesion_id,alumno_id" }
      );
    }
  } catch (err) {
    console.error("Error in dalInscribirAlumnoExistente Supabase:", err);
  }

  if (!alumnoFound) {
    throw new Error("Alumno no encontrado");
  }

  const inscripcion: Inscripcion = {
    id: inscId,
    clase_id: claseId,
    alumno_id: alumnoId,
    fecha_alta: now.split("T")[0],
    activo: true,
    created_at: now,
  };

  dbState.inscripciones.push(inscripcion);
  return { alumno: alumnoFound, inscripcion };
}

/**
 * Finalizar sesión de tatami
 */
export async function dalFinalizarSesion(sesionId: string): Promise<SesionClase> {
  return dalCerrarSesionClase(sesionId);
}

/**
 * Métricas para el profesor (/profesor/metricas)
 */
export async function dalGetProfesorMetricas(
  profesorId?: string
): Promise<ProfesorMetricasData> {
  const currentUser = await requireProfesor();
  const effectiveProfId =
    currentUser.rol === "ADMIN" ? profesorId || currentUser.id : currentUser.id;

  const profesor =
    dbState.usuarios.find((u) => u.id === effectiveProfId) || currentUser;

  // Clases del profesor
  const clasesProfesor = dbState.clases.filter(
    (c) => c.profesor_id === effectiveProfId
  );
  const clasesIds = new Set(clasesProfesor.map((c) => c.id));

  // Sesiones dictadas este mes
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const sesionesMes = dbState.sesiones.filter(
    (s) => clasesIds.has(s.clase_id) && s.fecha >= primerDiaMes
  );

  const clasesDictadasMes = sesionesMes.length;

  // Asistencias en estas sesiones
  const sesionesIds = new Set(sesionesMes.map((s) => s.id));
  const asistenciasMes = dbState.asistencias.filter((a) =>
    sesionesIds.has(a.sesion_id)
  );

  const presentesMes = asistenciasMes.filter(
    (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
  ).length;

  const promedioAsistencia =
    clasesDictadasMes > 0
      ? Math.round((presentesMes / clasesDictadasMes) * 10) / 10
      : 0;

  // Alumnos inscriptos en clases de este profesor
  const inscripcionesProf = dbState.inscripciones.filter(
    (ins) => clasesIds.has(ins.clase_id) && ins.activo
  );

  const alumnoIdToClases = new Map<string, string[]>();
  for (const ins of inscripcionesProf) {
    const claseObj = clasesProfesor.find((c) => c.id === ins.clase_id);
    const existing = alumnoIdToClases.get(ins.alumno_id) || [];
    if (claseObj) existing.push(claseObj.nombre);
    alumnoIdToClases.set(ins.alumno_id, existing);
  }

  const alumnosMetrics = [];

  for (const [alumnoId, clasesNombres] of alumnoIdToClases.entries()) {
    const rawAlumno = dbState.alumnos.find((a) => a.id === alumnoId);
    if (!rawAlumno) continue;

    const alumno: Alumno = {
      ...rawAlumno,
      notas_privadas:
        currentUser.rol === "ADMIN" ? rawAlumno.notas_privadas : null,
    };

    // Historial total de asistencias de este alumno
    const asistenciasAlumno = dbState.asistencias.filter(
      (a) => a.alumno_id === alumnoId
    );
    const totalClases = asistenciasAlumno.length;
    const totalPresentes = asistenciasAlumno.filter(
      (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
    ).length;

    const porcentajePresentismo =
      totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 100;

    // Clases en cinturón actual
    const gradActual = dbState.graduaciones
      .filter(
        (g) => g.alumno_id === alumno.id && g.cinturon === alumno.cinturon_actual
      )
      .sort((x, y) => y.fecha_graduacion.localeCompare(x.fecha_graduacion))[0];

    const fechaCinto = gradActual ? gradActual.fecha_graduacion : "2026-01-01";
    const clasesEnCinto = asistenciasAlumno.filter(
      (a) =>
        (a.estado === "PRESENTE" || a.estado === "TARDE") &&
        a.marcado_en >= fechaCinto
    ).length;

    alumnosMetrics.push({
      alumno,
      totalAsistencias: totalPresentes,
      porcentajePresentismo,
      clasesEnCinturonActual: clasesEnCinto,
      clasesNombre: clasesNombres,
    });
  }

  return {
    profesor,
    clasesDictadasMes,
    promedioAsistencia,
    alumnosMetrics,
  };
}

/**
 * Métricas completas con historial para filtro dinámico (Último mes, 3 meses, Todo, Personalizado)
 */
export async function dalGetProfesorMetricasCompletas(
  profesorId?: string
): Promise<ProfesorMetricasCompletasData> {
  const currentUser = await requireProfesor();
  const effectiveProfId =
    currentUser.rol === "ADMIN" ? profesorId || currentUser.id : currentUser.id;

  // 1. Intentar en Supabase para obtener estadísticas reales
  try {
    const supabase = await createServerSupabaseClient();

    // Profesor
    const { data: dbProfesor } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", effectiveProfId)
      .maybeSingle();

    const profesor: Usuario = dbProfesor
      ? {
          id: dbProfesor.id,
          email: dbProfesor.email,
          nombre_completo: dbProfesor.nombre_completo,
          rol: dbProfesor.rol,
          activo: dbProfesor.activo,
          created_at: dbProfesor.created_at,
        }
      : currentUser;

    // Clases del profesor
    const { data: dbClases } = await supabase
      .from("clases")
      .select("*")
      .eq("profesor_id", effectiveProfId);

    const clasesProfesor = dbClases || [];
    const clasesIds = new Set(clasesProfesor.map((c: any) => c.id));
    const clasesNombresMap = new Map<string, string>();
    for (const c of clasesProfesor) {
      clasesNombresMap.set(c.id, c.nombre);
    }

    // Sesiones del profesor (por clase asignada o por profesor_id directo)
    const { data: dbTodasSesiones } = await supabase
      .from("sesiones_clase")
      .select("*, clase:clases(id, nombre, profesor_id)")
      .order("fecha", { ascending: false });

    const sesionesFiltradas = (dbTodasSesiones || []).filter((s: any) => {
      return (
        s.profesor_id === effectiveProfId ||
        clasesIds.has(s.clase_id) ||
        s.clase?.profesor_id === effectiveProfId
      );
    });

    const sesionesIds = new Set(sesionesFiltradas.map((s: any) => s.id));

    // Asistencias de esas sesiones
    let dbAsistencias: any[] = [];
    if (sesionesIds.size > 0) {
      const { data: asistData } = await supabase
        .from("asistencias")
        .select("*")
        .in("sesion_id", Array.from(sesionesIds));
      dbAsistencias = asistData || [];
    }

    const asistenciasPorSesion = new Map<string, any[]>();
    for (const a of dbAsistencias) {
      const list = asistenciasPorSesion.get(a.sesion_id) || [];
      list.push(a);
      asistenciasPorSesion.set(a.sesion_id, list);
    }

    const sesiones: SesionMetricaItem[] = sesionesFiltradas.map((s: any) => {
      const asistenciasSesion = asistenciasPorSesion.get(s.id) || [];
      const presentesCount = asistenciasSesion.filter(
        (a: any) => a.estado === "PRESENTE" || a.estado === "TARDE"
      ).length;
      return {
        id: s.id,
        clase_id: s.clase_id,
        clase_nombre: s.clase?.nombre || clasesNombresMap.get(s.clase_id) || "Clase Tatami",
        fecha: s.fecha,
        presentesCount,
        totalAsistencias: asistenciasSesion.length,
      };
    });

    // Inscripciones del profesor
    let dbInscripciones: any[] = [];
    if (clasesIds.size > 0) {
      const { data: inscData } = await supabase
        .from("inscripciones")
        .select("*")
        .in("clase_id", Array.from(clasesIds))
        .eq("activo", true);
      dbInscripciones = inscData || [];
    }

    const alumnoIdToClases = new Map<string, string[]>();
    for (const ins of dbInscripciones) {
      const nombreClase = clasesNombresMap.get(ins.clase_id);
      const existing = alumnoIdToClases.get(ins.alumno_id) || [];
      if (nombreClase && !existing.includes(nombreClase)) {
        existing.push(nombreClase);
      }
      alumnoIdToClases.set(ins.alumno_id, existing);
    }

    // Incluir alumnos que hayan asistido a sesiones del profesor aunque la inscripción haya variado
    for (const a of dbAsistencias) {
      if (!alumnoIdToClases.has(a.alumno_id)) {
        alumnoIdToClases.set(a.alumno_id, []);
      }
    }

    const alumnosIdsList = Array.from(alumnoIdToClases.keys());
    let dbAlumnosList: any[] = [];
    if (alumnosIdsList.length > 0) {
      const { data: alData } = await supabase
        .from("alumnos")
        .select("*")
        .in("id", alumnosIdsList);
      dbAlumnosList = alData || [];
    }

    // Graduaciones para cálculo de clases en cinturón actual
    let dbGraduaciones: any[] = [];
    if (alumnosIdsList.length > 0) {
      const { data: gradData } = await supabase
        .from("historial_graduaciones")
        .select("*")
        .in("alumno_id", alumnosIdsList);
      dbGraduaciones = gradData || [];
    }

    // Todas las asistencias históricas del alumno para cálculo exacto de clases en cinto
    let dbTodasAsistencias: any[] = [];
    if (alumnosIdsList.length > 0) {
      const { data: allAsist } = await supabase
        .from("asistencias")
        .select("alumno_id, estado, marcado_en, created_at")
        .in("alumno_id", alumnosIdsList);
      dbTodasAsistencias = allAsist || [];
    }

    const asistenciasPorAlumno = new Map<string, any[]>();
    for (const a of dbAsistencias) {
      const list = asistenciasPorAlumno.get(a.alumno_id) || [];
      list.push(a);
      asistenciasPorAlumno.set(a.alumno_id, list);
    }

    const sesionFechaMap = new Map<string, string>();
    for (const s of sesionesFiltradas) {
      sesionFechaMap.set(s.id, s.fecha);
    }

    // Torneos y participaciones de alumnos
    let dbParticipacionesProf: any[] = [];
    try {
      const { data: tpData } = await supabase
        .from("torneo_participaciones")
        .select("*, torneo:torneos(id, nombre, fecha)");
      dbParticipacionesProf = tpData || [];
    } catch (_) {}

    const alumnos: AlumnoMetricaItem[] = [];
    for (const rawAlumno of dbAlumnosList) {
      const alumnoId = rawAlumno.id;
      const clasesNombres = alumnoIdToClases.get(alumnoId) || [];

      const alumno: Alumno = {
        id: rawAlumno.id,
        nombre: rawAlumno.nombre,
        apellido: rawAlumno.apellido,
        fecha_nacimiento: rawAlumno.fecha_nacimiento,
        cinturon_actual: (rawAlumno.cinturon_actual === "Azul" ? "Violeta" : rawAlumno.cinturon_actual) as KarateBelt,
        subcategoria_actual: rawAlumno.subcategoria_actual,
        estado: rawAlumno.estado,
        telefono_contacto: rawAlumno.telefono_contacto,
        contacto_emergencia: rawAlumno.contacto_emergencia,
        notas_privadas: currentUser.rol === "ADMIN" ? rawAlumno.notas_privadas : null,
        created_at: rawAlumno.created_at,
      };

      const asistenciasAlumnoRaw = asistenciasPorAlumno.get(alumnoId) || [];
      const asistenciasAlumno = asistenciasAlumnoRaw.map((a: any) => ({
        sesionId: a.sesion_id,
        fecha: sesionFechaMap.get(a.sesion_id) || (a.marcado_en || a.created_at || "").split("T")[0] || "",
        estado: a.estado,
      }));

      // Clases acumuladas en cinturón actual
      const gradActual = dbGraduaciones
        .filter((g: any) => g.alumno_id === alumnoId && (g.cinturon === alumno.cinturon_actual || (alumno.cinturon_actual === "Violeta" && g.cinturon === "Azul")))
        .sort((x: any, y: any) => (y.fecha_graduacion || "").localeCompare(x.fecha_graduacion || ""))[0];

      const fechaCinto = gradActual ? gradActual.fecha_graduacion : (rawAlumno.created_at ? rawAlumno.created_at.split("T")[0] : "2020-01-01");
      const clasesEnCinto = dbTodasAsistencias.filter((a: any) => {
        const fechaA = (a.marcado_en || a.created_at || "").split("T")[0];
        return (
          a.alumno_id === alumnoId &&
          (a.estado === "PRESENTE" || a.estado === "TARDE") &&
          fechaA >= fechaCinto
        );
      }).length;

      // Torneos del alumno
      const partsAl = (dbParticipacionesProf.length > 0
        ? dbParticipacionesProf.filter((p: any) => p.alumno_id === alumnoId)
        : dbState.torneo_participaciones.filter((p) => p.alumno_id === alumnoId)
      );

      const premiosObtenidos = partsAl.map((p: any) => {
        const tor = dbState.torneos.find((t) => t.id === p.torneo_id);
        return {
          torneoId: p.torneo?.id || p.torneo_id,
          torneoNombre: p.torneo?.nombre || tor?.nombre || "Torneo Tatami",
          fecha: p.torneo?.fecha || tor?.fecha || "",
          puesto_premio: p.puesto_premio,
          medalla: p.medalla as TipoMedalla,
          categoria: p.categoria,
        };
      });

      alumnos.push({
        alumno,
        clasesNombre: clasesNombres,
        asistencias: asistenciasAlumno,
        clasesEnCinturonActual: clasesEnCinto,
        torneosCompetidos: partsAl.length,
        premiosObtenidos,
      });
    }

    // Historial de bajas por deserción
    const { data: dbBajas } = await supabase
      .from("historial_bajas")
      .select("*")
      .order("fecha_baja", { ascending: false });

    const historialBajas: RegistroHistorialBaja[] = (dbBajas || []).map((b: any) => ({
      id: b.id,
      alumno_id: b.alumno_id,
      alumno_nombre: b.alumno_nombre,
      cinturon: (b.cinturon === "Azul" ? "Violeta" : b.cinturon) as KarateBelt,
      subcategoria: b.subcategoria,
      fecha_baja: b.fecha_baja,
      tipo: b.tipo,
      motivo: b.motivo,
      ausencias_consecutivas: b.ausencias_consecutivas || 4,
      telefono_contacto: b.telefono_contacto,
      contacto_emergencia: b.contacto_emergencia,
      registrado_por: b.registrado_por,
      registrado_por_nombre: b.registrado_por_nombre,
      created_at: b.created_at,
    }));

    return {
      profesor,
      sesiones,
      alumnos,
      historialBajas,
    };
  } catch (err) {
    console.warn("dalGetProfesorMetricasCompletas Supabase fallback to dbState:", err);
  }

  // 2. Fallback local a dbState
  const profesor =
    dbState.usuarios.find((u) => u.id === effectiveProfId) || currentUser;

  const clasesProfesor = dbState.clases.filter(
    (c) => c.profesor_id === effectiveProfId
  );
  const clasesIds = new Set(clasesProfesor.map((c) => c.id));

  const sesiones: SesionMetricaItem[] = dbState.sesiones
    .filter((s) => clasesIds.has(s.clase_id) || s.profesor_id === effectiveProfId)
    .map((s) => {
      const asistenciasSesion = dbState.asistencias.filter((a) => a.sesion_id === s.id);
      const presentesCount = asistenciasSesion.filter(
        (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
      ).length;
      return {
        id: s.id,
        clase_id: s.clase_id,
        clase_nombre: s.clase_nombre || "Clase Tatami",
        fecha: s.fecha,
        presentesCount,
        totalAsistencias: asistenciasSesion.length,
      };
    });

  const inscripcionesProf = dbState.inscripciones.filter(
    (ins) => clasesIds.has(ins.clase_id) && ins.activo
  );

  const alumnoIdToClases = new Map<string, string[]>();
  for (const ins of inscripcionesProf) {
    const claseObj = clasesProfesor.find((c) => c.id === ins.clase_id);
    const existing = alumnoIdToClases.get(ins.alumno_id) || [];
    if (claseObj) existing.push(claseObj.nombre);
    alumnoIdToClases.set(ins.alumno_id, existing);
  }

  const alumnos: AlumnoMetricaItem[] = [];

  for (const [alumnoId, clasesNombres] of alumnoIdToClases.entries()) {
    const rawAlumno = dbState.alumnos.find((a) => a.id === alumnoId);
    if (!rawAlumno) continue;

    const alumno: Alumno = {
      ...rawAlumno,
      cinturon_actual: (rawAlumno.cinturon_actual === "Azul" ? "Violeta" : rawAlumno.cinturon_actual) as KarateBelt,
      notas_privadas:
        currentUser.rol === "ADMIN" ? rawAlumno.notas_privadas : null,
    };

    const asistenciasAlumno = dbState.asistencias
      .filter((a) => a.alumno_id === alumnoId)
      .map((a) => {
        const ses = dbState.sesiones.find((s) => s.id === a.sesion_id);
        return {
          sesionId: a.sesion_id,
          fecha: ses?.fecha || a.created_at.split("T")[0],
          estado: a.estado,
        };
      });

    const gradActual = dbState.graduaciones
      .filter(
        (g) => g.alumno_id === alumno.id && g.cinturon === alumno.cinturon_actual
      )
      .sort((x, y) => y.fecha_graduacion.localeCompare(x.fecha_graduacion))[0];

    const fechaCinto = gradActual ? gradActual.fecha_graduacion : "2026-01-01";
    const clasesEnCinto = dbState.asistencias.filter(
      (a) =>
        a.alumno_id === alumnoId &&
        (a.estado === "PRESENTE" || a.estado === "TARDE") &&
        a.marcado_en >= fechaCinto
    ).length;

    alumnos.push({
      alumno,
      clasesNombre: clasesNombres,
      asistencias: asistenciasAlumno,
      clasesEnCinturonActual: clasesEnCinto,
    });
  }

  return {
    profesor,
    sesiones,
    alumnos,
    historialBajas: [...dbState.historial_bajas],
  };
}

/**
 * Obtener métricas consolidadas de todo el dojo (todas las clases y profesores) para el SuperAdmin
 */
export async function dalGetDojoMetricasCompletas(): Promise<ProfesorMetricasCompletasData> {
  const currentUser = await requireAdmin();

  // 1. Intentar en Supabase para obtener estadísticas de todo el dojo
  try {
    const supabase = await createServerSupabaseClient();

    // Todas las clases
    const { data: dbClases } = await supabase
      .from("clases")
      .select("*");

    const todasClases = dbClases || [];
    const clasesNombresMap = new Map<string, string>();
    for (const c of todasClases) {
      clasesNombresMap.set(c.id, c.nombre);
    }

    // Todas las sesiones con join de clase
    const { data: dbSesiones } = await supabase
      .from("sesiones_clase")
      .select("*, clase:clases(id, nombre, profesor_id)")
      .order("fecha", { ascending: false });

    const todasSesiones = dbSesiones || [];
    const sesionesIds = new Set(todasSesiones.map((s: any) => s.id));

    // Todas las asistencias
    let dbAsistencias: any[] = [];
    if (sesionesIds.size > 0) {
      const { data: asistData } = await supabase
        .from("asistencias")
        .select("*");
      dbAsistencias = asistData || [];
    }

    const asistenciasPorSesion = new Map<string, any[]>();
    for (const a of dbAsistencias) {
      const list = asistenciasPorSesion.get(a.sesion_id) || [];
      list.push(a);
      asistenciasPorSesion.set(a.sesion_id, list);
    }

    const sesiones: SesionMetricaItem[] = todasSesiones.map((s: any) => {
      const asistenciasSesion = asistenciasPorSesion.get(s.id) || [];
      const presentesCount = asistenciasSesion.filter(
        (a: any) => a.estado === "PRESENTE" || a.estado === "TARDE"
      ).length;
      return {
        id: s.id,
        clase_id: s.clase_id,
        clase_nombre: s.clase?.nombre || clasesNombresMap.get(s.clase_id) || "Clase Tatami",
        fecha: s.fecha,
        presentesCount,
        totalAsistencias: asistenciasSesion.length,
      };
    });

    // Todas las inscripciones activas
    const { data: dbInscripciones } = await supabase
      .from("inscripciones")
      .select("*")
      .eq("activo", true);

    const alumnoIdToClases = new Map<string, string[]>();
    for (const ins of (dbInscripciones || [])) {
      const nombreClase = clasesNombresMap.get(ins.clase_id);
      const existing = alumnoIdToClases.get(ins.alumno_id) || [];
      if (nombreClase && !existing.includes(nombreClase)) {
        existing.push(nombreClase);
      }
      alumnoIdToClases.set(ins.alumno_id, existing);
    }

    // Todos los alumnos
    const { data: dbAlumnos } = await supabase
      .from("alumnos")
      .select("*");

    const todosAlumnos = dbAlumnos || [];

    // Graduaciones para clasesEnCinturonActual
    const { data: dbGraduaciones } = await supabase
      .from("historial_graduaciones")
      .select("*");

    const todasGrads = dbGraduaciones || [];

    const asistenciasPorAlumno = new Map<string, any[]>();
    for (const a of dbAsistencias) {
      const list = asistenciasPorAlumno.get(a.alumno_id) || [];
      list.push(a);
      asistenciasPorAlumno.set(a.alumno_id, list);
    }

    const sesionFechaMap = new Map<string, string>();
    for (const s of todasSesiones) {
      sesionFechaMap.set(s.id, s.fecha);
    }

    // Torneos y participaciones de alumnos del dojo
    let dbParticipacionesDojo: any[] = [];
    try {
      const { data: tpData } = await supabase
        .from("torneo_participaciones")
        .select("*, torneo:torneos(id, nombre, fecha)");
      dbParticipacionesDojo = tpData || [];
    } catch (_) {}

    const alumnos: AlumnoMetricaItem[] = [];
    for (const rawAlumno of todosAlumnos) {
      const alumnoId = rawAlumno.id;
      const clasesNombres = alumnoIdToClases.get(alumnoId) || [];

      const alumno: Alumno = {
        id: rawAlumno.id,
        nombre: rawAlumno.nombre,
        apellido: rawAlumno.apellido,
        fecha_nacimiento: rawAlumno.fecha_nacimiento,
        cinturon_actual: (rawAlumno.cinturon_actual === "Azul" ? "Violeta" : rawAlumno.cinturon_actual) as KarateBelt,
        subcategoria_actual: rawAlumno.subcategoria_actual,
        estado: rawAlumno.estado,
        telefono_contacto: rawAlumno.telefono_contacto,
        contacto_emergencia: rawAlumno.contacto_emergencia,
        notas_privadas: rawAlumno.notas_privadas,
        created_at: rawAlumno.created_at,
      };

      const asistenciasAlumnoRaw = asistenciasPorAlumno.get(alumnoId) || [];
      const asistenciasAlumno = asistenciasAlumnoRaw.map((a: any) => ({
        sesionId: a.sesion_id,
        fecha: sesionFechaMap.get(a.sesion_id) || (a.marcado_en || a.created_at || "").split("T")[0] || "",
        estado: a.estado,
      }));

      // Clases acumuladas en cinturón actual
      const gradActual = todasGrads
        .filter((g: any) => g.alumno_id === alumnoId && (g.cinturon === alumno.cinturon_actual || (alumno.cinturon_actual === "Violeta" && g.cinturon === "Azul")))
        .sort((x: any, y: any) => (y.fecha_graduacion || "").localeCompare(x.fecha_graduacion || ""))[0];

      const fechaCinto = gradActual ? gradActual.fecha_graduacion : (rawAlumno.created_at ? rawAlumno.created_at.split("T")[0] : "2020-01-01");
      const clasesEnCinto = asistenciasAlumnoRaw.filter((a: any) => {
        const fechaA = (a.marcado_en || a.created_at || "").split("T")[0];
        return (
          (a.estado === "PRESENTE" || a.estado === "TARDE") &&
          fechaA >= fechaCinto
        );
      }).length;

      // Torneos del alumno
      const partsAl = (dbParticipacionesDojo.length > 0
        ? dbParticipacionesDojo.filter((p: any) => p.alumno_id === alumnoId)
        : dbState.torneo_participaciones.filter((p) => p.alumno_id === alumnoId)
      );

      const premiosObtenidos = partsAl.map((p: any) => {
        const tor = dbState.torneos.find((t) => t.id === p.torneo_id);
        return {
          torneoId: p.torneo?.id || p.torneo_id,
          torneoNombre: p.torneo?.nombre || tor?.nombre || "Torneo Tatami",
          fecha: p.torneo?.fecha || tor?.fecha || "",
          puesto_premio: p.puesto_premio,
          medalla: p.medalla as TipoMedalla,
          categoria: p.categoria,
        };
      });

      alumnos.push({
        alumno,
        clasesNombre: clasesNombres,
        asistencias: asistenciasAlumno,
        clasesEnCinturonActual: clasesEnCinto,
        torneosCompetidos: partsAl.length,
        premiosObtenidos,
      });
    }

    // Historial de bajas de deserción del dojo
    const { data: dbBajas } = await supabase
      .from("historial_bajas")
      .select("*")
      .order("fecha_baja", { ascending: false });

    const historialBajas: RegistroHistorialBaja[] = (dbBajas || []).map((b: any) => ({
      id: b.id,
      alumno_id: b.alumno_id,
      alumno_nombre: b.alumno_nombre,
      cinturon: (b.cinturon === "Azul" ? "Violeta" : b.cinturon) as KarateBelt,
      subcategoria: b.subcategoria,
      fecha_baja: b.fecha_baja,
      tipo: b.tipo,
      motivo: b.motivo,
      ausencias_consecutivas: b.ausencias_consecutivas || 4,
      telefono_contacto: b.telefono_contacto,
      contacto_emergencia: b.contacto_emergencia,
      registrado_por: b.registrado_por,
      registrado_por_nombre: b.registrado_por_nombre,
      created_at: b.created_at,
    }));

    return {
      profesor: currentUser,
      sesiones,
      alumnos,
      historialBajas,
    };
  } catch (err) {
    console.warn("dalGetDojoMetricasCompletas Supabase fallback to dbState:", err);
  }

  // 2. Fallback local a dbState
  const todasClases = dbState.clases;
  const clasesIds = new Set(todasClases.map((c) => c.id));

  // Todas las sesiones dictadas en el dojo
  const sesiones: SesionMetricaItem[] = dbState.sesiones
    .filter((s) => clasesIds.has(s.clase_id))
    .map((s) => {
      const asistenciasSesion = dbState.asistencias.filter((a) => a.sesion_id === s.id);
      const presentesCount = asistenciasSesion.filter(
        (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
      ).length;
      return {
        id: s.id,
        clase_id: s.clase_id,
        clase_nombre: s.clase_nombre || "Clase Tatami",
        fecha: s.fecha,
        presentesCount,
        totalAsistencias: asistenciasSesion.length,
      };
    });

  // Mapeo de alumnos con todas las clases en las que están inscriptos
  const inscripcionesActivas = dbState.inscripciones.filter(
    (ins) => clasesIds.has(ins.clase_id) && ins.activo
  );

  const alumnoIdToClases = new Map<string, string[]>();
  for (const ins of inscripcionesActivas) {
    const claseObj = todasClases.find((c) => c.id === ins.clase_id);
    const existing = alumnoIdToClases.get(ins.alumno_id) || [];
    if (claseObj && !existing.includes(claseObj.nombre)) {
      existing.push(claseObj.nombre);
    }
    alumnoIdToClases.set(ins.alumno_id, existing);
  }

  // Asegurar que todos los alumnos activos del dojo figuren
  for (const a of dbState.alumnos.filter((al) => al.estado === "ACTIVO")) {
    if (!alumnoIdToClases.has(a.id)) {
      alumnoIdToClases.set(a.id, []);
    }
  }

  const alumnos: AlumnoMetricaItem[] = [];

  for (const [alumnoId, clasesNombres] of alumnoIdToClases.entries()) {
    const rawAlumno = dbState.alumnos.find((a) => a.id === alumnoId);
    if (!rawAlumno) continue;

    const alumno: Alumno = {
      ...rawAlumno,
      cinturon_actual: (rawAlumno.cinturon_actual === "Azul" ? "Violeta" : rawAlumno.cinturon_actual) as KarateBelt,
      notas_privadas: rawAlumno.notas_privadas,
    };

    const asistenciasAlumno = dbState.asistencias
      .filter((a) => a.alumno_id === alumnoId)
      .map((a) => {
        const ses = dbState.sesiones.find((s) => s.id === a.sesion_id);
        return {
          sesionId: a.sesion_id,
          fecha: ses?.fecha || a.created_at.split("T")[0],
          estado: a.estado,
        };
      });

    const gradActual = dbState.graduaciones
      .filter(
        (g) => g.alumno_id === alumno.id && g.cinturon === alumno.cinturon_actual
      )
      .sort((x, y) => y.fecha_graduacion.localeCompare(x.fecha_graduacion))[0];

    const fechaCinto = gradActual ? gradActual.fecha_graduacion : "2026-01-01";
    const clasesEnCinto = dbState.asistencias.filter(
      (a) =>
        a.alumno_id === alumnoId &&
        (a.estado === "PRESENTE" || a.estado === "TARDE") &&
        a.marcado_en >= fechaCinto
    ).length;

    alumnos.push({
      alumno,
      clasesNombre: clasesNombres,
      asistencias: asistenciasAlumno,
      clasesEnCinturonActual: clasesEnCinto,
    });
  }

  return {
    profesor: currentUser,
    sesiones,
    alumnos,
    historialBajas: [...dbState.historial_bajas],
  };
}

/**
 * Métricas globales para el Administrador / Headmaster (/admin/dashboard)
 */
export async function dalGetAdminDashboardMetrics(): Promise<AdminDashboardMetricsData> {
  await requireAdmin();

  try {
    const supabase = await createServerSupabaseClient();

    // 1. Alumnos activos
    const { count: totalAlumnosActivos } = await supabase
      .from("alumnos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "ACTIVO");

    // 2. Profesores activos
    const { data: dbProfesores } = await supabase
      .from("usuarios")
      .select("*")
      .eq("activo", true);

    // 3. Clases dictadas: ÚNICAMENTE sesiones CERRADAS / FINALIZADAS
    const { data: dbSesionesFinalizadas } = await supabase
      .from("sesiones_clase")
      .select("*, clase:clases(id, nombre, profesor_id)")
      .eq("estado", "FINALIZADA");

    const totalClasesDictadas = dbSesionesFinalizadas?.length || 0;

    // 4. Todas las asistencias registradas
    const { data: dbAsistencias } = await supabase
      .from("asistencias")
      .select("*");

    // 5. Clases activas
    const { data: dbClases } = await supabase
      .from("clases")
      .select("*")
      .eq("activa", true);

    // 6. Inscripciones activas
    const { data: dbInscripciones } = await supabase
      .from("inscripciones")
      .select("*")
      .eq("activo", true);

    const profesores = dbProfesores || dbState.usuarios.filter((u) => u.activo);
    const sesiones = dbSesionesFinalizadas || [];
    const asistencias = dbAsistencias || [];
    const clases = dbClases || [];
    const inscripciones = dbInscripciones || [];

    // Desempeño por profesor (calculado estrictamente sobre docentes activos)
    // Directores o administradores que no dictan clases no figuran como docentes.
    const docentes = profesores.filter(
      (prof: any) =>
        prof.rol === "PROFESOR" ||
        clases.some((c: any) => c.profesor_id === prof.id) ||
        sesiones.some((s: any) => s.profesor_id === prof.id)
    );

    const desempenoProfesores = docentes.map((prof: any) => {
      const sesProf = sesiones.filter(
        (s: any) => s.profesor_id === prof.id || s.clase?.profesor_id === prof.id
      );
      const sIds = new Set(sesProf.map((s: any) => s.id));
      const asProf = asistencias.filter((a: any) => sIds.has(a.sesion_id));
      const pres = asProf.filter(
        (a: any) => a.estado === "PRESENTE" || a.estado === "TARDE"
      ).length;

      // Retención real: Si no dictó clases o no hay asistencias, 0%. Nunca inventar números.
      const retencion =
        sesProf.length > 0 && asProf.length > 0
          ? Math.round((pres / asProf.length) * 100)
          : 0;

      return {
        profesorId: prof.id,
        nombre: prof.nombre_completo,
        rol: prof.rol,
        clasesDictadas: sesProf.length,
        retencionPorcentaje: retencion,
        promedioAlumnosPorClase:
          sesProf.length > 0 ? Math.round((pres / sesProf.length) * 10) / 10 : 0,
      };
    });

    // Convocatoria por clase (solo sobre clases cerradas)
    const clasesConvocatoria = clases.map((clase: any) => {
      const sesClase = sesiones.filter((s: any) => s.clase_id === clase.id);
      const sIds = new Set(sesClase.map((s: any) => s.id));
      const asClase = asistencias.filter((a: any) => sIds.has(a.sesion_id));
      const pres = asClase.filter(
        (a: any) => a.estado === "PRESENTE" || a.estado === "TARDE"
      ).length;
      const prom =
        sesClase.length > 0 ? Math.round((pres / sesClase.length) * 10) / 10 : 0;
      const inscriptos = inscripciones.filter(
        (i: any) => i.clase_id === clase.id && i.activo
      ).length;

      return {
        claseId: clase.id,
        nombre: clase.nombre,
        promedioAsistencias: prom,
        inscriptos,
      };
    });

    const clasesSorted = [...clasesConvocatoria].sort(
      (a, b) => b.promedioAsistencias - a.promedioAsistencias
    );
    const clasesConMayorConvocatoria =
      totalClasesDictadas > 0 ? clasesSorted.slice(0, 3) : [];
    const clasesConMenorConvocatoria =
      totalClasesDictadas > 0 ? [...clasesSorted].reverse().slice(0, 3) : [];

    // Alertas de Deserción:
    // Un alumno activo entra en alerta ÚNICAMENTE si acumula 4 o más AUSENTE
    // consecutivas en clases que ya han sido CERRADAS (FINALIZADA).
    const { data: dbAlumnos } = await supabase
      .from("alumnos")
      .select("*")
      .eq("estado", "ACTIVO");

    const alumnos = dbAlumnos || dbState.alumnos.filter((a) => a.estado === "ACTIVO");
    const alertasDesercion: AlertaDesercion[] = [];

    // Solo se evalúan si efectivamente existen al menos 4 clases finalizadas en el sistema
    if (sesiones.length >= 4 && alumnos.length > 0) {
      for (const al of alumnos) {
        // Detectar si el alumno fue contactado y se le restablecieron las faltas con "Continúa"
        let fechaReinicio: string | null = null;
        if (al.notas_privadas) {
          const matchReset = al.notas_privadas.match(/\[DESERCION_RESET:([^\]]+)\]/);
          if (matchReset) {
            fechaReinicio = matchReset[1];
          }
        }

        const asistenciasAlumnoEnCerradas = asistencias
          .filter((a: any) => a.alumno_id === al.id)
          .map((a: any) => {
            const ses = sesiones.find((s: any) => s.id === a.sesion_id);
            return {
              sesionId: a.sesion_id,
              fecha: ses?.fecha || a.created_at.split("T")[0],
              marcado_en: a.marcado_en || a.created_at,
              estado: a.estado,
            };
          })
          .filter((item: any) => sesiones.some((s: any) => s.id === item.sesionId))
          .sort((x: any, y: any) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());

        if (asistenciasAlumnoEnCerradas.length === 0) continue;

        let ausenciasConsecutivas = 0;
        let ultimaFechaAsistida: string | null = null;

        for (const reg of asistenciasAlumnoEnCerradas) {
          // Si la inasistencia fue anterior o igual a la fecha de restablecimiento de faltas, se corta la racha a 0
          if (fechaReinicio && new Date(reg.fecha).getTime() <= new Date(fechaReinicio.split("T")[0]).getTime()) {
            break;
          }

          if (reg.estado === "AUSENTE") {
            if (ultimaFechaAsistida === null) {
              ausenciasConsecutivas++;
            }
          } else if (reg.estado === "PRESENTE" || reg.estado === "TARDE") {
            if (ultimaFechaAsistida === null) {
              ultimaFechaAsistida = reg.fecha;
            }
            break; // Racha de ausencias interrumpida
          }
        }

        // Alerta estricta tras 4 faltas seguidas
        if (ausenciasConsecutivas >= 4) {
          alertasDesercion.push({
            alumno: al,
            ausenciasConsecutivas,
            ultimaClaseAsistida: ultimaFechaAsistida,
            telefonoContacto: al.telefono_contacto || "Sin registrar",
            contactoEmergencia: al.contacto_emergencia || "Sin registrar",
          });
        }
      }
    }

    const historialBajas = await dalGetHistorialBajas();

    return {
      totalAlumnosActivos: totalAlumnosActivos || 0,
      totalProfesoresActivos: docentes.length,
      totalClasesDictadas,
      clasesConMayorConvocatoria,
      clasesConMenorConvocatoria,
      desempenoProfesores,
      alertasDesercion,
      historialBajas,
    };
  } catch (err) {
    console.error("Error in dalGetAdminDashboardMetrics Supabase:", err);
  }

  // Fallback seguro en memoria (100% limpio en 0)
  const docentes = dbState.usuarios.filter(
    (u) =>
      u.activo &&
      (u.rol === "PROFESOR" || dbState.clases.some((c) => c.profesor_id === u.id))
  );
  const historialBajasMem = await dalGetHistorialBajas();
  return {
    totalAlumnosActivos: dbState.alumnos.filter((a) => a.estado === "ACTIVO").length,
    totalProfesoresActivos: docentes.length,
    totalClasesDictadas: dbState.sesiones.filter((s) => s.estado === "FINALIZADA").length,
    clasesConMayorConvocatoria: [],
    clasesConMenorConvocatoria: [],
    desempenoProfesores: docentes.map((p) => ({
      profesorId: p.id,
      nombre: p.nombre_completo,
      rol: p.rol,
      clasesDictadas: 0,
      retencionPorcentaje: 0,
      promedioAlumnosPorClase: 0,
    })),
    alertasDesercion: [],
    historialBajas: historialBajasMem,
  };
}

/**
 * Obtener listado de alumnos para Admin (con notas privadas y resumen de asistencia)
 */
export async function dalGetAdminAlumnos(
  search?: string,
  beltFilter?: KarateBelt | "TODOS"
): Promise<Alumno[]> {
  await requireAdmin();

  // 1. Intentar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from("alumnos").select("*").order("apellido", { ascending: true });

    const normalizedBeltFilter = beltFilter === "Azul" ? "Violeta" : beltFilter;
    if (normalizedBeltFilter && normalizedBeltFilter !== "TODOS") {
      query = query.eq("cinturon_actual", normalizedBeltFilter);
    }

    if (search && search.trim() !== "") {
      const q = `%${search.trim()}%`;
      query = query.or(`nombre.ilike.${q},apellido.ilike.${q},telefono_contacto.ilike.${q}`);
    }

    const { data: alumnos, error } = await query;
    if (!error && alumnos && alumnos.length > 0) {
      // Traer todas las asistencias para computar métricas rápidas de los alumnos
      const { data: allAsistencias } = await supabase
        .from("asistencias")
        .select("alumno_id, estado, marcado_en");

      const asistenciasMap = new Map<string, { presentes: number; tardes: number; ausentes: number; total: number }>();
      for (const asis of allAsistencias || []) {
        const existing = asistenciasMap.get(asis.alumno_id) || { presentes: 0, tardes: 0, ausentes: 0, total: 0 };
        existing.total += 1;
        if (asis.estado === "PRESENTE") existing.presentes += 1;
        else if (asis.estado === "TARDE") existing.tardes += 1;
        else if (asis.estado === "AUSENTE") existing.ausentes += 1;
        asistenciasMap.set(asis.alumno_id, existing);
      }

      return alumnos.map((a: any) => {
        const cinturon: KarateBelt = (a.cinturon_actual === "Azul" ? "Violeta" : a.cinturon_actual) as KarateBelt;
        const subcatValidas = SUBCATEGORIAS_POR_CINTURON[cinturon] || [];
        const subcategoria: string | null = a.subcategoria_actual || (subcatValidas.length === 1 ? subcatValidas[0] : null);
        const { ids, nombres } = getProfesoresForAlumno(a.id);

        const stats = asistenciasMap.get(a.id) || { presentes: 0, tardes: 0, ausentes: 0, total: 0 };
        const porcentajePresentismo =
          stats.total > 0 ? Math.round(((stats.presentes + stats.tardes) / stats.total) * 100) : 100;

        return {
          id: a.id,
          nombre: a.nombre,
          apellido: a.apellido,
          fecha_nacimiento: a.fecha_nacimiento,
          telefono_contacto: a.telefono_contacto,
          contacto_emergencia: a.contacto_emergencia,
          cinturon_actual: cinturon,
          subcategoria_actual: subcategoria,
          estado: a.estado,
          notas_privadas: a.notas_privadas,
          profesores_ids: ids,
          profesores_nombres: nombres,
          asistencias_resumen: {
            ...stats,
            porcentajePresentismo,
          },
          created_at: a.created_at,
        };
      });
    }
  } catch (err) {
    console.error("Error in dalGetAdminAlumnos Supabase:", err);
  }

  // 2. Fallback con dbState
  let list: Alumno[] = dbState.alumnos.map((a) => {
    const cinturon: KarateBelt = (a.cinturon_actual === "Azul" ? "Violeta" : a.cinturon_actual) as KarateBelt;
    const subcatValidas = SUBCATEGORIAS_POR_CINTURON[cinturon] || [];
    const subcategoria: string | null = a.subcategoria_actual || (subcatValidas.length === 1 ? subcatValidas[0] : null);
    const { ids, nombres } = getProfesoresForAlumno(a.id);

    const asistenciasAlumno = dbState.asistencias.filter((asis) => asis.alumno_id === a.id);
    const total = asistenciasAlumno.length;
    const presentes = asistenciasAlumno.filter((asis) => asis.estado === "PRESENTE").length;
    const tardes = asistenciasAlumno.filter((asis) => asis.estado === "TARDE").length;
    const ausentes = asistenciasAlumno.filter((asis) => asis.estado === "AUSENTE").length;
    const porcentajePresentismo =
      total > 0 ? Math.round(((presentes + tardes) / total) * 100) : 100;

    return {
      ...a,
      cinturon_actual: cinturon,
      subcategoria_actual: subcategoria,
      profesores_ids: ids,
      profesores_nombres: nombres,
      asistencias_resumen: {
        total,
        presentes,
        tardes,
        ausentes,
        porcentajePresentismo,
      },
    };
  });

  if (search && search.trim() !== "") {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.apellido.toLowerCase().includes(q) ||
        a.telefono_contacto.includes(q)
    );
  }

  if (beltFilter && beltFilter !== "TODOS") {
    const targetBelt = beltFilter === "Azul" ? "Violeta" : beltFilter;
    list = list.filter((a) => a.cinturon_actual === targetBelt);
  }

  return list;
}

/**
 * Obtener ficha detallada de un alumno específico con desglose individual de asistencias
 */
export async function dalGetFichaAlumno(alumnoId: string): Promise<FichaAlumnoData> {
  const currentUser = await requireProfesor();
  const isAdmin = currentUser.rol === "ADMIN";

  // 1. Intentar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbAlumno, error: alumnoError } = await supabase
      .from("alumnos")
      .select("*")
      .eq("id", alumnoId)
      .maybeSingle();

    if (!alumnoError && dbAlumno) {
      const cinturon: KarateBelt = (dbAlumno.cinturon_actual === "Azul" ? "Violeta" : dbAlumno.cinturon_actual) as KarateBelt;
      const subcatValidas = SUBCATEGORIAS_POR_CINTURON[cinturon] || [];
      const subcategoria: string | null = dbAlumno.subcategoria_actual || (subcatValidas.length === 1 ? subcatValidas[0] : null);

      // Traer asistencias con datos de sesión y clase
      const { data: dbAsistencias } = await supabase
        .from("asistencias")
        .select(`
          id,
          sesion_id,
          alumno_id,
          estado,
          es_recuperacion,
          marcado_en,
          created_at,
          sesion:sesiones_clase (
            id,
            fecha,
            hora_apertura,
            clase_id,
            clase:clases (
              id,
              nombre
            ),
            profesor:usuarios!profesor_id (
              nombre_completo
            )
          )
        `)
        .eq("alumno_id", alumnoId)
        .order("marcado_en", { ascending: false });

      // Traer graduaciones históricas
      const { data: dbGraduaciones } = await supabase
        .from("historial_graduaciones")
        .select(`
          id,
          alumno_id,
          cinturon,
          subcategoria,
          fecha_graduacion,
          graduado_por,
          observaciones,
          created_at,
          evaluador:usuarios!graduado_por (
            nombre_completo
          )
        `)
        .eq("alumno_id", alumnoId)
        .order("fecha_graduacion", { ascending: false });

      // Traer inscripciones activas
      const { data: dbInscripciones } = await supabase
        .from("inscripciones")
        .select(`
          id,
          clase_id,
          clase:clases (
            id,
            nombre,
            hora_inicio,
            hora_fin,
            profesor:usuarios!profesor_id (
              nombre_completo
            )
          )
        `)
        .eq("alumno_id", alumnoId)
        .eq("activo", true);

      const rawAsistencias = dbAsistencias || [];
      const totalClases = rawAsistencias.length;
      const totalPresentes = rawAsistencias.filter((a: any) => a.estado === "PRESENTE").length;
      const totalTardes = rawAsistencias.filter((a: any) => a.estado === "TARDE").length;
      const totalAusentes = rawAsistencias.filter((a: any) => a.estado === "AUSENTE").length;
      const porcentajePresentismo =
        totalClases > 0 ? Math.round(((totalPresentes + totalTardes) / totalClases) * 100) : 100;

      // Clases en cinturón actual
      const gradActual = (dbGraduaciones || []).find((g: any) => (g.cinturon === "Azul" ? "Violeta" : g.cinturon) === cinturon);
      const fechaCinto = gradActual?.fecha_graduacion || "2020-01-01";
      const clasesEnCinto = rawAsistencias.filter(
        (a: any) => (a.estado === "PRESENTE" || a.estado === "TARDE") && (a.marcado_en || "") >= fechaCinto
      ).length;

      const historialAsistencias: FichaAlumnoAsistenciaItem[] = rawAsistencias.map((a: any) => ({
        id: a.id,
        sesionId: a.sesion_id,
        fecha: a.sesion?.fecha || a.marcado_en?.split("T")[0] || "Fecha s/d",
        claseNombre: a.sesion?.clase?.nombre || "Clase de Karate",
        estado: a.estado as AsistenciaEstado,
        esRecuperacion: !!a.es_recuperacion,
        marcadoEn: a.marcado_en || a.created_at,
        horaApertura: a.sesion?.hora_apertura,
        profesorNombre: a.sesion?.profesor?.nombre_completo,
      }));

      const historialGraduaciones: HistorialGraduacion[] = (dbGraduaciones || []).map((g: any) => {
        const isVioleta =
          g.cinturon === "Azul" ||
          g.cinturon === "Violeta" ||
          (g.observaciones && g.observaciones.includes("[VIOLETA]"));
        const cinturon: KarateBelt = isVioleta ? "Violeta" : g.cinturon;
        let subcat = g.subcategoria;
        if (!subcat && g.observaciones) {
          const m = g.observaciones.match(/\[SUBCAT:([^\]]+)\]/);
          if (m) subcat = m[1];
        }
        const cleanObs = g.observaciones
          ? g.observaciones.replace(/\[SUBCAT:[^\]]*\]/g, "").replace(/\[VIOLETA\]/g, "").trim()
          : g.observaciones;

        return {
          id: g.id,
          alumno_id: g.alumno_id,
          cinturon,
          subcategoria: subcat || null,
          fecha_graduacion: g.fecha_graduacion,
          graduado_por: g.graduado_por,
          graduado_por_nombre: g.evaluador?.nombre_completo || "Sensei Evaluador",
          observaciones: cleanObs,
          created_at: g.created_at,
        };
      });

      // Cálculo de último pase y días transcurridos
      const ultimoPase = historialGraduaciones.length > 0 ? historialGraduaciones[0] : null;
      const fechaUltimoPase = ultimoPase?.fecha_graduacion || dbAlumno.created_at?.split("T")[0] || null;
      let diasDesdeUltimoPase = 0;
      if (fechaUltimoPase) {
        const dGrad = new Date(`${fechaUltimoPase}T12:00:00`);
        const hoy = new Date();
        const diffTime = hoy.getTime() - dGrad.getTime();
        diasDesdeUltimoPase = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }
      const esAptoParaPase = diasDesdeUltimoPase >= 30 && clasesEnCinto >= 12;

      const clasesInscriptas = (dbInscripciones || []).map((ins: any) => ({
        id: ins.clase?.id || ins.clase_id,
        nombre: ins.clase?.nombre || "Karate Do",
        profesorNombre: ins.clase?.profesor?.nombre_completo,
        horaInicio: ins.clase?.hora_inicio,
        horaFin: ins.clase?.hora_fin,
      }));

      const { ids: profIds, nombres: profNombres } = getProfesoresForAlumno(dbAlumno.id);

      const alumno: Alumno = {
        id: dbAlumno.id,
        nombre: dbAlumno.nombre,
        apellido: dbAlumno.apellido,
        fecha_nacimiento: dbAlumno.fecha_nacimiento,
        telefono_contacto: dbAlumno.telefono_contacto,
        contacto_emergencia: dbAlumno.contacto_emergencia,
        cinturon_actual: cinturon,
        subcategoria_actual: subcategoria,
        estado: dbAlumno.estado,
        notas_privadas: isAdmin ? dbAlumno.notas_privadas : null,
        profesores_ids: profIds,
        profesores_nombres: profNombres,
        asistencias_resumen: {
          total: totalClases,
          presentes: totalPresentes,
          tardes: totalTardes,
          ausentes: totalAusentes,
          porcentajePresentismo,
          clasesEnCinturonActual: clasesEnCinto,
          fechaUltimoPase,
          diasDesdeUltimoPase,
        },
        created_at: dbAlumno.created_at,
      };

      return {
        alumno,
        estadisticas: {
          totalClases,
          totalPresentes,
          totalTardes,
          totalAusentes,
          porcentajePresentismo,
          clasesEnCinturonActual: clasesEnCinto,
          fechaUltimoPase,
          diasDesdeUltimoPase,
          esAptoParaPase,
        },
        clasesInscriptas,
        historialGraduaciones,
        historialAsistencias,
        torneos: await dalGetTorneosAlumno(dbAlumno.id),
      };
    }
  } catch (err) {
    console.error("Error in dalGetFichaAlumno Supabase:", err);
  }

  // 2. Fallback en memoria (dbState)
  const rawAlumno = dbState.alumnos.find((a) => a.id === alumnoId);
  if (!rawAlumno) {
    throw new Error("Alumno no encontrado");
  }

  const cinturon: KarateBelt = (rawAlumno.cinturon_actual === "Azul" ? "Violeta" : rawAlumno.cinturon_actual) as KarateBelt;
  const subcatValidas = SUBCATEGORIAS_POR_CINTURON[cinturon] || [];
  const subcategoria: string | null = rawAlumno.subcategoria_actual || (subcatValidas.length === 1 ? subcatValidas[0] : null);
  const { ids: profIds, nombres: profNombres } = getProfesoresForAlumno(rawAlumno.id);

  const asistenciasAlumno = dbState.asistencias.filter((a) => a.alumno_id === alumnoId);
  const totalClases = asistenciasAlumno.length;
  const totalPresentes = asistenciasAlumno.filter((a) => a.estado === "PRESENTE").length;
  const totalTardes = asistenciasAlumno.filter((a) => a.estado === "TARDE").length;
  const totalAusentes = asistenciasAlumno.filter((a) => a.estado === "AUSENTE").length;
  const porcentajePresentismo =
    totalClases > 0 ? Math.round(((totalPresentes + totalTardes) / totalClases) * 100) : 100;

  const graduaciones = dbState.graduaciones
    .filter((g) => g.alumno_id === alumnoId)
    .sort((x, y) => y.fecha_graduacion.localeCompare(x.fecha_graduacion));

  const gradActual = graduaciones.find(
    (g) => (g.cinturon === "Azul" ? "Violeta" : g.cinturon) === cinturon
  );
  const fechaCinto = gradActual?.fecha_graduacion || "2020-01-01";
  const clasesEnCinto = asistenciasAlumno.filter(
    (a) => (a.estado === "PRESENTE" || a.estado === "TARDE") && a.marcado_en >= fechaCinto
  ).length;

  const ultimoPase = graduaciones.length > 0 ? graduaciones[0] : null;
  const fechaUltimoPase = ultimoPase?.fecha_graduacion || rawAlumno.created_at?.split("T")[0] || null;
  let diasDesdeUltimoPase = 0;
  if (fechaUltimoPase) {
    const dGrad = new Date(`${fechaUltimoPase}T12:00:00`);
    const hoy = new Date();
    const diffTime = hoy.getTime() - dGrad.getTime();
    diasDesdeUltimoPase = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }
  const esAptoParaPase = diasDesdeUltimoPase >= 30 && clasesEnCinto >= 12;

  const historialAsistencias: FichaAlumnoAsistenciaItem[] = asistenciasAlumno
    .map((a) => {
      const sesion = dbState.sesiones.find((s) => s.id === a.sesion_id);
      const clase = sesion ? dbState.clases.find((c) => c.id === sesion.clase_id) : null;
      const prof = sesion ? dbState.usuarios.find((u) => u.id === sesion.profesor_id) : null;
      return {
        id: a.id,
        sesionId: a.sesion_id,
        fecha: sesion?.fecha || a.marcado_en.split("T")[0],
        claseNombre: clase?.nombre || sesion?.clase_nombre || "Clase de Karate",
        estado: a.estado,
        esRecuperacion: a.es_recuperacion,
        marcadoEn: a.marcado_en,
        horaApertura: sesion?.hora_apertura,
        profesorNombre: prof?.nombre_completo,
      };
    })
    .sort((x, y) => y.marcadoEn.localeCompare(x.marcadoEn));

  const inscripciones = dbState.inscripciones.filter(
    (i) => i.alumno_id === alumnoId && i.activo
  );
  const clasesInscriptas = inscripciones.map((ins) => {
    const c = dbState.clases.find((clase) => clase.id === ins.clase_id);
    const prof = c ? dbState.usuarios.find((u) => u.id === c.profesor_id) : null;
    return {
      id: ins.clase_id,
      nombre: c?.nombre || "Karate Do",
      profesorNombre: prof?.nombre_completo,
      horaInicio: c?.hora_inicio,
      horaFin: c?.hora_fin,
    };
  });

  const alumno: Alumno = {
    ...rawAlumno,
    cinturon_actual: cinturon,
    subcategoria_actual: subcategoria,
    notas_privadas: isAdmin ? rawAlumno.notas_privadas : null,
    profesores_ids: profIds,
    profesores_nombres: profNombres,
    asistencias_resumen: {
      total: totalClases,
      presentes: totalPresentes,
      tardes: totalTardes,
      ausentes: totalAusentes,
      porcentajePresentismo,
      clasesEnCinturonActual: clasesEnCinto,
      fechaUltimoPase,
      diasDesdeUltimoPase,
    },
  };

  return {
    alumno,
    estadisticas: {
      totalClases,
      totalPresentes,
      totalTardes,
      totalAusentes,
      porcentajePresentismo,
      clasesEnCinturonActual: clasesEnCinto,
      fechaUltimoPase,
      diasDesdeUltimoPase,
      esAptoParaPase,
    },
    clasesInscriptas,
    historialGraduaciones: graduaciones.map((g) => ({
      ...g,
      cinturon: (g.cinturon === "Azul" ? "Violeta" : g.cinturon) as KarateBelt,
    })),
    historialAsistencias,
    torneos: await dalGetTorneosAlumno(alumno.id),
  };
}

/**
 * Obtener clases para administración
 */
export async function dalGetAdminClases(): Promise<Clase[]> {
  await requireAdmin();
  return dbState.clases;
}

/**
 * Registrar nueva graduación de cinto / categoría (con histórico y actualización en alumno)
 */
export async function dalRegistrarGraduacion(
  alumnoId: string,
  nuevoCinturon: KarateBelt,
  observaciones?: string | null,
  subcategoria?: string | null,
  fechaGraduacionInput?: string
): Promise<HistorialGraduacion> {
  const admin = await requireAdmin();

  // 1. Normalizar cinturón Violeta
  const cintoEfectivo: KarateBelt = (nuevoCinturon === "Azul" ? "Violeta" : nuevoCinturon) as KarateBelt;

  // 2. Validar correspondencia estricta de subcategoría con el color
  const subcategoriasValidas = SUBCATEGORIAS_POR_CINTURON[cintoEfectivo] || [];
  let subcatEfectiva: string | null = subcategoria?.trim() || null;

  if (subcatEfectiva && !subcategoriasValidas.includes(subcatEfectiva)) {
    throw new Error(
      `La categoría "${subcatEfectiva}" no corresponde al cinturón ${cintoEfectivo}. Categorías permitidas: ${subcategoriasValidas.join(", ")}`
    );
  }

  if (!subcatEfectiva && subcategoriasValidas.length === 1) {
    subcatEfectiva = subcategoriasValidas[0];
  }

  // 3. REGLA ESTRICTA DE NO RETROCESO: Bloquear cualquier intento de descender de grado o color
  let currentCinturon: KarateBelt = "Blanco";
  let currentSubcategoria: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbAl } = await supabase
      .from("alumnos")
      .select("cinturon_actual, subcategoria_actual")
      .eq("id", alumnoId)
      .maybeSingle();
    if (dbAl) {
      currentCinturon = (dbAl.cinturon_actual === "Azul" ? "Violeta" : dbAl.cinturon_actual) as KarateBelt;
      currentSubcategoria = dbAl.subcategoria_actual || null;
    }
  } catch {}

  const memAl = dbState.alumnos.find((a) => a.id === alumnoId);
  if (memAl && (!currentCinturon || currentCinturon === "Blanco")) {
    currentCinturon = (memAl.cinturon_actual === "Azul" ? "Violeta" : memAl.cinturon_actual) as KarateBelt;
    currentSubcategoria = memAl.subcategoria_actual || currentSubcategoria;
  }

  const currentRank = getGradoRank(currentCinturon, currentSubcategoria);
  const newRank = getGradoRank(cintoEfectivo, subcatEfectiva);

  if (newRank < currentRank) {
    throw new Error(
      `Movimiento no permitido: Un alumno no puede descender a una categoría o cinturón inferior (${cintoEfectivo} ${subcatEfectiva || ""}). Grado actual del alumno: ${currentCinturon} ${currentSubcategoria || ""}.`
    );
  }

  const now = new Date().toISOString();
  const fechaGraduacion = fechaGraduacionInput || now.split("T")[0];

  // 4. Persistencia en Supabase con tolerancia a columnas/enums aún no migrados
  const cleanObsText = (observaciones || `Graduación a ${cintoEfectivo}${subcatEfectiva ? ` (${subcatEfectiva})` : ""} en Nievas Academia Deportiva`).trim();
  const encodedObs = `[SUBCAT:${subcatEfectiva || ""}][VIOLETA] ${cleanObsText}`.trim();

  try {
    const supabase = await createServerSupabaseClient();

    let dbGrad: any = null;
    const insertRes = await supabase
      .from("historial_graduaciones")
      .insert({
        alumno_id: alumnoId,
        cinturon: cintoEfectivo,
        subcategoria: subcatEfectiva,
        fecha_graduacion: fechaGraduacion,
        graduado_por: admin.id,
        observaciones: encodedObs,
      })
      .select()
      .maybeSingle();

    if (insertRes.error) {
      // Fallback si la BD en Supabase aún tiene el enum viejo o no tiene columna subcategoria
      const dbCinturon = cintoEfectivo === "Violeta" ? "Azul" : cintoEfectivo;
      const retryRes = await supabase
        .from("historial_graduaciones")
        .insert({
          alumno_id: alumnoId,
          cinturon: dbCinturon,
          fecha_graduacion: fechaGraduacion,
          graduado_por: admin.id,
          observaciones: encodedObs,
        })
        .select()
        .maybeSingle();

      dbGrad = retryRes.data;
    } else {
      dbGrad = insertRes.data;
    }

    const updateRes = await supabase
      .from("alumnos")
      .update({
        cinturon_actual: cintoEfectivo,
        subcategoria_actual: subcatEfectiva,
      })
      .eq("id", alumnoId);

    if (updateRes.error) {
      const dbCinturon = cintoEfectivo === "Violeta" ? "Azul" : cintoEfectivo;
      await supabase
        .from("alumnos")
        .update({
          cinturon_actual: dbCinturon,
        })
        .eq("id", alumnoId);
    }

    if (dbGrad) {
      const al = dbState.alumnos.find((a) => a.id === alumnoId);
      if (al) {
        al.cinturon_actual = cintoEfectivo;
        al.subcategoria_actual = subcatEfectiva;
      }
      return {
        id: dbGrad.id,
        alumno_id: alumnoId,
        cinturon: cintoEfectivo,
        subcategoria: subcatEfectiva,
        fecha_graduacion: fechaGraduacion,
        graduado_por: admin.id,
        graduado_por_nombre: admin.nombre_completo,
        observaciones: cleanObsText,
        created_at: dbGrad.created_at || now,
      };
    }
  } catch (err) {
    console.warn("dalRegistrarGraduacion Supabase fallback to in-memory:", err);
  }

  // 4. Fallback dbState
  const alumno = dbState.alumnos.find((a) => a.id === alumnoId);
  if (!alumno) {
    throw new Error("Alumno no encontrado");
  }

  const graduacion: HistorialGraduacion = {
    id: "g" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
    alumno_id: alumnoId,
    cinturon: cintoEfectivo,
    subcategoria: subcatEfectiva,
    fecha_graduacion: fechaGraduacion,
    graduado_por: admin.id,
    graduado_por_nombre: admin.nombre_completo,
    observaciones:
      observaciones ||
      `Graduación a ${cintoEfectivo}${subcatEfectiva ? ` (${subcatEfectiva})` : ""} en Nievas Academia Deportiva`,
    created_at: now,
  };

  dbState.graduaciones.push(graduacion);
  alumno.cinturon_actual = cintoEfectivo;
  alumno.subcategoria_actual = subcatEfectiva;

  return graduacion;
}

/**
 * Actualizar nota privada confidencial (Solo ADMIN)
 */
export async function dalActualizarNotaPrivada(
  alumnoId: string,
  notasPrivadas: string
): Promise<Alumno> {
  await requireAdmin();
  const alumno = dbState.alumnos.find((a) => a.id === alumnoId);
  if (!alumno) {
    throw new Error("Alumno no encontrado");
  }

  alumno.notas_privadas = notasPrivadas;
  return alumno;
}

/**
 * Crear nueva clase / horario con asignación de lista de alumnos y sesión inmediata en tatami
 */
export async function dalCrearClase(data: CrearClaseInput): Promise<Clase> {
  const currentUser = await requireProfesor();
  const effectiveProfId = data.profesorId || currentUser.id;
  const profesor = dbState.usuarios.find((u) => u.id === effectiveProfId);
  const now = new Date().toISOString();
  const { fecha: hoyArg, horaInicioDefecto, horaFinDefecto } = getArgentinaDateTime();
  const fechaClase = data.fecha || hoyArg;

  // Si no se pasaron días de semana pero sí fecha, calcular el día de la semana
  let diasSemana = data.diasSemana && data.diasSemana.length > 0 ? data.diasSemana : [];
  if (diasSemana.length === 0 && fechaClase) {
    const d = new Date(`${fechaClase}T12:00:00`).getDay();
    diasSemana = [isNaN(d) ? new Date().getDay() : d];
  }

  // Horarios en Argentina con formato completo HH:mm:ss
  let horaInicio = data.horaInicio?.trim();
  if (horaInicio) {
    if (horaInicio.length === 5) horaInicio = `${horaInicio}:00`;
  } else {
    horaInicio = horaInicioDefecto;
  }

  let horaFin = data.horaFin?.trim();
  if (horaFin) {
    if (horaFin.length === 5) horaFin = `${horaFin}:00`;
  } else {
    const [hh, mm] = horaInicio.split(":").map(Number);
    const endH = (hh + 1) % 24;
    const endM = (mm + 15) % 60;
    const endHAdjusted = mm + 15 >= 60 ? (endH + 1) % 24 : endH;
    horaFin = `${String(endHAdjusted).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;
  }

  // Si no se pasó nombre manual, tomar el nombre de la lista de alumnos
  let nombreClase = data.nombre?.trim();
  if (!nombreClase && data.listaAlumnosId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: listData } = await supabase
        .from("listas_alumnos")
        .select("nombre")
        .eq("id", data.listaAlumnosId)
        .maybeSingle();
      if (listData?.nombre) {
        nombreClase = listData.nombre;
      }
    } catch {}
    if (!nombreClase) {
      const listMem = dbState.listas_alumnos.find((l) => l.id === data.listaAlumnosId);
      if (listMem?.nombre) {
        nombreClase = listMem.nombre;
      }
    }
  }
  if (!nombreClase) {
    nombreClase = "Clase Tatami";
  }

  let nuevaClaseId = "c" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);
  let nuevaSesionId = "s" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbClase, error: errClase } = await supabase.from("clases").insert({
      nombre: nombreClase,
      profesor_id: effectiveProfId,
      dias_semana: diasSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      cupo_maximo: data.cupoMaximo || 30,
      activa: true,
    }).select().single();

    if (!errClase && dbClase) {
      nuevaClaseId = dbClase.id;

      let alumnosInscriptosIds: string[] = [];
      if (data.listaAlumnosId) {
        const { data: items } = await supabase
          .from("lista_alumnos_items")
          .select("alumno_id")
          .eq("lista_id", data.listaAlumnosId);

        if (items && items.length > 0) {
          alumnosInscriptosIds = items.map((it: any) => it.alumno_id);
          const inscRows = alumnosInscriptosIds.map((aId) => ({
            clase_id: dbClase.id,
            alumno_id: aId,
            fecha_alta: fechaClase,
            activo: true,
          }));
          await supabase.from("inscripciones").insert(inscRows);
        }
      }

      const { data: dbSesion } = await supabase.from("sesiones_clase").insert({
        clase_id: dbClase.id,
        profesor_id: effectiveProfId,
        fecha: fechaClase,
        hora_apertura: now,
        estado: "ABIERTA",
        observaciones: "Sesión creada al iniciar clase.",
      }).select().single();

      if (dbSesion) {
        nuevaSesionId = dbSesion.id;
        if (alumnosInscriptosIds.length > 0) {
          const asistRows = alumnosInscriptosIds.map((aId) => ({
            sesion_id: dbSesion.id,
            alumno_id: aId,
            estado: "AUSENTE",
            es_recuperacion: false,
            marcado_en: now,
          }));
          await supabase.from("asistencias").insert(asistRows);
        }
      }
    }
  } catch (err) {
    console.error("Error creating clase in Supabase:", err);
  }

  const nuevaClase: Clase = {
    id: nuevaClaseId,
    nombre: nombreClase,
    profesor_id: effectiveProfId,
    profesor_nombre: profesor ? profesor.nombre_completo : currentUser.nombre_completo,
    dias_semana: diasSemana,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    cupo_maximo: data.cupoMaximo || 30,
    activa: true,
    created_at: now,
    total_inscriptos: 0,
  };
  (nuevaClase as any).sesion_id = nuevaSesionId;

  dbState.clases.push(nuevaClase);

  if (data.listaAlumnosId) {
    const lista = dbState.listas_alumnos.find((l) => l.id === data.listaAlumnosId);
    if (lista && lista.alumnos_ids.length > 0) {
      for (const alumnoId of lista.alumnos_ids) {
        dbState.inscripciones.push({
          id: "i" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
          clase_id: nuevaClase.id,
          alumno_id: alumnoId,
          fecha_alta: fechaClase,
          activo: true,
          created_at: now,
        });
      }
      nuevaClase.total_inscriptos = lista.alumnos_ids.length;
    }
  }

  const nuevaSesion: SesionClase = {
    id: nuevaSesionId,
    clase_id: nuevaClase.id,
    profesor_id: effectiveProfId,
    fecha: fechaClase,
    hora_apertura: now,
    estado: "ABIERTA",
    observaciones: "Sesión creada al iniciar clase.",
    created_at: now,
    clase_nombre: nuevaClase.nombre,
  };
  dbState.sesiones.push(nuevaSesion);

  const inscriptos = dbState.inscripciones.filter(
    (ins) => ins.clase_id === nuevaClase.id && ins.activo
  );
  for (const ins of inscriptos) {
    dbState.asistencias.push({
      id: "as" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
      sesion_id: nuevaSesion.id,
      alumno_id: ins.alumno_id,
      estado: "AUSENTE",
      es_recuperacion: false,
      marcado_en: now,
      created_at: now,
    });
  }

  return nuevaClase;
}

/**

/**
 * Obtener listas de alumnos disponibles
 */
export async function dalGetListasAlumnos(): Promise<ListaAlumnos[]> {
  const currentUser = await requireProfesor();
  try {
    const supabase = await createServerSupabaseClient();
    const { data: listas, error } = await supabase
      .from("listas_alumnos")
      .select(`
        id,
        nombre,
        descripcion,
        creado_por,
        created_at,
        creado_por_usuario:usuarios(nombre_completo),
        items:lista_alumnos_items(alumno_id)
      `)
      .order("created_at", { ascending: false });

    if (!error && listas) {
      // Obtener todos los usuarios profesores/admins para resolver nombres
      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("id, nombre_completo");
      const userMap = new Map((usuarios || []).map((u: any) => [u.id, u.nombre_completo]));

      const mappedListas: ListaAlumnos[] = listas.map((l: any) => {
        const { profesoresIds, cleanDescripcion } = parseProfesoresFromDescripcion(l.descripcion);
        const profesoresNombres = profesoresIds
          .map((id) => userMap.get(id))
          .filter(Boolean) as string[];

        return {
          id: l.id,
          nombre: l.nombre,
          descripcion: cleanDescripcion,
          alumnos_ids: (l.items || []).map((i: any) => i.alumno_id),
          profesores_ids: profesoresIds,
          profesores_nombres: profesoresNombres,
          creado_por_id: l.creado_por,
          creado_por_nombre: l.creado_por_usuario?.nombre_completo || "Sensei",
          created_at: l.created_at,
          total_alumnos: (l.items || []).length,
        };
      });

      // Si es PROFESOR regular (no admin), filtrar listas donde está asignado o es el creador
      if (currentUser.rol === "PROFESOR") {
        return mappedListas.filter((l) => {
          if (l.creado_por_id === currentUser.id) return true;
          if (l.profesores_ids && l.profesores_ids.includes(currentUser.id)) return true;
          // Si no tiene ningún profesor específico asignado, es una lista general visible
          if (!l.profesores_ids || l.profesores_ids.length === 0) return true;
          return false;
        });
      }

      // ADMIN (Dirección) ve todas las listas
      return mappedListas;
    }
  } catch (err) {
    console.error("Error in dalGetListasAlumnos:", err);
  }

  // Fallback memoria
  return dbState.listas_alumnos
    .filter((l) => {
      if (currentUser.rol === "ADMIN") return true;
      if (l.creado_por_id === currentUser.id) return true;
      if (l.profesores_ids && l.profesores_ids.includes(currentUser.id)) return true;
      return !l.profesores_ids || l.profesores_ids.length === 0;
    })
    .map((lista) => ({
      ...lista,
      total_alumnos: lista.alumnos_ids.length,
    }));
}

/**
 * Crear nueva lista de alumnos con asignación de uno o múltiples profesores
 */
export async function dalCrearListaAlumnos(
  input: CrearListaAlumnosInput & { profesoresIds?: string[] }
): Promise<ListaAlumnos> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  let generatedId = "l" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);

  let rawDesc = input.descripcion?.trim() || "";
  const profs = input.profesoresIds || [];
  if (profs.length > 0) {
    rawDesc = `[PROFS:${profs.join(",")}] ${rawDesc}`.trim();
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("listas_alumnos").insert({
      nombre: input.nombre.trim(),
      descripcion: rawDesc,
      creado_por: currentUser.id,
    }).select().single();

    if (!error && data) {
      generatedId = data.id;
      if (input.alumnosIds && input.alumnosIds.length > 0) {
        const items = input.alumnosIds.map((aId) => ({
          lista_id: data.id,
          alumno_id: aId,
        }));
        await supabase.from("lista_alumnos_items").insert(items);
      }
    }
  } catch (err) {
    console.error("Error in dalCrearListaAlumnos Supabase:", err);
  }

  const { cleanDescripcion } = parseProfesoresFromDescripcion(rawDesc);

  const nuevaLista: ListaAlumnos = {
    id: generatedId,
    nombre: input.nombre.trim(),
    descripcion: cleanDescripcion,
    alumnos_ids: input.alumnosIds,
    profesores_ids: profs,
    creado_por_id: currentUser.id,
    creado_por_nombre: currentUser.nombre_completo,
    created_at: now,
    total_alumnos: input.alumnosIds.length,
  };

  dbState.listas_alumnos.unshift(nuevaLista);
  return nuevaLista;
}

/**
 * Actualizar lista de alumnos existente con sincronización directa en Supabase
 */
export async function dalActualizarListaAlumnos(
  listaId: string,
  input: CrearListaAlumnosInput & { profesoresIds?: string[] }
): Promise<ListaAlumnos> {
  const currentUser = await requireProfesor();

  let rawDesc = input.descripcion?.trim() || "";
  const profs = input.profesoresIds || [];
  if (profs.length > 0) {
    rawDesc = `[PROFS:${profs.join(",")}] ${rawDesc}`.trim();
  }

  // 1. Intentar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    const { data: updatedDb, error: errUp } = await supabase
      .from("listas_alumnos")
      .update({
        nombre: input.nombre.trim(),
        descripcion: rawDesc,
      })
      .eq("id", listaId)
      .select()
      .maybeSingle();

    if (!errUp && updatedDb) {
      // Sincronizar items de alumnos
      await supabase.from("lista_alumnos_items").delete().eq("lista_id", listaId);

      if (input.alumnosIds && input.alumnosIds.length > 0) {
        const items = input.alumnosIds.map((aId) => ({
          lista_id: listaId,
          alumno_id: aId,
        }));
        await supabase.from("lista_alumnos_items").insert(items);
      }

      const { cleanDescripcion } = parseProfesoresFromDescripcion(rawDesc);

      const updatedObj: ListaAlumnos = {
        id: updatedDb.id,
        nombre: updatedDb.nombre,
        descripcion: cleanDescripcion,
        alumnos_ids: input.alumnosIds,
        profesores_ids: profs,
        creado_por_id: updatedDb.creado_por,
        creado_por_nombre: currentUser.nombre_completo,
        created_at: updatedDb.created_at,
        total_alumnos: input.alumnosIds.length,
      };

      // Sincronizar memoria
      const memIndex = dbState.listas_alumnos.findIndex((l) => l.id === listaId);
      if (memIndex !== -1) {
        dbState.listas_alumnos[memIndex] = updatedObj;
      } else {
        dbState.listas_alumnos.push(updatedObj);
      }

      return updatedObj;
    }
  } catch (err) {
    console.error("Error in dalActualizarListaAlumnos Supabase:", err);
  }

  // 2. Fallback memoria
  const lista = dbState.listas_alumnos.find((l) => l.id === listaId);
  if (!lista) {
    const newMemObj: ListaAlumnos = {
      id: listaId,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || "",
      alumnos_ids: input.alumnosIds,
      profesores_ids: profs,
      creado_por_id: currentUser.id,
      creado_por_nombre: currentUser.nombre_completo,
      created_at: new Date().toISOString(),
      total_alumnos: input.alumnosIds.length,
    };
    dbState.listas_alumnos.push(newMemObj);
    return newMemObj;
  }

  lista.nombre = input.nombre.trim();
  lista.descripcion = input.descripcion?.trim() || "";
  lista.alumnos_ids = input.alumnosIds;
  lista.profesores_ids = profs;
  lista.total_alumnos = input.alumnosIds.length;

  return lista;
}

/**
 * Eliminar lista de alumnos en Supabase y memoria
 */
export async function dalEliminarListaAlumnos(
  listaId: string
): Promise<{ id: string }> {
  await requireProfesor();

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from("listas_alumnos").delete().eq("id", listaId);
  } catch (err) {
    console.error("Error in dalEliminarListaAlumnos Supabase:", err);
  }

  const index = dbState.listas_alumnos.findIndex((l) => l.id === listaId);
  if (index !== -1) {
    dbState.listas_alumnos.splice(index, 1);
  }
  return { id: listaId };
}

/**
 * Importar alumnos en lote desde archivo CSV (Solo ADMIN / Dirección)
 */
export async function dalImportarAlumnosCsv(
  alumnosNuevos: Array<{
    nombre: string;
    apellido: string;
    cinturonActual?: KarateBelt;
    telefonoContacto?: string;
    contactoEmergencia?: string;
    fechaNacimiento?: string;
  }>
): Promise<{ totalImportados: number; erroresCount: number }> {
  await requireAdmin();
  const now = new Date().toISOString();

  const rows = alumnosNuevos.map((a) => ({
    nombre: a.nombre.trim(),
    apellido: a.apellido.trim(),
    cinturon_actual: a.cinturonActual || "Blanco",
    telefono_contacto: a.telefonoContacto?.trim() || "Sin registrar",
    contacto_emergencia: a.contactoEmergencia?.trim() || "Sin registrar",
    fecha_nacimiento: a.fechaNacimiento || "2015-01-01",
    estado: "ACTIVO",
  }));

  let totalImportados = 0;
  let erroresCount = 0;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: inserted, error } = await supabase
      .from("alumnos")
      .insert(rows)
      .select();

    if (!error && inserted) {
      totalImportados = inserted.length;

      // Sync memoria
      for (const ins of inserted) {
        dbState.alumnos.push({
          id: ins.id,
          nombre: ins.nombre,
          apellido: ins.apellido,
          fecha_nacimiento: ins.fecha_nacimiento,
          telefono_contacto: ins.telefono_contacto,
          contacto_emergencia: ins.contacto_emergencia,
          cinturon_actual: ins.cinturon_actual,
          estado: ins.estado,
          created_at: ins.created_at,
        });
      }

      return { totalImportados, erroresCount: 0 };
    } else if (error) {
      console.error("Error in dalImportarAlumnosCsv Supabase:", error);
      erroresCount = rows.length;
    }
  } catch (err) {
    console.error("Error in dalImportarAlumnosCsv:", err);
    erroresCount = rows.length;
  }

  // Fallback memoria
  for (const r of rows) {
    dbState.alumnos.push({
      id: "a" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
      nombre: r.nombre,
      apellido: r.apellido,
      fecha_nacimiento: r.fecha_nacimiento,
      telefono_contacto: r.telefono_contacto,
      contacto_emergencia: r.contacto_emergencia,
      cinturon_actual: r.cinturon_actual as KarateBelt,
      estado: "ACTIVO",
      created_at: now,
    });
    totalImportados++;
  }

  return { totalImportados, erroresCount };
}

/**
 * Editar clase histórica (Solo ADMIN / Dirección)
 */
export async function dalEditarClaseHistorial(input: {
  claseId: string;
  sesionId?: string;
  nombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  profesorId: string;
}): Promise<Clase> {
  await requireAdmin();

  const horaInicioFormatted = input.horaInicio.length === 5 ? `${input.horaInicio}:00` : input.horaInicio;
  const horaFinFormatted = input.horaFin.length === 5 ? `${input.horaFin}:00` : input.horaFin;

  try {
    const supabase = await createServerSupabaseClient();

    // Actualizar clase
    const { data: updatedClase, error: errClase } = await supabase
      .from("clases")
      .update({
        nombre: input.nombre.trim(),
        profesor_id: input.profesorId,
        hora_inicio: horaInicioFormatted,
        hora_fin: horaFinFormatted,
      })
      .eq("id", input.claseId)
      .select("*, profesor:usuarios(nombre_completo)")
      .maybeSingle();

    // Actualizar fecha y profesor en la sesión si existe
    if (input.sesionId) {
      await supabase
        .from("sesiones_clase")
        .update({
          fecha: input.fecha,
          profesor_id: input.profesorId,
        })
        .eq("id", input.sesionId);
    } else {
      // Actualizar todas las sesiones vinculadas a esa clase
      await supabase
        .from("sesiones_clase")
        .update({
          fecha: input.fecha,
          profesor_id: input.profesorId,
        })
        .eq("clase_id", input.claseId);
    }

    if (!errClase && updatedClase) {
      const resultClase: Clase = {
        id: updatedClase.id,
        nombre: updatedClase.nombre,
        profesor_id: updatedClase.profesor_id,
        profesor_nombre: (updatedClase.profesor as any)?.nombre_completo || "Sensei",
        dias_semana: updatedClase.dias_semana || [1, 3, 5],
        hora_inicio: updatedClase.hora_inicio,
        hora_fin: updatedClase.hora_fin,
        cupo_maximo: updatedClase.cupo_maximo || 30,
        activa: updatedClase.activa ?? true,
        created_at: updatedClase.created_at,
      };

      // Sync memoria
      const memC = dbState.clases.find((c) => c.id === input.claseId);
      if (memC) {
        memC.nombre = resultClase.nombre;
        memC.profesor_id = resultClase.profesor_id;
        memC.profesor_nombre = resultClase.profesor_nombre;
        memC.hora_inicio = resultClase.hora_inicio;
        memC.hora_fin = resultClase.hora_fin;
      }
      return resultClase;
    }
  } catch (err) {
    console.error("Error in dalEditarClaseHistorial Supabase:", err);
  }

  // Fallback memoria
  const cMem = dbState.clases.find((c) => c.id === input.claseId);
  if (!cMem) {
    throw new Error("Clase no encontrada");
  }
  cMem.nombre = input.nombre.trim();
  cMem.profesor_id = input.profesorId;
  cMem.hora_inicio = horaInicioFormatted;
  cMem.hora_fin = horaFinFormatted;

  return cMem;
}

/**
 * Obtener todos los alumnos activos para selección en listas
 */
export async function dalGetTodosAlumnos(): Promise<Alumno[]> {
  const currentUser = await requireProfesor();
  try {
    const supabase = await createServerSupabaseClient();
    const { data: alumnos, error } = await supabase
      .from("alumnos")
      .select("*")
      .eq("estado", "ACTIVO")
      .order("apellido", { ascending: true });

    if (!error && alumnos) {
      return alumnos.map((a: any) => ({
        id: a.id,
        nombre: a.nombre,
        apellido: a.apellido,
        fecha_nacimiento: a.fecha_nacimiento,
        telefono_contacto: a.telefono_contacto,
        contacto_emergencia: a.contacto_emergencia,
        cinturon_actual: a.cinturon_actual,
        estado: a.estado,
        notas_privadas: null,
        profesores_ids: [currentUser.id],
        profesores_nombres: [currentUser.nombre_completo],
        created_at: a.created_at,
      }));
    }
  } catch (err) {
    console.error("Error in dalGetTodosAlumnos Supabase:", err);
  }

  return dbState.alumnos
    .filter((a) => a.estado === "ACTIVO")
    .map((a) => {
      const { ids, nombres } = getProfesoresForAlumno(a.id);
      return {
        ...a,
        profesores_ids: ids,
        profesores_nombres: nombres,
      };
    });
}

/**
 * Crear alumno individual de forma rápida desde modal de listas
 */
export async function dalCrearAlumnoRapido(input: {
  nombre: string;
  apellido: string;
  cinturonActual?: KarateBelt;
  telefonoContacto?: string;
  contactoEmergencia?: string;
}): Promise<Alumno> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  let generatedId = "a" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("alumnos").insert({
      nombre: input.nombre.trim(),
      apellido: input.apellido.trim(),
      cinturon_actual: input.cinturonActual || "Blanco",
      telefono_contacto: input.telefonoContacto?.trim() || "Sin registrar",
      contacto_emergencia: input.contactoEmergencia?.trim() || "Sin registrar",
      estado: "ACTIVO",
      fecha_nacimiento: "2015-01-01",
    }).select().single();

    if (!error && data) {
      generatedId = data.id;
    }
  } catch (err) {
    console.error("Error creating alumno in Supabase:", err);
  }

  const nuevoAlumno: Alumno = {
    id: generatedId,
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    fecha_nacimiento: "2015-01-01",
    telefono_contacto: input.telefonoContacto?.trim() || "Sin registrar",
    contacto_emergencia: input.contactoEmergencia?.trim() || "Sin registrar",
    cinturon_actual: input.cinturonActual || "Blanco",
    estado: "ACTIVO",
    notas_privadas: null,
    profesores_ids: [currentUser.id],
    profesores_nombres: [
      currentUser.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim(),
    ],
    created_at: now,
  };

  dbState.alumnos.unshift(nuevoAlumno);
  return nuevoAlumno;
}

/**
 * Obtener las últimas clases dictadas de un sensei o de la academia (por defecto 3).
 * Lee directamente las sesiones de tatami finalizadas ordenadas cronológicamente.
 */
export async function dalGetUltimasClasesProfesor(
  profesorId?: string,
  limit: number = 3
): Promise<ClaseHistorialItem[]> {
  const currentUser = await requireProfesor();

  // 1. Intentar en Supabase consultando directamente las sesiones finalizadas
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("sesiones_clase")
      .select(`
        id,
        clase_id,
        profesor_id,
        fecha,
        hora_apertura,
        estado,
        observaciones,
        created_at,
        clase:clases(
          id,
          nombre,
          profesor_id,
          dias_semana,
          hora_inicio,
          hora_fin,
          cupo_maximo,
          activa,
          created_at
        ),
        profesor:usuarios(id, nombre_completo),
        asistencias(id, alumno_id, estado, es_recuperacion)
      `)
      .eq("estado", "FINALIZADA")
      .order("fecha", { ascending: false })
      .order("hora_apertura", { ascending: false });

    if (profesorId && profesorId !== "TODOS") {
      query = query.eq("profesor_id", profesorId);
    } else if (currentUser.rol === "PROFESOR") {
      query = query.eq("profesor_id", currentUser.id);
    }

    const { data: dbSesiones, error: errSesiones } = await query.limit(limit);

    if (!errSesiones && dbSesiones && dbSesiones.length > 0) {
      const items: ClaseHistorialItem[] = [];

      for (const row of dbSesiones) {
        const asistencias = (row.asistencias as any[]) || [];
        const presDirectos = asistencias.filter((a) => a.estado === "PRESENTE").length;
        const tardes = asistencias.filter((a) => a.estado === "TARDE").length;
        const ausentes = asistencias.filter((a) => a.estado === "AUSENTE").length;

        // Quien llegó tarde TIENE PRESENTE (asistió a la clase)
        const totalPresentes = presDirectos + tardes;
        const totalInscriptos = asistencias.length || (row.clase as any)?.cupo_maximo || 0;

        const claseObj: Clase = {
          id: (row.clase as any)?.id || row.clase_id,
          nombre: (row.clase as any)?.nombre || "Clase Tatami",
          profesor_id: (row.clase as any)?.profesor_id || row.profesor_id,
          profesor_nombre:
            (row.profesor as any)?.nombre_completo ||
            (row.profesor_id === currentUser.id
              ? currentUser.nombre_completo
              : "Sensei"),
          dias_semana: (row.clase as any)?.dias_semana || [1, 3, 5],
          hora_inicio: (row.clase as any)?.hora_inicio || "18:00:00",
          hora_fin: (row.clase as any)?.hora_fin || "19:15:00",
          cupo_maximo: (row.clase as any)?.cupo_maximo || 30,
          activa: (row.clase as any)?.activa ?? true,
          created_at: (row.clase as any)?.created_at || row.created_at,
          total_inscriptos: totalInscriptos,
        };

        const sesionObj: SesionClase = {
          id: row.id,
          clase_id: row.clase_id,
          profesor_id: row.profesor_id,
          fecha: row.fecha,
          hora_apertura: row.hora_apertura,
          estado: row.estado,
          observaciones: row.observaciones,
          created_at: row.created_at,
          clase_nombre: claseObj.nombre,
        };

        items.push({
          clase: claseObj,
          sesion: sesionObj,
          fecha: row.fecha || sesionObj.created_at.split("T")[0],
          totalInscriptos,
          totalPresentes,
          totalAusentes: ausentes,
          totalTardes: tardes,
        });
      }

      return items;
    }
  } catch (err) {
    console.error("Error in dalGetUltimasClasesProfesor Supabase:", err);
  }

  // Fallback memoria
  const finalizadasMem = dbState.sesiones
    .filter((s) => s.estado === "FINALIZADA")
    .filter((s) => {
      if (profesorId && profesorId !== "TODOS") return s.profesor_id === profesorId;
      if (currentUser.rol === "PROFESOR") return s.profesor_id === currentUser.id;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.hora_apertura || b.created_at).getTime() -
        new Date(a.hora_apertura || a.created_at).getTime()
    );

  const items: ClaseHistorialItem[] = [];
  for (const sesion of finalizadasMem.slice(0, limit)) {
    const clase = dbState.clases.find((c) => c.id === sesion.clase_id) || {
      id: sesion.clase_id,
      nombre: sesion.clase_nombre || "Clase Tatami",
      profesor_id: sesion.profesor_id,
      profesor_nombre: currentUser.nombre_completo,
      dias_semana: [1, 3, 5],
      hora_inicio: "18:00:00",
      hora_fin: "19:15:00",
      cupo_maximo: 30,
      activa: true,
      created_at: sesion.created_at,
    };

    const asistencias = dbState.asistencias.filter((a) => a.sesion_id === sesion.id);
    const presDirectos = asistencias.filter((a) => a.estado === "PRESENTE").length;
    const tardes = asistencias.filter((a) => a.estado === "TARDE").length;
    const ausentes = asistencias.filter((a) => a.estado === "AUSENTE").length;
    const totalPresentes = presDirectos + tardes;
    const inscriptos = dbState.inscripciones.filter((i) => i.clase_id === clase.id && i.activo);

    items.push({
      clase,
      sesion,
      fecha: sesion.fecha,
      totalInscriptos: asistencias.length || inscriptos.length || clase.total_inscriptos || 0,
      totalPresentes,
      totalAusentes: ausentes,
      totalTardes: tardes,
    });
  }

  return items;
}

/**
 * Obtener todo el historial de clases de un sensei o de la academia
 */
export async function dalGetHistorialClasesProfesor(
  profesorId?: string
): Promise<ClaseHistorialItem[]> {
  return dalGetUltimasClasesProfesor(profesorId, 300);
}

/**
 * Obtener lista de profesores disponibles
 */
export async function dalGetProfesores(): Promise<Usuario[]> {
  await requireAuth();
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbUsuarios, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true });

    if (!error && dbUsuarios && dbUsuarios.length > 0) {
      return (dbUsuarios as Usuario[]).filter(
        (u) => u.rol === "PROFESOR" || u.rol === "ADMIN"
      );
    }
  } catch (err) {
    console.error("Error in dalGetProfesores:", err);
  }
  return dbState.usuarios.filter(
    (u) => u.activo && (u.rol === "PROFESOR" || u.rol === "ADMIN")
  );
}

/**
 * Actualizar cinturón y subcategoría de un alumno (permite a Admin/Profesor editar cinturón de inmediato)
 */
export async function dalActualizarCinturonAlumno(
  alumnoId: string,
  nuevoCinturon: KarateBelt,
  nuevaSubcategoria?: string | null
): Promise<Alumno> {
  const currentUser = await requireProfesor();
  const cintoEfectivo: KarateBelt = (nuevoCinturon === "Azul" ? "Violeta" : nuevoCinturon) as KarateBelt;
  const subcategoriasValidas = SUBCATEGORIAS_POR_CINTURON[cintoEfectivo] || [];
  let subcatEfectiva: string | null = nuevaSubcategoria?.trim() || null;

  if (subcatEfectiva && !subcategoriasValidas.includes(subcatEfectiva)) {
    subcatEfectiva = subcategoriasValidas[0] || null;
  }
  if (!subcatEfectiva && subcategoriasValidas.length === 1) {
    subcatEfectiva = subcategoriasValidas[0];
  }

  const now = new Date().toISOString();

  // 1. Sincronizar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("alumnos")
      .update({
        cinturon_actual: cintoEfectivo,
        subcategoria_actual: subcatEfectiva,
      })
      .eq("id", alumnoId);

    await supabase.from("historial_graduaciones").insert({
      alumno_id: alumnoId,
      cinturon: cintoEfectivo,
      subcategoria: subcatEfectiva,
      fecha_graduacion: now.split("T")[0],
      graduado_por: currentUser.id,
      observaciones: `Cinturón actualizado a ${cintoEfectivo}${subcatEfectiva ? ` (${subcatEfectiva})` : ""} por ${currentUser.nombre_completo}`,
    });
  } catch (err) {
    console.warn("dalActualizarCinturonAlumno Supabase fallback:", err);
  }

  // 2. Fallback dbState
  const alumno = dbState.alumnos.find((a) => a.id === alumnoId);
  if (alumno) {
    alumno.cinturon_actual = cintoEfectivo;
    alumno.subcategoria_actual = subcatEfectiva;

    dbState.graduaciones.push({
      id: "g" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
      alumno_id: alumnoId,
      cinturon: cintoEfectivo,
      subcategoria: subcatEfectiva,
      fecha_graduacion: now.split("T")[0],
      graduado_por: currentUser.id,
      graduado_por_nombre: currentUser.nombre_completo,
      observaciones: `Cinturón actualizado a ${cintoEfectivo}${subcatEfectiva ? ` (${subcatEfectiva})` : ""} por ${currentUser.nombre_completo}`,
      created_at: now,
    });

    return alumno;
  }

  return {
    id: alumnoId,
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    telefono_contacto: "",
    contacto_emergencia: "",
    cinturon_actual: cintoEfectivo,
    subcategoria_actual: subcatEfectiva,
    estado: "ACTIVO",
    created_at: now,
  };
}

/**
 * Obtener clases abiertas de un sensei (permanecen abiertas hasta que el sensei las cierra)
 */
export async function dalGetClasesAbiertas(
  profesorId?: string
): Promise<ClaseAbiertaItem[]> {
  const currentUser = await requireProfesor();
  const effectiveProfId =
    currentUser.rol === "ADMIN" ? profesorId || currentUser.id : currentUser.id;

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("sesiones_clase")
      .select(`
        id,
        clase_id,
        profesor_id,
        fecha,
        hora_apertura,
        estado,
        observaciones,
        created_at,
        clase:clases(id, nombre, profesor_id, dias_semana, hora_inicio, hora_fin, cupo_maximo, activa, created_at)
      `)
      .eq("estado", "ABIERTA");

    if (currentUser.rol === "PROFESOR") {
      query = query.eq("profesor_id", currentUser.id);
    } else if (profesorId && profesorId !== currentUser.id) {
      query = query.eq("profesor_id", profesorId);
    }

    const { data, error } = await query;
    if (!error && data) {
      const { data: dbUsuarios } = await supabase.from("usuarios").select("id, nombre_completo");
      const userMap = new Map((dbUsuarios || []).map((u: any) => [u.id, u.nombre_completo]));

      const items: ClaseAbiertaItem[] = [];
      for (const row of data) {
        const sesion: SesionClase = {
          id: row.id,
          clase_id: row.clase_id,
          profesor_id: row.profesor_id,
          fecha: row.fecha,
          hora_apertura: row.hora_apertura,
          estado: row.estado,
          observaciones: row.observaciones,
          created_at: row.created_at,
          clase_nombre: (row.clase as any)?.nombre || "Clase Tatami",
        };

        const profId = row.profesor_id || (row.clase as any)?.profesor_id;
        const profNombre =
          userMap.get(profId) ||
          (profId === currentUser.id ? currentUser.nombre_completo : "Sensei");

        const clase: Clase = {
          id: (row.clase as any)?.id || row.clase_id,
          nombre: (row.clase as any)?.nombre || "Clase Tatami",
          profesor_id: profId,
          profesor_nombre: profNombre,
          dias_semana: (row.clase as any)?.dias_semana || [1, 3, 5],
          hora_inicio: (row.clase as any)?.hora_inicio || "18:00:00",
          hora_fin: (row.clase as any)?.hora_fin || "19:15:00",
          cupo_maximo: (row.clase as any)?.cupo_maximo || 30,
          activa: (row.clase as any)?.activa ?? true,
          created_at: (row.clase as any)?.created_at || row.created_at,
          total_inscriptos: 0,
        };

        const { data: asistData } = await supabase
          .from("asistencias")
          .select("estado")
          .eq("sesion_id", row.id);

        const { count: inscriptosCount } = await supabase
          .from("inscripciones")
          .select("id", { count: "exact", head: true })
          .eq("clase_id", row.clase_id)
          .eq("activo", true);

        const presDirectos = (asistData || []).filter(
          (a: any) => a.estado === "PRESENTE"
        ).length;
        const tardesCount = (asistData || []).filter(
          (a: any) => a.estado === "TARDE"
        ).length;
        const ausentesCount = (asistData || []).filter(
          (a: any) => a.estado === "AUSENTE"
        ).length;

        // Quien llegó tarde TIENE PRESENTE
        const presentesCount = presDirectos + tardesCount;

        items.push({
          sesion,
          clase,
          presentesCount,
          tardesCount,
          ausentesCount,
          totalCount: inscriptosCount || (asistData || []).length || 0,
        });
      }
      return items;
    }
  } catch (err) {
    console.error("Error in dalGetClasesAbiertas Supabase:", err);
  }

  // Memory fallback
  let sesionesAbiertas = dbState.sesiones.filter((s) => s.estado === "ABIERTA");
  if (currentUser.rol === "PROFESOR") {
    sesionesAbiertas = sesionesAbiertas.filter(
      (s) => s.profesor_id === currentUser.id
    );
  } else if (profesorId && profesorId !== currentUser.id) {
    sesionesAbiertas = sesionesAbiertas.filter(
      (s) => s.profesor_id === profesorId
    );
  }

  const items: ClaseAbiertaItem[] = [];
  for (const sesion of sesionesAbiertas) {
    const clase = dbState.clases.find((c) => c.id === sesion.clase_id);
    if (!clase) continue;

    const inscriptos = dbState.inscripciones.filter(
      (ins) => ins.clase_id === clase.id && ins.activo
    );

    const asistencias = dbState.asistencias.filter(
      (a) => a.sesion_id === sesion.id
    );

    const presDirectos = asistencias.filter((a) => a.estado === "PRESENTE").length;
    const tardesCount = asistencias.filter((a) => a.estado === "TARDE").length;
    const ausentesCount = asistencias.filter((a) => a.estado === "AUSENTE").length;
    const presentesCount = presDirectos + tardesCount;

    items.push({
      sesion,
      clase,
      presentesCount,
      tardesCount,
      ausentesCount,
      totalCount: inscriptos.length || clase.total_inscriptos || 0,
    });
  }

  return items;
}

/**
 * Cerrar/finalizar sesión de clase
 */
export async function dalCerrarSesionClase(
  sesionId: string
): Promise<SesionClase> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  // 1. Intentar en Supabase
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbSesion, error: errFetch } = await supabase
      .from("sesiones_clase")
      .select("*, clase:clases(id, nombre, hora_inicio, hora_fin)")
      .eq("id", sesionId)
      .maybeSingle();

    if (!errFetch && dbSesion) {
      if (currentUser.rol === "PROFESOR") {
        const hasAccess = await checkProfesorAccessToClase(
          supabase,
          currentUser.id,
          dbSesion.clase_id,
          dbSesion.profesor_id,
          (dbSesion.clase as any)?.nombre || ""
        );
        if (!hasAccess) {
          throw new Error("No tienes permisos para cerrar la sesión de otro profesor");
        }
      }

      await supabase
        .from("sesiones_clase")
        .update({ estado: "FINALIZADA" })
        .eq("id", sesionId);

      // Mantener la hora_fin programada de la clase. Solo asignar una si no existía.
      if (!(dbSesion.clase as any)?.hora_fin) {
        const { horaFinDefecto } = getArgentinaDateTime();
        await supabase
          .from("clases")
          .update({ hora_fin: horaFinDefecto })
          .eq("id", dbSesion.clase_id);
      }

      // Sincronizar estado en memoria
      const sMem = dbState.sesiones.find((s) => s.id === sesionId);
      if (sMem) sMem.estado = "FINALIZADA";

      return {
        id: dbSesion.id,
        clase_id: dbSesion.clase_id,
        profesor_id: dbSesion.profesor_id,
        fecha: dbSesion.fecha,
        hora_apertura: dbSesion.hora_apertura,
        estado: "FINALIZADA",
        observaciones: dbSesion.observaciones,
        created_at: dbSesion.created_at,
        clase_nombre: (dbSesion.clase as any)?.nombre || "Clase",
      };
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("No tienes permisos")) {
      throw err;
    }
    console.error("Error in dalCerrarSesionClase Supabase:", err);
  }

  // 2. Fallback memoria
  const sesion = dbState.sesiones.find((s) => s.id === sesionId);
  if (!sesion) {
    throw new Error("Sesión no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && sesion.profesor_id !== currentUser.id) {
    throw new Error("No tienes permisos para cerrar la sesión de otro profesor");
  }

  sesion.estado = "FINALIZADA";
  return sesion;
}

/**
 * Obtener historial de alumnos que causaron baja por deserción o confirmación de dirección
 */
export async function dalGetHistorialBajas(): Promise<RegistroHistorialBaja[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbBajas, error } = await supabase
      .from("historial_bajas")
      .select("*")
      .order("fecha_baja", { ascending: false });

    if (!error && dbBajas) {
      return dbBajas.map((b: any) => ({
        id: b.id,
        alumno_id: b.alumno_id,
        alumno_nombre: b.alumno_nombre,
        cinturon: (b.cinturon === "Azul" ? "Violeta" : b.cinturon) as KarateBelt,
        subcategoria: b.subcategoria,
        fecha_baja: b.fecha_baja,
        tipo: b.tipo,
        motivo: b.motivo,
        ausencias_consecutivas: b.ausencias_consecutivas || 4,
        telefono_contacto: b.telefono_contacto,
        contacto_emergencia: b.contacto_emergencia,
        registrado_por: b.registrado_por,
        registrado_por_nombre: b.registrado_por_nombre,
        created_at: b.created_at,
      }));
    }
  } catch (err) {
    console.warn("dalGetHistorialBajas Supabase fallback:", err);
  }

  // Fallback memoria y tags en alumnos inactivos
  const list = [...dbState.historial_bajas];
  for (const al of dbState.alumnos) {
    if (al.estado === "INACTIVO" && al.notas_privadas?.includes("[BAJA_DESERCION") && !list.some((b) => b.alumno_id === al.id)) {
      list.push({
        id: "b-" + al.id,
        alumno_id: al.id,
        alumno_nombre: `${al.nombre} ${al.apellido}`,
        cinturon: (al.cinturon_actual === "Azul" ? "Violeta" : al.cinturon_actual) as KarateBelt,
        subcategoria: al.subcategoria_actual,
        fecha_baja: new Date().toISOString().split("T")[0],
        tipo: "NO_VUELVE",
        motivo: "Baja por deserción (No vuelve)",
        ausencias_consecutivas: 4,
        telefono_contacto: al.telefono_contacto,
        contacto_emergencia: al.contacto_emergencia,
        created_at: new Date().toISOString(),
      });
    }
  }

  return list.sort((a, b) => b.fecha_baja.localeCompare(a.fecha_baja));
}

/**
 * Marcar que un alumno en riesgo de deserción "Continúa":
 * Restablece las inasistencias acumuladas a 0 para que deje de estar en la lista de deserción.
 */
export async function dalMarcarAlumnoContinua(
  alumnoId: string,
  motivo?: string
): Promise<{ success: boolean; message: string }> {
  await requireAdmin();
  const now = new Date().toISOString();
  const resetTag = `[DESERCION_RESET:${now}]`;

  try {
    const supabase = await createServerSupabaseClient();

    // Obtener notas actuales del alumno
    const { data: dbAl } = await supabase
      .from("alumnos")
      .select("notas_privadas, estado")
      .eq("id", alumnoId)
      .maybeSingle();

    const oldNotes = dbAl?.notas_privadas || "";
    // Limpiar resets anteriores y poner el nuevo
    const cleanNotes = oldNotes.replace(/\[DESERCION_RESET:[^\]]+\]/g, "").trim();
    const updatedNotes = `${resetTag} ${cleanNotes}`.trim();

    await supabase
      .from("alumnos")
      .update({
        notas_privadas: updatedNotes,
        estado: "ACTIVO",
      })
      .eq("id", alumnoId);
  } catch (err) {
    console.warn("dalMarcarAlumnoContinua Supabase error:", err);
  }

  // Actualizar estado en memoria
  const memAl = dbState.alumnos.find((a) => a.id === alumnoId);
  if (memAl) {
    const oldNotes = memAl.notas_privadas || "";
    const cleanNotes = oldNotes.replace(/\[DESERCION_RESET:[^\]]+\]/g, "").trim();
    memAl.notas_privadas = `${resetTag} ${cleanNotes}`.trim();
    memAl.estado = "ACTIVO";
  }

  return {
    success: true,
    message: "Faltas restablecidas a 0. El alumno continúa en la academia y ya no figura en la lista de deserción.",
  };
}

/**
 * Marcar que un alumno en riesgo de deserción "No vuelve":
 * 1. Lo elimina de la lista de deserción (pasa a INACTIVO).
 * 2. Lo quita de las listas de alumnos a las que pertenece.
 * 3. Desactiva sus inscripciones a clases.
 * 4. Lo guarda en el historial permanente de bajas.
 */
export async function dalMarcarAlumnoNoVuelve(
  alumnoId: string,
  motivo?: string
): Promise<{ success: boolean; message: string }> {
  const admin = await requireAdmin();
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const bajaTag = `[BAJA_DESERCION:${now}]`;

  // Buscar datos del alumno
  let alumnoNombre = "Alumno";
  let cinturon: KarateBelt = "Blanco";
  let subcategoria: string | null = null;
  let telContacto = "";
  let telEmergencia = "";

  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbAl } = await supabase
      .from("alumnos")
      .select("*")
      .eq("id", alumnoId)
      .maybeSingle();

    if (dbAl) {
      alumnoNombre = `${dbAl.nombre} ${dbAl.apellido}`;
      cinturon = (dbAl.cinturon_actual === "Azul" ? "Violeta" : dbAl.cinturon_actual) as KarateBelt;
      subcategoria = dbAl.subcategoria_actual || null;
      telContacto = dbAl.telefono_contacto || "";
      telEmergencia = dbAl.contacto_emergencia || "";

      const oldNotes = dbAl.notas_privadas || "";
      const updatedNotes = `${bajaTag} ${oldNotes}`.trim();

      // 1. Marcar como INACTIVO en alumnos
      await supabase
        .from("alumnos")
        .update({
          estado: "INACTIVO",
          notas_privadas: updatedNotes,
        })
        .eq("id", alumnoId);

      // 2. Quitarlo de las listas de alumnos (lista_alumnos_items)
      await supabase
        .from("lista_alumnos_items")
        .delete()
        .eq("alumno_id", alumnoId);

      // 3. Desactivar inscripciones a clases
      await supabase
        .from("inscripciones")
        .update({ activo: false })
        .eq("alumno_id", alumnoId);

      // 4. Guardar en historial_bajas
      await supabase
        .from("historial_bajas")
        .insert({
          alumno_id: alumnoId,
          alumno_nombre: alumnoNombre,
          cinturon,
          subcategoria,
          fecha_baja: today,
          tipo: "NO_VUELVE",
          motivo: motivo || "Deserción escolar: confirmado por Dirección tras 4 faltas seguidas",
          ausencias_consecutivas: 4,
          telefono_contacto: telContacto,
          contacto_emergencia: telEmergencia,
          registrado_por: admin.id,
          registrado_por_nombre: admin.nombre_completo,
        });
    }
  } catch (err) {
    console.warn("dalMarcarAlumnoNoVuelve Supabase fallback:", err);
  }

  // Sincronizar memoria
  const memAl = dbState.alumnos.find((a) => a.id === alumnoId);
  if (memAl) {
    memAl.estado = "INACTIVO";
    alumnoNombre = `${memAl.nombre} ${memAl.apellido}`;
    cinturon = (memAl.cinturon_actual === "Azul" ? "Violeta" : memAl.cinturon_actual) as KarateBelt;
    subcategoria = memAl.subcategoria_actual || null;
    telContacto = memAl.telefono_contacto || "";
    telEmergencia = memAl.contacto_emergencia || "";

    const oldNotes = memAl.notas_privadas || "";
    memAl.notas_privadas = `${bajaTag} ${oldNotes}`.trim();
  }

  // Quitar de listas_alumnos en memoria
  for (const lista of dbState.listas_alumnos) {
    lista.alumnos_ids = lista.alumnos_ids.filter((id) => id !== alumnoId);
  }

  // Desactivar inscripciones en memoria
  for (const ins of dbState.inscripciones) {
    if (ins.alumno_id === alumnoId) {
      ins.activo = false;
    }
  }

  // Guardar en historial_bajas en memoria
  const registroBaja: RegistroHistorialBaja = {
    id: "baja-" + Math.random().toString(36).substring(2, 9),
    alumno_id: alumnoId,
    alumno_nombre: alumnoNombre,
    cinturon,
    subcategoria,
    fecha_baja: today,
    tipo: "NO_VUELVE",
    motivo: motivo || "Deserción escolar: confirmado por Dirección tras 4 faltas seguidas",
    ausencias_consecutivas: 4,
    telefono_contacto: telContacto,
    contacto_emergencia: telEmergencia,
    registrado_por: admin.id,
    registrado_por_nombre: admin.nombre_completo,
    created_at: now,
  };
  dbState.historial_bajas.unshift(registroBaja);

  return {
    success: true,
    message: `${alumnoNombre} fue dado de baja, quitado de las listas de alumnos y registrado en el historial de deserciones.`,
  };
}

/**
 * Reincorporar a un alumno que estaba en el historial de bajas / no vuelve
 */
export async function dalReincorporarAlumno(alumnoId: string): Promise<{ success: boolean; message: string }> {
  await requireAdmin();
  const now = new Date().toISOString();
  const resetTag = `[DESERCION_RESET:${now}]`;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbAl } = await supabase
      .from("alumnos")
      .select("notas_privadas")
      .eq("id", alumnoId)
      .maybeSingle();

    const oldNotes = dbAl?.notas_privadas || "";
    const cleanNotes = oldNotes
      .replace(/\[BAJA_DESERCION:[^\]]+\]/g, "")
      .replace(/\[DESERCION_RESET:[^\]]+\]/g, "")
      .trim();

    await supabase
      .from("alumnos")
      .update({
        estado: "ACTIVO",
        notas_privadas: `${resetTag} [REINCORPORADO:${now}] ${cleanNotes}`.trim(),
      })
      .eq("id", alumnoId);
  } catch (err) {
    console.warn("dalReincorporarAlumno Supabase fallback:", err);
  }

  const memAl = dbState.alumnos.find((a) => a.id === alumnoId);
  if (memAl) {
    memAl.estado = "ACTIVO";
    const oldNotes = memAl.notas_privadas || "";
    const cleanNotes = oldNotes
      .replace(/\[BAJA_DESERCION:[^\]]+\]/g, "")
      .replace(/\[DESERCION_RESET:[^\]]+\]/g, "")
      .trim();
    memAl.notas_privadas = `${resetTag} [REINCORPORADO:${now}] ${cleanNotes}`.trim();
  }

  return {
    success: true,
    message: "Alumno reincorporado con éxito al padrón activo de la academia.",
  };
}

// ======================================================================================
// GESTIÓN DE TORNEOS Y PARTICIPACIONES (ADMIN)
// ======================================================================================

/**
 * Obtener todos los torneos registrados con sus competidores y premios
 */
export async function dalGetTorneos(): Promise<Torneo[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbTorneos, error } = await supabase
      .from("torneos")
      .select(`
        *,
        participaciones:torneo_participaciones(
          id,
          torneo_id,
          alumno_id,
          categoria,
          puesto_premio,
          medalla,
          notas,
          created_at,
          alumno:alumnos(id, nombre, apellido, cinturon_actual, subcategoria_actual)
        )
      `)
      .order("fecha", { ascending: false });

    if (!error && dbTorneos) {
      return dbTorneos.map((t: any) => ({
        id: t.id,
        nombre: t.nombre,
        fecha: t.fecha,
        lugar: t.lugar,
        descripcion: t.descripcion,
        creado_por: t.creado_por,
        creado_por_nombre: t.creado_por_nombre,
        created_at: t.created_at,
        participaciones: (t.participaciones || []).map((p: any) => ({
          id: p.id,
          torneo_id: p.torneo_id,
          alumno_id: p.alumno_id,
          alumno_nombre: p.alumno ? `${p.alumno.nombre} ${p.alumno.apellido}` : "Alumno",
          alumno_cinturon: (p.alumno?.cinturon_actual === "Azul" ? "Violeta" : p.alumno?.cinturon_actual) as KarateBelt,
          alumno_subcategoria: p.alumno?.subcategoria_actual,
          categoria: p.categoria || "General",
          puesto_premio: p.puesto_premio,
          medalla: p.medalla as TipoMedalla,
          notas: p.notas,
          created_at: p.created_at,
        })),
      }));
    }
  } catch (err) {
    console.warn("dalGetTorneos Supabase fallback to dbState:", err);
  }

  // Fallback a dbState
  return dbState.torneos.map((t) => {
    const parts = dbState.torneo_participaciones
      .filter((p) => p.torneo_id === t.id)
      .map((p) => {
        const al = dbState.alumnos.find((a) => a.id === p.alumno_id);
        return {
          ...p,
          alumno_nombre: al ? `${al.nombre} ${al.apellido}` : p.alumno_nombre || "Alumno",
          alumno_cinturon: al ? (al.cinturon_actual === "Azul" ? "Violeta" : al.cinturon_actual) as KarateBelt : p.alumno_cinturon,
          alumno_subcategoria: al ? al.subcategoria_actual : p.alumno_subcategoria,
        };
      });
    return {
      ...t,
      participaciones: parts,
    };
  });
}

/**
 * Obtener un torneo por ID
 */
export async function dalGetTorneoById(torneoId: string): Promise<Torneo | null> {
  const torneos = await dalGetTorneos();
  return torneos.find((t) => t.id === torneoId) || null;
}

/**
 * Crear un nuevo torneo con sus competidores y premios
 */
export async function dalCrearTorneo(input: {
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
}): Promise<Torneo> {
  const admin = await requireAdmin();

  let createdTorneo: Torneo | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: newT, error: errT } = await supabase
      .from("torneos")
      .insert({
        nombre: input.nombre.trim(),
        fecha: input.fecha,
        lugar: input.lugar?.trim() || null,
        descripcion: input.descripcion?.trim() || null,
        creado_por: admin.id,
        creado_por_nombre: admin.nombre_completo,
      })
      .select()
      .single();

    if (!errT && newT) {
      const partsRows = input.participaciones.map((p) => ({
        torneo_id: newT.id,
        alumno_id: p.alumno_id,
        categoria: p.categoria?.trim() || "General",
        puesto_premio: p.puesto_premio.trim(),
        medalla: p.medalla || "OTRO",
        notas: p.notas?.trim() || null,
      }));

      let insertedParts: any[] = [];
      if (partsRows.length > 0) {
        const { data: pData } = await supabase
          .from("torneo_participaciones")
          .insert(partsRows)
          .select("*, alumno:alumnos(id, nombre, apellido, cinturon_actual, subcategoria_actual)");
        insertedParts = pData || [];
      }

      createdTorneo = {
        id: newT.id,
        nombre: newT.nombre,
        fecha: newT.fecha,
        lugar: newT.lugar,
        descripcion: newT.descripcion,
        creado_por: newT.creado_por,
        creado_por_nombre: newT.creado_por_nombre,
        created_at: newT.created_at,
        participaciones: insertedParts.map((p: any) => ({
          id: p.id,
          torneo_id: p.torneo_id,
          alumno_id: p.alumno_id,
          alumno_nombre: p.alumno ? `${p.alumno.nombre} ${p.alumno.apellido}` : "",
          alumno_cinturon: (p.alumno?.cinturon_actual === "Azul" ? "Violeta" : p.alumno?.cinturon_actual) as KarateBelt,
          alumno_subcategoria: p.alumno?.subcategoria_actual,
          categoria: p.categoria,
          puesto_premio: p.puesto_premio,
          medalla: p.medalla as TipoMedalla,
          notas: p.notas,
          created_at: p.created_at,
        })),
      };
    }
  } catch (err) {
    console.warn("dalCrearTorneo Supabase fallback:", err);
  }

  // Respaldo en dbState
  const fallbackTorneoId = createdTorneo?.id || `torneo-${Date.now()}`;
  const fallbackParts: TorneoParticipacion[] = input.participaciones.map((p, idx) => {
    const al = dbState.alumnos.find((a) => a.id === p.alumno_id);
    return {
      id: `tp-${Date.now()}-${idx}`,
      torneo_id: fallbackTorneoId,
      alumno_id: p.alumno_id,
      alumno_nombre: al ? `${al.nombre} ${al.apellido}` : "Alumno",
      alumno_cinturon: al ? (al.cinturon_actual === "Azul" ? "Violeta" : al.cinturon_actual) as KarateBelt : "Blanco",
      alumno_subcategoria: al ? al.subcategoria_actual : null,
      categoria: p.categoria || "General",
      puesto_premio: p.puesto_premio,
      medalla: p.medalla || "OTRO",
      notas: p.notas || null,
      created_at: new Date().toISOString(),
    };
  });

  const fallbackTorneo: Torneo = createdTorneo || {
    id: fallbackTorneoId,
    nombre: input.nombre.trim(),
    fecha: input.fecha,
    lugar: input.lugar?.trim() || null,
    descripcion: input.descripcion?.trim() || null,
    creado_por: admin.id,
    creado_por_nombre: admin.nombre_completo,
    participaciones: fallbackParts,
    created_at: new Date().toISOString(),
  };

  dbState.torneos.unshift(fallbackTorneo);
  dbState.torneo_participaciones.push(...fallbackParts);

  return fallbackTorneo;
}

/**
 * Actualizar torneo y sus competidores
 */
export async function dalActualizarTorneo(
  torneoId: string,
  input: {
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
): Promise<Torneo> {
  await requireAdmin();

  try {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("torneos")
      .update({
        nombre: input.nombre.trim(),
        fecha: input.fecha,
        lugar: input.lugar?.trim() || null,
        descripcion: input.descripcion?.trim() || null,
      })
      .eq("id", torneoId);

    // Reemplazar participaciones
    await supabase.from("torneo_participaciones").delete().eq("torneo_id", torneoId);

    const partsRows = input.participaciones.map((p) => ({
      torneo_id: torneoId,
      alumno_id: p.alumno_id,
      categoria: p.categoria?.trim() || "General",
      puesto_premio: p.puesto_premio.trim(),
      medalla: p.medalla || "OTRO",
      notas: p.notas?.trim() || null,
    }));

    if (partsRows.length > 0) {
      await supabase.from("torneo_participaciones").insert(partsRows);
    }
  } catch (err) {
    console.warn("dalActualizarTorneo Supabase fallback:", err);
  }

  // dbState fallback
  const idx = dbState.torneos.findIndex((t) => t.id === torneoId);
  const updatedParts: TorneoParticipacion[] = input.participaciones.map((p, pIdx) => {
    const al = dbState.alumnos.find((a) => a.id === p.alumno_id);
    return {
      id: `tp-${Date.now()}-${pIdx}`,
      torneo_id: torneoId,
      alumno_id: p.alumno_id,
      alumno_nombre: al ? `${al.nombre} ${al.apellido}` : "Alumno",
      alumno_cinturon: al ? (al.cinturon_actual === "Azul" ? "Violeta" : al.cinturon_actual) as KarateBelt : "Blanco",
      alumno_subcategoria: al ? al.subcategoria_actual : null,
      categoria: p.categoria || "General",
      puesto_premio: p.puesto_premio,
      medalla: p.medalla || "OTRO",
      notas: p.notas || null,
      created_at: new Date().toISOString(),
    };
  });

  if (idx !== -1) {
    dbState.torneos[idx] = {
      ...dbState.torneos[idx],
      nombre: input.nombre.trim(),
      fecha: input.fecha,
      lugar: input.lugar?.trim() || null,
      descripcion: input.descripcion?.trim() || null,
      participaciones: updatedParts,
    };
  }

  dbState.torneo_participaciones = dbState.torneo_participaciones.filter((p) => p.torneo_id !== torneoId);
  dbState.torneo_participaciones.push(...updatedParts);

  const t = await dalGetTorneoById(torneoId);
  if (!t) throw new Error("Torneo no encontrado");
  return t;
}

/**
 * Eliminar un torneo
 */
export async function dalEliminarTorneo(torneoId: string): Promise<boolean> {
  await requireAdmin();

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from("torneo_participaciones").delete().eq("torneo_id", torneoId);
    await supabase.from("torneos").delete().eq("id", torneoId);
  } catch (err) {
    console.warn("dalEliminarTorneo Supabase fallback:", err);
  }

  dbState.torneos = dbState.torneos.filter((t) => t.id !== torneoId);
  dbState.torneo_participaciones = dbState.torneo_participaciones.filter((p) => p.torneo_id !== torneoId);

  return true;
}

/**
 * Obtener participaciones en torneos y premios de un alumno específico
 */
export async function dalGetTorneosAlumno(alumnoId: string): Promise<Array<{
  id: string;
  torneoId: string;
  torneoNombre: string;
  fecha: string;
  lugar?: string | null;
  categoria?: string;
  puesto_premio: string;
  medalla?: TipoMedalla;
  notas?: string | null;
}>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbParts, error } = await supabase
      .from("torneo_participaciones")
      .select("*, torneo:torneos(*)")
      .eq("alumno_id", alumnoId);

    if (!error && dbParts && dbParts.length > 0) {
      return dbParts.map((p: any) => ({
        id: p.id,
        torneoId: p.torneo?.id || p.torneo_id,
        torneoNombre: p.torneo?.nombre || "Torneo Tatami",
        fecha: p.torneo?.fecha || (p.created_at || "").split("T")[0],
        lugar: p.torneo?.lugar,
        categoria: p.categoria,
        puesto_premio: p.puesto_premio,
        medalla: p.medalla as TipoMedalla,
        notas: p.notas,
      }));
    }
  } catch (err) {
    console.warn("dalGetTorneosAlumno Supabase fallback:", err);
  }

  // Fallback dbState
  return dbState.torneo_participaciones
    .filter((p) => p.alumno_id === alumnoId)
    .map((p) => {
      const t = dbState.torneos.find((tor) => tor.id === p.torneo_id);
      return {
        id: p.id,
        torneoId: p.torneo_id,
        torneoNombre: t?.nombre || "Torneo Tatami",
        fecha: t?.fecha || new Date().toISOString().split("T")[0],
        lugar: t?.lugar,
        categoria: p.categoria,
        puesto_premio: p.puesto_premio,
        medalla: p.medalla,
        notas: p.notas,
      };
    });
}
