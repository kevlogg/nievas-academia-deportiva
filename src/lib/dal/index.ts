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
} from "@/types";
import {
  InscribirAlumnoInput,
  CrearClaseInput,
  CrearListaAlumnosInput,
} from "@/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
 * Obtener detalle de una clase específica
 */
export async function dalGetClaseById(claseId: string): Promise<Clase | null> {
  const currentUser = await requireProfesor();
  const clase = dbState.clases.find((c) => c.id === claseId);
  if (!clase) return null;

  // Verificación RBAC: Si es profesor, solo puede ver su clase
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

  const clase = dbState.clases.find((c) => c.id === claseId);
  if (!clase) {
    throw new Error("Clase no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && clase.profesor_id !== currentUser.id) {
    throw new Error("Solo el profesor asignado o un admin pueden iniciar esta clase");
  }

  // Buscar si ya existe sesión para esta clase y fecha
  let sesion = dbState.sesiones.find(
    (s) => s.clase_id === claseId && s.fecha === targetFecha
  );

  if (!sesion) {
    sesion = {
      id: "s" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
      clase_id: claseId,
      profesor_id: currentUser.id,
      fecha: targetFecha,
      hora_apertura: new Date().toISOString(),
      estado: "ABIERTA",
      observaciones: "",
      created_at: new Date().toISOString(),
      clase_nombre: clase.nombre,
    };
    dbState.sesiones.push(sesion);

    // Inicializar asistencias por defecto para todos los alumnos inscriptos
    const inscriptos = dbState.inscripciones.filter(
      (ins) => ins.clase_id === claseId && ins.activo
    );

    for (const ins of inscriptos) {
      dbState.asistencias.push({
        id: "as" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
        sesion_id: sesion.id,
        alumno_id: ins.alumno_id,
        estado: "AUSENTE", // Por defecto ausente hasta que el profesor toque
        es_recuperacion: false,
        marcado_en: new Date().toISOString(),
        created_at: new Date().toISOString(),
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

  // Obtener asistencias de la sesión
  const sessionAsistencias = dbState.asistencias.filter(
    (a) => a.sesion_id === sesionId
  );

  const items: AlumnoSesionItem[] = [];

  for (const a of sessionAsistencias) {
    const rawAlumno = dbState.alumnos.find((al) => al.id === a.alumno_id);
    if (rawAlumno) {
      // Regla de RBAC: El profesor NO puede ver notas_privadas
      const alumno: Alumno = {
        ...rawAlumno,
        notas_privadas:
          currentUser.rol === "ADMIN" ? rawAlumno.notas_privadas : null,
      };

      // Calcular clases acumuladas en su cinturón actual
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
 */
export async function dalMarcarAsistencia(
  sesionId: string,
  alumnoId: string,
  estado: AsistenciaEstado,
  esRecuperacion: boolean = false
): Promise<Asistencia> {
  const currentUser = await requireProfesor();
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

  const now = new Date().toISOString();

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
 * Buscar alumnos globales para agregar como Recuperación (excluyendo a los que ya están en la sesión)
 */
export async function dalBuscarAlumnosGlobalParaRecuperacion(
  query: string,
  sesionId: string
): Promise<Alumno[]> {
  await requireProfesor();

  const cleanQuery = query.toLowerCase().trim();
  const alumnosYaEnSesion = new Set(
    dbState.asistencias
      .filter((a) => a.sesion_id === sesionId)
      .map((a) => a.alumno_id)
  );

  return dbState.alumnos
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
    .slice(0, 10);
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
  input: InscribirAlumnoInput
): Promise<{ alumno: Alumno; inscripcion: Inscripcion }> {
  const currentUser = await requireProfesor();
  const clase = dbState.clases.find((c) => c.id === claseId);
  if (!clase) {
    throw new Error("Clase no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && clase.profesor_id !== currentUser.id) {
    throw new Error("Solo puedes inscribir alumnos en tus propias clases");
  }

  const now = new Date().toISOString();
  const nuevoAlumno: Alumno = {
    id: "a" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    fecha_nacimiento: input.fechaNacimiento,
    telefono_contacto: input.telefonoContacto.trim(),
    contacto_emergencia: input.contactoEmergencia.trim(),
    cinturon_actual: input.cinturonActual,
    estado: "ACTIVO",
    notas_privadas: null,
    created_at: now,
  };

  dbState.alumnos.push(nuevoAlumno);

  const nuevaInscripcion: Inscripcion = {
    id: "ins" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
    clase_id: claseId,
    alumno_id: nuevoAlumno.id,
    fecha_alta: now.split("T")[0],
    activo: true,
    created_at: now,
  };

  dbState.inscripciones.push(nuevaInscripcion);
  if (clase.total_inscriptos !== undefined) {
    clase.total_inscriptos += 1;
  }

  return { alumno: nuevoAlumno, inscripcion: nuevaInscripcion };
}

/**
 * Finalizar sesión de tatami
 */
export async function dalFinalizarSesion(sesionId: string): Promise<SesionClase> {
  const currentUser = await requireProfesor();
  const sesion = dbState.sesiones.find((s) => s.id === sesionId);
  if (!sesion) {
    throw new Error("Sesión no encontrada");
  }

  if (currentUser.rol === "PROFESOR" && sesion.profesor_id !== currentUser.id) {
    throw new Error("No tienes permisos para cerrar esta sesión");
  }

  sesion.estado = "FINALIZADA";
  return sesion;
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

  const profesor =
    dbState.usuarios.find((u) => u.id === effectiveProfId) || currentUser;

  const clasesProfesor = dbState.clases.filter(
    (c) => c.profesor_id === effectiveProfId
  );
  const clasesIds = new Set(clasesProfesor.map((c) => c.id));

  // Todas las sesiones de este profesor
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

  // Alumnos inscriptos
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
  };
}

/**
 * Obtener métricas consolidadas de todo el dojo (todas las clases y profesores) para el SuperAdmin
 */
export async function dalGetDojoMetricasCompletas(): Promise<ProfesorMetricasCompletasData> {
  const currentUser = await requireAdmin();

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
    // Un alumno activo entra en alerta ÚNICAMENTE si acumula 3 o más AUSENTE
    // consecutivas en clases que ya han sido CERRADAS (FINALIZADA).
    const { data: dbAlumnos } = await supabase
      .from("alumnos")
      .select("*")
      .eq("estado", "ACTIVO");

    const alumnos = dbAlumnos || dbState.alumnos.filter((a) => a.estado === "ACTIVO");
    const alertasDesercion: AlertaDesercion[] = [];

    // Solo se evalúan si efectivamente existen clases finalizadas en el sistema
    if (sesiones.length >= 3 && alumnos.length > 0) {
      for (const al of alumnos) {
        const asistenciasAlumnoEnCerradas = asistencias
          .filter((a: any) => a.alumno_id === al.id)
          .map((a: any) => {
            const ses = sesiones.find((s: any) => s.id === a.sesion_id);
            return {
              sesionId: a.sesion_id,
              fecha: ses?.fecha || a.created_at.split("T")[0],
              estado: a.estado,
            };
          })
          .filter((item: any) => sesiones.some((s: any) => s.id === item.sesionId))
          .sort((x: any, y: any) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());

        if (asistenciasAlumnoEnCerradas.length === 0) continue;

        let ausenciasConsecutivas = 0;
        let ultimaFechaAsistida: string | null = null;

        for (const reg of asistenciasAlumnoEnCerradas) {
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

        if (ausenciasConsecutivas >= 3) {
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

    return {
      totalAlumnosActivos: totalAlumnosActivos || 0,
      totalProfesoresActivos: docentes.length,
      totalClasesDictadas,
      clasesConMayorConvocatoria,
      clasesConMenorConvocatoria,
      desempenoProfesores,
      alertasDesercion,
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
  };
}

/**
 * Obtener listado de alumnos para Admin (con notas privadas)
 */
export async function dalGetAdminAlumnos(
  search?: string,
  beltFilter?: KarateBelt | "TODOS"
): Promise<Alumno[]> {
  await requireAdmin();

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from("alumnos").select("*").order("apellido", { ascending: true });

    if (beltFilter && beltFilter !== "TODOS") {
      query = query.eq("cinturon_actual", beltFilter);
    }

    if (search && search.trim() !== "") {
      const q = `%${search.trim()}%`;
      query = query.or(`nombre.ilike.${q},apellido.ilike.${q},telefono_contacto.ilike.${q}`);
    }

    const { data: alumnos, error } = await query;
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
        notas_privadas: a.notas_privadas,
        profesores_ids: [],
        profesores_nombres: [],
        created_at: a.created_at,
      }));
    }
  } catch (err) {
    console.error("Error in dalGetAdminAlumnos Supabase:", err);
  }

  let list = dbState.alumnos.map((a) => {
    const { ids, nombres } = getProfesoresForAlumno(a.id);
    return {
      ...a,
      profesores_ids: ids,
      profesores_nombres: nombres,
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
    list = list.filter((a) => a.cinturon_actual === beltFilter);
  }

  return list;
}

/**
 * Obtener clases para administración
 */
export async function dalGetAdminClases(): Promise<Clase[]> {
  await requireAdmin();
  return dbState.clases;
}

/**
 * Registrar nueva graduación de cinto (con histórico y actualización en alumno)
 */
export async function dalRegistrarGraduacion(
  alumnoId: string,
  nuevoCinturon: KarateBelt,
  observaciones?: string
): Promise<HistorialGraduacion> {
  const admin = await requireAdmin();
  const alumno = dbState.alumnos.find((a) => a.id === alumnoId);
  if (!alumno) {
    throw new Error("Alumno no encontrado");
  }

  const now = new Date().toISOString();
  const fechaGraduacion = now.split("T")[0];

  const graduacion: HistorialGraduacion = {
    id: "g" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
    alumno_id: alumnoId,
    cinturon: nuevoCinturon,
    fecha_graduacion: fechaGraduacion,
    graduado_por: admin.id,
    graduado_por_nombre: admin.nombre_completo,
    observaciones: observaciones || `Graduación a ${nuevoCinturon} en Nievas Academia Deportiva`,
    created_at: now,
  };

  dbState.graduaciones.push(graduacion);
  alumno.cinturon_actual = nuevoCinturon;

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
  const hoyFecha = now.split("T")[0];
  const fechaClase = data.fecha || hoyFecha;

  // Si no se pasaron días de semana pero sí fecha, calcular el día de la semana
  let diasSemana = data.diasSemana && data.diasSemana.length > 0 ? data.diasSemana : [];
  if (diasSemana.length === 0 && fechaClase) {
    const d = new Date(`${fechaClase}T12:00:00`).getDay();
    diasSemana = [isNaN(d) ? new Date().getDay() : d];
  }

  let nuevaClaseId = "c" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);
  let nuevaSesionId = "s" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbClase, error: errClase } = await supabase.from("clases").insert({
      nombre: data.nombre.trim(),
      profesor_id: effectiveProfId,
      dias_semana: diasSemana,
      hora_inicio: data.horaInicio,
      hora_fin: data.horaFin,
      cupo_maximo: data.cupoMaximo,
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
    nombre: data.nombre.trim(),
    profesor_id: effectiveProfId,
    profesor_nombre: profesor ? profesor.nombre_completo : currentUser.nombre_completo,
    dias_semana: diasSemana,
    hora_inicio: data.horaInicio,
    hora_fin: data.horaFin,
    cupo_maximo: data.cupoMaximo,
    activa: true,
    created_at: now,
    total_inscriptos: 0,
  };

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
 * Obtener listas de alumnos disponibles
 */
export async function dalGetListasAlumnos(): Promise<ListaAlumnos[]> {
  await requireProfesor();
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
      return listas.map((l: any) => ({
        id: l.id,
        nombre: l.nombre,
        descripcion: l.descripcion || "",
        alumnos_ids: (l.items || []).map((i: any) => i.alumno_id),
        creado_por_id: l.creado_por,
        creado_por_nombre: l.creado_por_usuario?.nombre_completo || "Sensei",
        created_at: l.created_at,
        total_alumnos: (l.items || []).length,
      }));
    }
  } catch (err) {
    console.error("Error in dalGetListasAlumnos:", err);
  }
  return dbState.listas_alumnos.map((lista) => ({
    ...lista,
    total_alumnos: lista.alumnos_ids.length,
  }));
}

/**
 * Crear nueva lista de alumnos
 */
export async function dalCrearListaAlumnos(
  input: CrearListaAlumnosInput
): Promise<ListaAlumnos> {
  const currentUser = await requireProfesor();
  const now = new Date().toISOString();

  let generatedId = "l" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("listas_alumnos").insert({
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || "",
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

  const nuevaLista: ListaAlumnos = {
    id: generatedId,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || "",
    alumnos_ids: input.alumnosIds,
    creado_por_id: currentUser.id,
    creado_por_nombre: currentUser.nombre_completo,
    created_at: now,
    total_alumnos: input.alumnosIds.length,
  };

  dbState.listas_alumnos.unshift(nuevaLista);
  return nuevaLista;
}

/**
 * Actualizar lista de alumnos existente
 */
export async function dalActualizarListaAlumnos(
  listaId: string,
  input: CrearListaAlumnosInput
): Promise<ListaAlumnos> {
  await requireProfesor();
  const lista = dbState.listas_alumnos.find((l) => l.id === listaId);
  if (!lista) {
    throw new Error("Lista de alumnos no encontrada");
  }

  lista.nombre = input.nombre.trim();
  lista.descripcion = input.descripcion?.trim() || "";
  lista.alumnos_ids = input.alumnosIds;
  lista.total_alumnos = input.alumnosIds.length;

  return lista;
}

/**
 * Eliminar lista de alumnos
 */
export async function dalEliminarListaAlumnos(
  listaId: string
): Promise<{ id: string }> {
  await requireProfesor();
  const index = dbState.listas_alumnos.findIndex((l) => l.id === listaId);
  if (index === -1) {
    throw new Error("Lista de alumnos no encontrada");
  }

  dbState.listas_alumnos.splice(index, 1);
  return { id: listaId };
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
 * Obtener las últimas clases de un sensei (por defecto 3)
 */
export async function dalGetUltimasClasesProfesor(
  profesorId?: string,
  limit: number = 3
): Promise<ClaseHistorialItem[]> {
  const currentUser = await requireProfesor();
  const effectiveProfId =
    currentUser.rol === "ADMIN" ? profesorId || currentUser.id : currentUser.id;

  let clasesSensei = dbState.clases.filter((c) => c.activa);
  if (currentUser.rol === "PROFESOR" || profesorId) {
    clasesSensei = clasesSensei.filter((c) => c.profesor_id === effectiveProfId);
  }

  // Ordenar por created_at descendente (más recientes primero)
  const sortedClases = [...clasesSensei].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const items: ClaseHistorialItem[] = [];

  for (const clase of sortedClases.slice(0, limit)) {
    const sesion = dbState.sesiones
      .filter((s) => s.clase_id === clase.id)
      .sort(
        (a, b) => new Date(b.hora_apertura).getTime() - new Date(a.hora_apertura).getTime()
      )[0];

    const inscriptos = dbState.inscripciones.filter(
      (ins) => ins.clase_id === clase.id && ins.activo
    );

    let presentes = 0;
    let ausentes = 0;
    let tardes = 0;

    if (sesion) {
      const asistencias = dbState.asistencias.filter((as) => as.sesion_id === sesion.id);
      presentes = asistencias.filter((a) => a.estado === "PRESENTE").length;
      ausentes = asistencias.filter((a) => a.estado === "AUSENTE").length;
      tardes = asistencias.filter((a) => a.estado === "TARDE").length;
    }

    items.push({
      clase,
      sesion,
      fecha: sesion?.fecha || clase.created_at.split("T")[0],
      totalInscriptos: inscriptos.length || clase.total_inscriptos || 0,
      totalPresentes: presentes,
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
  return dalGetUltimasClasesProfesor(profesorId, 50);
}

/**
 * Obtener lista de profesores disponibles
 */
export async function dalGetProfesores(): Promise<Usuario[]> {
  await requireAuth();
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbUsuarios, error } = await supabase.from("usuarios").select("*").eq("activo", true);
    const { data: dbClases } = await supabase.from("clases").select("profesor_id");
    const profIdsConClases = new Set((dbClases || []).map((c: any) => c.profesor_id));

    if (!error && dbUsuarios && dbUsuarios.length > 0) {
      return (dbUsuarios as Usuario[]).filter(
        (u) => u.rol === "PROFESOR" || profIdsConClases.has(u.id)
      );
    }
  } catch (err) {
    console.error("Error in dalGetProfesores:", err);
  }
  return dbState.usuarios.filter(
    (u) => u.activo && (u.rol === "PROFESOR" || dbState.clases.some((c) => c.profesor_id === u.id))
  );
}

/**
 * Actualizar cinturón de un alumno (permite a cualquier Admin editar el cinturón al cargar listas)
 */
export async function dalActualizarCinturonAlumno(
  alumnoId: string,
  nuevoCinturon: KarateBelt
): Promise<Alumno> {
  const currentUser = await requireProfesor();
  const alumno = dbState.alumnos.find((a) => a.id === alumnoId);
  if (!alumno) {
    throw new Error("Alumno no encontrado");
  }

  alumno.cinturon_actual = nuevoCinturon;

  const now = new Date().toISOString();
  dbState.graduaciones.push({
    id: "g" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
    alumno_id: alumnoId,
    cinturon: nuevoCinturon,
    fecha_graduacion: now.split("T")[0],
    graduado_por: currentUser.id,
    graduado_por_nombre: currentUser.nombre_completo,
    observaciones: `Cinturón actualizado por ${currentUser.nombre_completo}`,
    created_at: now,
  });

  return alumno;
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

        const presentesCount = (asistData || []).filter(
          (a: any) => a.estado === "PRESENTE" || a.estado === "TARDE"
        ).length;

        items.push({
          sesion,
          clase,
          presentesCount,
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

    const presentesCount = asistencias.filter(
      (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
    ).length;

    items.push({
      sesion,
      clase,
      presentesCount,
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
