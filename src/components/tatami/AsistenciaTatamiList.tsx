"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AsistenciaTatamiListProps {
  clase: Clase;
  initialSesion: SesionClase | null;
  initialItems: AlumnoSesionItem[];
  isAdmin: boolean;
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
}: AsistenciaTatamiListProps) {
  const [sesion, setSesion] = useState<SesionClase | null>(initialSesion);
  const [items, setItems] = useState<AlumnoSesionItem[]>(initialItems);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<"recuperacion" | "inscribir" | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Helper para haptic feedback en dispositivos táctiles
  const triggerHaptic = useCallback((type: "tap" | "success" | "warn") => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      if (type === "tap") navigator.vibrate(30);
      else if (type === "success") navigator.vibrate([40, 60, 40]);
      else if (type === "warn") navigator.vibrate([100, 50, 100]);
    }
  }, []);

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

  // Callback cuando se inscribe un alumno rápido
  const handleAlumnoInscripto = (nuevoAlumno: {
    id: string;
    nombre: string;
    apellido: string;
    cinturon_actual: KarateBelt;
    telefono_contacto: string;
    contacto_emergencia: string;
  }) => {
    const item: AlumnoSesionItem = {
      alumno: {
        id: nuevoAlumno.id,
        nombre: nuevoAlumno.nombre,
        apellido: nuevoAlumno.apellido,
        fecha_nacimiento: "2015-01-01",
        telefono_contacto: nuevoAlumno.telefono_contacto,
        contacto_emergencia: nuevoAlumno.contacto_emergencia,
        cinturon_actual: nuevoAlumno.cinturon_actual,
        estado: "ACTIVO",
        notas_privadas: null,
        created_at: new Date().toISOString(),
      },
      estado: "PRESENTE",
      es_recuperacion: false,
      marcado_en: new Date().toISOString(),
      clases_en_cinturon: 1,
    };

    setItems((prev) => [...prev, item]);

    // Marcar presente en la sesión si está abierta
    if (sesion) {
      marcarAsistenciaAction(sesion.id, nuevoAlumno.id, "PRESENTE", false);
    }

    triggerHaptic("success");
    setBannerNotice(`${nuevoAlumno.nombre} inscripto y marcado presente.`);
    setTimeout(() => setBannerNotice(null), 3000);
  };

  // Cálculos de resumen
  const presentesCount = items.filter(
    (i) => i.estado === "PRESENTE" || i.estado === "TARDE"
  ).length;
  const ausentesCount = items.filter((i) => i.estado === "AUSENTE").length;
  const recuperacionesCount = items.filter((i) => i.es_recuperacion).length;
  const totalCount = items.length;

  return (
    <div className="space-y-4 pb-20">
      {/* Banner de Estado de Conexión & Sincronización Tatami */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors bg-slate-900 border-slate-800">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-4 h-4" />
              <span>Tatami Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <WifiOff className="w-4 h-4" />
              <span>Modo Offline (Tatami Local Activo)</span>
            </span>
          )}
        </div>

        {offlinePendingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-md border border-amber-800/60 font-mono">
              {offlinePendingCount} pendientes
            </span>
            {isOnline && (
              <button
                onClick={syncOfflineQueue}
                disabled={isSyncing}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded-md text-[11px] touch-target-safe cursor-pointer"
              >
                <RefreshCw
                  className={cn("w-3 h-3", isSyncing && "animate-spin")}
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
        <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shadow-lg">
            <Flame className="w-8 h-8 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {clase.nombre}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Sesión del día no iniciada todavía.
            </p>
          </div>

          <button
            onClick={handleIniciarClase}
            disabled={isPending}
            className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-base rounded-2xl shadow-xl shadow-red-950/60 border border-red-500/40 flex items-center justify-center gap-3 transition-transform active:scale-95 touch-target-safe cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>INICIAR CLASE EN TATAMI</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header de la Sesión en curso */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                      sesion.estado === "ABIERTA"
                        ? "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        sesion.estado === "ABIERTA"
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-slate-400"
                      )}
                    />
                    {sesion.estado === "ABIERTA" ? "Sesión Activa" : "Finalizada"}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {sesion.fecha}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-white tracking-tight mt-1">
                  {clase.nombre}
                </h1>
              </div>

              {sesion.estado === "ABIERTA" && (
                <button
                  onClick={handleFinalizarClase}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors touch-target-safe cursor-pointer"
                >
                  Finalizar Clase
                </button>
              )}
            </div>

            {/* Marcadores de Asistencia en Tiempo Real */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">
                  Total
                </span>
                <span className="text-base font-bold text-white">
                  {totalCount}
                </span>
              </div>
              <div className="p-2 bg-emerald-950/40 rounded-xl border border-emerald-900/50">
                <span className="block text-[10px] text-emerald-400 uppercase font-medium">
                  Presentes
                </span>
                <span className="text-base font-bold text-emerald-300">
                  {presentesCount}
                </span>
              </div>
              <div className="p-2 bg-red-950/30 rounded-xl border border-red-900/40">
                <span className="block text-[10px] text-red-400 uppercase font-medium">
                  Ausentes
                </span>
                <span className="text-base font-bold text-red-300">
                  {ausentesCount}
                </span>
              </div>
              <div className="p-2 bg-amber-950/30 rounded-xl border border-amber-900/40">
                <span className="block text-[10px] text-amber-400 uppercase font-medium">
                  Recup.
                </span>
                <span className="text-base font-bold text-amber-300">
                  {recuperacionesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción Rápida en Tatami (Mobile First) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setActiveModal("recuperacion")}
              className="py-3 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm touch-target-safe cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-red-400" />
              <span>+ Alumno Recuperación</span>
            </button>
            <button
              onClick={() => setActiveModal("inscribir")}
              className="py-3 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm touch-target-safe cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>+ Inscribir Alumno</span>
            </button>
          </div>

          {/* Lista Táctil de Alumnos para Tomar Asistencia */}
          <div className="space-y-2.5" role="list" aria-label="Lista de alumnos en clase">
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 text-sm">
                No hay alumnos inscriptos en esta clase aún. Toca "+ Inscribir Alumno" para sumar el primero.
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
                      "p-3.5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md",
                      isPresente &&
                        "bg-slate-900/90 border-emerald-800/80 shadow-emerald-950/20",
                      isAusente &&
                        "bg-slate-900/50 border-slate-800/80 opacity-85",
                      isTarde &&
                        "bg-slate-900/90 border-amber-800/80 shadow-amber-950/20"
                    )}
                  >
                    {/* Info Alumno */}
                    <div className="flex items-center gap-3">
                      {/* Avatar / Iniciales */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border",
                          isPresente
                            ? "bg-emerald-950 text-emerald-300 border-emerald-700/60"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        )}
                      >
                        {item.alumno.nombre[0]}
                        {item.alumno.apellido[0]}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm tracking-tight">
                            {item.alumno.nombre} {item.alumno.apellido}
                          </span>

                          <BeltBadge
                            belt={item.alumno.cinturon_actual}
                            size="sm"
                          />

                          {item.es_recuperacion && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800">
                              Recuperación
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {item.clases_en_cinturon !== undefined && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Award className="w-3 h-3 text-amber-400" />
                              <span>{item.clases_en_cinturon} clases en cinto</span>
                            </span>
                          )}

                          <a
                            href={`tel:${item.alumno.telefono_contacto}`}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                            title="Llamar contacto"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{item.alumno.telefono_contacto}</span>
                          </a>
                        </div>

                        {/* Notas privadas (solo visible si es ADMIN) */}
                        {isAdmin && item.alumno.notas_privadas && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50 mt-1">
                            <ShieldAlert className="w-3 h-3 shrink-0" />
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
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950 scale-102"
                            : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
                          "px-2.5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1 transition-all touch-target-safe cursor-pointer",
                          isTarde
                            ? "bg-amber-600 text-white shadow-md shadow-amber-950"
                            : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
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
                          "px-3 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1 transition-all touch-target-safe cursor-pointer",
                          isAusente
                            ? "bg-red-950/80 text-red-300 border border-red-800"
                            : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
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
            onAlumnoInscripto={handleAlumnoInscripto}
          />
        </>
      )}
    </div>
  );
}
