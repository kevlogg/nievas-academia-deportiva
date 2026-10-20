"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Alumno,
  AlumnoSesionItem,
  AsistenciaEstado,
  Clase,
  KarateBelt,
  SesionClase,
} from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { ModalRecuperacion } from "@/components/tatami/ModalRecuperacion";
import { ModalInscribirAlumno } from "@/components/tatami/ModalInscribirAlumno";
import {
  finalizarSesionClaseAction,
  iniciarSesionClaseAction,
  marcarAsistenciaAction,
  sincronizarAsistenciasOfflineAction,
  guardarAsistenciaSesionCompletaAction,
} from "@/lib/actions/asistencia.actions";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  UserCheck,
  Wifi,
  WifiOff,
  Flame,
  Award,
  RefreshCw,
  Phone,
  ShieldAlert,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AsistenciaTatamiListProps {
  clase: Clase;
  initialSesion: SesionClase | null;
  initialItems: AlumnoSesionItem[];
  isAdmin: boolean;
  alumnosDisponibles?: Alumno[];
}

interface OfflineQueueItem {
  sesionId: string;
  alumnoId: string;
  estado: AsistenciaEstado;
  esRecuperacion: boolean;
  timestamp: number;
}

const STORAGE_QUEUE_KEY = "nievas_tatami_offline_queue";

