"use client";

import React, { useState, useMemo, useTransition } from "react";
import { Alumno, KarateBelt } from "@/types";
import {
  inscribirAlumnoRapidoAction,
  inscribirAlumnoExistenteAction,
} from "@/lib/actions/asistencia.actions";
import { buscarAlumnosRecuperacionAction } from "@/lib/actions/alumnos.actions";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  UserCheck,
  UserPlus,
  Users,
  Search,
  X,
  Loader2,
  AlertCircle,
  PlusCircle,
  Sparkles,
  Check,
} from "lucide-react";

interface ModalInscribirAlumnoProps {
  isOpen: boolean;
  onClose: () => void;
  claseId: string;
  claseNombre?: string;
  sesionId?: string;
  alumnosDisponibles?: Alumno[];
  onAlumnoInscripto: (nuevoAlumno: Alumno) => void;
}

const BELTS: KarateBelt[] = [
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Naranja",
  "Verde",
  "Azul",
  "Marrón",
  "Negro",
];

export function ModalInscribirAlumno({
  isOpen,
  onClose,
  claseId,
  claseNombre,
  sesionId,
  alumnosDisponibles = [],
  onAlumnoInscripto,
}: ModalInscribirAlumnoProps) {
  const [activeTab, setActiveTab] = useState<"PADRON" | "NUEVO">("PADRON");

  // Estado para Padrón General
  const [searchQuery, setSearchQuery] = useState("");
  const [asyncResults, setAsyncResults] = useState<Alumno[]>([]);
  const [isSearchingAsync, startSearchingAsync] = useTransition();

  // Estado para Nuevo Alumno
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    fechaNacimiento: "2015-01-01",
    telefonoContacto: "",
    contactoEmergencia: "",
    cinturonActual: "Blanco" as KarateBelt,
  });

  const [isSubmitting, startSubmitting] = useTransition();
  const [addingAlumnoId, setAddingAlumnoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Normalizador de strings
  const cleanStr = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // Filtrado de Padrón General en memoria
  const filteredPadron = useMemo(() => {
    if (alumnosDisponibles.length === 0) return [];
    if (!searchQuery.trim()) return alumnosDisponibles.slice(0, 20);

    const q = cleanStr(searchQuery);
    return alumnosDisponibles.filter((a) => {
      const full = cleanStr(`${a.nombre} ${a.apellido} ${a.cinturon_actual}`);
      return full.includes(q);
    }).slice(0, 25);
  }, [alumnosDisponibles, searchQuery]);

  // Detector de duplicados cuando se registra uno nuevo
  const duplicateMatches = useMemo(() => {
    const normNom = cleanStr(formData.nombre);
    const normApe = cleanStr(formData.apellido);
    if (normNom.length < 2 && normApe.length < 2) return [];

    return alumnosDisponibles.filter((a) => {
      const aNom = cleanStr(a.nombre);
      const aApe = cleanStr(a.apellido);
      if (normNom.length >= 2 && normApe.length >= 2) {
        return (
          (aNom.includes(normNom) && aApe.includes(normApe)) ||
          (aNom.includes(normApe) && aApe.includes(normNom))
        );
      }
      if (normNom.length >= 2) return aNom.includes(normNom) || aApe.includes(normNom);
      if (normApe.length >= 2) return aApe.includes(normApe) || aNom.includes(normApe);
      return false;
    });
  }, [formData.nombre, formData.apellido, alumnosDisponibles]);

  if (!isOpen) return null;

  // Manejo de búsqueda asíncrona si no hay lista precargada
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setError(null);

    if (alumnosDisponibles.length === 0 && val.trim().length >= 2) {
      startSearchingAsync(async () => {
        const res = await buscarAlumnosRecuperacionAction(val, sesionId || "");
        if (res.success && res.data) {
          setAsyncResults(res.data);
        } else {
          setAsyncResults([]);
        }
      });
    }
  };

  // Inscribir alumno existente del padrón general
  const handleInscribirExistente = (alumno: Alumno) => {
    setError(null);
    setAddingAlumnoId(alumno.id);

    startSubmitting(async () => {
      try {
        const res = await inscribirAlumnoExistenteAction({
          claseId,
          alumnoId: alumno.id,
          sesionId,
        });

        if (res.success) {
          onAlumnoInscripto(res.data.alumno);
          setMensajeExito(`¡${alumno.nombre} ${alumno.apellido} sumado a la clase!`);
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setError(res.error || "No se pudo sumar el alumno a la clase");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al sumar alumno");
      } finally {
        setAddingAlumnoId(null);
      }
    });
  };

  // Crear y dar de alta nuevo alumno rápido
  const handleSubmitNuevo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setError("Por favor completa nombre y apellido");
      return;
    }

    setError(null);
    startSubmitting(async () => {
      try {
        const res = await inscribirAlumnoRapidoAction({
          claseId,
          sesionId,
          ...formData,
        });

        if (res.success) {
          onAlumnoInscripto(res.data.alumno);
          setMensajeExito(`¡${formData.nombre} ${formData.apellido} registrado y sumado a la clase!`);
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setError(res.error || "Ocurrió un error al registrar el alumno");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de red al registrar alumno");
      }
    });
  };

  const listaPadronMostrar = alumnosDisponibles.length > 0 ? filteredPadron : asyncResults;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-5 shadow-2xl shadow-blue-950/50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E57A8] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <UserCheck className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Sumar Alumno a Clase Abierta
              </h2>
              <p className="text-xs text-blue-200 font-medium truncate max-w-[260px] sm:max-w-md">
                {claseNombre ? `Clase: ${claseNombre}` : "Alta en tatami con presente inmediato"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors touch-target-safe cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones de Error o Éxito */}
        {error && (
          <div className="mt-3 p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl flex items-center gap-2 text-xs text-rose-200 animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {mensajeExito && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl flex items-center gap-2 text-xs text-emerald-200 font-bold animate-fade-in shrink-0">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-300" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Selector de Pestañas: Padrón General vs Registrar Nuevo */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#092652] rounded-2xl border border-[#2056A8] mt-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("PADRON")}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "PADRON"
                ? "bg-white text-[#0F3E86] shadow-sm"
                : "text-blue-200 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Padrón General</span>
            {alumnosDisponibles.length > 0 && (
              <span className="text-[10px] opacity-75 font-mono">({alumnosDisponibles.length})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("NUEVO")}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "NUEVO"
                ? "bg-cyan-400 text-[#0F3E86] shadow-sm"
                : "text-cyan-300 hover:text-white"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Registrar Alumno</span>
          </button>
        </div>

        {/* TAB 1: PADRÓN GENERAL */}
        {activeTab === "PADRON" && (
          <div className="flex-1 flex flex-col min-h-0 pt-3 space-y-2.5">
            {/* Buscador */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar por nombre, apellido o cinturón..."
                className="w-full pl-9 pr-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/70 text-xs focus:outline-none focus:ring-2 focus:ring-white transition-all"
              />
            </div>

            {/* Listado de Alumnos del Padrón */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {isSearchingAsync ? (
                <div className="flex items-center justify-center py-10 gap-2 text-xs text-blue-200">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Buscando en el padrón general...</span>
                </div>
              ) : listaPadronMostrar.length === 0 ? (
                <div className="text-center py-8 px-4 text-xs text-blue-200 font-medium bg-[#0A2E65]/50 rounded-2xl border border-dashed border-[#2056A8] space-y-2">
                  <p>
                    {searchQuery.trim()
                      ? "No se encontró ningún alumno en el dojo con ese nombre."
                      : "No hay alumnos disponibles en el padrón."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("NUEVO")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-[#0F3E86] font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Registrarlo como Nuevo Alumno</span>
                  </button>
                </div>
              ) : (
                listaPadronMostrar.map((alumno) => {
                  const isAddingThis = addingAlumnoId === alumno.id;

                  return (
                    <div
                      key={alumno.id}
                      className="p-3 bg-[#0A2E65]/80 hover:bg-[#0B3575] border border-[#2056A8] hover:border-blue-300 rounded-2xl flex items-center justify-between gap-3 transition-colors shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {alumno.apellido}, {alumno.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-blue-200 mt-0.5 flex-wrap">
                          <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                          {alumno.telefono_contacto && alumno.telefono_contacto !== "Sin registrar" && (
                            <span className="text-blue-300/80 truncate">
                              Tel: {alumno.telefono_contacto}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInscribirExistente(alumno)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isAddingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F3E86]" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-[#0F3E86]" />
                        )}
                        <span>{isAddingThis ? "Sumando..." : "Sumar (Presente)"}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REGISTRAR NUEVO ALUMNO */}
        {activeTab === "NUEVO" && (
          <form
            onSubmit={handleSubmitNuevo}
            className="flex-1 overflow-y-auto pt-3 space-y-3 pr-1"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej. Lucas"
                  className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={formData.apellido}
                  onChange={(e) =>
                    setFormData({ ...formData, apellido: e.target.value })
                  }
                  placeholder="Ej. Morales"
                  className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Cinturón Inicial
                </label>
                <select
                  value={formData.cinturonActual}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cinturonActual: e.target.value as KarateBelt,
                    })
                  }
                  className="w-full px-2.5 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer"
                >
                  {BELTS.map((b) => (
                    <option key={b} value={b} className="bg-[#082552] text-white">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  required
                  value={formData.fechaNacimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, fechaNacimiento: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={formData.telefonoContacto}
                  onChange={(e) =>
                    setFormData({ ...formData, telefonoContacto: e.target.value })
                  }
                  placeholder="+54 9 11..."
                  className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Contacto de Emergencia
                </label>
                <input
                  type="text"
                  value={formData.contactoEmergencia}
                  onChange={(e) =>
                    setFormData({ ...formData, contactoEmergencia: e.target.value })
                  }
                  placeholder="Madre: Carolina..."
                  className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/50"
                />
              </div>
            </div>

            {/* ALERTA DUPLICADOS EN VIVO */}
            {duplicateMatches.length > 0 && (
              <div className="p-3 bg-amber-500/15 border-2 border-amber-400/60 rounded-xl space-y-2 animate-fade-in">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>¡Ya existe un alumno con nombre similar en el dojo!</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {duplicateMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#08234D] border border-amber-500/40 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-white">
                          {match.nombre} {match.apellido}
                        </span>
                        <span className="text-amber-200 text-[11px] ml-2">
                          • {match.cinturon_actual}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInscribirExistente(match)}
                        disabled={isSubmitting}
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-[#0F3E86] font-black text-[11px] rounded-lg shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        Sumar este alumno
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de Envío */}
            <div className="pt-2 border-t border-[#1E57A8] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.nombre.trim() || !formData.apellido.trim()}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-[#0F3E86] font-black text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0F3E86]" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-[#0F3E86]" />
                    <span>Registrar y Sumar a Clase</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
