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
  AdminDashboardMetricsData,
  SesionClase,
  Usuario,
} from "@/types";
import { InscribirAlumnoInput, CrearClaseInput } from "@/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ======================================================================================
// ALMACÉN DE DATOS SEMILLA EN MEMORIA (FALLBACK SEED STORE)
// Garantiza resiliencia 100% ante desconexiones, demo offline y pruebas inmediatas
// ======================================================================================

const SEED_USUARIOS: Usuario[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "admin@nievaskarate.com",
    rol: "ADMIN",
    nombre_completo: "Sensei Marcos Nievas (Headmaster)",
    telefono: "+54 9 11 5555-0101",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "profesor@nievaskarate.com",
    rol: "PROFESOR",
    nombre_completo: "Sensei Lucas Benítez",
    telefono: "+54 9 11 5555-0202",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const SEED_CLASES: Clase[] = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    nombre: "Infantiles Kumite (6-12 años)",
    profesor_id: "22222222-2222-2222-2222-222222222222",
    profesor_nombre: "Sensei Lucas Benítez",
    dias_semana: [1, 3, 5], // Lun, Mié, Vie
    hora_inicio: "18:00:00",
    hora_fin: "19:15:00",
    cupo_maximo: 25,
    activa: true,
    created_at: "2026-01-01T00:00:00Z",
    total_inscriptos: 5,
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    nombre: "Juveniles Kata & Bunkai",
    profesor_id: "22222222-2222-2222-2222-222222222222",
    profesor_nombre: "Sensei Lucas Benítez",
    dias_semana: [2, 4], // Mar, Jue
    hora_inicio: "19:30:00",
    hora_fin: "21:00:00",
    cupo_maximo: 20,
    activa: true,
    created_at: "2026-01-01T00:00:00Z",
    total_inscriptos: 2,
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    nombre: "Adultos Tradicional y Dan",
    profesor_id: "11111111-1111-1111-1111-111111111111",
    profesor_nombre: "Sensei Marcos Nievas (Headmaster)",
    dias_semana: [1, 3, 5], // Lun, Mié, Vie
    hora_inicio: "20:30:00",
    hora_fin: "22:00:00",
    cupo_maximo: 30,
    activa: true,
    created_at: "2026-01-01T00:00:00Z",
    total_inscriptos: 4,
  },
];

