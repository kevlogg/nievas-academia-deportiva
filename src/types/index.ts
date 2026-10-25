export type UserRole = "ADMIN" | "PROFESOR";

export type KarateBelt =
  | "Blanco"
  | "Blanco/Amarillo"
  | "Amarillo"
  | "Naranja"
  | "Verde"
  | "Violeta"
  | "Marrón"
  | "Negro"
  | "Azul";

export type SubcategoriaCinturon =
  | "9° kyu"
  | "8t kyu"
  | "8° kyu"
  | "7t"
  | "7°"
  | "6t"
  | "6°"
  | "5t"
  | "5°"
  | "4t"
  | "4°"
  | "3t"
  | "3°"
  | "2t"
  | "2°"
  | "1t"
  | "1°"
  | "1 dan"
  | "2 dan"
  | "3 dan";

export const SUBCATEGORIAS_POR_CINTURON: Record<KarateBelt, string[]> = {
  Blanco: ["9° kyu"],
  "Blanco/Amarillo": ["9° kyu", "8t kyu"],
  Amarillo: ["8t kyu"],
  Naranja: ["8° kyu"],
  Verde: ["7t", "7°", "6t", "6°"],
  Violeta: ["5t", "5°", "4t", "4°"],
  Marrón: ["3t", "3°", "2t", "2°", "1t", "1°"],
  Negro: ["1 dan", "2 dan", "3 dan"],
  Azul: ["5t", "5°", "4t", "4°"], // Alias de compatibilidad
};

export const CINTURON_POR_SUBCATEGORIA: Record<string, KarateBelt> = {
  "9° kyu": "Blanco",
  "8t kyu": "Amarillo",
  "8° kyu": "Naranja",
  "7t": "Verde",
  "7°": "Verde",
  "6t": "Verde",
  "6°": "Verde",
  "5t": "Violeta",
  "5°": "Violeta",
  "4t": "Violeta",
  "4°": "Violeta",
  "3t": "Marrón",
  "3°": "Marrón",
  "2t": "Marrón",
  "2°": "Marrón",
  "1t": "Marrón",
  "1°": "Marrón",
  "1 dan": "Negro",
  "2 dan": "Negro",
  "3 dan": "Negro",
};

export interface GradoKarate {
  cinturon: KarateBelt;
  subcategoria: string;
  rank: number;
  label: string;
}

/**
 * Escalafón jerárquico canónico estricto de Nievas Academia Deportiva.
 * Los alumnos únicamente pueden progresar hacia adelante (rank >= rank_actual).
 * Queda terminantemente bloqueado descender a un grado o color inferior.
 */
export const ESCALAFON_KARATE: GradoKarate[] = [
  { cinturon: "Blanco", subcategoria: "9° kyu", rank: 0, label: "Blanco (9° kyu)" },
  { cinturon: "Amarillo", subcategoria: "8t kyu", rank: 1, label: "Amarillo (8t kyu)" },
  { cinturon: "Naranja", subcategoria: "8° kyu", rank: 2, label: "Naranja (8° kyu)" },
  { cinturon: "Verde", subcategoria: "7t", rank: 3, label: "Verde (7t)" },
  { cinturon: "Verde", subcategoria: "7°", rank: 4, label: "Verde (7°)" },
  { cinturon: "Verde", subcategoria: "6t", rank: 5, label: "Verde (6t)" },
  { cinturon: "Verde", subcategoria: "6°", rank: 6, label: "Verde (6°)" },
  { cinturon: "Violeta", subcategoria: "5t", rank: 7, label: "Violeta (5t)" },
  { cinturon: "Violeta", subcategoria: "5°", rank: 8, label: "Violeta (5°)" },
  { cinturon: "Violeta", subcategoria: "4t", rank: 9, label: "Violeta (4t)" },
  { cinturon: "Violeta", subcategoria: "4°", rank: 10, label: "Violeta (4°)" },
  { cinturon: "Marrón", subcategoria: "3t", rank: 11, label: "Marrón (3t)" },
  { cinturon: "Marrón", subcategoria: "3°", rank: 12, label: "Marrón (3°)" },
  { cinturon: "Marrón", subcategoria: "2t", rank: 13, label: "Marrón (2t)" },
  { cinturon: "Marrón", subcategoria: "2°", rank: 14, label: "Marrón (2°)" },
  { cinturon: "Marrón", subcategoria: "1t", rank: 15, label: "Marrón (1t)" },
  { cinturon: "Marrón", subcategoria: "1°", rank: 16, label: "Marrón (1°)" },
  { cinturon: "Negro", subcategoria: "1 dan", rank: 17, label: "Negro (1 dan)" },
  { cinturon: "Negro", subcategoria: "2 dan", rank: 18, label: "Negro (2 dan)" },
  { cinturon: "Negro", subcategoria: "3 dan", rank: 19, label: "Negro (3 dan)" },
];

