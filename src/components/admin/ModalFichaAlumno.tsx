"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Alumno,
  KarateBelt,
  FichaAlumnoData,
  FichaAlumnoAsistenciaItem,
  HistorialGraduacion,
} from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  obtenerFichaAlumnoAction,
  actualizarNotaPrivadaAction,
} from "@/lib/actions/alumnos.actions";
import {
  X,
  Phone,
  MessageCircle,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  Loader2,
  Users,
  Bookmark,
  Layers,
  History,
  AlertCircle,
  Save,
  Trophy,
  Medal,
} from "lucide-react";

interface ModalFichaAlumnoProps {
  alumno: Alumno | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPaseOficial?: (alumno: Alumno) => void;
  onNotaUpdated?: (alumnoId: string, nuevaNota: string) => void;
}

export function ModalFichaAlumno({
  alumno,
  isOpen,
  onClose,
  onOpenPaseOficial,
  onNotaUpdated,
}: ModalFichaAlumnoProps) {
  const [activeTab, setActiveTab] = useState<"resumen" | "asistencias" | "graduaciones" | "torneos" | "nota">("resumen");
  const [fichaData, setFichaData] = useState<FichaAlumnoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para la nota privada editable
  const [notaPrivada, setNotaPrivada] = useState("");
  const [isSavingNota, startSavingNota] = useTransition();
  const [notaSavedFeedback, setNotaSavedFeedback] = useState(false);

  // Filtro de estado dentro del historial de asistencias
  const [filtroAsistencia, setFiltroAsistencia] = useState<"TODAS" | "PRESENTE" | "TARDE" | "AUSENTE">("TODAS");

  useEffect(() => {
    if (isOpen && alumno) {
      setActiveTab("resumen");
      setNotaPrivada(alumno.notas_privadas || "");
      setError(null);
      setIsLoading(true);

      obtenerFichaAlumnoAction(alumno.id)
        .then((res) => {
          if (res.success) {
            setFichaData(res.data);
            if (res.data.alumno.notas_privadas !== undefined) {
              setNotaPrivada(res.data.alumno.notas_privadas || "");
            }
          } else {
            setError(res.error || "No se pudo cargar el detalle completo del alumno");
          }
        })
        .catch(() => {
          setError("Error de conexión al cargar la ficha");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setFichaData(null);
    }
  }, [isOpen, alumno]);

  if (!isOpen || !alumno) return null;

  // Estadísticas (usar las enriquecidas de fichaData o el resumen inicial de alumno)
  const totalClases = fichaData?.estadisticas.totalClases ?? alumno.asistencias_resumen?.total ?? 0;
  const presentes = fichaData?.estadisticas.totalPresentes ?? alumno.asistencias_resumen?.presentes ?? 0;
  const tardes = fichaData?.estadisticas.totalTardes ?? alumno.asistencias_resumen?.tardes ?? 0;
  const ausentes = fichaData?.estadisticas.totalAusentes ?? alumno.asistencias_resumen?.ausentes ?? 0;
  const porcentajePresentismo =
    fichaData?.estadisticas.porcentajePresentismo ?? alumno.asistencias_resumen?.porcentajePresentismo ?? 100;
  const clasesEnCinto =
    fichaData?.estadisticas.clasesEnCinturonActual ?? alumno.asistencias_resumen?.clasesEnCinturonActual ?? 0;

  // Seguimiento de último pase oficial y días transcurridos para evaluación
  const fechaUltimoPase =
    fichaData?.estadisticas.fechaUltimoPase ??
    alumno.asistencias_resumen?.fechaUltimoPase ??
    (alumno.created_at ? alumno.created_at.split("T")[0] : null);

  const diasDesdeUltimoPase =
    fichaData?.estadisticas.diasDesdeUltimoPase ??
    alumno.asistencias_resumen?.diasDesdeUltimoPase ??
    (fechaUltimoPase
      ? Math.max(0, Math.floor((new Date().getTime() - new Date(`${fechaUltimoPase}T12:00:00`).getTime()) / (1000 * 60 * 60 * 24)))
      : 0);

  const esAptoParaPase =
    fichaData?.estadisticas.esAptoParaPase ?? (diasDesdeUltimoPase >= 30 && clasesEnCinto >= 12);

  // Calcular edad del alumno si tiene fecha de nacimiento
  const calcularEdad = (fechaNac?: string) => {
    if (!fechaNac) return null;
    try {
      const birth = new Date(fechaNac);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return isNaN(age) ? null : `${age} años`;
    } catch {
      return null;
    }
  };

  const edadStr = calcularEdad(alumno.fecha_nacimiento);

  // Teléfono para WhatsApp (limpiar espacios y símbolos)
  const cleanPhone = alumno.telefono_contacto?.replace(/\D/g, "");
  const cleanEmergencyPhone = alumno.contacto_emergencia?.replace(/\D/g, "");

  const handleGuardarNota = () => {
    startSavingNota(async () => {
      const res = await actualizarNotaPrivadaAction(alumno.id, notaPrivada);
      if (res.success) {
        setNotaSavedFeedback(true);
        setTimeout(() => setNotaSavedFeedback(false), 2500);
        if (onNotaUpdated) onNotaUpdated(alumno.id, notaPrivada);
      } else {
        alert(res.error || "Error al guardar la nota");
      }
    });
  };

  // Filtrado de asistencias detalladas
  const asistenciasFiltradas = (fichaData?.historialAsistencias || []).filter((item) => {
    if (filtroAsistencia === "TODAS") return true;
    return item.estado === filtroAsistencia;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl max-h-[92vh] bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-2xl shadow-blue-950/70 flex flex-col overflow-hidden">
        {/* 1. Header de la Ficha */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0C3473] to-[#0F3E86] border-b border-[#1E57A8] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border-2 border-white/20 flex items-center justify-center font-black text-lg text-cyan-300 shadow-inner shrink-0">
              {alumno.nombre[0]}
              {alumno.apellido[0]}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                  {alumno.nombre} {alumno.apellido}
                </h2>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    alumno.estado === "ACTIVO"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {alumno.estado}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <BeltBadge
                  belt={alumno.cinturon_actual}
                  subcategoria={alumno.subcategoria_actual}
                  size="sm"
                />
                {edadStr && (
                  <span className="text-xs text-blue-200 font-medium">
                    • {edadStr}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenPaseOficial && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPaseOficial(alumno);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                title="Realizar pase oficial de cinturón o categoría"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span className="hidden sm:inline">Pase Oficial</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Tarjetas Métricas Rápidas de Asistencia y Torneos (5 Cards) */}
        <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-[#0A2E65] border-b border-[#1E57A8] shrink-0">
          {/* Presentes */}
          <div className="p-3 rounded-2xl bg-[#0F3E86] border border-emerald-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Presentes</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{presentes}</span>
              <span className="text-[11px] text-emerald-300 font-bold">
                {totalClases > 0 ? `${Math.round((presentes / totalClases) * 100)}%` : "0%"}
              </span>
            </div>
            <span className="text-[10px] text-blue-200 font-medium mt-0.5">Clases en tatami</span>
          </div>

          {/* Tardes */}
          <div className="p-3 rounded-2xl bg-[#0F3E86] border border-amber-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tardanzas</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{tardes}</span>
              <span className="text-[11px] text-amber-300 font-bold">
                {totalClases > 0 ? `${Math.round((tardes / totalClases) * 100)}%` : "0%"}
              </span>
            </div>
            <span className="text-[10px] text-blue-200 font-medium mt-0.5">Llegadas tarde</span>
          </div>

          {/* Ausencias */}
          <div className="p-3 rounded-2xl bg-[#0F3E86] border border-rose-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ausencias</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{ausentes}</span>
              <span className="text-[11px] text-rose-300 font-bold">
                {totalClases > 0 ? `${Math.round((ausentes / totalClases) * 100)}%` : "0%"}
              </span>
            </div>
            <span className="text-[10px] text-blue-200 font-medium mt-0.5">Faltas registradas</span>
          </div>

          {/* Clases en Cinto Actual */}
          <div className="p-3 rounded-2xl bg-[#0F3E86] border border-cyan-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-cyan-300">
              <span className="text-[11px] font-bold uppercase tracking-wider">En su Cinto</span>
              <Award className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{clasesEnCinto}</span>
              <span className="text-[11px] text-cyan-200 font-bold">clases</span>
            </div>
            <span className="text-[10px] text-blue-200 font-medium mt-0.5">Para pase de grado</span>
          </div>

          {/* Torneos & Premios */}
          <div className="p-3 rounded-2xl bg-[#0F3E86] border border-amber-400/30 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-amber-300">
              <span className="text-[11px] font-bold uppercase tracking-wider">Torneos</span>
              <Trophy className="w-4 h-4 text-amber-300" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-300">{fichaData?.torneos?.length ?? 0}</span>
              <span className="text-[11px] text-amber-200 font-bold">
                {(fichaData?.torneos?.length ?? 0) === 1 ? "evento" : "eventos"}
              </span>
            </div>
            <span className="text-[10px] text-blue-200 font-medium mt-0.5">
              {(fichaData?.torneos?.length ?? 0) > 0 ? "Con participación" : "Sin torneos aún"}
            </span>
          </div>
        </div>

        {/* 2.1 Banner de Maduración en Grado y Registro de Último Pase */}
        <div className="px-4 sm:px-5 py-3 bg-[#082552] border-b border-[#1E57A8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
                esAptoParaPase
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-blue-500/20 text-cyan-300 border border-blue-500/40"
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-blue-100">Último Pase Oficial:</span>
                <span className="text-xs font-black text-cyan-300">
                  {fechaUltimoPase || "Fecha histórica de alta"}
                </span>
                <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                  {diasDesdeUltimoPase} {diasDesdeUltimoPase === 1 ? "día transcurrido" : "días transcurridos"}
                </span>
              </div>
              <p className="text-[11px] text-blue-300 font-medium mt-0.5">
                Permanencia en categoría actual • {clasesEnCinto} clases presenciadas en este grado
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {esAptoParaPase ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Apto para Examen / Próximo Grado</span>
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 font-bold text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-300" />
                <span>En período de práctica ({diasDesdeUltimoPase} días en grado)</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. Navegación por Pestañas */}
        <div className="px-4 sm:px-5 pt-3 bg-[#0C3473] border-b border-[#1E57A8] flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("resumen")}
            className={`pb-2.5 px-3 text-xs font-black transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "resumen"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-blue-200 hover:text-white"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Datos & Contacto</span>
          </button>

          <button
            onClick={() => setActiveTab("asistencias")}
            className={`pb-2.5 px-3 text-xs font-black transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "asistencias"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-blue-200 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Historial Clases ({totalClases})</span>
          </button>

          <button
            onClick={() => setActiveTab("graduaciones")}
            className={`pb-2.5 px-3 text-xs font-black transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "graduaciones"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-blue-200 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Graduaciones ({fichaData?.historialGraduaciones.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("torneos")}
            className={`pb-2.5 px-3 text-xs font-black transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "torneos"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-blue-200 hover:text-white"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Torneos ({fichaData?.torneos?.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("nota")}
            className={`pb-2.5 px-3 text-xs font-black transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "nota"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-blue-200 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Nota Privada</span>
          </button>
        </div>

        {/* 4. Contenido Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: DATOS & CONTACTO */}
          {activeTab === "resumen" && (
            <div className="space-y-4">
              {/* Acciones de Contacto Rápido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Teléfono Personal */}
                <div className="p-3.5 bg-[#0A2E65] border border-[#2056A8] rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-blue-200 font-semibold">Teléfono de Contacto</p>
                    <p className="font-bold text-sm text-white truncate">{alumno.telefono_contacto || "Sin registrar"}</p>
                  </div>
                  {cleanPhone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all cursor-pointer"
                        title="Llamar"
                      >
                        <Phone className="w-4 h-4 text-cyan-300" />
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all cursor-pointer"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Contacto de Emergencia */}
                <div className="p-3.5 bg-[#0A2E65] border border-[#2056A8] rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-rose-300 font-semibold">Contacto de Emergencia</p>
                    <p className="font-bold text-sm text-white truncate">{alumno.contacto_emergencia || "Sin registrar"}</p>
                  </div>
                  {cleanEmergencyPhone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${cleanEmergencyPhone}`}
                        className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-sm transition-all cursor-pointer"
                        title="Llamar a Emergencia"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Información Académica & Dojo */}
              <div className="p-4 bg-[#0A2E65] border border-[#2056A8] rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-blue-200 tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-300" />
                  <span>Información en Nievas Academia</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-blue-300 block mb-0.5">Fecha de Nacimiento:</span>
                    <span className="font-bold text-white">
                      {alumno.fecha_nacimiento || "No informada"}{" "}
                      {edadStr && <span className="text-cyan-300">({edadStr})</span>}
                    </span>
                  </div>

                  <div>
                    <span className="text-blue-300 block mb-0.5">Fecha de Alta en Dojo:</span>
                    <span className="font-bold text-white">
                      {alumno.created_at ? alumno.created_at.split("T")[0] : "Histórico"}
                    </span>
                  </div>

                  <div>
                    <span className="text-blue-300 block mb-0.5">Senseis a Cargo:</span>
                    <span className="font-bold text-cyan-200">
                      {alumno.profesores_nombres && alumno.profesores_nombres.length > 0
                        ? alumno.profesores_nombres.join(", ")
                        : "Sensei Francisco Nievas"}
                    </span>
                  </div>

                  <div>
                    <span className="text-blue-300 block mb-0.5">Presentismo Global:</span>
                    <span className="font-bold text-emerald-300">
                      {porcentajePresentismo}% de asistencia ({presentes + tardes} de {totalClases} clases)
                    </span>
                  </div>

                  <div>
                    <span className="text-blue-300 block mb-0.5">Último Pase Oficial:</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>{fechaUltimoPase || "Registro inicial"}</span>
                      <span className="text-cyan-300 font-extrabold text-[11px]">
                        ({diasDesdeUltimoPase} días transcurridos)
                      </span>
                    </span>
                  </div>

                  <div>
                    <span className="text-blue-300 block mb-0.5">Estado de Aptitud:</span>
                    {esAptoParaPase ? (
                      <span className="font-bold text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Apto para evaluación ({clasesEnCinto} clases en cinto)</span>
                      </span>
                    ) : (
                      <span className="font-bold text-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>En entrenamiento ({diasDesdeUltimoPase} días / {clasesEnCinto} clases)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Clases inscriptas */}
                {fichaData?.clasesInscriptas && fichaData.clasesInscriptas.length > 0 && (
                  <div className="pt-2 border-t border-[#1E57A8]">
                    <span className="text-blue-300 text-[11px] block mb-1 font-medium">
                      Clases en las que está inscripto:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {fichaData.clasesInscriptas.map((c) => (
                        <span
                          key={c.id}
                          className="px-2.5 py-1 bg-[#0F3E86] border border-[#2056A8] text-white text-xs font-bold rounded-lg"
                        >
                          {c.nombre} {c.profesorNombre && `(${c.profesorNombre})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vista rápida de notas si existen */}
              {notaPrivada && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold block text-amber-300">Nota Privada Confidencial:</span>
                    <p className="mt-0.5 leading-relaxed">{notaPrivada}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL DE ASISTENCIAS DETALLADO */}
          {activeTab === "asistencias" && (
            <div className="space-y-3">
              {/* Filtros rápidos de asistencia */}
              <div className="flex items-center gap-1.5 bg-[#0A2E65] p-1 rounded-xl border border-[#2056A8] w-fit text-xs">
                {(["TODAS", "PRESENTE", "TARDE", "AUSENTE"] as const).map((estado) => (
                  <button
                    key={estado}
                    onClick={() => setFiltroAsistencia(estado)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      filtroAsistencia === estado
                        ? "bg-white text-[#0F3E86] shadow-sm"
                        : "text-blue-200 hover:text-white"
                    }`}
                  >
                    {estado === "TODAS"
                      ? "Todas"
                      : estado === "PRESENTE"
                      ? "Presentes"
                      : estado === "TARDE"
                      ? "Tardanzas"
                      : "Ausentes"}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-blue-200 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
                  <span className="text-xs font-medium">Cargando asistencias históricas...</span>
                </div>
              ) : asistenciasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-blue-200 bg-[#0A2E65] rounded-2xl border border-dashed border-[#2056A8] text-xs font-medium">
                  No hay asistencias registradas con el criterio seleccionado.
                </div>
              ) : (
                <div className="space-y-2">
                  {asistenciasFiltradas.map((asis) => (
                    <div
                      key={asis.id}
                      className="p-3 bg-[#0A2E65] border border-[#2056A8] rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            asis.estado === "PRESENTE"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : asis.estado === "TARDE"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {asis.estado === "PRESENTE" && <CheckCircle2 className="w-4 h-4" />}
                          {asis.estado === "TARDE" && <Clock className="w-4 h-4" />}
                          {asis.estado === "AUSENTE" && <XCircle className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{asis.claseNombre}</p>
                          <div className="flex items-center gap-2 text-[11px] text-blue-200">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-cyan-300" />
                              <span>{asis.fecha}</span>
                            </span>
                            {asis.profesorNombre && (
                              <span>• Sensei: {asis.profesorNombre}</span>
                            )}
                            {asis.esRecuperacion && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                Recuperación
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                            asis.estado === "PRESENTE"
                              ? "bg-emerald-500 text-slate-950"
                              : asis.estado === "TARDE"
                              ? "bg-amber-400 text-slate-950"
                              : "bg-rose-500/30 text-rose-200 border border-rose-500/40"
                          }`}
                        >
                          {asis.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORIAL DE GRADUACIONES */}
          {activeTab === "graduaciones" && (
            <div className="space-y-3">
              {/* Card Resumen de Antigüedad y Aptitud en Grado Actual */}
              <div className="p-4 bg-gradient-to-r from-[#0A2E65] to-[#0D3877] rounded-2xl border border-cyan-500/40 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shrink-0">
                    <Award className="w-6 h-6 text-cyan-300" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                      Grado Vigente en Dojo
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-black text-white">
                        {alumno.cinturon_actual} {alumno.subcategoria_actual && `(${alumno.subcategoria_actual})`}
                      </span>
                    </div>
                    <p className="text-xs text-blue-300 mt-1">
                      Último pase registrado: <strong className="text-white">{fechaUltimoPase || "Histórico"}</strong> •{" "}
                      <strong className="text-amber-300 font-black">{diasDesdeUltimoPase} días transcurridos hasta hoy</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onOpenPaseOficial && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPaseOficial(alumno);
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-slate-950" />
                      <span>Promover Alumno</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pb-1 pt-1">
                <p className="text-xs text-blue-200 font-semibold">
                  Historial cronológico de exámenes y ascensos
                </p>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-blue-200 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
                  <span className="text-xs font-medium">Cargando historial de graduaciones...</span>
                </div>
              ) : !fichaData?.historialGraduaciones || fichaData.historialGraduaciones.length === 0 ? (
                <div className="p-8 text-center text-blue-200 bg-[#0A2E65] rounded-2xl border border-dashed border-[#2056A8] text-xs font-medium">
                  Este alumno no cuenta con graduaciones previas registradas. Cinturón actual: {alumno.cinturon_actual}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {fichaData.historialGraduaciones.map((grad) => {
                    let diasGrad = 0;
                    if (grad.fecha_graduacion) {
                      const d = new Date(`${grad.fecha_graduacion}T12:00:00`);
                      diasGrad = Math.max(0, Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
                    }

                    return (
                      <div
                        key={grad.id}
                        className="p-3.5 bg-[#0A2E65] border border-[#2056A8] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <BeltBadge
                            belt={grad.cinturon}
                            subcategoria={grad.subcategoria}
                            size="md"
                          />
                          <div>
                            <p className="font-bold text-white text-sm">
                              {grad.cinturon} {grad.subcategoria && `(${grad.subcategoria})`}
                            </p>
                            <p className="text-[11px] text-blue-200">
                              Evaluador: {grad.graduado_por_nombre || "Sensei Directivo"}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="flex items-center sm:justify-end gap-1.5">
                            <span className="text-xs text-cyan-300 font-black">
                              {grad.fecha_graduacion}
                            </span>
                            <span className="text-[10px] text-amber-300/90 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                              hace {diasGrad} {diasGrad === 1 ? "día" : "días"}
                            </span>
                          </div>
                          {grad.observaciones && (
                            <span className="text-[11px] text-blue-200 italic max-w-xs block truncate mt-0.5">
                              &quot;{grad.observaciones}&quot;
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: TORNEOS & PREMIOS */}
          {activeTab === "torneos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>Historial de Torneos y Premiaciones ({fichaData?.torneos?.length ?? 0})</span>
                </h4>
              </div>

              {!fichaData?.torneos || fichaData.torneos.length === 0 ? (
                <div className="p-8 text-center bg-[#0A2E65] border border-[#2056A8] rounded-2xl text-xs text-blue-200">
                  <Trophy className="w-8 h-8 text-amber-300/40 mx-auto mb-2" />
                  <p className="font-bold text-white text-sm">Sin torneos registrados</p>
                  <p className="text-[11px] text-blue-200 mt-1 max-w-sm mx-auto">
                    Este alumno aún no fue asignado a ninguna delegación de torneos. Podés sumarlo desde la sección de Torneos en Dirección.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fichaData.torneos.map((torneo) => {
                    const isOro = torneo.medalla === "ORO" || torneo.puesto_premio.toLowerCase().includes("1");
                    const isPlata = torneo.medalla === "PLATA" || torneo.puesto_premio.toLowerCase().includes("2");
                    const isBronce = torneo.medalla === "BRONCE" || torneo.puesto_premio.toLowerCase().includes("3");

                    return (
                      <div
                        key={torneo.id}
                        className="p-4 bg-[#0A2E65] border border-[#2056A8] hover:border-amber-400/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="p-1 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              <Trophy className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-black text-white text-sm">
                              {torneo.torneoNombre}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-blue-200 flex-wrap">
                            <span className="flex items-center gap-1 text-cyan-300 font-bold">
                              <Calendar className="w-3 h-3" />
                              {torneo.fecha}
                            </span>
                            {torneo.lugar && (
                              <span>• {torneo.lugar}</span>
                            )}
                            <span className="text-white font-medium">
                              • Modalidad: <strong className="text-cyan-200">{torneo.categoria || "General"}</strong>
                            </span>
                          </div>
                          {torneo.notas && (
                            <p className="text-[11px] text-blue-200 italic mt-0.5">
                              &ldquo;{torneo.notas}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Badge de Premio / Medalla */}
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border flex items-center gap-1.5 self-start sm:self-center ${
                            isOro
                              ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                              : isPlata
                              ? "bg-slate-200 text-slate-900 border-slate-300 shadow-md"
                              : isBronce
                              ? "bg-amber-800 text-amber-100 border-amber-700"
                              : "bg-blue-600/40 text-blue-100 border-blue-400/40"
                          }`}
                        >
                          <span>{isOro ? "🥇" : isPlata ? "🥈" : isBronce ? "🥉" : "🎖️"}</span>
                          <span>{torneo.puesto_premio}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NOTA PRIVADA CONFIDENCIAL */}
          {activeTab === "nota" && (
            <div className="p-4 bg-[#0A2E65] border border-[#2056A8] rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Nota Confidencial del Alumno (Solo visible por Dirección)</span>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                Registra aquí aspectos médicos, consideraciones físicas, notas familiares o seguimiento pedagógico privado.
              </p>

              <textarea
                rows={4}
                value={notaPrivada}
                onChange={(e) => setNotaPrivada(e.target.value)}
                placeholder="Ej. Lesión previa en rodilla izquierda. Excelente disciplina en tatami. Requiere certificado médico renovado..."
                className="w-full px-3 py-2.5 bg-[#082552] border border-[#2056A8] rounded-xl text-xs text-white placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-white"
              />

              <div className="flex items-center justify-between pt-1">
                {notaSavedFeedback ? (
                  <span className="text-xs text-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ¡Nota confidencial guardada!
                  </span>
                ) : (
                  <span className="text-[11px] text-blue-300">
                    Los cambios se guardan de forma permanente.
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleGuardarNota}
                  disabled={isSavingNota}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingNota ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Nota</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer con Botón Cerrar */}
        <div className="p-3.5 bg-[#0C3473] border-t border-[#1E57A8] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
