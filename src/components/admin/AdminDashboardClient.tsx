"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AdminDashboardMetricsData,
  Clase,
  Usuario,
  AlertaDesercion,
  RegistroHistorialBaja,
} from "@/types";
import { ModalCrearClase } from "./ModalCrearClase";
import { ModalGestionarPinProfesor } from "./ModalGestionarPinProfesor";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  marcarAlumnoContinuaAction,
  marcarAlumnoNoVuelveAction,
  reincorporarAlumnoAction,
} from "@/lib/actions/alumnos.actions";
import { formatDaysList, formatTime } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Phone,
  Plus,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  CheckCircle2,
  ShieldCheck,
  History,
  Tablet,
  KeyRound,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  UserX,
  RotateCcw,
  Loader2,
  X,
  Archive,
} from "lucide-react";

interface AdminDashboardClientProps {
  currentUser?: Usuario;
  metrics: AdminDashboardMetricsData;
  clases: Clase[];
  profesores: Usuario[];
}

export function AdminDashboardClient({
  currentUser,
  metrics,
  clases,
  profesores,
}: AdminDashboardClientProps) {
  const [isCrearClaseOpen, setIsCrearClaseOpen] = useState(false);
  const [profesorParaPin, setProfesorParaPin] = useState<Usuario | null>(null);

  // Estados dinámicos de Deserción y Bajas
  const [alertas, setAlertas] = useState<AlertaDesercion[]>(metrics.alertasDesercion);
  const [historialBajas, setHistorialBajas] = useState<RegistroHistorialBaja[]>(
    metrics.historialBajas || []
  );
  const [desplegarDesercion, setDesplegarDesercion] = useState<boolean>(true);
  const [tabDesercion, setTabDesercion] = useState<"alertas" | "historial">("alertas");
  const [procesandoAlumnoId, setProcesandoAlumnoId] = useState<string | null>(null);
  const [alumnoParaBaja, setAlumnoParaBaja] = useState<AlertaDesercion | null>(null);
  const [motivoBajaInput, setMotivoBajaInput] = useState<string>("");
  const [feedback, setFeedback] = useState<{ tipo: "exito" | "error"; mensaje: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = currentUser?.nombre_completo
    ? currentUser.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim()
    : "Francisco Nievas";

  const showFeedback = (tipo: "exito" | "error", mensaje: string) => {
    setFeedback({ tipo, mensaje });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Acción "Continúa": restablece inasistencias a 0 y lo saca de la lista de deserción
  const handleContinua = (alumnoId: string, nombreAlumno: string) => {
    setProcesandoAlumnoId(alumnoId);
    startTransition(async () => {
      const res = await marcarAlumnoContinuaAction(alumnoId);
      setProcesandoAlumnoId(null);
      if (res.success) {
        setAlertas((prev) => prev.filter((a) => a.alumno.id !== alumnoId));
        showFeedback(
          "exito",
          `¡Faltas restablecidas a 0! ${nombreAlumno} continúa y ya no figura en deserción.`
        );
      } else {
        showFeedback("error", res.error || "No se pudo actualizar el estado del alumno");
      }
    });
  };

  // Confirmar acción "No vuelve": baja, remoción de listas y registro en historial
  const handleConfirmarNoVuelve = () => {
    if (!alumnoParaBaja) return;
    const { alumno, ausenciasConsecutivas } = alumnoParaBaja;
    setProcesandoAlumnoId(alumno.id);

    startTransition(async () => {
      const res = await marcarAlumnoNoVuelveAction(
        alumno.id,
        motivoBajaInput || "Deserción confirmada por Dirección tras 4 faltas consecutivas"
      );
      setProcesandoAlumnoId(null);

      if (res.success) {
        setAlertas((prev) => prev.filter((a) => a.alumno.id !== alumno.id));
        setHistorialBajas((prev) => [
          {
            id: "baja-" + Date.now(),
            alumno_id: alumno.id,
            alumno_nombre: `${alumno.nombre} ${alumno.apellido}`,
            cinturon: alumno.cinturon_actual,
            subcategoria: alumno.subcategoria_actual,
            fecha_baja: new Date().toISOString().split("T")[0],
            tipo: "NO_VUELVE",
            motivo: motivoBajaInput || "Deserción confirmada por Dirección tras 4 faltas consecutivas",
            ausencias_consecutivas: ausenciasConsecutivas,
            telefono_contacto: alumno.telefono_contacto,
            contacto_emergencia: alumno.contacto_emergencia,
            registrado_por: currentUser?.id,
            registrado_por_nombre: currentUser?.nombre_completo,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);

        showFeedback(
          "exito",
          `${alumno.nombre} ${alumno.apellido} fue dado de baja y guardado en el historial de deserciones.`
        );
        setAlumnoParaBaja(null);
        setMotivoBajaInput("");
      } else {
        showFeedback("error", res.error || "Error al dar de baja al alumno");
      }
    });
  };

  // Reincorporar alumno desde el historial de bajas
  const handleReincorporar = (alumnoId: string, nombreAlumno: string) => {
    setProcesandoAlumnoId(alumnoId);
    startTransition(async () => {
      const res = await reincorporarAlumnoAction(alumnoId);
      setProcesandoAlumnoId(null);
      if (res.success) {
        setHistorialBajas((prev) => prev.filter((b) => b.alumno_id !== alumnoId));
        showFeedback(
          "exito",
          `¡${nombreAlumno} ha sido reincorporado exitosamente al padrón activo!`
        );
      } else {
        showFeedback("error", res.error || "Error al reincorporar alumno");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Banner Principal del Sensei / Directivo - Card Reducida y Compacta en Azul Oficial #0F3E86 */}
      <div className="p-3.5 sm:p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-blue-950/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-white shadow-xs shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
              {cleanNombre}
            </h1>
            <p className="text-[11px] text-blue-200 font-medium truncate">
              Dirección general del dojo y retención de alumnos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/terminal"
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95 shrink-0"
            title="Activar Modo Terminal en la tablet fija del dojo"
          >
            <Tablet className="w-4 h-4 text-slate-950" />
            <span>Fijar Modo Tablet</span>
          </Link>

          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-blue-50 text-[#0F3E86] font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 text-[#0F3E86]" />
            <span>Nueva Clase</span>
          </button>
        </div>
      </div>

      {/* Resumen Directivo del Dojo - Cards Azules #0F3E86 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-[#0F3E86] text-white border-2 border-rose-400 rounded-2xl shadow-xl shadow-blue-950/15 space-y-1">
          <div className="flex items-center justify-between text-rose-300 text-xs font-bold">
            <span>Alertas de Deserción</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-rose-300">
            {alertas.length}
          </p>
          <span className="text-[11px] text-rose-200 font-semibold">
            Alumnos con &ge; 4 faltas seguidas
          </span>
        </div>

        <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 space-y-1">
          <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
            <span>Padrón de Alumnos</span>
            <Users className="w-4 h-4 text-cyan-300" />
          </div>
          <p className="text-3xl font-black text-white">
            {metrics.totalAlumnosActivos}
          </p>
          <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-semibold">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Alumnos activos en el dojo</span>
          </span>
        </div>

        <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 space-y-1">
          <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
            <span>Equipo Docente</span>
            <ShieldCheck className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-3xl font-black text-amber-300">
            {metrics.totalProfesoresActivos}
          </p>
          <span className="text-[11px] text-blue-200 font-medium">
            Senseis profesores activos
          </span>
        </div>
      </div>

      {/* Banner flotante de feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in duration-200 ${
            feedback.tipo === "exito"
              ? "bg-emerald-950/90 border-emerald-500/70 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/70 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tipo === "exito" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.mensaje}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-white/80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECCIÓN CRÍTICA: ALERTAS DE DESERCIÓN (DESPLEGABLE / ACORDEÓN) */}
      <section className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
        {/* Cabecera con selector de pestaña y botón de colapso */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Control de Deserción Escolar
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                  {alertas.length} en alerta
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Alumnos con 4 o más inasistencias seguidas en clases finalizadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pestañas: Alertas Activas / Historial de Bajas */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-200">
              <button
                onClick={() => {
                  setTabDesercion("alertas");
                  setDesplegarDesercion(true);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  tabDesercion === "alertas"
                    ? "bg-[#0F3E86] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Alertas Activas ({alertas.length})
              </button>

              <button
                onClick={() => {
                  setTabDesercion("historial");
                  setDesplegarDesercion(true);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  tabDesercion === "historial"
                    ? "bg-[#0F3E86] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Historial Bajas ({historialBajas.length})</span>
              </button>
            </div>

            {/* Botón Desplegable / Contraer */}
            <button
              onClick={() => setDesplegarDesercion((prev) => !prev)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={desplegarDesercion ? "Contraer lista" : "Desplegar lista"}
            >
              {desplegarDesercion ? (
                <>
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                  <span>Contraer</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                  <span>Desplegar lista</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Resumen cuando está contraído */}
        {!desplegarDesercion && (
          <div
            onClick={() => setDesplegarDesercion(true)}
            className="p-3.5 bg-blue-50/70 hover:bg-blue-100/60 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900 font-semibold cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>
                {tabDesercion === "alertas"
                  ? `Lista colapsada: ${alertas.length} alumnos en riesgo de deserción (≥ 4 faltas).`
                  : `Historial colapsado: ${historialBajas.length} alumnos registrados en el histórico de bajas.`}
              </span>
            </div>
            <span className="text-cyan-700 font-bold hover:underline">Hacer clic para desplegar &rarr;</span>
          </div>
        )}

        {/* CONTENIDO DESPLEGADO */}
        {desplegarDesercion && (
          <>
            {/* PESTAÑA 1: ALERTAS ACTIVAS */}
            {tabDesercion === "alertas" && (
              <>
                {alertas.length === 0 ? (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs sm:text-sm shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Sin alertas de deserción activas</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Ningún alumno activo acumula 4 o más inasistencias consecutivas en clases cerradas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {alertas.map((alerta) => {
                      const cleanPhone = (
                        alerta.telefonoContacto ||
                        alerta.contactoEmergencia ||
                        ""
                      ).replace(/\D/g, "");

                      const mensajeWsp = encodeURIComponent(
                        `Hola! Nos comunicamos de Nievas Academia Deportiva. Notamos que ${alerta.alumno.nombre} acumuló inasistencias consecutivas a las clases de Karate y queríamos saber si se encuentra bien o si necesitan coordinar clases de recuperación.`
                      );

                      const isProcesando = procesandoAlumnoId === alerta.alumno.id;

                      return (
                        <div
                          key={alerta.alumno.id}
                          className="p-4 bg-[#0F3E86] text-white border-2 border-rose-500 rounded-2xl shadow-xl shadow-blue-950/15 space-y-3 relative overflow-hidden flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-white text-base">
                                    {alerta.alumno.nombre} {alerta.alumno.apellido}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider shadow-xs">
                                    {alerta.ausenciasConsecutivas} Faltas Seguidas
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <BeltBadge
                                    belt={alerta.alumno.cinturon_actual}
                                    subcategoria={alerta.alumno.subcategoria_actual}
                                    size="sm"
                                  />
                                  <span className="text-xs text-blue-200">
                                    • Última vez:{" "}
                                    <strong className="text-white">
                                      {alerta.ultimaClaseAsistida || "Sin registro"}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Contactos */}
                            <div className="mt-3 p-2.5 bg-white/10 rounded-xl border border-white/15 text-xs space-y-1">
                              <div className="flex items-center justify-between text-blue-100">
                                <span className="text-[11px] text-blue-200 font-semibold">Teléfono Alumno:</span>
                                <span className="font-bold text-white">{alerta.telefonoContacto || "No registrado"}</span>
                              </div>
                              <div className="flex items-center justify-between text-blue-100">
                                <span className="text-[11px] text-rose-300 font-semibold">Tutor / Emergencia:</span>
                                <span className="font-bold text-white">{alerta.contactoEmergencia || "No registrado"}</span>
                              </div>
                            </div>
                          </div>

                          {/* ACCIONES: WhatsApp + Continúa + No Vuelve */}
                          <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2 flex-wrap">
                            {/* 1. Botón WhatsApp Directo */}
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${mensajeWsp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                                title="Enviar mensaje de WhatsApp al alumno o tutor"
                              >
                                <MessageCircle className="w-4 h-4 fill-white" />
                                <span>WhatsApp</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-blue-300 italic">Sin teléfono</span>
                            )}

                            {/* 2. Botón Continúa y Botón No Vuelve */}
                            <div className="flex items-center gap-1.5">
                              {/* Continúa */}
                              <button
                                type="button"
                                disabled={isProcesando}
                                onClick={() =>
                                  handleContinua(
                                    alerta.alumno.id,
                                    `${alerta.alumno.nombre} ${alerta.alumno.apellido}`
                                  )
                                }
                                className="px-3 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Restablece las 4 faltas a 0 y saca al alumno de la lista de deserción"
                              >
                                {isProcesando ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                                )}
                                <span>Continúa</span>
                              </button>

                              {/* No Vuelve */}
                              <button
                                type="button"
                                disabled={isProcesando}
                                onClick={() => setAlumnoParaBaja(alerta)}
                                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                title="Da de baja al alumno, lo quita de las listas y lo guarda en el historial de deserción"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>No vuelve</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* PESTAÑA 2: HISTORIAL DE BAJAS */}
            {tabDesercion === "historial" && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">
                    Registro permanente de alumnos que dejaron de asistir al dojo.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permite conservar sus antecedentes, notas y contactarlos en futuras campañas de reinscripción.
                  </p>
                </div>

                {historialBajas.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 font-medium">
                    No hay alumnos dados de baja en el historial.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {historialBajas.map((item) => {
                      const cleanPhone = (
                        item.telefono_contacto ||
                        item.contacto_emergencia ||
                        ""
                      ).replace(/\D/g, "");

                      const mensajeWsp = encodeURIComponent(
                        `Hola ${item.alumno_nombre}! Te escribimos de Nievas Academia Deportiva. Queríamos saber cómo estás y contarte que el dojo siempre tiene las puertas abiertas para cuando desees retomar tus clases de Karate.`
                      );

                      const isProcesando = procesandoAlumnoId === item.alumno_id;

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-200 text-slate-700 shrink-0">
                              <UserX className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {item.alumno_nombre}
                                </span>
                                <BeltBadge
                                  belt={item.cinturon}
                                  subcategoria={item.subcategoria}
                                  size="sm"
                                />
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Baja registrada:{" "}
                                <strong className="text-slate-700">{item.fecha_baja}</strong> • Motivo:{" "}
                                <span className="italic">{item.motivo || "No vuelve más"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${mensajeWsp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Enviar WhatsApp de recontacto"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            <button
                              type="button"
                              disabled={isProcesando}
                              onClick={() => handleReincorporar(item.alumno_id, item.alumno_nombre)}
                              className="px-2.5 py-1.5 bg-[#0F3E86] hover:bg-[#1E57A8] text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                              title="Reincorporar alumno al padrón activo"
                            >
                              {isProcesando ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              <span>Reincorporar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL DE CONFIRMACIÓN: NO VUELVE */}
      {alumnoParaBaja && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#0F3E86] text-white border-2 border-rose-500 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-600 text-white">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Confirmar Baja por Deserción
                  </h3>
                  <p className="text-xs text-rose-200 font-medium">
                    El alumno dejará de pertenecer a las listas activas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAlumnoParaBaja(null)}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-xs space-y-2">
              <p className="font-bold text-white text-sm">
                {alumnoParaBaja.alumno.nombre} {alumnoParaBaja.alumno.apellido}
              </p>
              <p className="text-rose-200 leading-relaxed">
                Al confirmar que <strong>No vuelve</strong>:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-blue-100">
                <li>Se eliminará de la lista de alertas de deserción.</li>
                <li>Se quitará de todas las listas de alumnos a las que pertenece.</li>
                <li>Se desactivarán sus inscripciones en clases activas.</li>
                <li>Quedará archivado en el <strong>Historial de Bajas</strong> para no perder sus datos ni su ficha.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">
                Motivo / Nota de la baja (Opcional)
              </label>
              <textarea
                rows={2}
                value={motivoBajaInput}
                onChange={(e) => setMotivoBajaInput(e.target.value)}
                placeholder="Ej. Mudanza de ciudad / incompatibilidad de horarios / no responde mensajes..."
                className="w-full px-3 py-2 bg-[#082552] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            <div className="pt-2 border-t border-white/20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAlumnoParaBaja(null)}
                disabled={isPending}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarNoVuelve}
                disabled={isPending}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    <span>Confirmar No Vuelve</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN: DESEMPEÑO POR PROFESOR (Cards Azules #0F3E86) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#0F3E86]" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Desempeño y Cumplimiento de Profesores
          </h2>
        </div>

        {metrics.desempenoProfesores.length === 0 ? (
          <div className="p-5 bg-white rounded-2xl border border-slate-200 text-center py-8 text-xs text-slate-500 font-medium space-y-1">
            <p className="font-bold text-slate-700 text-sm">Sin profesores docentes asignados</p>
            <p>Aún no hay profesores con rol de Sensei o clases asignadas en el dojo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.desempenoProfesores.map((prof) => (
              <div
                key={prof.profesorId}
                className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {prof.nombre}
                    </h3>
                    <p className="text-xs text-cyan-300 font-medium">
                      {prof.rol === "ADMIN" ? "Dirección (Admin)" : "Sensei Profesor"}
                    </p>
                  </div>
                  {prof.clasesDictadas > 0 ? (
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-700/60">
                      {prof.retencionPorcentaje}% Retención
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-blue-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                      Sin clases dictadas
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
                    <span className="text-[10px] text-blue-200 block font-bold">
                      Clases Dictadas
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      {prof.clasesDictadas}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
                    <span className="text-[10px] text-blue-200 block font-bold">
                      Promedio Alumnos / Clase
                    </span>
                    <span className="font-extrabold text-cyan-300 text-sm">
                      {prof.promedioAlumnosPorClase}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECCIÓN: CONVOCATORIA DE CLASES (Cards Azules #0F3E86) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#0F3E86]" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Convocatoria de Clases de Karate
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mayor Convocatoria */}
          <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl space-y-3 shadow-xl shadow-blue-950/15">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Mayor Convocatoria</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMayorConvocatoria.length === 0 ? (
                <p className="text-xs text-blue-200/80 py-2">
                  Aún no hay clases cerradas con registro de asistencia.
                </p>
              ) : (
                metrics.clasesConMayorConvocatoria.map((c) => (
                  <div
                    key={c.claseId}
                    className="p-2.5 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white">{c.nombre}</span>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-300 block">
                        {c.promedioAsistencias} prom.
                      </span>
                      <span className="text-[10px] text-blue-200 font-medium">
                        {c.inscriptos} inscriptos
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Menor Convocatoria */}
          <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl space-y-3 shadow-xl shadow-blue-950/15">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
              <ArrowDownRight className="w-4 h-4 text-cyan-400" />
              <span>Menor Convocatoria (Reforzar Promoción)</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMenorConvocatoria.length === 0 ? (
                <p className="text-xs text-blue-200/80 py-2">
                  Aún no hay clases cerradas con registro de asistencia.
                </p>
              ) : (
                metrics.clasesConMenorConvocatoria.map((c) => (
                  <div
                    key={c.claseId}
                    className="p-2.5 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white">{c.nombre}</span>
                    <div className="text-right">
                      <span className="font-extrabold text-cyan-300 block">
                        {c.promedioAsistencias} prom.
                      </span>
                      <span className="text-[10px] text-blue-200 font-medium">
                        {c.inscriptos} inscriptos
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: CLASES REGISTRADAS DE LA ACADEMIA */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0F3E86]" />
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Clases Registradas de la Academia
              </h2>
              <p className="text-[11px] text-slate-500">
                Clases y turnos para que cada Sensei dicte e inicie asistencia en tatami
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="text-xs text-[#0F3E86] hover:text-blue-900 font-bold cursor-pointer"
          >
            + Nueva Clase
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl space-y-2 shadow-xl shadow-blue-950/15"
            >
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-sm text-white">{clase.nombre}</h4>
              </div>
              <p className="text-xs text-blue-200 font-medium">
                Profesor:{" "}
                <span className="text-white font-bold">
                  {clase.profesor_nombre || "Sensei"}
                </span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-blue-200 font-semibold pt-1 border-t border-white/15">
                <span>{formatDaysList(clase.dias_semana)}</span>
                <span>
                  {formatTime(clase.hora_inicio)} - {formatTime(clase.hora_fin)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN: EQUIPO DOCENTE & PINS DE TABLET */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Equipo Docente & PINs de Tablet
              </h2>
              <p className="text-[11px] text-slate-500">
                Gestiona los PINs de acceso rápido para que los Senseis desbloqueen el tatami en la tablet
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {profesores.map((prof) => (
            <div
              key={prof.id}
              className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md"
            >
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-white truncate">
                  {prof.nombre_completo}
                </h4>
                <p className="text-[11px] text-blue-200 truncate">{prof.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-blue-100">
                    {prof.rol === "ADMIN" ? "Dirección" : "Profesor"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setProfesorParaPin(prof)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Gestionar PIN</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Modal para Crear Nueva Clase */}
      <ModalCrearClase
        isOpen={isCrearClaseOpen}
        onClose={() => setIsCrearClaseOpen(false)}
        profesores={profesores}
        onClaseCreada={() => {
          setIsCrearClaseOpen(false);
          window.location.reload();
        }}
      />

      {/* Modal para Gestionar PIN de Profesor */}
      <ModalGestionarPinProfesor
        isOpen={!!profesorParaPin}
        onClose={() => setProfesorParaPin(null)}
        profesor={profesorParaPin}
        onPinActualizado={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
