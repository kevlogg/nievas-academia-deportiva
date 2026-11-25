"use client";

import React, { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Alumno,
  PreExamen,
  PreExamenSesion,
  EvaluacionSemaforo,
  KarateBelt,
  Usuario,
  ESCALAFON_KARATE,
  getGradoRank,
} from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  guardarPreExamenAction,
  crearPreExamenSesionAction,
  actualizarAlumnosSesionAction,
  eliminarPreExamenSesionAction,
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
  FileText,
  Loader2,
  Sparkles,
  ChevronRight,
  X,
  Clock,
  MessageSquare,
  Check,
  Zap,
  Save,
} from "lucide-react";

interface PreExamenClientProps {
  currentUser: Usuario;
  initialAlumnos: Alumno[];
  initialPreExamenes: PreExamen[];
  initialSesiones?: PreExamenSesion[];
}

function getProximoGrado(cinturon: KarateBelt, subcategoria?: string | null) {
  const currentRank = getGradoRank(cinturon, subcategoria);
  const nextGrad = ESCALAFON_KARATE.find((g) => g.rank > currentRank);
  return nextGrad || null;
}

export function PreExamenClient({
  currentUser,
  initialAlumnos,
  initialPreExamenes,
  initialSesiones = [],
}: PreExamenClientProps) {
  const [sesiones, setSesiones] = useState<PreExamenSesion[]>(initialSesiones);
  const [preExamenes, setPreExamenes] = useState<PreExamen[]>(initialPreExamenes);
  const [alumnos] = useState<Alumno[]>(initialAlumnos);

  const [activeTab, setActiveTab] = useState<"mesas" | "historial">("mesas");
  const [activeSesionId, setActiveSesionId] = useState<string | null>(null);

  // Mapa rápido de alumnos
  const alumnosMap = useMemo(() => {
    const map = new Map<string, Alumno>();
    alumnos.forEach((a) => map.set(a.id, a));
    return map;
  }, [alumnos]);

  // Sesión actualmente activa (mesa en vivo)
  const activeSesion = useMemo(() => {
    if (!activeSesionId) return null;
    return sesiones.find((s) => s.id === activeSesionId) || null;
  }, [sesiones, activeSesionId]);

  // Feedback y Transiciones
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tipo: "exito" | "error"; mensaje: string } | null>(null);
  const [savingAlumnoId, setSavingAlumnoId] = useState<string | null>(null);
  const [isGuardandoTodo, setIsGuardandoTodo] = useState<boolean>(false);

  const showFeedback = (tipo: "exito" | "error", mensaje: string) => {
    setFeedback({ tipo, mensaje });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Modales
  const [isModalNuevaSesionOpen, setIsModalNuevaSesionOpen] = useState(false);
  const [isModalAgregarAlumnosOpen, setIsModalAgregarAlumnosOpen] = useState(false);
  const [sesionParaEliminar, setSesionParaEliminar] = useState<PreExamenSesion | null>(null);
  const [preExamenParaEliminar, setPreExamenParaEliminar] = useState<PreExamen | null>(null);

  // Estados del Formulario de Nueva Sesión
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [nuevaFecha, setNuevaFecha] = useState<string>(hoyStr);
  const [nuevoTitulo, setNuevoTitulo] = useState<string>("");
  const [selectedAlumnosIds, setSelectedAlumnosIds] = useState<Set<string>>(new Set());
  const [searchModalAlumno, setSearchModalAlumno] = useState<string>("");
  const [filtroCintoModal, setFiltroCintoModal] = useState<KarateBelt | "TODOS">("TODOS");

  // Filtros dentro de la mesa en vivo
  const [searchMesa, setSearchMesa] = useState<string>("");
  const [filtroEstadoMesa, setFiltroEstadoMesa] = useState<"TODOS" | "PENDIENTES" | "CALIFICADOS">("TODOS");

  // Filtros en historial general
  const [searchHistorial, setSearchHistorial] = useState<string>("");
  const [filtroSemaforo, setFiltroSemaforo] = useState<"TODOS" | EvaluacionSemaforo>("TODOS");

  // Abrir modal nueva sesión reseteando valores
  const handleOpenNuevaSesion = () => {
    setNuevaFecha(hoyStr);
    setNuevoTitulo("");
    setSelectedAlumnosIds(new Set());
    setSearchModalAlumno("");
    setFiltroCintoModal("TODOS");
    setIsModalNuevaSesionOpen(true);
  };

  // Alumnos filtrados para el selector de la nueva sesión
  const alumnosDisponiblesModal = useMemo(() => {
    return alumnos.filter((a) => {
      const matchSearch =
        !searchModalAlumno.trim() ||
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(searchModalAlumno.toLowerCase().trim());
      const matchCinto = filtroCintoModal === "TODOS" || a.cinturon_actual === filtroCintoModal;
      return matchSearch && matchCinto;
    });
  }, [alumnos, searchModalAlumno, filtroCintoModal]);

  // Alternar selección de alumno en modal
  const toggleSelectAlumno = (alumnoId: string) => {
    setSelectedAlumnosIds((prev) => {
      const next = new Set(prev);
      if (next.has(alumnoId)) {
        next.delete(alumnoId);
      } else {
        next.add(alumnoId);
      }
      return next;
    });
  };

  const handleSelectTodosVisibles = () => {
    setSelectedAlumnosIds((prev) => {
      const next = new Set(prev);
      alumnosDisponiblesModal.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const handleDeselectTodos = () => {
    setSelectedAlumnosIds(new Set());
  };

  // Crear la sesión/mesa de pre-examen
  const handleCrearSesionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFecha) {
      showFeedback("error", "Por favor indicá la fecha del pre-examen.");
      return;
    }
    if (selectedAlumnosIds.size === 0) {
      showFeedback("error", "Por favor seleccioná al menos un alumno para rendir.");
      return;
    }

    startTransition(async () => {
      const idsArray = Array.from(selectedAlumnosIds);
      const res = await crearPreExamenSesionAction({
        fecha: nuevaFecha,
        titulo: nuevoTitulo.trim() || `Pre-Examen ${nuevaFecha}`,
        alumnos_ids: idsArray,
      });

      if (res.success) {
        setSesiones((prev) => [res.data, ...prev]);
        setIsModalNuevaSesionOpen(false);
        setActiveSesionId(res.data.id);
        showFeedback(
          "exito",
          `¡Mesa de pre-examen abierta con ${idsArray.length} alumno(s) convocados!`
        );
      } else {
        showFeedback("error", res.error || "Error al abrir la mesa de pre-examen.");
      }
    });
  };

  // Agregar alumnos a la sesión actual
  const handleAgregarAlumnosASesion = (alumnosNuevosIds: string[]) => {
    if (!activeSesion) return;
    const combinados = Array.from(new Set([...activeSesion.alumnos_ids, ...alumnosNuevosIds]));

    startTransition(async () => {
      const res = await actualizarAlumnosSesionAction(activeSesion.id, combinados);
      if (res.success) {
        setSesiones((prev) =>
          prev.map((s) => (s.id === activeSesion.id ? res.data : s))
        );
        setIsModalAgregarAlumnosOpen(false);
        showFeedback("exito", "Alumnos agregados a la mesa de pre-examen.");
      } else {
        showFeedback("error", res.error || "Error al agregar alumnos.");
      }
    });
  };

  // Quitar alumno de la sesión actual
  const handleQuitarAlumnoDeSesion = (alumnoId: string) => {
    if (!activeSesion) return;
    const filtrados = activeSesion.alumnos_ids.filter((id) => id !== alumnoId);

    startTransition(async () => {
      const res = await actualizarAlumnosSesionAction(activeSesion.id, filtrados);
      if (res.success) {
        setSesiones((prev) =>
          prev.map((s) => (s.id === activeSesion.id ? res.data : s))
        );
        showFeedback("exito", "Alumno quitado de la mesa.");
      } else {
        showFeedback("error", res.error || "Error al quitar alumno.");
      }
    });
  };

  // Eliminar sesión completa
  const handleConfirmarEliminarSesion = () => {
    if (!sesionParaEliminar) return;
    const { id } = sesionParaEliminar;

    startTransition(async () => {
      const res = await eliminarPreExamenSesionAction(id);
      if (res.success) {
        setSesiones((prev) => prev.filter((s) => s.id !== id));
        if (activeSesionId === id) {
          setActiveSesionId(null);
        }
        setSesionParaEliminar(null);
        showFeedback("exito", "Mesa de pre-examen eliminada.");
      } else {
        showFeedback("error", res.error || "Error al eliminar la mesa.");
      }
    });
  };

  // Calificar en vivo a un alumno (semáforo clickeable en la lista)
  const handleCalificarAlumno = async (
    alumno: Alumno,
    instancia: "kihon" | "kata" | "kumite",
    nota: EvaluacionSemaforo
  ) => {
    if (!activeSesion) return;

    const fechaSesion = activeSesion.fecha;
    const proximo = getProximoGrado(alumno.cinturon_actual, alumno.subcategoria_actual);

    // Buscar si ya tiene evaluación registrada
    const evalExistente = preExamenes.find(
      (p) =>
        p.alumno_id === alumno.id &&
        (p.sesion_id === activeSesion.id || p.fecha === fechaSesion)
    );

    const nuevasNotas = {
      kihon_nota: instancia === "kihon" ? nota : evalExistente?.kihon_nota || null,
      kata_nota: instancia === "kata" ? nota : evalExistente?.kata_nota || null,
      kumite_nota: instancia === "kumite" ? nota : evalExistente?.kumite_nota || null,
    };

    // Actualización optimista inmediata en local
    const alumnoNombreCompleto = `${alumno.nombre} ${alumno.apellido}`.trim();
    const tempId = evalExistente?.id || crypto.randomUUID();

    const tempPreExamen: PreExamen = {
      id: tempId,
      sesion_id: activeSesion.id,
      alumno_id: alumno.id,
      alumno_nombre: alumnoNombreCompleto,
      alumno_cinturon: alumno.cinturon_actual,
      alumno_subcategoria: alumno.subcategoria_actual,
      fecha: fechaSesion,
      cinturon_actual: alumno.cinturon_actual,
      subcategoria_actual: alumno.subcategoria_actual,
      cinturon_postula: proximo?.cinturon || null,
      subcategoria_postula: proximo?.subcategoria || null,
      kihon_nota: nuevasNotas.kihon_nota,
      kata_nota: nuevasNotas.kata_nota,
      kumite_nota: nuevasNotas.kumite_nota,
      resultado_promedio: null,
      resultado_score: 0,
      resultado_estado: null,
      observaciones: evalExistente?.observaciones || null,
      created_at: evalExistente?.created_at || new Date().toISOString(),
    };

    setPreExamenes((prev) => {
      const idx = prev.findIndex((p) => p.id === tempId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...tempPreExamen };
        return copy;
      }
      return [tempPreExamen, ...prev];
    });

    setSavingAlumnoId(alumno.id);

    try {
      const res = await guardarPreExamenAction({
        id: evalExistente?.id,
        sesion_id: activeSesion.id,
        alumno_id: alumno.id,
        alumno_nombre: alumnoNombreCompleto,
        fecha: fechaSesion,
        cinturon_actual: alumno.cinturon_actual,
        subcategoria_actual: alumno.subcategoria_actual,
        cinturon_postula: proximo?.cinturon || null,
        subcategoria_postula: proximo?.subcategoria || null,
        kihon_nota: nuevasNotas.kihon_nota,
        kata_nota: nuevasNotas.kata_nota,
        kumite_nota: nuevasNotas.kumite_nota,
        observaciones: evalExistente?.observaciones || null,
      });

      if (res.success && res.data) {
        setPreExamenes((prev) =>
          prev.map((p) => (p.id === tempId || p.id === res.data.id ? res.data : p))
        );
        showFeedback("exito", `Calificación de ${alumno.nombre} guardada automáticamente.`);
      }
    } catch (e) {
      console.error("Error guardando calificación de alumno:", e);
    } finally {
      setSavingAlumnoId(null);
    }
  };

  // Guardar observación técnica para un alumno
  const handleGuardarObservacionAlumno = async (alumno: Alumno, obs: string) => {
    if (!activeSesion) return;
    const fechaSesion = activeSesion.fecha;
    const proximo = getProximoGrado(alumno.cinturon_actual, alumno.subcategoria_actual);

    const evalExistente = preExamenes.find(
      (p) =>
        p.alumno_id === alumno.id &&
        (p.sesion_id === activeSesion.id || p.fecha === fechaSesion)
    );

    const alumnoNombreCompleto = `${alumno.nombre} ${alumno.apellido}`.trim();

    try {
      const res = await guardarPreExamenAction({
        id: evalExistente?.id,
        sesion_id: activeSesion.id,
        alumno_id: alumno.id,
        alumno_nombre: alumnoNombreCompleto,
        fecha: fechaSesion,
        cinturon_actual: alumno.cinturon_actual,
        subcategoria_actual: alumno.subcategoria_actual,
        cinturon_postula: proximo?.cinturon || null,
        subcategoria_postula: proximo?.subcategoria || null,
        kihon_nota: evalExistente?.kihon_nota || null,
        kata_nota: evalExistente?.kata_nota || null,
        kumite_nota: evalExistente?.kumite_nota || null,
        observaciones: obs.trim() || null,
      });

      if (res.success && res.data) {
        setPreExamenes((prev) =>
          prev.map((p) => (p.id === res.data.id ? res.data : p))
        );
        showFeedback("exito", `Observación de ${alumno.nombre} guardada.`);
      }
    } catch (e) {
      console.error("Error guardando observación:", e);
    }
  };

  // Guardar manualmente todas las calificaciones de la mesa actual
  const handleGuardarTodoManual = async () => {
    if (!activeSesion) return;
    setIsGuardandoTodo(true);

    try {
      const fechaSesion = activeSesion.fecha;
      let guardadosCount = 0;

      for (const alumno of alumnosEnMesa) {
        const ev = preExamenes.find(
          (p) =>
            p.alumno_id === alumno.id &&
            (p.sesion_id === activeSesion.id || p.fecha === fechaSesion)
        );

        if (ev && (ev.kihon_nota || ev.kata_nota || ev.kumite_nota || ev.observaciones)) {
          const proximo = getProximoGrado(alumno.cinturon_actual, alumno.subcategoria_actual);
          const alumnoNombreCompleto = `${alumno.nombre} ${alumno.apellido}`.trim();

          const res = await guardarPreExamenAction({
            id: ev.id,
            sesion_id: activeSesion.id,
            alumno_id: alumno.id,
            alumno_nombre: alumnoNombreCompleto,
            fecha: fechaSesion,
            cinturon_actual: alumno.cinturon_actual,
            subcategoria_actual: alumno.subcategoria_actual,
            cinturon_postula: proximo?.cinturon || null,
            subcategoria_postula: proximo?.subcategoria || null,
            kihon_nota: ev.kihon_nota || null,
            kata_nota: ev.kata_nota || null,
            kumite_nota: ev.kumite_nota || null,
            observaciones: ev.observaciones || null,
          });

          if (res.success && res.data) {
            guardadosCount++;
          }
        }
      }

      showFeedback(
        "exito",
        guardadosCount > 0
          ? `¡Mesa guardada! Se sincronizaron las calificaciones de ${guardadosCount} alumno(s) correctamente.`
          : "¡Mesa sincronizada! Todas las calificaciones se encuentran guardadas en la base de datos."
      );
    } catch (err) {
      console.error("Error al guardar todo:", err);
      showFeedback("error", "Ocurrió un error al guardar todas las evaluaciones.");
    } finally {
      setIsGuardandoTodo(false);
    }
  };

  // Alumnos de la mesa en vivo
  const alumnosEnMesa = useMemo(() => {
    if (!activeSesion) return [];
    return activeSesion.alumnos_ids
      .map((id) => alumnosMap.get(id))
      .filter((a): a is Alumno => Boolean(a));
  }, [activeSesion, alumnosMap]);

  // Alumnos filtrados dentro de la mesa en vivo
  const alumnosMesaFiltrados = useMemo(() => {
    return alumnosEnMesa.filter((a) => {
      const matchSearch =
        !searchMesa.trim() ||
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(searchMesa.toLowerCase().trim());

      const ev = preExamenes.find(
        (p) =>
          p.alumno_id === a.id &&
          (p.sesion_id === activeSesion?.id || p.fecha === activeSesion?.fecha)
      );

      const isCalificado = Boolean(ev?.kihon_nota && ev?.kata_nota && ev?.kumite_nota);

      if (filtroEstadoMesa === "CALIFICADOS") return matchSearch && isCalificado;
      if (filtroEstadoMesa === "PENDIENTES") return matchSearch && !isCalificado;
      return matchSearch;
    });
  }, [alumnosEnMesa, searchMesa, filtroEstadoMesa, preExamenes, activeSesion]);

  // Progreso de la mesa
  const progresoMesa = useMemo(() => {
    if (!activeSesion || alumnosEnMesa.length === 0) return { calificados: 0, total: 0, pct: 0 };
    const total = alumnosEnMesa.length;
    let calificados = 0;
    alumnosEnMesa.forEach((a) => {
      const ev = preExamenes.find(
        (p) =>
          p.alumno_id === a.id &&
          (p.sesion_id === activeSesion.id || p.fecha === activeSesion.fecha)
      );
      if (ev?.kihon_nota && ev?.kata_nota && ev?.kumite_nota) {
        calificados++;
      }
    });
    return {
      calificados,
      total,
      pct: Math.round((calificados / total) * 100),
    };
  }, [activeSesion, alumnosEnMesa, preExamenes]);

  // Historial general filtrado
  const preExamenesHistorialFiltrados = useMemo(() => {
    return preExamenes.filter((p) => {
      const alObj = alumnosMap.get(p.alumno_id);
      const nombreAlumno =
        p.alumno_nombre && p.alumno_nombre !== "Alumno"
          ? p.alumno_nombre
          : alObj
          ? `${alObj.nombre} ${alObj.apellido}`.trim()
          : "";

      const matchesSearch =
        !searchHistorial.trim() ||
        nombreAlumno.toLowerCase().includes(searchHistorial.toLowerCase().trim()) ||
        (p.cinturon_actual || "").toLowerCase().includes(searchHistorial.toLowerCase().trim()) ||
        (p.observaciones || "").toLowerCase().includes(searchHistorial.toLowerCase().trim());

      const matchesSemaforo =
        filtroSemaforo === "TODOS" || p.resultado_promedio === filtroSemaforo;

      return matchesSearch && matchesSemaforo;
    });
  }, [preExamenes, searchHistorial, filtroSemaforo, alumnosMap]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Botón Volver y Badge superior */}
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
          <span>Módulo de Pre-Examen Tatami</span>
        </span>
      </div>

      {/* Banner Principal Oficial Nievas */}
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
              Mesas de evaluación simultánea: Kihon, Kata y Kumite en lista
            </p>
          </div>
        </div>

        {/* Botón Abrir Fecha si estamos en vista de mesas */}
        {!activeSesion && (
          <button
            type="button"
            onClick={handleOpenNuevaSesion}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Abrir Fecha de Pre-Examen</span>
            <span className="sm:hidden">Nueva Fecha</span>
          </button>
        )}
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

      {/* =========================================================================
          MODO 1: MESA DE CALIFICACIÓN EN VIVO (CUANDO HAY UNA SESIÓN ABIERTA)
         ========================================================================= */}
      {activeSesion ? (
        <div className="space-y-5 animate-in fade-in">
          {/* Barra superior de la Mesa */}
          <div className="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSesionId(null)}
                  className="p-2 text-slate-600 hover:text-[#0F3E86] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Volver a lista de fechas"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {activeSesion.titulo}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                      Mesa en Curso
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Fecha: {activeSesion.fecha}
                    </span>
                    <span>•</span>
                    <span>Evaluador: {activeSesion.profesor_nombre || "Sensei"}</span>
                  </p>
                </div>
              </div>

              {/* Botón rápido para guardar y sumar alumnos a la mesa */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                <button
                  type="button"
                  onClick={handleGuardarTodoManual}
                  disabled={isGuardandoTodo}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  title="Guardar todas las calificaciones en la base de datos"
                >
                  {isGuardandoTodo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isGuardandoTodo ? "Guardando..." : "Guardar Calificaciones"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalAgregarAlumnosOpen(true)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0F3E86] border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sumar Alumno a la Mesa</span>
                </button>
              </div>
            </div>

            {/* Barra de progreso de la mesa */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Progreso de Calificación:
                </span>
                <span className="text-slate-900">
                  <strong>{progresoMesa.calificados}</strong> de {progresoMesa.total} alumnos calificados ({progresoMesa.pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progresoMesa.pct}%` }}
                />
              </div>
            </div>

            {/* Barra de búsqueda y filtros rápidos dentro de la mesa */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar alumno en esta mesa..."
                  value={searchMesa}
                  onChange={(e) => setSearchMesa(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                />
              </div>

              {/* Filtro por estado en la mesa */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFiltroEstadoMesa("TODOS")}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    filtroEstadoMesa === "TODOS"
                      ? "bg-[#0F3E86] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todos ({alumnosEnMesa.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstadoMesa("PENDIENTES")}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    filtroEstadoMesa === "PENDIENTES"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Pendientes ({alumnosEnMesa.length - progresoMesa.calificados})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstadoMesa("CALIFICADOS")}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    filtroEstadoMesa === "CALIFICADOS"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Calificados ({progresoMesa.calificados})
                </button>
              </div>
            </div>
          </div>

          {/* Banner de Ayuda y Estado de Guardado */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/50 border-2 border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950 font-medium shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">
                  Autoguardado en vivo activo
                </span>
                <span className="text-[11px] text-slate-600">
                  Cada botón que presionás se guarda al instante. También podés usar el botón <strong>&quot;Guardar Calificaciones&quot;</strong> para asegurar la sincronización total en la base de datos.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGuardarTodoManual}
              disabled={isGuardandoTodo}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50 self-end sm:self-auto"
            >
              {isGuardandoTodo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isGuardandoTodo ? "Guardando..." : "Guardar Calificaciones"}</span>
            </button>
          </div>

          {/* LISTA DE ALUMNOS UNO DEBAJO DEL OTRO */}
          {alumnosMesaFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white border-2 border-slate-200 rounded-2xl space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                No hay alumnos en la mesa con el filtro aplicado.
              </p>
              <button
                type="button"
                onClick={() => setIsModalAgregarAlumnosOpen(true)}
                className="px-4 py-2 bg-[#0F3E86] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Sumar Alumnos a la Mesa
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {alumnosMesaFiltrados.map((alumno, index) => {
                const proximo = getProximoGrado(alumno.cinturon_actual, alumno.subcategoria_actual);
                const ev = preExamenes.find(
                  (p) =>
                    p.alumno_id === alumno.id &&
                    (p.sesion_id === activeSesion.id || p.fecha === activeSesion.fecha)
                );

                const kihon = ev?.kihon_nota || null;
                const kata = ev?.kata_nota || null;
                const kumite = ev?.kumite_nota || null;
                const isCompleto = Boolean(kihon && kata && kumite);

                // Cálculo de estado para el badge
                let statusBadge = null;
                if (isCompleto && ev?.resultado_score) {
                  if (ev.resultado_promedio === "VERDE") {
                    statusBadge = (
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        🟢 Apto / Bueno ({ev.resultado_score.toFixed(2)})
                      </span>
                    );
                  } else if (ev.resultado_promedio === "AMARILLO") {
                    statusBadge = (
                      <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-black flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        🟡 Regular ({ev.resultado_score.toFixed(2)})
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-black flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        🔴 A Mejorar ({ev.resultado_score.toFixed(2)})
                      </span>
                    );
                  }
                } else {
                  const cant = [kihon, kata, kumite].filter(Boolean).length;
                  statusBadge = (
                    <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {cant === 0 ? "Pendiente" : `En curso (${cant}/3)`}
                    </span>
                  );
                }

                const iniciales = `${alumno.nombre[0] || ""}${alumno.apellido[0] || ""}`.toUpperCase();

                return (
                  <div
                    key={alumno.id}
                    className="p-4 sm:p-5 bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl shadow-sm transition-all space-y-4"
                  >
                    {/* Fila 1: Cabecera del alumno */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-2xl bg-[#0F3E86] text-cyan-300 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                          {iniciales}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-400 font-bold">#{index + 1}</span>
                            <h3 className="font-black text-slate-900 text-base">
                              {alumno.nombre} {alumno.apellido}
                            </h3>
                          </div>

                          {/* Cinturón actual y próximo */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500">Actual:</span>
                            <BeltBadge belt={alumno.cinturon_actual} subcategoria={alumno.subcategoria_actual} size="sm" />
                            {proximo && (
                              <>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[11px] font-bold text-amber-800">Postula a:</span>
                                <BeltBadge belt={proximo.cinturon} subcategoria={proximo.subcategoria} size="sm" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status + Quitar de la mesa */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {savingAlumnoId === alumno.id ? (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>Guardando...</span>
                          </span>
                        ) : ev?.id ? (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Guardado en BD ✓</span>
                          </span>
                        ) : null}

                        {statusBadge}

                        <button
                          type="button"
                          onClick={() => handleQuitarAlumnoDeSesion(alumno.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Quitar de esta mesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Fila 2: LAS 3 INSTANCIAS CON LOS 3 BOTONES VISIBLES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {/* 1. KIHON */}
                      <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                            <span>🥋</span>
                            <span>Kihon (Técnica)</span>
                          </span>
                          {kihon && (
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              {kihon}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kihon", "ROJO")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kihon === "ROJO"
                                ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400 scale-102"
                                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                            }`}
                          >
                            <span>🔴</span>
                            <span>Malo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kihon", "AMARILLO")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kihon === "AMARILLO"
                                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 scale-102"
                                : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200"
                            }`}
                          >
                            <span>🟡</span>
                            <span>Reg.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kihon", "VERDE")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kihon === "VERDE"
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 scale-102"
                                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                            }`}
                          >
                            <span>🟢</span>
                            <span>Bueno</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. KATA */}
                      <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                            <span>📜</span>
                            <span>Kata (Formas)</span>
                          </span>
                          {kata && (
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              {kata}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kata", "ROJO")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kata === "ROJO"
                                ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400 scale-102"
                                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                            }`}
                          >
                            <span>🔴</span>
                            <span>Malo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kata", "AMARILLO")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kata === "AMARILLO"
                                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 scale-102"
                                : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200"
                            }`}
                          >
                            <span>🟡</span>
                            <span>Reg.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kata", "VERDE")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kata === "VERDE"
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 scale-102"
                                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                            }`}
                          >
                            <span>🟢</span>
                            <span>Bueno</span>
                          </button>
                        </div>
                      </div>

                      {/* 3. KUMITE */}
                      <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                            <span>🥊</span>
                            <span>Kumite (Combate)</span>
                          </span>
                          {kumite && (
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              {kumite}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kumite", "ROJO")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kumite === "ROJO"
                                ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400 scale-102"
                                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                            }`}
                          >
                            <span>🔴</span>
                            <span>Malo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kumite", "AMARILLO")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kumite === "AMARILLO"
                                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 scale-102"
                                : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200"
                            }`}
                          >
                            <span>🟡</span>
                            <span>Reg.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCalificarAlumno(alumno, "kumite", "VERDE")}
                            className={`py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              kumite === "VERDE"
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 scale-102"
                                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                            }`}
                          >
                            <span>🟢</span>
                            <span>Bueno</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Fila 3: Observación técnica para este alumno */}
                    <div className="pt-1">
                      <details className="group">
                        <summary className="text-[11px] font-bold text-slate-500 hover:text-blue-700 cursor-pointer flex items-center gap-1.5 w-fit select-none">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {ev?.observaciones
                              ? `Observación: "${ev.observaciones}"`
                              : "Agregar observación técnica..."}
                          </span>
                        </summary>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            defaultValue={ev?.observaciones || ""}
                            placeholder="Ej: Corregir postura Zenkutsu Dachi o guardia en Kumite..."
                            id={`obs-input-${alumno.id}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleGuardarObservacionAlumno(alumno, (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inputEl = document.getElementById(`obs-input-${alumno.id}`) as HTMLInputElement;
                              if (inputEl) {
                                handleGuardarObservacionAlumno(alumno, inputEl.value);
                              }
                            }}
                            className="px-3 py-2 bg-[#0F3E86] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar Nota</span>
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra Flotante de Acciones Inferior */}
          <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md border-2 border-slate-300 p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <span className="font-black text-slate-900 block">
                  Autoguardado reactivo activo
                </span>
                <span className="text-[11px] text-slate-500">
                  {progresoMesa.calificados} de {progresoMesa.total} alumnos calificados ({progresoMesa.pct}%) • Datos sincronizados
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleGuardarTodoManual}
                disabled={isGuardandoTodo}
                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGuardandoTodo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Guardar Calificaciones</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  showFeedback("exito", "Mesa de pre-examen finalizada y guardada.");
                  setActiveSesionId(null);
                }}
                className="flex-1 sm:flex-initial px-4 py-2 bg-[#0F3E86] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                <span>Finalizar Mesa</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            MODO 2: VISTA GENERAL DE FECHAS / MESAS Y HISTORIAL
           ========================================================================= */
        <div className="space-y-6">
          {/* Pestañas: Fechas / Mesas de Pre-Examen vs Historial de Evaluaciones */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit border border-slate-300/80">
            <button
              type="button"
              onClick={() => setActiveTab("mesas")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "mesas"
                  ? "bg-[#0F3E86] text-white shadow-md shadow-blue-950/20"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Fechas de Pre-Examen</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-slate-800">
                {sesiones.length}
              </span>
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
              <span>Historial de Evaluaciones</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-slate-800">
                {preExamenes.length}
              </span>
            </button>
          </div>

          {/* PESTAÑA A: LISTADO DE FECHAS / MESAS DE PRE-EXAMEN */}
          {activeTab === "mesas" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Mesas y Fechas de Pre-Examen
                  </h2>
                  <p className="text-xs text-slate-500">
                    Abrí una fecha, seleccioná los alumnos que van a rendir y calificalos en vivo con los botones semáforo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNuevaSesion}
                  className="px-4 py-2.5 rounded-xl bg-[#0F3E86] hover:bg-blue-900 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-blue-950/20 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 text-cyan-300" />
                  <span>Abrir Nueva Fecha de Pre-Examen</span>
                </button>
              </div>

              {sesiones.length === 0 ? (
                <div className="p-12 text-center bg-white border-2 border-slate-200 rounded-2xl space-y-3">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">
                    No hay fechas de pre-examen creadas todavía.
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Creá una nueva fecha para convocar a todos los alumnos que rendirán y calificar en vivo en una lista.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNuevaSesion}
                    className="px-4 py-2 bg-[#0F3E86] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer mt-2"
                  >
                    Abrir Primera Fecha de Pre-Examen
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sesiones.map((ses) => {
                    const totalAlumnos = ses.alumnos_ids.length;
                    // Contar cuántos están calificados en esta fecha
                    const calificadosCount = ses.alumnos_ids.filter((id) => {
                      const ev = preExamenes.find(
                        (p) =>
                          p.alumno_id === id &&
                          (p.sesion_id === ses.id || p.fecha === ses.fecha)
                      );
                      return Boolean(ev?.kihon_nota && ev?.kata_nota && ev?.kumite_nota);
                    }).length;

                    const isCompleto = totalAlumnos > 0 && calificadosCount === totalAlumnos;

                    return (
                      <div
                        key={ses.id}
                        className="p-5 bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl shadow-sm transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              {ses.fecha}
                            </span>

                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                isCompleto
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-900 border border-amber-200"
                              }`}
                            >
                              {isCompleto ? "Completado" : "En Curso"}
                            </span>
                          </div>

                          <h3 className="text-base font-black text-slate-900 tracking-tight">
                            {ses.titulo}
                          </h3>

                          <p className="text-xs text-slate-500">
                            Evaluador: <strong>{ses.profesor_nombre || "Sensei"}</strong>
                          </p>

                          {/* Alumnos y progreso */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              {totalAlumnos} alumnos convocados
                            </span>
                            <span className="text-slate-900">
                              {calificadosCount} de {totalAlumnos} calificados
                            </span>
                          </div>
                        </div>

                        {/* Botones de acción de la mesa */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setActiveSesionId(ses.id)}
                            className="flex-1 py-2 px-3 bg-[#0F3E86] hover:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <Award className="w-4 h-4 text-cyan-300" />
                            <span>Entrar a Calificar en Lista</span>
                          </button>

                          {currentUser.rol === "ADMIN" && (
                            <button
                              type="button"
                              onClick={() => setSesionParaEliminar(ses)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Eliminar mesa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA B: HISTORIAL COMPLETO DE EVALUACIONES */}
          {activeTab === "historial" && (
            <div className="space-y-4">
              <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Buscador */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por alumno, cinturón u observación..."
                      value={searchHistorial}
                      onChange={(e) => setSearchHistorial(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                    />
                  </div>

                  {/* Filtro Semáforo */}
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
                    <button
                      type="button"
                      onClick={() => setFiltroSemaforo("TODOS")}
                      className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                        filtroSemaforo === "TODOS"
                          ? "bg-[#0F3E86] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroSemaforo("VERDE")}
                      className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                        filtroSemaforo === "VERDE"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      🟢 Bueno
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroSemaforo("AMARILLO")}
                      className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                        filtroSemaforo === "AMARILLO"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      🟡 Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroSemaforo("ROJO")}
                      className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                        filtroSemaforo === "ROJO"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      🔴 A Mejorar
                    </button>
                  </div>
                </div>
              </div>

              {/* Listado de Evaluaciones */}
              {preExamenesHistorialFiltrados.length === 0 ? (
                <div className="p-12 text-center bg-white border-2 border-slate-200 rounded-2xl space-y-3">
                  <Award className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">
                    No hay evaluaciones registradas con los filtros actuales.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {preExamenesHistorialFiltrados.map((item) => {
                    const isAprobado = item.resultado_promedio === "VERDE";
                    const isRegular = item.resultado_promedio === "AMARILLO";
                    const alObj = alumnosMap.get(item.alumno_id);
                    const nombreAlumno =
                      item.alumno_nombre && item.alumno_nombre !== "Alumno"
                        ? item.alumno_nombre
                        : alObj
                        ? `${alObj.nombre} ${alObj.apellido}`.trim()
                        : "Alumno";

                    const iniciales =
                      nombreAlumno && nombreAlumno !== "Alumno"
                        ? nombreAlumno
                            .split(" ")
                            .filter(Boolean)
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "AL";

                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl shadow-sm transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Info Alumno */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0F3E86] text-cyan-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {iniciales}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 text-base">
                                  {nombreAlumno}
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
                              {item.resultado_score ? (
                                <span className="opacity-75 text-[10px] font-semibold">
                                  ({item.resultado_score.toFixed(2)})
                                </span>
                              ) : null}
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

                        {/* Desglose de las 3 Instancias */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <span className="font-bold text-slate-700">📜 Kata:</span>
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-md ${
                                item.kata_nota === "VERDE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.kata_nota === "AMARILLO"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.kata_nota || "—"}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <span className="font-bold text-slate-700">🥋 Kihon:</span>
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-md ${
                                item.kihon_nota === "VERDE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.kihon_nota === "AMARILLO"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.kihon_nota || "—"}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <span className="font-bold text-slate-700">🥊 Kumite:</span>
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-md ${
                                item.kumite_nota === "VERDE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.kumite_nota === "AMARILLO"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.kumite_nota || "—"}
                            </span>
                          </div>
                        </div>

                        {item.observaciones && (
                          <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-700 font-medium">
                            <span className="font-bold text-blue-900 block text-[10px] uppercase">
                              Observaciones Técnicas:
                            </span>
                            {item.observaciones}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: ABRIR NUEVA FECHA DE PRE-EXAMEN Y SELECCIONAR ALUMNOS
         ========================================================================= */}
      {isModalNuevaSesionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#0F3E86] text-white">
                  <Calendar className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Abrir Nueva Fecha de Pre-Examen
                  </h3>
                  <p className="text-xs text-slate-500">
                    Definí la fecha y seleccioná todos los alumnos que rendirán.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalNuevaSesionOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearSesionSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Fecha y Título */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Fecha del Pre-Examen:
                  </label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Título / Identificador (opcional):
                  </label>
                  <input
                    type="text"
                    value={nuevoTitulo}
                    onChange={(e) => setNuevoTitulo(e.target.value)}
                    placeholder={`ej: Pre-Examen ${nuevaFecha || hoyStr}`}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                  />
                </div>
              </div>

              {/* Selección de Alumnos Participantes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Seleccionar Alumnos que van a Rendir:</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-[#0F3E86]">
                      {selectedAlumnosIds.size} seleccionados
                    </span>
                  </label>

                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={handleSelectTodosVisibles}
                      className="text-blue-700 hover:underline cursor-pointer"
                    >
                      Seleccionar todos visibles
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleDeselectTodos}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Limpiar selección
                    </button>
                  </div>
                </div>

                {/* Filtros de búsqueda para alumnos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o apellido..."
                      value={searchModalAlumno}
                      onChange={(e) => setSearchModalAlumno(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                    />
                  </div>

                  <select
                    value={filtroCintoModal}
                    onChange={(e) => setFiltroCintoModal(e.target.value as KarateBelt | "TODOS")}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
                  >
                    <option value="TODOS">Todos los cinturones</option>
                    <option value="Blanco">Blanco</option>
                    <option value="Amarillo">Amarillo</option>
                    <option value="Naranja">Naranja</option>
                    <option value="Verde">Verde</option>
                    <option value="Violeta">Violeta</option>
                    <option value="Rojo">Rojo</option>
                    <option value="Marrón">Marrón</option>
                    <option value="Negro">Negro</option>
                  </select>
                </div>

                {/* Lista seleccionable de alumnos */}
                <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50 p-1">
                  {alumnosDisponiblesModal.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-medium">
                      No se encontraron alumnos con los filtros seleccionados.
                    </div>
                  ) : (
                    alumnosDisponiblesModal.map((a) => {
                      const isSelected = selectedAlumnosIds.has(a.id);
                      const proximo = getProximoGrado(a.cinturon_actual, a.subcategoria_actual);

                      return (
                        <div
                          key={a.id}
                          onClick={() => toggleSelectAlumno(a.id)}
                          className={`p-2.5 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-100/70 border border-blue-300"
                              : "hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer pointer-events-none"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-900 block truncate">
                                {a.nombre} {a.apellido}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {proximo ? `Postula para ${proximo.cinturon}` : "Graduación máxima"}
                              </span>
                            </div>
                          </div>

                          <BeltBadge belt={a.cinturon_actual} subcategoria={a.subcategoria_actual} size="sm" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Botón Submit */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalNuevaSesionOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || selectedAlumnosIds.size === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#0F3E86] hover:bg-blue-900 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-blue-950/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando Mesa...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4 text-cyan-300" />
                      <span>Crear Mesa y Calificar Alumnos ({selectedAlumnosIds.size})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SUMAR ALUMNOS A LA MESA EN CURSO
         ========================================================================= */}
      {isModalAgregarAlumnosOpen && activeSesion && (
        <ModalAgregarAlumnosMesa
          alumnos={alumnos}
          alumnosYaEnMesaIds={activeSesion.alumnos_ids}
          onClose={() => setIsModalAgregarAlumnosOpen(false)}
          onConfirm={handleAgregarAlumnosASesion}
        />
      )}

      {/* =========================================================================
          MODAL: CONFIRMACIÓN PARA ELIMINAR MESA DE PRE-EXAMEN
         ========================================================================= */}
      {sesionParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                ¿Eliminar mesa de pre-examen?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción eliminará la mesa <strong>{sesionParaEliminar.titulo}</strong> con fecha{" "}
              <strong>{sesionParaEliminar.fecha}</strong> y todas las evaluaciones vinculadas. Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSesionParaEliminar(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminarSesion}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                {isPending ? "Eliminando..." : "Sí, eliminar mesa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRMACIÓN PARA ELIMINAR EVALUACIÓN INDIVIDUAL
         ========================================================================= */}
      {preExamenParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                ¿Eliminar registro de pre-examen?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción eliminará la evaluación del alumno{" "}
              <strong>
                {preExamenParaEliminar.alumno_nombre && preExamenParaEliminar.alumno_nombre !== "Alumno"
                  ? preExamenParaEliminar.alumno_nombre
                  : alumnosMap.get(preExamenParaEliminar.alumno_id)
                  ? `${alumnosMap.get(preExamenParaEliminar.alumno_id)!.nombre} ${alumnosMap.get(preExamenParaEliminar.alumno_id)!.apellido}`.trim()
                  : "Alumno"}
              </strong>{" "}
              con fecha <strong>{preExamenParaEliminar.fecha}</strong>. Esta acción no se puede deshacer.
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
                onClick={() => {
                  if (!preExamenParaEliminar) return;
                  const { id } = preExamenParaEliminar;
                  startTransition(async () => {
                    const res = await eliminarPreExamenAction(id);
                    if (res.success) {
                      setPreExamenes((prev) => prev.filter((p) => p.id !== id));
                      setPreExamenParaEliminar(null);
                      showFeedback("exito", "Evaluación eliminada correctamente.");
                    } else {
                      showFeedback("error", res.error || "Error al eliminar.");
                    }
                  });
                }}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                {isPending ? "Eliminando..." : "Sí, eliminar registro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini-Componente Modal para Sumar Alumnos a una Mesa en curso
function ModalAgregarAlumnosMesa({
  alumnos,
  alumnosYaEnMesaIds,
  onClose,
  onConfirm,
}: {
  alumnos: Alumno[];
  alumnosYaEnMesaIds: string[];
  onClose: () => void;
  onConfirm: (alumnosIds: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const alumnosDisponibles = useMemo(() => {
    return alumnos
      .filter((a) => !alumnosYaEnMesaIds.includes(a.id))
      .filter((a) =>
        !search.trim() ||
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(search.toLowerCase().trim())
      );
  }, [alumnos, alumnosYaEnMesaIds, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Sumar Alumnos a la Mesa
            </h3>
            <p className="text-xs text-slate-500">
              Seleccioná los alumnos para incorporarlos a la lista de esta mesa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o apellido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F3E86]"
          />
        </div>

        <div className="border border-slate-200 rounded-xl flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
          {alumnosDisponibles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-medium">
              No hay más alumnos disponibles para agregar.
            </div>
          ) : (
            alumnosDisponibles.map((a) => {
              const isSelected = selectedIds.has(a.id);
              return (
                <div
                  key={a.id}
                  onClick={() => toggleSelect(a.id)}
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-100/70 border border-blue-300" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer pointer-events-none"
                    />
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {a.nombre} {a.apellido}
                    </span>
                  </div>
                  <BeltBadge belt={a.cinturon_actual} subcategoria={a.subcategoria_actual} size="sm" />
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 rounded-xl bg-[#0F3E86] hover:bg-blue-900 text-white font-bold text-xs shadow-md shadow-blue-950/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