/**
 * Obtener el rango numérico (0 a 19) de un cinturón y subcategoría
 */
export function getGradoRank(cinturon: KarateBelt, subcategoria?: string | null): number {
  const normBelt = cinturon === "Azul" ? "Violeta" : cinturon;
  if (subcategoria) {
    const cleanSub = subcategoria.trim().toLowerCase();
    const match = ESCALAFON_KARATE.find(
      (g) =>
        g.cinturon === normBelt &&
        (g.subcategoria.toLowerCase() === cleanSub ||
          cleanSub.startsWith(g.subcategoria.toLowerCase()) ||
          g.subcategoria.toLowerCase().replace(/[°\s]/g, "") === cleanSub.replace(/[°\s]/g, ""))
    );
    if (match) return match.rank;
  }
  // Si no tiene subcategoría, tomar el rango base del color
  const base = ESCALAFON_KARATE.find((g) => g.cinturon === normBelt);
  return base ? base.rank : 0;
}

/**
 * Rango máximo alcanzable por un color de cinturón
 */
export function getMaxRankForBelt(cinturon: KarateBelt): number {
  const normBelt = cinturon === "Azul" ? "Violeta" : cinturon;
  const items = ESCALAFON_KARATE.filter((g) => g.cinturon === normBelt);
  if (items.length === 0) return 0;
  return Math.max(...items.map((i) => i.rank));
}

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
  Violeta: {
    label: "Violeta",
    bgClass: "bg-purple-100 dark:bg-purple-950/50",
    textClass: "text-purple-900 dark:text-purple-300 font-semibold",
    borderClass: "border-purple-500 dark:border-purple-500",
    indicatorBg: "#8B5CF6",
    kanji: "紫",
  },
  Azul: {
    label: "Violeta", // Reemplazado oficialmente por Violeta
    bgClass: "bg-purple-100 dark:bg-purple-950/50",
    textClass: "text-purple-900 dark:text-purple-300 font-semibold",
    borderClass: "border-purple-500 dark:border-purple-500",
    indicatorBg: "#8B5CF6",
    kanji: "紫",
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
  pin_activo?: boolean;
  tiene_biometria?: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface WebAuthnCredentialRecord {
  id: string; // Base64URL string of credential ID
  publicKey: string; // Base64URL string
  counter: number;
  deviceName?: string;
  transports?: string[];
  createdAt: string;
}

export interface ProfesorTerminalItem {
  id: string;
  nombre_completo: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  tiene_pin: boolean;
  tiene_biometria: boolean;
  credenciales_biometria_ids?: string[];
  avatar_url?: string;
}


export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  telefono_contacto: string;
  contacto_emergencia: string;
  cinturon_actual: KarateBelt;
  subcategoria_actual?: string | null;
  estado: AlumnoEstado;
  notas_privadas?: string | null;
  profesores_ids?: string[];
  profesores_nombres?: string[];
  asistencias_resumen?: {
    total: number;
    presentes: number;
    tardes: number;
    ausentes: number;
    porcentajePresentismo: number;
    clasesEnCinturonActual?: number;
    fechaUltimoPase?: string | null;
    diasDesdeUltimoPase?: number;
  };
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
  profesores_ids?: string[];
  profesores_nombres?: string[];
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
  tardesCount?: number;
  ausentesCount?: number;
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
  subcategoria?: string | null;
  fecha_graduacion: string;
  graduado_por?: string | null;
  graduado_por_nombre?: string | null;
  observaciones?: string | null;
  created_at: string;
}

export interface FichaAlumnoAsistenciaItem {
  id: string;
  sesionId: string;
  fecha: string;
  claseNombre: string;
  estado: AsistenciaEstado;
  esRecuperacion: boolean;
  marcadoEn: string;
  horaApertura?: string;
  profesorNombre?: string;
}

export interface FichaAlumnoData {
  alumno: Alumno;
  estadisticas: {
    totalClases: number;
    totalPresentes: number;
    totalTardes: number;
    totalAusentes: number;
    porcentajePresentismo: number;
    clasesEnCinturonActual: number;
    fechaUltimoPase?: string | null;
    diasDesdeUltimoPase: number;
    esAptoParaPase: boolean;
  };
  clasesInscriptas: Array<{
    id: string;
    nombre: string;
    profesorNombre?: string;
    horaInicio?: string;
    horaFin?: string;
  }>;
  historialGraduaciones: HistorialGraduacion[];
  historialAsistencias: FichaAlumnoAsistenciaItem[];
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
  totalProfesoresActivos: number;
  totalClasesDictadas: number;
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
    rol?: UserRole;
    clasesDictadas: number;
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
