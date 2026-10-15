export type UserRole = "ADMIN" | "PROFESOR";

export type KarateBelt =
  | "Blanco"
  | "Blanco/Amarillo"
  | "Amarillo"
  | "Naranja"
  | "Verde"
  | "Azul"
  | "Marrón"
  | "Negro";

export type AlumnoEstado = "ACTIVO" | "INACTIVO";
export type SesionEstado = "ABIERTA" | "FINALIZADA";
export type AsistenciaEstado = "PRESENTE" | "AUSENTE" | "TARDE";

export interface BeltStyle {
  label: KarateBelt;
  bgClass: string;
  textClass: string;
  borderClass: string;
  indicatorBg: string;
  kanji: string;
}

export const BELT_CONFIG: Record<KarateBelt, BeltStyle> = {
  Blanco: {
    label: "Blanco",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-900 dark:text-slate-100",
    borderClass: "border-slate-300 dark:border-slate-600",
    indicatorBg: "#F1F5F9",
    kanji: "白",
  },
  "Blanco/Amarillo": {
    label: "Blanco/Amarillo",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    textClass: "text-amber-900 dark:text-amber-200",
    borderClass: "border-amber-400 dark:border-amber-500",
    indicatorBg: "linear-gradient(90deg, #F8FAFC 50%, #FBBF24 50%)",
    kanji: "白黄",
  },
  Amarillo: {
    label: "Amarillo",
    bgClass: "bg-yellow-100 dark:bg-yellow-950/50",
    textClass: "text-yellow-900 dark:text-yellow-300 font-semibold",
    borderClass: "border-yellow-400 dark:border-yellow-500",
    indicatorBg: "#EAB308",
    kanji: "黄",
  },
  Naranja: {
    label: "Naranja",
    bgClass: "bg-orange-100 dark:bg-orange-950/50",
    textClass: "text-orange-900 dark:text-orange-300 font-semibold",
    borderClass: "border-orange-500 dark:border-orange-500",
    indicatorBg: "#F97316",
    kanji: "橙",
  },
  Verde: {
    label: "Verde",
    bgClass: "bg-emerald-100 dark:bg-emerald-950/50",
    textClass: "text-emerald-900 dark:text-emerald-300 font-semibold",
    borderClass: "border-emerald-500 dark:border-emerald-600",
    indicatorBg: "#10B981",
    kanji: "緑",
  },
  Azul: {
    label: "Azul",
    bgClass: "bg-blue-100 dark:bg-blue-950/50",
    textClass: "text-blue-900 dark:text-blue-300 font-semibold",
    borderClass: "border-blue-500 dark:border-blue-500",
    indicatorBg: "#3B82F6",
    kanji: "青",
  },
  Marrón: {
    label: "Marrón",
    bgClass: "bg-amber-900/20 dark:bg-amber-950/70",
    textClass: "text-amber-950 dark:text-amber-300 font-semibold",
    borderClass: "border-amber-700 dark:border-amber-600",
    indicatorBg: "#78350F",
    kanji: "茶",
  },
  Negro: {
    label: "Negro",
    bgClass: "bg-slate-950 text-amber-300 dark:bg-black dark:text-amber-400 font-bold",
    textClass: "text-amber-300 dark:text-amber-400 font-bold tracking-wide",
    borderClass: "border-amber-500/80 shadow-sm shadow-amber-500/20",
    indicatorBg: "#0F172A",
    kanji: "黒",
  },
};

export interface Usuario {
  id: string;
  email: string;
  rol: UserRole;
  nombre_completo: string;
  telefono?: string;
  activo: boolean;
  created_at: string;
}

export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  telefono_contacto: string;
  contacto_emergencia: string;
  cinturon_actual: KarateBelt;
  estado: AlumnoEstado;
  notas_privadas?: string | null;
  created_at: string;
}

export interface Clase {
  id: string;
  nombre: string;
  profesor_id: string;
  dias_semana: number[]; // 0=Domingo, 1=Lunes, ...
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number;
  activa: boolean;
  created_at: string;
  profesor_nombre?: string;
  total_inscriptos?: number;
}