export function AsistenciaTatamiList({
  clase,
  initialSesion,
  initialItems,
  isAdmin,
  alumnosDisponibles = [],
}: AsistenciaTatamiListProps) {
  const [sesion, setSesion] = useState<SesionClase | null>(initialSesion);
  const [items, setItems] = useState<AlumnoSesionItem[]>(initialItems);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<"recuperacion" | "inscribir" | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);

  // Helper para haptic feedback en dispositivos táctiles
  const triggerHaptic = useCallback((type: "tap" | "success" | "warn") => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      if (type === "tap") navigator.vibrate(30);
      else if (type === "success") navigator.vibrate([40, 60, 40]);
      else if (type === "warn") navigator.vibrate([100, 50, 100]);
    }
  }, []);

  // Guardar cambios masivos y explícitos en Supabase
  const handleGuardarCambios = async (volverAClases: boolean = false) => {
    if (!sesion) return;
    setIsSaving(true);
    triggerHaptic("tap");

    try {
      const payload = items.map((it) => ({
        alumnoId: it.alumno.id,
        estado: it.estado,
        esRecuperacion: it.es_recuperacion,
      }));

      const res = await guardarAsistenciaSesionCompletaAction(sesion.id, payload);
      if (res.success) {
        setHasPendingChanges(false);
        triggerHaptic("success");
        setBannerNotice("¡Asistencia guardada y confirmada con éxito en la base de datos!");
        setTimeout(() => setBannerNotice(null), 4000);

        if (volverAClases) {
          const isKiosk = typeof window !== "undefined" && localStorage.getItem("nievas_kiosk_mode") === "true";
          router.push(isKiosk ? "/terminal" : "/profesor/clases");
          router.refresh();
        } else {
          router.refresh();
        }
      } else {
        alert(res.error || "No se pudo guardar la asistencia");
      }
    } catch {
      alert("Error al conectar con el servidor para guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  // Sincronizar cola offline con el servidor
  const syncOfflineQueue = useCallback(async () => {
    if (typeof window === "undefined") return;
    const rawQueue = localStorage.getItem(STORAGE_QUEUE_KEY);
    if (!rawQueue) return;

    try {
      const queue: OfflineQueueItem[] = JSON.parse(rawQueue);
      if (queue.length === 0) return;

      setIsSyncing(true);
      const res = await sincronizarAsistenciasOfflineAction(queue);
      if (res.success) {
        localStorage.removeItem(STORAGE_QUEUE_KEY);
        setOfflinePendingCount(0);
        setBannerNotice(`¡Sincronizadas ${res.data.totalSincronizadas} asistencias offline!`);
        setTimeout(() => setBannerNotice(null), 4000);
      }
    } catch {
      // Ignorar si aún no hay conexión
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Monitorizar estado de red
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Contar pendientes al montar
    const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setOfflinePendingCount(parsed.length);
      } catch {}
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineQueue]);

  // Iniciar clase del día
  const handleIniciarClase = () => {
    triggerHaptic("success");
    startTransition(async () => {
      const res = await iniciarSesionClaseAction(clase.id);
      if (res.success) {
        setSesion({
          id: res.data.sesionId,
          clase_id: clase.id,
          profesor_id: clase.profesor_id,
          fecha: new Date().toISOString().split("T")[0],
          hora_apertura: new Date().toISOString(),
          estado: "ABIERTA",
          observaciones: "",
          created_at: new Date().toISOString(),
          clase_nombre: clase.nombre,
        });
        setBannerNotice("¡Clase iniciada en el tatami! Puedes tomar lista.");
        setTimeout(() => setBannerNotice(null), 3000);
      }
    });
  };

  // Finalizar clase
  const handleFinalizarClase = () => {
    if (!sesion) return;
    const confirmClose = window.confirm(
      "¿Deseas finalizar la sesión de tatami? Quedará registrada la asistencia actual."
    );
    if (!confirmClose) return;

    triggerHaptic("warn");
    startTransition(async () => {
      const res = await finalizarSesionClaseAction(sesion.id);
      if (res.success) {
        setSesion({ ...sesion, estado: "FINALIZADA" });
        setBannerNotice("Clase finalizada con éxito.");
        setTimeout(() => setBannerNotice(null), 4000);
      }
    });
  };

  // 1-Tap Toggle de Asistencia con actualización optimista y soporte offline
  const handleToggleEstado = (
    alumnoId: string,
    targetEstado: AsistenciaEstado,
    esRecuperacion: boolean = false
  ) => {
    if (!sesion) return;

    triggerHaptic("tap");
    setHasPendingChanges(true);

    // 1. Actualización optimista inmediata en UI
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.alumno.id === alumnoId) {
          return {
            ...item,
            estado: targetEstado,
            marcado_en: new Date().toISOString(),
          };
        }
        return item;
      })
    );

    // 2. Si estamos sin conexión, guardar en cola local
    if (!navigator.onLine) {
      try {
        const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
        const queue: OfflineQueueItem[] = raw ? JSON.parse(raw) : [];

        // Reemplazar si ya estaba en cola
        const filtered = queue.filter(
          (q) => !(q.sesionId === sesion.id && q.alumnoId === alumnoId)
        );
        filtered.push({
          sesionId: sesion.id,
          alumnoId,
          estado: targetEstado,
          esRecuperacion,
          timestamp: Date.now(),
        });

        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(filtered));
        setOfflinePendingCount(filtered.length);
      } catch {}
      return;
    }

    // 3. Enviar al servidor via Server Action
    startTransition(async () => {
      try {
        const res = await marcarAsistenciaAction(
          sesion.id,
          alumnoId,
          targetEstado,
          esRecuperacion
        );

        if (!res.success) {
          // Revertir si hubo error
          console.error(res.error);
        }
      } catch {
        // En caso de caída de conexión silenciosa, guardar en cola
        const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
        const queue: OfflineQueueItem[] = raw ? JSON.parse(raw) : [];
        queue.push({
          sesionId: sesion.id,
          alumnoId,
          estado: targetEstado,
          esRecuperacion,
          timestamp: Date.now(),
        });
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
        setOfflinePendingCount(queue.length);
      }
    });
  };

  // Callback cuando se agrega un alumno de recuperación
  const handleAlumnoRecuperacionAgregado = (alumno: Alumno) => {
    setItems((prev) => [
      ...prev,
      {
        alumno,
        estado: "PRESENTE",
        es_recuperacion: true,
        marcado_en: new Date().toISOString(),
        clases_en_cinturon: 1,
      },
    ]);
    triggerHaptic("success");
    setBannerNotice(`${alumno.nombre} agregado como recuperación.`);
    setTimeout(() => setBannerNotice(null), 3000);
  };

  // Callback cuando se inscribe o suma un alumno (existente o nuevo)
  const handleAlumnoInscripto = (nuevoAlumno: Alumno) => {
    const item: AlumnoSesionItem = {
      alumno: nuevoAlumno,
      estado: "PRESENTE",
      es_recuperacion: false,
      marcado_en: new Date().toISOString(),
      clases_en_cinturon: 1,
    };

    setItems((prev) => {
      const filtered = prev.filter((it) => it.alumno.id !== nuevoAlumno.id);
      return [...filtered, item];
    });

    triggerHaptic("success");
    setBannerNotice(`¡${nuevoAlumno.nombre} ${nuevoAlumno.apellido} sumado a la clase y marcado PRESENTE!`);
    setTimeout(() => setBannerNotice(null), 3500);
  };

  // Cálculos de resumen
  const presentesCount = items.filter(
    (i) => i.estado === "PRESENTE" || i.estado === "TARDE"
  ).length;
  const tardesCount = items.filter((i) => i.estado === "TARDE").length;
  const ausentesCount = items.filter((i) => i.estado === "AUSENTE").length;
  const recuperacionesCount = items.filter((i) => i.es_recuperacion).length;
  const totalCount = items.length;

  return (
    <div className="space-y-4 pb-20">
      {/* Banner de Estado de Conexión & Sincronización Tatami */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors bg-[#0F3E86] border-[#1E57A8] text-white shadow-md shadow-blue-950/20">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>Tatami Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <WifiOff className="w-4 h-4 text-amber-400" />
              <span>Modo Offline (Tatami Local Activo)</span>
            </span>
          )}
        </div>

        {offlinePendingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="bg-[#0A2E65] text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-500/40 font-mono text-[11px]">
              {offlinePendingCount} pendientes
            </span>
            {isOnline && (
              <button
                onClick={syncOfflineQueue}
                disabled={isSyncing}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md text-[11px] touch-target-safe cursor-pointer transition-colors"
              >
                <RefreshCw
                  className={cn("w-3 h-3 text-cyan-300", isSyncing && "animate-spin")}
                />
                <span>Sincronizar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {bannerNotice && (
        <div className="p-3 bg-red-950/90 border border-red-800 rounded-xl text-xs text-white flex items-center justify-between animate-in fade-in duration-200">
          <span className="font-medium">{bannerNotice}</span>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Principal: Iniciar Clase o Sesión Activa */}
      {!sesion ? (
        <div className="p-6 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl text-center space-y-4 shadow-xl shadow-blue-950/20">
          <div className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-white border-2 border-white/20 shadow-md shadow-blue-950/20">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest bg-white/10 px-2.5 py-0.5 rounded-md border border-white/20">
              Apertura de Tatami
            </span>
            <h2 className="text-xl font-black text-white tracking-tight mt-2">
              {clase.nombre}
            </h2>
            <p className="text-xs text-blue-200 mt-1 font-medium">
              Sesión del día no iniciada todavía. Inicia la clase para comenzar a marcar asistencia.
            </p>
          </div>

          <button
            onClick={handleIniciarClase}
            disabled={isPending}
            className="w-full py-4 px-6 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-base rounded-2xl shadow-xl shadow-blue-950/30 flex items-center justify-center gap-3 transition-transform active:scale-98 touch-target-safe cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current text-[#0F3E86]" />
            <span>INICIAR CLASE EN TATAMI</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header de la Sesión en curso - Compacto y de Menor Altura */}
          <div className="p-3.5 sm:p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/20 space-y-2.5">
            {/* Fila 1: Título, estado y botón finalizar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                    sesion.estado === "ABIERTA"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : "bg-white/10 text-blue-200 border border-white/20"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      sesion.estado === "ABIERTA"
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-blue-300"
                    )}
                  />
                  {sesion.estado === "ABIERTA" ? "Sesión Activa" : "Finalizada"}
                </span>

                <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  {clase.nombre}
                </h1>

                <span className="hidden md:inline-block text-xs text-blue-200 font-semibold shrink-0">
                  • {sesion.fecha}
                </span>
              </div>

              {sesion.estado === "ABIERTA" ? (
                <button
                  onClick={handleFinalizarClase}
                  disabled={isPending}
                  className="self-end sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-rose-500/20 text-rose-200 hover:text-white text-xs font-bold rounded-xl border border-white/20 hover:border-rose-400/40 transition-colors touch-target-safe cursor-pointer shrink-0"
                >
                  Finalizar Clase
                </button>
              ) : (
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleGuardarCambios(false)}
                    disabled={isPending || isSaving}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-black rounded-xl border transition-all active:scale-95 touch-target-safe cursor-pointer flex items-center gap-1.5 shadow-sm",
                      hasPendingChanges
                        ? "bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-300 animate-pulse"
                        : "bg-white/15 hover:bg-white/25 text-white border-white/30"
                    )}
                    title="Guardar cambios de asistencia"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSaving ? "Guardando..." : "Guardar Cambios"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Fila 2: Marcadores compactos de asistencia + Botones de acción rápida integrados */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
              {/* Marcadores compactos en pastillas horizontales */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                <span className="bg-[#0A2E65] border border-[#2056A8] px-2.5 py-1 rounded-lg text-white font-bold flex items-center gap-1.5">
                  <span className="text-[10px] text-blue-200 uppercase font-semibold">Total:</span>
                  <span className="font-mono text-sm">{totalCount}</span>
                </span>

                <span className="bg-[#0A2E65] border border-emerald-500/40 px-2.5 py-1 rounded-lg text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{presentesCount}</span>
                  <span className="text-[11px] text-emerald-400/80 font-normal hidden xs:inline">presentes</span>
                  {tardesCount > 0 && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 flex items-center gap-0.5 font-bold">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{tardesCount} tarde</span>
                    </span>
                  )}
                </span>

                <span className="bg-[#0A2E65] border border-rose-500/40 px-2.5 py-1 rounded-lg text-rose-300 font-bold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{ausentesCount}</span>
                  <span className="text-[11px] text-rose-400/80 font-normal hidden xs:inline">ausentes</span>
                </span>

                <span className="bg-[#0A2E65] border border-amber-500/40 px-2.5 py-1 rounded-lg text-amber-300 font-bold flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold">Recup:</span>
                  <span className="font-mono text-sm">{recuperacionesCount}</span>
                </span>
              </div>

              {/* Botones de acción rápida integrados compactos */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModal("recuperacion")}
                  className="py-1.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm touch-target-safe cursor-pointer transition-all active:scale-98"
                  title="Agregar alumno de recuperación"
                >
                  <UserPlus className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="hidden sm:inline">+ Recuperación</span>
                  <span className="sm:hidden">+ Recup.</span>
                </button>

                <button
                  onClick={() => setActiveModal("inscribir")}
                  className="py-1.5 px-3 bg-white hover:bg-blue-50 border border-white rounded-xl text-xs font-black text-[#0F3E86] flex items-center gap-1.5 shadow-sm touch-target-safe cursor-pointer transition-all active:scale-98"
                  title="Inscribir nuevo alumno"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#0F3E86]" />
                  <span>+ Inscribir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lista Táctil de Alumnos para Tomar Asistencia */}
          <div className="space-y-2.5" role="list" aria-label="Lista de alumnos en clase">
            {items.length === 0 ? (
              <div className="p-8 text-center text-blue-200 bg-[#0F3E86] rounded-2xl border-2 border-dashed border-[#1E57A8] text-sm font-medium shadow-md">
                No hay alumnos inscriptos en esta clase aún. Toca &quot;+ Inscribir Alumno&quot; para sumar el primero.
              </div>
            ) : (
              items.map((item) => {
                const isPresente = item.estado === "PRESENTE";
                const isAusente = item.estado === "AUSENTE";
                const isTarde = item.estado === "TARDE";

                return (
                  <div
                    key={item.alumno.id}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl bg-[#0F3E86] text-white",
                      isPresente &&
                        "border-emerald-400 ring-1 ring-emerald-400/40 shadow-emerald-950/20",
                      isAusente &&
                        "border-[#1E57A8] opacity-80",
                      isTarde &&
                        "border-amber-400 ring-1 ring-amber-400/40 shadow-amber-950/20"
                    )}
                  >
                    {/* Info Alumno */}
                    <div className="flex items-center gap-3">
                      {/* Avatar / Iniciales */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border",
                          isPresente
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                            : isTarde
                            ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                            : "bg-white/10 text-cyan-200 border-white/20"
                        )}
                      >
                        {item.alumno.nombre[0]}
                        {item.alumno.apellido[0]}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-base tracking-tight">
                            {item.alumno.nombre} {item.alumno.apellido}
                          </span>

                          <BeltBadge
                            belt={item.alumno.cinturon_actual}
                            size="sm"
                          />

                          {item.es_recuperacion && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40">
                              Recuperación
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-blue-200 font-medium">
                          {item.clases_en_cinturon !== undefined && (
                            <span className="flex items-center gap-1 text-blue-100">
                              <Award className="w-3.5 h-3.5 text-amber-400" />
                              <span>{item.clases_en_cinturon} clases en cinto</span>
                            </span>
                          )}

                          <a
                            href={`tel:${item.alumno.telefono_contacto}`}
                            className="flex items-center gap-1 text-cyan-300 hover:text-white transition-colors"
                            title="Llamar contacto"
                          >
                            <Phone className="w-3.5 h-3.5 text-cyan-300" />
                            <span>{item.alumno.telefono_contacto}</span>
                          </a>
                        </div>

                        {/* Notas privadas (solo visible si es ADMIN) */}
                        {isAdmin && item.alumno.notas_privadas && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-200 font-medium bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-400/30 mt-1">
                            <ShieldAlert className="w-3 h-3 shrink-0 text-amber-400" />
                            <span className="truncate max-w-[260px]">
                              Nota: {item.alumno.notas_privadas}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones Táctiles de 1-Tap (min-h 48px para dedos en tatami) */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() =>
                          handleToggleEstado(
                            item.alumno.id,
                            "PRESENTE",
                            item.es_recuperacion
                          )
                        }
                        className={cn(
                          "px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all touch-target-safe cursor-pointer",
                          isPresente
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40 scale-102"
                            : "bg-white/10 text-blue-100 border border-white/20 hover:bg-emerald-600/30 hover:text-emerald-300 hover:border-emerald-400/50"
                        )}
                        aria-pressed={isPresente}
                        title="Marcar Presente"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Presente</span>
                      </button>

                      <button
                        onClick={() =>
                          handleToggleEstado(
                            item.alumno.id,
                            "TARDE",
                            item.es_recuperacion
                          )
                        }
                        className={cn(
                          "px-2.5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all touch-target-safe cursor-pointer",
                          isTarde
                            ? "bg-amber-500 text-white shadow-md shadow-amber-950/40 scale-102"
                            : "bg-white/10 text-blue-100 border border-white/20 hover:bg-amber-500/30 hover:text-amber-300 hover:border-amber-400/50"
                        )}
                        aria-pressed={isTarde}
                        title="Marcar Tarde"
                      >
                        <Clock className="w-4 h-4" />
                        <span className="hidden sm:inline">Tarde</span>
                      </button>

                      <button
                        onClick={() =>
                          handleToggleEstado(
                            item.alumno.id,
                            "AUSENTE",
                            item.es_recuperacion
                          )
                        }
                        className={cn(
                          "px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all touch-target-safe cursor-pointer",
                          isAusente
                            ? "bg-rose-600 text-white shadow-md shadow-rose-950/40 scale-102"
                            : "bg-white/10 text-blue-100 border border-white/20 hover:bg-rose-600/30 hover:text-rose-300 hover:border-rose-400/50"
                        )}
                        aria-pressed={isAusente}
                        title="Marcar Ausente"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Ausente</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Barra Inferior Destacada de Guardar Cambios para Sesiones Finalizadas */}
          {sesion && sesion.estado === "FINALIZADA" && (
            <div className="sticky bottom-4 z-30 p-4 bg-[#0A2E65] text-white border-2 border-emerald-400/60 rounded-2xl shadow-2xl shadow-blue-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">
                  <Save className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Registro de Clase Cerrada</span>
                    {hasPendingChanges && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">
                        Cambios pendientes
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-blue-200">
                    Guarda la información editada para sincronizarla en el historial y base de datos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleGuardarCambios(false)}
                  disabled={isPending || isSaving}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/40 border border-emerald-300 flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSaving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}</span>
                </button>

                <button
                  onClick={() => handleGuardarCambios(true)}
                  disabled={isPending || isSaving}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-blue-50 active:scale-95 text-[#0F3E86] font-black text-xs rounded-xl shadow-lg border border-white flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer"
                >
                  <span>GUARDAR Y SALIR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {sesion && (
        <>
          <ModalRecuperacion
            isOpen={activeModal === "recuperacion"}
            onClose={() => setActiveModal(null)}
            sesionId={sesion.id}
            onAlumnoAgregado={handleAlumnoRecuperacionAgregado}
          />
          <ModalInscribirAlumno
            isOpen={activeModal === "inscribir"}
            onClose={() => setActiveModal(null)}
            claseId={clase.id}
            claseNombre={clase.nombre}
            sesionId={sesion.id}
            alumnosDisponibles={alumnosDisponibles}
            onAlumnoInscripto={handleAlumnoInscripto}
          />
        </>
      )}
    </div>
  );
}
