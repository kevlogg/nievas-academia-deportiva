import { z } from "zod";

export const KarateBeltEnum = z.enum([
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Naranja",
  "Verde",
  "Violeta",
  "Marrón",
  "Negro",
  "Azul",
]);

export const AsistenciaEstadoEnum = z.enum(["PRESENTE", "AUSENTE", "TARDE"]);

export const MarcarAsistenciaSchema = z.object({
  sesionId: z.string().min(1, "ID de sesión inválido"),
  alumnoId: z.string().min(1, "ID de alumno inválido"),
  estado: AsistenciaEstadoEnum,
  esRecuperacion: z.boolean().default(false),
});

export const InscribirAlumnoSchema = z.object({
  claseId: z.string().min(1, "ID de clase inválido"),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (AAAA-MM-DD)"),
  telefonoContacto: z
    .string()
    .min(6, "Teléfono de contacto requerido (mínimo 6 dígitos)"),
  contactoEmergencia: z
    .string()
    .min(6, "Contacto y teléfono de emergencia requerido"),
  cinturonActual: KarateBeltEnum.default("Blanco"),
});

export const AgregarRecuperacionSchema = z.object({
  sesionId: z.string().min(1, "ID de sesión inválido"),
  alumnoId: z.string().min(1, "ID de alumno inválido"),
});

export const RegistrarGraduacionSchema = z.object({
  alumnoId: z.string().min(1, "ID de alumno inválido"),
  nuevoCinturon: KarateBeltEnum,
  subcategoria: z.string().optional().nullable(),
  fechaGraduacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
    .default(() => new Date().toISOString().split("T")[0]),
  observaciones: z.string().optional().nullable(),
});

export const ActualizarNotaPrivadaSchema = z.object({
  alumnoId: z.string().uuid("ID de alumno inválido"),
  notasPrivadas: z.string(),
});

export const CrearClaseSchema = z.object({
  nombre: z.string().optional(),
  profesorId: z.string().optional(),
  listaAlumnosId: z.string().optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
    .optional(),
  diasSemana: z
    .array(z.number().int().min(0).max(6))
    .optional()
    .default([]),
  horaInicio: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato de hora HH:MM")
    .optional(),
  horaFin: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato de hora HH:MM")
    .optional(),
  cupoMaximo: z.coerce.number().int().positive().default(30),
});

export const CrearListaAlumnosSchema = z.object({
  nombre: z.string().min(3, "El nombre de la lista debe tener al menos 3 caracteres"),
  descripcion: z.string().optional(),
  alumnosIds: z.array(z.string()).min(1, "Debe seleccionar al menos un alumno"),
  profesoresIds: z.array(z.string()).optional(),
});

export const EditarClaseHistorialSchema = z.object({
  claseId: z.string().min(1, "ID de clase requerido"),
  sesionId: z.string().optional(),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD"),
  horaInicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato HH:MM"),
  profesorId: z.string().min(1, "Profesor requerido"),
});

export const IniciarSesionSchema = z.object({
  claseId: z.string().uuid("ID de clase inválido"),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
    .optional(),
});

export type MarcarAsistenciaInput = z.infer<typeof MarcarAsistenciaSchema>;
export type InscribirAlumnoInput = z.infer<typeof InscribirAlumnoSchema>;
export type AgregarRecuperacionInput = z.infer<typeof AgregarRecuperacionSchema>;
export type RegistrarGraduacionInput = z.infer<typeof RegistrarGraduacionSchema>;
export type ActualizarNotaPrivadaInput = z.infer<
  typeof ActualizarNotaPrivadaSchema
>;
export type CrearClaseInput = z.infer<typeof CrearClaseSchema>;
export type CrearListaAlumnosInput = z.infer<typeof CrearListaAlumnosSchema>;
export type EditarClaseHistorialInput = z.infer<typeof EditarClaseHistorialSchema>;
export type IniciarSesionInput = z.infer<typeof IniciarSesionSchema>;