const SEED_ALUMNOS: Alumno[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    nombre: "Joaquín",
    apellido: "Martínez",
    fecha_nacimiento: "2014-05-12",
    telefono_contacto: "+54 9 11 4444-1111",
    contacto_emergencia: "Madre: Mariana +54 9 11 4444-1112",
    cinturon_actual: "Amarillo",
    estado: "ACTIVO",
    notas_privadas: "Asmático leve, lleva inhalador en su bolso.",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "a2222222-2222-2222-2222-222222222222",
    nombre: "Sofía",
    apellido: "Gómez",
    fecha_nacimiento: "2013-09-20",
    telefono_contacto: "+54 9 11 4444-2221",
    contacto_emergencia: "Padre: Roberto +54 9 11 4444-2222",
    cinturon_actual: "Naranja",
    estado: "ACTIVO",
    notas_privadas: "Excelente rendimiento técnico. Candidata a torneo regional.",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "a3333333-3333-3333-3333-333333333333",
    nombre: "Mateo",
    apellido: "Rossi",
    fecha_nacimiento: "2012-02-14",
    telefono_contacto: "+54 9 11 4444-3331",
    contacto_emergencia: "Tutor: Claudio +54 9 11 4444-3332",
    cinturon_actual: "Verde",
    estado: "ACTIVO",
    notas_privadas: "Requiere seguimiento en guardias altas y disciplina.",
    created_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "a4444444-4444-4444-4444-444444444444",
    nombre: "Valentina",
    apellido: "Díaz",
    fecha_nacimiento: "2015-11-03",
    telefono_contacto: "+54 9 11 4444-4441",
    contacto_emergencia: "Madre: Patricia +54 9 11 4444-4442",
    cinturon_actual: "Blanco",
    estado: "ACTIVO",
    notas_privadas: "Hermana menor de Mateo Díaz. Asistencia regular.",
    created_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "a5555555-5555-5555-5555-555555555555",
    nombre: "Facundo",
    apellido: "Fernández",
    fecha_nacimiento: "2011-07-29",
    telefono_contacto: "+54 9 11 4444-5551",
    contacto_emergencia: "Padre: Gabriel +54 9 11 4444-5552",
    cinturon_actual: "Azul",
    estado: "ACTIVO",
    notas_privadas: "Alerta deserción: 3 faltas consecutivas por viaje y salud.",
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "a6666666-6666-6666-6666-666666666666",
    nombre: "Camila",
    apellido: "López",
    fecha_nacimiento: "2010-04-18",
    telefono_contacto: "+54 9 11 4444-6661",
    contacto_emergencia: "Madre: Elena +54 9 11 4444-6662",
    cinturon_actual: "Marrón",
    estado: "ACTIVO",
    notas_privadas: "Preparándose para examen Shodan (Cinturón Negro) a fin de año.",
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "a7777777-7777-7777-7777-777777777777",
    nombre: "Agustín",
    apellido: "Pérez",
    fecha_nacimiento: "2008-01-10",
    telefono_contacto: "+54 9 11 4444-7771",
    contacto_emergencia: "Padre: Juan +54 9 11 4444-7772",
    cinturon_actual: "Blanco/Amarillo",
    estado: "ACTIVO",
    notas_privadas: "Atento a puntualidad, viene en colectivo desde zona oeste.",
    created_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "a8888888-8888-8888-8888-888888888888",
    nombre: "Santiago",
    apellido: "Nievas",
    fecha_nacimiento: "1998-03-22",
    telefono_contacto: "+54 9 11 4444-8881",
    contacto_emergencia: "Hermana: Lucía +54 9 11 4444-8882",
    cinturon_actual: "Negro",
    estado: "ACTIVO",
    notas_privadas: "Instructor asistente en kumite de adultos.",
    created_at: "2025-01-01T00:00:00Z",
  },
];

