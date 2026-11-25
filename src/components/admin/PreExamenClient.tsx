"use client";

import React, { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Alumno,
  PreExamen,
  EvaluacionSemaforo,
  KarateBelt,
  Usuario,
  ESCALAFON_KARATE,
  getGradoRank,
} from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  crearPreExamenAction,
  eliminarPreExamenAction,
} from "@/lib/actions/pre-examen.actions";
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Filter,
  History,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  AlertCircle,
  HelpCircle,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

interface PreExamenClientProps {
  currentUser: Usuario;
  initialAlumnos: Alumno[];
  initialPreExamenes: PreExamen[];
}

export function PreExamenClient({
  currentUser,
  initialAlumnos,
  initialPreExamenes,
}: PreExamenClientProps) {
  const [activeTab, setActiveTab] = useState<"nueva" | "historial">("nueva");
  const [preExamenes, setPreExamenes] = useState<PreExamen[]>(initialPreExamenes);
  const [alumnos] = useState<Alumno[]>(initialAlumnos);

  // Form states
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string>("");
  const [searchAlumno, setSearchAlumno] = useState<string>("");
  const [isDropdownAlumnoOpen, setIsDropdownAlumnoOpen] = useState<boolean>(false);

  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [fecha, setFecha] = useState<string>(hoyStr);

  const [kihonNota, setKihonNota] = useState<EvaluacionSemaforo | null>(null);
  const [kataNota, setKataNota] = useState<EvaluacionSemaforo | null>(null);
  const [kumiteNota, setKumiteNota] = useState<EvaluacionSemaforo | null>(null);
  const [observaciones, setObservaciones] = useState<string>("");

  // History filtering
  const [searchHistorial, setSearchHistorial] = useState<string>("");
  const [filtroSemaforo, setFiltroSemaforo] = useState<"TODOS" | EvaluacionSemaforo>("TODOS");

  // Transitions & Feedback
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tipo: "exito" | "error"; mensaje: string } | null>(null);
  const [preExamenParaEliminar, setPreExamenParaEliminar] = useState<PreExamen | null>(null);

  const showFeedback = (tipo: "exito" | "error", mensaje: string) => {
    setFeedback({ tipo, mensaje });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Alumno seleccionado
  const selectedAlumno = useMemo(() => {
    return alumnos.find((a) => a.id === selectedAlumnoId) || null;
  }, [alumnos, selectedAlumnoId]);

  // Alumnos filtrados para selector
  const alumnosFiltrados = useMemo(() => {
    if (!searchAlumno.trim()) return alumnos.slice(0, 30);
    const q = searchAlumno.toLowerCase().trim();
    return alumnos.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.apellido.toLowerCase().includes(q) ||
        a.cinturon_actual.toLowerCase().includes(q)
    );
  }, [alumnos, searchAlumno]);

  // Próximo cinturón según escalafón
  const proximoGrado = useMemo(() => {
    if (!selectedAlumno) return null;
    const currentRank = getGradoRank(
      selectedAlumno.cinturon_actual,
      selectedAlumno.subcategoria_actual
    );
    const nextGrad = ESCALAFON_KARATE.find((g) => g.rank > currentRank);
    return nextGrad || null;
  }, [selectedAlumno]);

  // Cálculo en vivo del resultado del semáforo
  const liveResult = useMemo(() => {
    if (!kihonNota || !kataNota || !kumiteNota) return null;

    const mapPuntos: Record<EvaluacionSemaforo, number> = {
      VERDE: 3,
      AMARILLO: 2,
      ROJO: 1,
    };

    const sum = mapPuntos[kihonNota] + mapPuntos[kataNota] + mapPuntos[kumiteNota];
    const score = Math.round((sum / 3) * 100) / 100;

    let resultado_promedio: EvaluacionSemaforo = "ROJO";
    let estado: "APROBADO" | "REGULAR" | "A_MEJORAR" = "A_MEJORAR";
    let titulo = "Rendimiento Malo / Requiere Práctica";
    let desc = "El alumno aún no alcanza el nivel requerido para la mesa de examen. Se recomienda reforzar los puntos observados.";

    if (score >= 2.67) {
      resultado_promedio = "VERDE";
      estado = "APROBADO";
      titulo = "Rendimiento Bueno / Apto Examen";
      desc = "¡Felicitaciones! El alumno demostró solidez técnica en las 3 áreas y está apto para presentarse a examen de graduación.";
    } else if (score >= 2.0) {
      resultado_promedio = "AMARILLO";
      estado = "REGULAR";
      titulo = "Rendimiento Regular / En Observación";
      desc = "Rendimiento aceptable con aspectos técnicos a ajustar previo al pase de cinturón.";
    }

    return {
      resultado_promedio,
      estado,
      score,
      titulo,
      desc,
    };
  }, [kihonNota, kataNota, kumiteNota]);

  // Guardar evaluación
  const handleGuardarEvaluacion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAlumno) {
      showFeedback("error", "Por favor seleccioná un alumno para evaluar.");
      return;
    }
    if (!fecha) {
      showFeedback("error", "Por favor ingresá la fecha del pre-examen.");
      return;
    }
    if (!kihonNota || !kataNota || !kumiteNota) {
      showFeedback("error", "Debés calificar las 3 instancias: Kihon, Kata y Kumite.");
      return;
    }

    startTransition(async () => {
      const res = await crearPreExamenAction({
        alumno_id: selectedAlumno.id,
        fecha,
        cinturon_actual: selectedAlumno.cinturon_actual,
        subcategoria_actual: selectedAlumno.subcategoria_actual,
        cinturon_postula: proximoGrado?.cinturon || null,
        subcategoria_postula: proximoGrado?.subcategoria || null,
        kihon_nota: kihonNota,
        kata_nota: kataNota,
        kumite_nota: kumiteNota,
        observaciones: observaciones.trim() || null,
      });

      if (res.success) {
        setPreExamenes((prev) => [res.data, ...prev]);
        showFeedback(
          "exito",
          `¡Pre-examen de ${selectedAlumno.nombre} ${selectedAlumno.apellido} registrado correctamente!`
        );
        // Reset form
        setSelectedAlumnoId("");
        setKihonNota(null);
        setKataNota(null);
        setKumiteNota(null);
        setObservaciones("");
        setActiveTab("historial");
      } else {
        showFeedback("error", res.error || "Error al registrar la evaluación.");
      }
    });
  };

  // Eliminar evaluación
  const handleConfirmarEliminar = () => {
    if (!preExamenParaEliminar) return;
    const { id } = preExamenParaEliminar;

    startTransition(async () => {
      const res = await eliminarPreExamenAction(id);
      if (res.success) {
        setPreExamenes((prev) => prev.filter((p) => p.id !== id));
        showFeedback("exito", "Evaluación de pre-examen eliminada.");
        setPreExamenParaEliminar(null);
      } else {
        showFeedback("error", res.error || "Error al eliminar la evaluación.");
      }
    });
  };

  // Historial filtrado
  const preExamenesFiltrados = useMemo(() => {
    return preExamenes.filter((p) => {
      const matchesSearch =
        !searchHistorial.trim() ||
        (p.alumno_nombre || "").toLowerCase().includes(searchHistorial.toLowerCase()) ||
        (p.cinturon_actual || "").toLowerCase().includes(searchHistorial.toLowerCase()) ||
        (p.observaciones || "").toLowerCase().includes(searchHistorial.toLowerCase());

      const matchesSemaforo =
        filtroSemaforo === "TODOS" || p.resultado_promedio === filtroSemaforo;

      return matchesSearch && matchesSemaforo;
    });
  }, [preExamenes, searchHistorial, filtroSemaforo]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Botón Volver y Badge */}
      <div className="flex items-center justify-between">
        <Link
          href={currentUser.rol === "ADMIN" ? "/admin/dashboard" : "/profesor/clases"}
          className="flex items-center gap-1.5 text-xs text-[#0F3E86] hover:text-blue-900 font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#0F3E86]" />
          <span>{currentUser.rol === "ADMIN" ? "Volver a Dirección" : "Volver a Clases"}</span>
        </Link>

        <span className="text-xs font-bold text-[#0F3E86] bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Módulo de Pre-Examen</span>
        </span>
      </div>

      {/* Banner Oficial Nievas */}
      <div className="p-3.5 sm:p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-blue-950/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-white shadow-xs shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Logo Nievas"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
              Evaluación Técnica de Pre-Examen
            </h1>
            <p className="text-[11px] text-blue-200 font-medium truncate">
              Simulacro y semáforo de graduación: Kihon, Kata y Kumite
            </p>
          </div>
        </div>

        {/* Contador rápido de pre-exámenes */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs">
          <FileText className="w-4 h-4 text-amber-300" />
          <span className="font-bold text-white">{preExamenes.length}</span>
          <span className="text-blue-200">evaluaciones</span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            feedback.tipo === "exito"
              ? "bg-emerald-500/15 border-emerald-500 text-emerald-800"
              : "bg-rose-500/15 border-rose-500 text-rose-800"
          }`}
        >
          {feedback.tipo === "exito" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.mensaje}</span>
        </div>
      )}

      {/* Selector de Pestañas: Nueva Evaluación vs Historial */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit border border-slate-300/80">
        <button
          type="button"
          onClick={() => setActiveTab("nueva")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "nueva"
              ? "bg-[#0F3E86] text-white shadow-md shadow-blue-950/20"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Award className="w-4 h-4 text-amber-300" />
          <span>Nueva Calificación</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "historial"
              ? "bg-[#0F3E86] text-white shadow-md shadow-blue-950/20"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Pre-Exámenes</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-slate-800">
            {preExamenes.length}
          </span>
        </button>
      </div>

      {/* PESTAÑA 1: NUEVA CALIFICACIÓN DE PRE-EXAMEN */}
      {activeTab === "nueva" && (
        <form onSubmit={handleGuardarEvaluacion} className="space-y-6">
          {/* Card Paso 1: Seleccionar Alumno y Fecha */}
          <div className="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-[#0F3E86] text-white">
                <Users className="w-4 h-4 text-cyan-300" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Alumno y Fecha del Pre-Examen
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector de Alumno con Búsqueda */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Alumno a Evaluar:</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {alumnos.length} alumnos registrados
                  </span>
                </label>

                <div className="relative">
                  <div
                    onClick={() => setIsDropdownAlumnoOpen(!isDropdownAlumnoOpen)}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    {selectedAlumno ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#0F3E86] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedAlumno.nombre[0]}
                          {selectedAlumno.apellido[0]}
                        </div>
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {selectedAlumno.nombre} {selectedAlumno.apellido}
                        </span>
                        <BeltBadge belt={selectedAlumno.cinturon_actual} size="sm" />
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">
                        Seleccionar un alumno...
                      </span>
                    )}
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>

                  {/* Dropdown flotante con búsqueda rápida */}
                  {isDropdownAlumnoOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border-2 border-slate-300 rounded-2xl shadow-xl p-2 space-y-2 max-h-72 flex flex-col">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre o cinturón..."
                          value={searchAlumno}
                          onChange={(e) => setSearchAlumno(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                          autoFocus
                        />
                      </div>

                      <div className="overflow-y-auto space-y-1 flex-1">
                        {alumnosFiltrados.length === 0 ? (
                          <p className="p-3 text-center text-xs text-slate-400">
                            No se encontraron alumnos con ese nombre.
                          </p>
                        ) : (
                          alumnosFiltrados.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setSelectedAlumnoId(a.id);
                                setIsDropdownAlumnoOpen(false);
                                setSearchAlumno("");
                              }}
                              className={`w-full p-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                selectedAlumnoId === a.id
                                  ? "bg-blue-50 text-[#0F3E86] font-bold border border-blue-200"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold">
                                  {a.nombre} {a.apellido}
                                </span>
                              </div>
                              <BeltBadge belt={a.cinturon_actual} size="sm" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info del alumno seleccionado y próximo cinturón */}
                {selectedAlumno && (
                  <div className="mt-2 p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-900 block">
                        Grado Actual:
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <BeltBadge
                          belt={selectedAlumno.cinturon_actual}
                          subcategoria={selectedAlumno.subcategoria_actual}
                          size="sm"
                        />
                      </div>
                    </div>

                    {proximoGrado && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-900 block">
                          Postula para Pase:
                        </span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <BeltBadge
                            belt={proximoGrado.cinturon}
                            subcategoria={proximoGrado.subcategoria}
                            size="sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selector de Fecha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fecha de Realización del Pre-Examen:</span>
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Quedará asentada en el legajo histórico técnico del alumno.
                </p>
              </div>
            </div>
          </div>

          {/* Card Paso 2: Las 3 Secciones Semáforo (Kihon, Kata, Kumite) */}
          <div className="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#0F3E86] text-white">
                  <Award className="w-4 h-4 text-cyan-300" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Calificación por Semáforo en las 3 Instancias
                </h2>
              </div>

              {/* Leyenda de Semáforo */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  Rojo = Malo
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  Amarillo = Regular
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Verde = Bueno
                </span>
              </div>
            </div>

            {/* Las 3 Secciones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. KIHON */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🥋</span>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                      Kihon
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Técnica Básica
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Posturas, desplazamientos, defensas y ataques fundamentales.
                </p>

                {/* Botones Semáforo */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setKihonNota("ROJO")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kihonNota === "ROJO"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400 scale-102"
                        : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                    }`}
                  >
                    <span className="text-base">🔴</span>
                    <span>Malo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKihonNota("AMARILLO")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kihonNota === "AMARILLO"
                        ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 scale-102"
                        : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <span className="text-base">🟡</span>
                    <span>Regular</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKihonNota("VERDE")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kihonNota === "VERDE"
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 scale-102"
                        : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                    }`}
                  >
                    <span className="text-base">🟢</span>
                    <span>Bueno</span>
                  </button>
                </div>
              </div>

              {/* 2. KATA */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📜</span>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                      Kata
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Formas & Bunkai
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Ritmo, potencia, kime, mirada y corrección del embusen.
                </p>

                {/* Botones Semáforo */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setKataNota("ROJO")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kataNota === "ROJO"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400 scale-102"
                        : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                    }`}
                  >
                    <span className="text-base">🔴</span>
                    <span>Malo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKataNota("AMARILLO")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kataNota === "AMARILLO"
                        ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 scale-102"
                        : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <span className="text-base">🟡</span>
                    <span>Regular</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKataNota("VERDE")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kataNota === "VERDE"
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 scale-102"
                        : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                    }`}
                  >
                    <span className="text-base">🟢</span>
                    <span>Bueno</span>
                  </button>
                </div>
              </div>

              {/* 3. KUMITE */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🥊</span>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                      Kumite
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Combate & Control
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Distancia (Maai), timing, iniciativa, guardia y control de impacto.
                </p>

                {/* Botones Semáforo */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setKumiteNota("ROJO")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kumiteNota === "ROJO"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400 scale-102"
                        : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                    }`}
                  >
                    <span className="text-base">🔴</span>
                    <span>Malo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKumiteNota("AMARILLO")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kumiteNota === "AMARILLO"
                        ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 scale-102"
                        : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <span className="text-base">🟡</span>
                    <span>Regular</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKumiteNota("VERDE")}
                    className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      kumiteNota === "VERDE"
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 scale-102"
                        : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                    }`}
                  >
                    <span className="text-base">🟢</span>
                    <span>Bueno</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card Paso 3: Resultado Promedio Calculado en Vivo */}
          <div
            className={`p-5 rounded-2xl border-2 transition-all shadow-md ${
              liveResult
                ? liveResult.resultado_promedio === "VERDE"
                  ? "bg-emerald-50 border-emerald-400 text-emerald-950"
                  : liveResult.resultado_promedio === "AMARILLO"
                  ? "bg-amber-50 border-amber-400 text-amber-950"
                  : "bg-rose-50 border-rose-400 text-rose-950"
                : "bg-slate-100 border-slate-300 text-slate-600"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                  Resultado Promedio del Pre-Examen:
                </span>

                {liveResult ? (
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">
                      {liveResult.resultado_promedio === "VERDE"
                        ? "🟢"
                        : liveResult.resultado_promedio === "AMARILLO"
                        ? "🟡"
                        : "🔴"}
                    </span>
                    <div>
                      <h3 className="text-lg font-black tracking-tight leading-tight">
                        {liveResult.titulo}
                      </h3>
                      <p className="text-xs font-medium opacity-85 mt-0.5">
                        {liveResult.desc}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500">
                    <HelpCircle className="w-5 h-5 text-slate-400" />
                    <p className="text-xs font-medium">
                      Seleccioná la calificación de las 3 instancias para calcular el promedio del alumno.
                    </p>
                  </div>
                )}
              </div>

              {/* Score Badge */}
              {liveResult && (
                <div className="sm:text-right shrink-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-black/10 font-black text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Score: {liveResult.score} / 3.0</span>
                  </div>
                  <div className="text-[10px] font-semibold opacity-75 mt-1">
                    Kihon: {kihonNota} | Kata: {kataNota} | Kumite: {kumiteNota}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Paso 4: Observaciones y Guardar */}
          <div className="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Observaciones del Sensei (Opcional):</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Puntos a reforzar, correcciones técnicas recomendadas o felicitaciones al alumno..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending || !selectedAlumno || !kihonNota || !kataNota || !kumiteNota}
                className="px-6 py-3 bg-[#0F3E86] hover:bg-[#154ca0] disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-950/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>Registrar Pre-Examen en el Historial</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* PESTAÑA 2: HISTORIAL DE EVALUACIONES */}
      {activeTab === "historial" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por alumno, cinturón o nota..."
                value={searchHistorial}
                onChange={(e) => setSearchHistorial(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
              />
            </div>

            {/* Filtro por Semáforo */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFiltroSemaforo("TODOS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filtroSemaforo === "TODOS"
                    ? "bg-[#0F3E86] text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Todos ({preExamenes.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroSemaforo("VERDE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  filtroSemaforo === "VERDE"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <span>🟢 Bueno</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroSemaforo("AMARILLO")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  filtroSemaforo === "AMARILLO"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <span>🟡 Regular</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroSemaforo("ROJO")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  filtroSemaforo === "ROJO"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <span>🔴 Malo</span>
              </button>
            </div>
          </div>

          {/* Listado de Pre-Exámenes */}
          {preExamenesFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white border-2 border-slate-200 rounded-2xl space-y-3">
              <Award className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                No hay evaluaciones registradas con los filtros actuales.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("nueva")}
                className="px-4 py-2 bg-[#0F3E86] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Calificar Nuevo Pre-Examen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {preExamenesFiltrados.map((item) => {
                const isAprobado = item.resultado_promedio === "VERDE";
                const isRegular = item.resultado_promedio === "AMARILLO";

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl shadow-sm transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Info Alumno */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F3E86] text-cyan-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {item.alumno_nombre
                            ? item.alumno_nombre
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                            : "AL"}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-base">
                              {item.alumno_nombre || "Alumno"}
                            </span>
                            <BeltBadge belt={item.cinturon_actual} size="sm" />
                            {item.subcategoria_actual && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {item.subcategoria_actual}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-blue-600" />
                              Fecha: <strong>{item.fecha}</strong>
                            </span>
                            <span>•</span>
                            <span>Evaluador: {item.profesor_nombre || "Sensei"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badge Promedio & Botón Eliminar */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div
                          className={`px-3 py-1.5 rounded-xl border font-black text-xs flex items-center gap-1.5 ${
                            isAprobado
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : isRegular
                              ? "bg-amber-50 text-amber-900 border-amber-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          }`}
                        >
                          <span className="text-base">
                            {isAprobado ? "🟢" : isRegular ? "🟡" : "🔴"}
                          </span>
                          <span>
                            {isAprobado
                              ? "Apto / Bueno"
                              : isRegular
                              ? "Regular"
                              : "A Mejorar"}
                          </span>
                          <span className="opacity-75 text-[10px] font-semibold">
                            ({item.resultado_score.toFixed(2)})
                          </span>
                        </div>

                        {currentUser.rol === "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => setPreExamenParaEliminar(item)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desglose de las 3 Secciones (Kihon, Kata, Kumite) */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                      <div className="p-2 bg-slate-50 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Kihon
                        </span>
                        <span className="text-xs font-black text-slate-900 flex items-center justify-center gap-1 mt-0.5">
                          {item.kihon_nota === "VERDE"
                            ? "🟢 Bueno"
                            : item.kihon_nota === "AMARILLO"
                            ? "🟡 Regular"
                            : "🔴 Malo"}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Kata
                        </span>
                        <span className="text-xs font-black text-slate-900 flex items-center justify-center gap-1 mt-0.5">
                          {item.kata_nota === "VERDE"
                            ? "🟢 Bueno"
                            : item.kata_nota === "AMARILLO"
                            ? "🟡 Regular"
                            : "🔴 Malo"}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Kumite
                        </span>
                        <span className="text-xs font-black text-slate-900 flex items-center justify-center gap-1 mt-0.5">
                          {item.kumite_nota === "VERDE"
                            ? "🟢 Bueno"
                            : item.kumite_nota === "AMARILLO"
                            ? "🟡 Regular"
                            : "🔴 Malo"}
                        </span>
                      </div>
                    </div>

                    {/* Observaciones si las hay */}
                    {item.observaciones && (
                      <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <p>
                          <strong>Observaciones:</strong> {item.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Pre-Examen */}
      {preExamenParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                ¿Eliminar evaluación de pre-examen?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción eliminará el registro de pre-examen de{" "}
              <strong>{preExamenParaEliminar.alumno_nombre}</strong> con fecha{" "}
              <strong>{preExamenParaEliminar.fecha}</strong>. Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPreExamenParaEliminar(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