export interface ListaAlumnos {
  id: string;
  nombre: string;
  descripcion?: string;
  alumnos_ids: string[];
  creado_por_id: string;
  creado_por_nombre?: string;
  created_at: string;
  total_alumnos?: number;
}

export interface ClaseHistorialItem {
  clase: Clase;
  sesion?: SesionClase;
  fecha: string;
  totalInscriptos: number;
  totalPresentes: number;
  totalAusentes: number;
  totalTardes: number;
}

export interface ClaseAbiertaItem {
  sesion: SesionClase;
  clase: Clase;
  presentesCount: number;
  totalCount: number;
}

export interface Inscripcion {
  id: string;
  clase_id: string;
  alumno_id: string;
  fecha_alta: string;
  activo: boolean;
  created_at: string;
}

export interface SesionClase {
  id: string;
  clase_id: string;
  profesor_id: string;
  fecha: string; // YYYY-MM-DD
  hora_apertura: string;
  estado: SesionEstado;
  observaciones?: string | null;
  created_at: string;
  clase_nombre?: string;
}

export interface Asistencia {
  id: string;
  sesion_id: string;
  alumno_id: string;
  estado: AsistenciaEstado;
  es_recuperacion: boolean;
  marcado_en: string;
  created_at: string;
}

export interface HistorialGraduacion {
  id: string;
  alumno_id: string;
  cinturon: KarateBelt;
  fecha_graduacion: string;
  graduado_por?: string | null;
  graduado_por_nombre?: string | null;
  observaciones?: string | null;
  created_at: string;
}

// Modelos enriquecidos para la UI del tatami
export interface AlumnoSesionItem {
  alumno: Alumno;
  asistenciaId?: string;
  estado: AsistenciaEstado;
  es_recuperacion: boolean;
  marcado_en?: string;
  clases_en_cinturon?: number;
}

export interface SesionMetricaItem {
  id: string;
  clase_id: string;
  clase_nombre: string;
  fecha: string;
  presentesCount: number;
  totalAsistencias: number;
}

export interface AlumnoMetricaItem {
  alumno: Alumno;
  clasesNombre: string[];
  asistencias: Array<{
    sesionId: string;
    fecha: string;
    estado: AsistenciaEstado;
  }>;
  clasesEnCinturonActual: number;
}

export interface ProfesorMetricasCompletasData {
  profesor: Usuario;
  sesiones: SesionMetricaItem[];
  alumnos: AlumnoMetricaItem[];
}

export interface ProfesorMetricasData {
  profesor: Usuario;
  clasesDictadasMes: number;
  promedioAsistencia: number;
  alumnosMetrics: Array<{
    alumno: Alumno;
    totalAsistencias: number;
    porcentajePresentismo: number;
    clasesEnCinturonActual: number;
    clasesNombre: string[];
  }>;
}

export interface AlertaDesercion {
  alumno: Alumno;
  ausenciasConsecutivas: number;
  ultimaClaseAsistida: string | null;
  telefonoContacto: string;
  contactoEmergencia: string;
}

export interface AdminDashboardMetricsData {
  totalAlumnosActivos: number;
  promedioGeneralAsistencia: number;
  clasesConMayorConvocatoria: Array<{
    claseId: string;
    nombre: string;
    promedioAsistencias: number;
    inscriptos: number;
  }>;
  clasesConMenorConvocatoria: Array<{
    claseId: string;
    nombre: string;
    promedioAsistencias: number;
    inscriptos: number;
  }>;
  desempenoProfesores: Array<{
    profesorId: string;
    nombre: string;
    clasesDictadasMes: number;
    clasesProgramadasMes: number;
    retencionPorcentaje: number;
    promedioAlumnosPorClase: number;
  }>;
  alertasDesercion: AlertaDesercion[];
}

export interface OfflineActionPayload {
  id: string;
  type: "MARCAR_ASISTENCIA" | "INSCRIBIR_ALUMNO" | "AGREGAR_RECUPERACION";
  payload: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}
