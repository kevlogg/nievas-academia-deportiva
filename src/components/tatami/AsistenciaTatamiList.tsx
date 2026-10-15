"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Image from "next/image";
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
        <div className="p-6 bg-white border-2 border-blue-200 rounded-3xl text-center space-y-4 shadow-xl text-blue-950">
          <div className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-[#154495] border-2 border-blue-400/60 shadow-md shadow-blue-950/20">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#154495] uppercase tracking-widest bg-blue-100 px-2.5 py-0.5 rounded border border-blue-200">
              Apertura de Tatami
            </span>
            <h2 className="text-xl font-black text-blue-950 tracking-tight mt-1.5">
              {clase.nombre}
            </h2>
            <p className="text-xs text-blue-700 mt-0.5 font-medium">
              Sesión del día no iniciada todavía. Inicia la clase para comenzar a marcar asistencia.
            </p>
          </div>

          <button
            onClick={handleIniciarClase}
            disabled={isPending}
            className="w-full py-4 px-6 bg-[#154495] hover:bg-blue-800 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-blue-950/20 flex items-center justify-center gap-3 transition-transform active:scale-98 touch-target-safe cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current text-blue-200" />
            <span>INICIAR CLASE EN TATAMI</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header de la Sesión en curso */}
          <div className="p-5 bg-white border-2 border-blue-200 rounded-3xl space-y-3 shadow-md text-blue-950">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                      sesion.estado === "ABIERTA"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-slate-100 text-slate-700 border border-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        sesion.estado === "ABIERTA"
                          ? "bg-emerald-600 animate-pulse"
                          : "bg-slate-400"
                      )}
                    />
                    {sesion.estado === "ABIERTA" ? "Sesión Activa" : "Finalizada"}
                  </span>
                  <span className="text-xs text-blue-700 font-semibold">
                    {sesion.fecha}
                  </span>
                </div>
                <h1 className="text-xl font-black text-blue-950 tracking-tight mt-1">
                  {clase.nombre}
                </h1>
              </div>

              {sesion.estado === "ABIERTA" && (
                <button
                  onClick={handleFinalizarClase}
                  disabled={isPending}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#154495] text-xs font-bold rounded-xl border border-blue-200 transition-colors touch-target-safe cursor-pointer"
                >
                  Finalizar Clase
                </button>
              )}
            </div>

            {/* Marcadores de Asistencia en Tiempo Real */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-blue-100 text-center">
              <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200">
                <span className="block text-[10px] text-blue-700 uppercase font-bold">
                  Total
                </span>
                <span className="text-base font-black text-blue-950">
                  {totalCount}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="block text-[10px] text-emerald-700 uppercase font-bold">
                  Presentes
                </span>
                <span className="text-base font-black text-emerald-800">
                  {presentesCount}
                </span>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <span className="block text-[10px] text-rose-700 uppercase font-bold">
                  Ausentes
                </span>
                <span className="text-base font-black text-rose-800">
                  {ausentesCount}
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="block text-[10px] text-amber-700 uppercase font-bold">
                  Recup.
                </span>
                <span className="text-base font-black text-amber-800">
                  {recuperacionesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción Rápida en Tatami (Mobile First) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setActiveModal("recuperacion")}
              className="py-3 px-3.5 bg-white hover:bg-blue-50 border-2 border-blue-200 rounded-2xl text-xs font-bold text-[#154495] flex items-center justify-center gap-2 shadow-sm touch-target-safe cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4 text-[#154495]" />
              <span>+ Alumno Recuperación</span>
            </button>
            <button
              onClick={() => setActiveModal("inscribir")}
              className="py-3 px-3.5 bg-white hover:bg-blue-50 border-2 border-blue-200 rounded-2xl text-xs font-bold text-[#154495] flex items-center justify-center gap-2 shadow-sm touch-target-safe cursor-pointer transition-colors"
            >
              <UserCheck className="w-4 h-4 text-[#154495]" />
              <span>+ Inscribir Alumno</span>
            </button>
          </div>

          {/* Lista Táctil de Alumnos para Tomar Asistencia */}
          <div className="space-y-2.5" role="list" aria-label="Lista de alumnos en clase">
            {items.length === 0 ? (
              <div className="p-8 text-center text-blue-700 bg-white rounded-2xl border-2 border-dashed border-blue-200 text-sm font-medium">
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
                      "p-4 rounded-2xl border-2 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-blue-950/5",
                      isPresente &&
                        "bg-white border-emerald-500 ring-2 ring-emerald-500/20",
                      isAusente &&
                        "bg-slate-50 border-slate-200 opacity-90",
                      isTarde &&
                        "bg-white border-amber-400 ring-2 ring-amber-400/20"
                    )}
                  >
                    {/* Info Alumno */}
                    <div className="flex items-center gap-3">
                      {/* Avatar / Iniciales */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border",
                          isPresente
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-blue-100 text-[#154495] border-blue-200"
                        )}
                      >
                        {item.alumno.nombre[0]}
                        {item.alumno.apellido[0]}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-blue-950 text-base tracking-tight">
                            {item.alumno.nombre} {item.alumno.apellido}
                          </span>

                          <BeltBadge
                            belt={item.alumno.cinturon_actual}
                            size="sm"
                          />

                          {item.es_recuperacion && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                              Recuperación
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-blue-800 font-medium">
                          {item.clases_en_cinturon !== undefined && (
                            <span className="flex items-center gap-1 text-blue-700">
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              <span>{item.clases_en_cinturon} clases en cinto</span>
                            </span>
                          )}

                          <a
                            href={`tel:${item.alumno.telefono_contacto}`}
                            className="flex items-center gap-1 text-blue-800 hover:text-[#154495] transition-colors"
                            title="Llamar contacto"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#154495]" />
                            <span>{item.alumno.telefono_contacto}</span>
                          </a>
                        </div>

                        {/* Notas privadas (solo visible si es ADMIN) */}
                        {isAdmin && item.alumno.notas_privadas && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                            <ShieldAlert className="w-3 h-3 shrink-0 text-amber-600" />
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
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20 scale-102"
                            : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300"
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
                            ? "bg-amber-500 text-white shadow-md shadow-amber-950/20"
                            : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
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
                            ? "bg-rose-600 text-white shadow-md shadow-rose-950/20"
                            : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300"
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