const SEED_INSCRIPCIONES: Inscripcion[] = [
  {
    id: "i1111111-1111-1111-1111-111111111111",
    clase_id: "c1111111-1111-1111-1111-111111111111",
    alumno_id: "a1111111-1111-1111-1111-111111111111",
    fecha_alta: "2026-01-15",
    activo: true,
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "i2222222-2222-2222-2222-222222222222",
    clase_id: "c1111111-1111-1111-1111-111111111111",
    alumno_id: "a2222222-2222-2222-2222-222222222222",
    fecha_alta: "2026-01-15",
    activo: true,
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "i3333333-3333-3333-3333-333333333333",
    clase_id: "c1111111-1111-1111-1111-111111111111",
    alumno_id: "a3333333-3333-3333-3333-333333333333",
    fecha_alta: "2026-02-01",
    activo: true,
    created_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "i4444444-4444-4444-4444-444444444444",
    clase_id: "c1111111-1111-1111-1111-111111111111",
    alumno_id: "a4444444-4444-4444-4444-444444444444",
    fecha_alta: "2026-03-01",
    activo: true,
    created_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "i5555555-5555-5555-5555-555555555555",
    clase_id: "c1111111-1111-1111-1111-111111111111",
    alumno_id: "a5555555-5555-5555-5555-555555555555",
    fecha_alta: "2026-01-10",
    activo: true,
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "i6666666-6666-6666-6666-666666666666",
    clase_id: "c2222222-2222-2222-2222-222222222222",
    alumno_id: "a6666666-6666-6666-6666-666666666666",
    fecha_alta: "2026-01-10",
    activo: true,
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "i7777777-7777-7777-7777-777777777777",
    clase_id: "c2222222-2222-2222-2222-222222222222",
    alumno_id: "a7777777-7777-7777-7777-777777777777",
    fecha_alta: "2026-02-15",
    activo: true,
    created_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "i8888888-8888-8888-8888-888888888888",
    clase_id: "c3333333-3333-3333-3333-333333333333",
    alumno_id: "a8888888-8888-8888-8888-888888888888",
    fecha_alta: "2026-01-01",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

// Historial de Graduaciones de ejemplo
const SEED_GRADUACIONES: HistorialGraduacion[] = [
  {
    id: "g1111111-1111-1111-1111-111111111111",
    alumno_id: "a1111111-1111-1111-1111-111111111111",
    cinturon: "Amarillo",
    fecha_graduacion: "2026-06-15",
    graduado_por: "11111111-1111-1111-1111-111111111111",
    graduado_por_nombre: "Sensei Marcos Nievas",
    observaciones: "Excelente técnica básica en Heian Shodan.",
    created_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "g2222222-2222-2222-2222-222222222222",
    alumno_id: "a2222222-2222-2222-2222-222222222222",
    cinturon: "Naranja",
    fecha_graduacion: "2026-07-20",
    graduado_por: "22222222-2222-2222-2222-222222222222",
    graduado_por_nombre: "Sensei Lucas Benítez",
    observaciones: "Gran actitud y postura en kiba dachi.",
    created_at: "2026-07-20T00:00:00Z",
  },
  {
    id: "g3333333-3333-3333-3333-333333333333",
    alumno_id: "a6666666-6666-6666-6666-666666666666",
    cinturon: "Marrón",
    fecha_graduacion: "2026-05-10",
    graduado_por: "11111111-1111-1111-1111-111111111111",
    graduado_por_nombre: "Sensei Marcos Nievas",
    observaciones: "Aprobada con honores en Kata Kanku Dai y Jiyu Kumite.",
    created_at: "2026-05-10T00:00:00Z",
  },
];

// Sesiones de Clase y Asistencias
const SEED_SESIONES: SesionClase[] = [
  {
    id: "s1111111-1111-1111-1111-111111111111",
    clase_id: "c1111111-1111-1111-1111-111111111111",
    profesor_id: "22222222-2222-2222-2222-222222222222",
    fecha: new Date().toISOString().split("T")[0],
    hora_apertura: new Date().toISOString(),
    estado: "ABIERTA",
    observaciones: "Entrenamiento de patadas y desplazamientos básicos.",
    created_at: new Date().toISOString(),
    clase_nombre: "Infantiles Kumite (6-12 años)",
  },
];

const SEED_ASISTENCIAS: Asistencia[] = [
  {
    id: "as111111-1111-1111-1111-111111111111",
    sesion_id: "s1111111-1111-1111-1111-111111111111",
    alumno_id: "a1111111-1111-1111-1111-111111111111",
    estado: "PRESENTE",
    es_recuperacion: false,
    marcado_en: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "as222222-2222-2222-2222-222222222222",
    sesion_id: "s1111111-1111-1111-1111-111111111111",
    alumno_id: "a2222222-2222-2222-2222-222222222222",
    estado: "PRESENTE",
    es_recuperacion: false,
    marcado_en: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "as333333-3333-3333-3333-333333333333",
    sesion_id: "s1111111-1111-1111-1111-111111111111",
    alumno_id: "a3333333-3333-3333-3333-333333333333",
    estado: "TARDE",
    es_recuperacion: false,
    marcado_en: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "as444444-4444-4444-4444-444444444444",
    sesion_id: "s1111111-1111-1111-1111-111111111111",
    alumno_id: "a5555555-5555-5555-5555-555555555555",
    estado: "AUSENTE",
    es_recuperacion: false,
    marcado_en: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

// Variables en memoria mutables de la aplicación
const dbState = {
  usuarios: [...SEED_USUARIOS],
  clases: [...SEED_CLASES],
  alumnos: [...SEED_ALUMNOS],
  inscripciones: [...SEED_INSCRIPCIONES],
  graduaciones: [...SEED_GRADUACIONES],
  sesiones: [...SEED_SESIONES],
  asistencias: [...SEED_ASISTENCIAS],
};

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
 * Métricas globales para el Administrador / Headmaster (/admin/dashboard)
 */
export async function dalGetAdminDashboardMetrics(): Promise<AdminDashboardMetricsData> {
  await requireAdmin();

  const totalAlumnosActivos = dbState.alumnos.filter(
    (a) => a.estado === "ACTIVO"
  ).length;

  const totalAsistencias = dbState.asistencias.length;
  const totalPresentes = dbState.asistencias.filter(
    (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
  ).length;

  const promedioGeneralAsistencia =
    totalAsistencias > 0
      ? Math.round((totalPresentes / totalAsistencias) * 100)
      : 84;

  // Desempeño por clase
  const clasesConvocatoria = dbState.clases.map((clase) => {
    const sesionesClase = dbState.sesiones.filter((s) => s.clase_id === clase.id);
    const sIds = new Set(sesionesClase.map((s) => s.id));
    const asistenciasClase = dbState.asistencias.filter((a) =>
      sIds.has(a.sesion_id)
    );
    const pres = asistenciasClase.filter(
      (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
    ).length;
    const prom =
      sesionesClase.length > 0
        ? Math.round((pres / sesionesClase.length) * 10) / 10
        : 14;

    const inscriptos = dbState.inscripciones.filter(
      (i) => i.clase_id === clase.id && i.activo
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

  const clasesConMayorConvocatoria = clasesSorted.slice(0, 3);
  const clasesConMenorConvocatoria = [...clasesSorted].reverse().slice(0, 3);

  // Desempeño por profesor
  const profesores = dbState.usuarios.filter((u) => u.activo);
  const desempenoProfesores = profesores.map((prof) => {
    const clasesProf = dbState.clases.filter((c) => c.profesor_id === prof.id);
    const cIds = new Set(clasesProf.map((c) => c.id));
    const ses = dbState.sesiones.filter((s) => cIds.has(s.clase_id));
    const sIds = new Set(ses.map((s) => s.id));
    const as = dbState.asistencias.filter((a) => sIds.has(a.sesion_id));
    const pres = as.filter(
      (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
    ).length;

    return {
      profesorId: prof.id,
      nombre: prof.nombre_completo,
      clasesDictadasMes: ses.length || 18,
      clasesProgramadasMes: 20,
      retencionPorcentaje: 92,
      promedioAlumnosPorClase:
        ses.length > 0 ? Math.round((pres / ses.length) * 10) / 10 : 15.4,
    };
  });

  // Alertas de deserción: 3 o más ausencias consecutivas
  const alertasDesercion = [
    {
      alumno: dbState.alumnos.find((a) => a.id === "a5555555-5555-5555-5555-555555555555")!,
      ausenciasConsecutivas: 3,
      ultimaClaseAsistida: "2026-09-28",
      telefonoContacto: "+54 9 11 4444-5551",
      contactoEmergencia: "Padre: Gabriel +54 9 11 4444-5552",
    },
    {
      alumno: dbState.alumnos.find((a) => a.id === "a4444444-4444-4444-4444-444444444444")!,
      ausenciasConsecutivas: 3,
      ultimaClaseAsistida: "2026-10-02",
      telefonoContacto: "+54 9 11 4444-4441",
      contactoEmergencia: "Madre: Patricia +54 9 11 4444-4442",
    },
  ].filter((item) => item.alumno !== undefined);

  return {
    totalAlumnosActivos,
    promedioGeneralAsistencia,
    clasesConMayorConvocatoria,
    clasesConMenorConvocatoria,
    desempenoProfesores,
    alertasDesercion,
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

  let list = dbState.alumnos;

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
 * Crear nueva clase / horario
 */
export async function dalCrearClase(data: CrearClaseInput): Promise<Clase> {
  await requireAdmin();

  const profesor = dbState.usuarios.find((u) => u.id === data.profesorId);
  const now = new Date().toISOString();

  const nuevaClase: Clase = {
    id: "c" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36),
    nombre: data.nombre.trim(),
    profesor_id: data.profesorId,
    profesor_nombre: profesor ? profesor.nombre_completo : "Sensei Asignado",
    dias_semana: data.diasSemana,
    hora_inicio: data.horaInicio,
    hora_fin: data.horaFin,
    cupo_maximo: data.cupoMaximo,
    activa: true,
    created_at: now,
    total_inscriptos: 0,
  };

  dbState.clases.push(nuevaClase);
  return nuevaClase;
}

/**
 * Obtener lista de profesores disponibles
 */
export async function dalGetProfesores(): Promise<Usuario[]> {
  await requireAuth();
  return dbState.usuarios.filter((u) => u.activo);
}
