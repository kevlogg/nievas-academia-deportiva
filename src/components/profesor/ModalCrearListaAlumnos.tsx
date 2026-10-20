"use client";

import React, { useState, useMemo } from "react";
import { Alumno, KarateBelt, ListaAlumnos, Usuario } from "@/types";
import { crearListaAlumnosAction } from "@/lib/actions/clases.actions";
import { actualizarCinturonAction, crearAlumnoRapidoAction } from "@/lib/actions/alumnos.actions";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  X,
  Search,
  Check,
  Users,
  PlusCircle,
  AlertCircle,
  UserPlus,
  UserCheck,
  Award,
  Edit2,
  Sparkles,
  Phone,
} from "lucide-react";

interface ModalCrearListaAlumnosProps {
  isOpen: boolean;
  onClose: () => void;
  alumnosDisponibles: Alumno[];
  currentUser?: Usuario;
  profesoresDisponibles?: Usuario[];
  onListaCreada: (nuevaLista: ListaAlumnos) => void;
  onAlumnoCreado?: (nuevoAlumno: Alumno) => void;
}

const KARATE_BELTS: KarateBelt[] = [
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Naranja",
  "Verde",
  "Azul",
  "Marrón",
  "Negro",
];

type TabModo = "TODOS" | "MIS_CLASES" | "OTRO_SENSEI" | "NUEVO_ALUMNO";

export function ModalCrearListaAlumnos({
  isOpen,
  onClose,
  alumnosDisponibles,
  currentUser,
  profesoresDisponibles = [],
  onListaCreada,
  onAlumnoCreado,
}: ModalCrearListaAlumnosProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [alumnos, setAlumnos] = useState<Alumno[]>(alumnosDisponibles);
  const [selectedAlumnoIds, setSelectedAlumnoIds] = useState<string[]>([]);
  const [selectedProfesorIds, setSelectedProfesorIds] = useState<string[]>(() =>
    currentUser?.id ? [currentUser.id] : []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBeltAlumnoId, setEditingBeltAlumnoId] = useState<string | null>(null);

  // Modo de Selección de Alumnos (Pestañas)
  const [activeTab, setActiveTab] = useState<TabModo>("TODOS");

  // Formulario de Alumno Nuevo
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [nuevoCinturon, setNuevoCinturon] = useState<KarateBelt>("Blanco");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmergencia, setNuevoEmergencia] = useState("");
  const [creandoAlumno, setCreandoAlumno] = useState(false);
  const [mensajeExitoAlumno, setMensajeExitoAlumno] = useState<string | null>(null);

  // Mantener actualizado el estado local de alumnos si cambia alumnosDisponibles
  React.useEffect(() => {
    setAlumnos(alumnosDisponibles);
  }, [alumnosDisponibles]);

  // Alumnos existentes en mis clases vs otros Senseis
  const misAlumnos = useMemo(() => {
    if (!currentUser?.id) return alumnos;
    return alumnos.filter(
      (a) =>
        a.profesores_ids?.includes(currentUser.id) ||
        !a.profesores_ids ||
        a.profesores_ids.length === 0
    );
  }, [alumnos, currentUser?.id]);

  const otrosSenseisAlumnos = useMemo(() => {
    if (!currentUser?.id) return [];
    return alumnos.filter(
      (a) =>
        !a.profesores_ids?.includes(currentUser.id) &&
        a.profesores_ids &&
        a.profesores_ids.length > 0
    );
  }, [alumnos, currentUser?.id]);

  // Helper para normalizar texto sin acentos
  const cleanStr = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // Detector en vivo de alumnos duplicados / similares (insensible a acentos)
  const duplicateMatches = useMemo(() => {
    const normNom = cleanStr(nuevoNombre);
    const normApe = cleanStr(nuevoApellido);
    if (normNom.length < 2 && normApe.length < 2) return [];

    return alumnos.filter((a) => {
      const aNom = cleanStr(a.nombre);
      const aApe = cleanStr(a.apellido);

      if (normNom.length >= 2 && normApe.length >= 2) {
        return (
          (aNom.includes(normNom) && aApe.includes(normApe)) ||
          (aNom.includes(normApe) && aApe.includes(normNom))
        );
      }
      if (normNom.length >= 2) {
        return aNom.includes(normNom) || aApe.includes(normNom);
      }
      if (normApe.length >= 2) {
        return aApe.includes(normApe) || aNom.includes(normApe);
      }
      return false;
    });
  }, [nuevoNombre, nuevoApellido, alumnos]);

  if (!isOpen) return null;

  // Alumnos mostrados en la pestaña activa según búsqueda
  const currentTabPool =
    activeTab === "TODOS"
      ? alumnos
      : activeTab === "MIS_CLASES"
      ? misAlumnos
      : otrosSenseisAlumnos;
  const filteredAlumnos = currentTabPool.filter((a) => {
    const full = `${a.nombre} ${a.apellido} ${a.cinturon_actual} ${
      a.profesores_nombres?.join(" ") || ""
    }`.toLowerCase();
    return full.includes(searchQuery.toLowerCase());
  });

  const toggleAlumno = (id: string) => {
    setSelectedAlumnoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedAlumnoIds.length === filteredAlumnos.length) {
      setSelectedAlumnoIds([]);
    } else {
      setSelectedAlumnoIds(filteredAlumnos.map((a) => a.id));
    }
  };

  const handleCambiarCinturon = async (alumnoId: string, nuevoCinturon: KarateBelt) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === alumnoId ? { ...a, cinturon_actual: nuevoCinturon } : a))
    );
    setEditingBeltAlumnoId(null);
    await actualizarCinturonAction(alumnoId, nuevoCinturon);
  };

  // Asociar alumno existente desde el detector de duplicados
  const handleAsociarExistente = (alumnoMatch: Alumno) => {
    if (!selectedAlumnoIds.includes(alumnoMatch.id)) {
      setSelectedAlumnoIds((prev) => [...prev, alumnoMatch.id]);
    }
    setMensajeExitoAlumno(
      `¡${alumnoMatch.nombre} ${alumnoMatch.apellido} (${alumnoMatch.cinturon_actual}) asociado a tu lista!`
    );
    setNuevoNombre("");
    setNuevoApellido("");
    setNuevoTelefono("");
    setNuevoEmergencia("");
    setTimeout(() => setMensajeExitoAlumno(null), 4000);
  };

  const toggleProfesor = (profId: string) => {
    setSelectedProfesorIds((prev) =>
      prev.includes(profId)
        ? prev.filter((id) => id !== profId)
        : [...prev, profId]
    );
  };

  // Crear Alumno Nuevo y agregarlo de inmediato
  const handleCrearAlumnoNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoApellido.trim()) {
      setError("Por favor ingresa nombre y apellido para el nuevo alumno");
      return;
    }

    setCreandoAlumno(true);
    setError(null);

    try {
      const res = await crearAlumnoRapidoAction({
        nombre: nuevoNombre.trim(),
        apellido: nuevoApellido.trim(),
        cinturonActual: nuevoCinturon,
        telefonoContacto: nuevoTelefono.trim() || undefined,
        contactoEmergencia: nuevoEmergencia.trim() || undefined,
      });

      if (res.success) {
        const created = res.data;
        setAlumnos((prev) => [created, ...prev]);
        setSelectedAlumnoIds((prev) => [...prev, created.id]);
        onAlumnoCreado?.(created);
        setMensajeExitoAlumno(
          `¡${created.nombre} ${created.apellido} registrado y añadido a la lista!`
        );
        setNuevoNombre("");
        setNuevoApellido("");
        setNuevoTelefono("");
        setNuevoEmergencia("");
        setActiveTab("TODOS");
        setTimeout(() => setMensajeExitoAlumno(null), 4000);
      } else {
        setError(res.error || "No se pudo registrar el nuevo alumno");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrar alumno");
    } finally {
      setCreandoAlumno(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa un nombre para la lista");
      return;
    }
    if (selectedAlumnoIds.length === 0) {
      setError("Debes seleccionar al menos un alumno para la lista");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await crearListaAlumnosAction({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        alumnosIds: selectedAlumnoIds,
        profesoresIds:
          selectedProfesorIds.length > 0
            ? selectedProfesorIds
            : currentUser?.id
            ? [currentUser.id]
            : undefined,
      });

      if (res.success) {
        if (res.data) {
          onListaCreada(res.data);
        }
        onClose();
        setNombre("");
        setDescripcion("");
        setSelectedAlumnoIds([]);
      } else {
        setError(res.error || "No se pudo crear la lista de alumnos");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la lista de alumnos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-xl sm:max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-[#0F3E86]/40 overflow-hidden">
        {/* Cabecera Modal */}
        <div className="px-5 py-4 bg-[#0B2E63] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <Users className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Crear Nueva Lista de Alumnos
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Agrupa alumnos sin duplicados y edita sus cinturones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mensajeExitoAlumno && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
              <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{mensajeExitoAlumno}</span>
            </div>
          )}

          {/* Nombre y Descripción de la Lista */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Nombre de la Lista *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Infantiles Turno Tarde, Kumite Avanzado..."
              className="w-full px-3.5 py-2.5 bg-[#0B2E63] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-white text-sm font-medium transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Descripción (Opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Alumnos hasta cinto verde, lunes y miércoles"
              className="w-full px-3.5 py-2 bg-[#0B2E63] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-white text-xs font-medium transition-all"
            />
          </div>

          {/* Asignar Profesores a cargo (Dirección) */}
          {currentUser?.rol === "ADMIN" && profesoresDisponibles && profesoresDisponibles.length > 0 && (
            <div className="space-y-2 p-3.5 bg-[#092652] rounded-2xl border border-[#2056A8]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-300" />
                  <span>Asignar Profesores / Dirección a cargo *</span>
                </label>
                <span className="text-[11px] text-cyan-300 font-bold bg-cyan-950/70 border border-cyan-600/50 px-2 py-0.5 rounded-full">
                  {selectedProfesorIds.length} seleccionados
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                Selecciona uno o más profesores/directores que podrán ver esta lista y dictar clases en tatami:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {profesoresDisponibles.map((prof) => {
                  const isSelected = selectedProfesorIds.includes(prof.id);
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => toggleProfesor(prof.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? "bg-white text-[#0F3E86] border-white shadow-sm font-black"
                          : "bg-white/10 text-blue-100 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isSelected
                            ? "bg-[#0F3E86] border-[#0F3E86] text-white"
                            : "border-blue-300/50"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span>
                        {prof.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim()}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">({prof.rol})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selector de Pestañas de Alumnos: 3 Fuentes Claras */}
          <div className="pt-2 border-t border-[#1E57A8] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
                Origen de Alumnos
              </span>
              <span className="text-xs font-black bg-white text-[#0F3E86] px-2.5 py-0.5 rounded-full shadow-sm">
                {selectedAlumnoIds.length} seleccionados
              </span>
            </div>

            {/* Selector de Pestañas de Alumnos: Padrón General, Mis Clases, Otro Sensei y Alumno Nuevo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#092652] rounded-2xl border border-[#2056A8]">
              {/* 1. Todos / Padrón General */}
              <button
                type="button"
                onClick={() => setActiveTab("TODOS")}
                className={`px-2 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === "TODOS"
                    ? "bg-white text-[#0F3E86] shadow-sm font-black"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">Todos ({alumnos.length})</span>
              </button>

              {/* 2. Mis Clases */}
              <button
                type="button"
                onClick={() => setActiveTab("MIS_CLASES")}
                className={`px-2 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === "MIS_CLASES"
                    ? "bg-white text-[#0F3E86] shadow-sm font-black"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="truncate">Mis Clases ({misAlumnos.length})</span>
              </button>

              {/* 3. Otro Sensei */}
              <button
                type="button"
                onClick={() => setActiveTab("OTRO_SENSEI")}
                className={`px-2 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === "OTRO_SENSEI"
                    ? "bg-white text-[#0F3E86] shadow-sm font-black"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">Otros ({otrosSenseisAlumnos.length})</span>
              </button>

              {/* 4. Alumno Nuevo */}
              <button
                type="button"
                onClick={() => setActiveTab("NUEVO_ALUMNO")}
                className={`px-2 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === "NUEVO_ALUMNO"
                    ? "bg-cyan-400 text-[#0F3E86] shadow-sm font-black"
                    : "text-cyan-300 hover:text-white"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="truncate">+ Nuevo Alumno</span>
              </button>
            </div>

            {/* Contenido Pestaña 3: FORMULARIO DE ALUMNO NUEVO CON DETECTOR EN VIVO */}
            {activeTab === "NUEVO_ALUMNO" && (
              <div className="p-4 bg-[#0B2E63] border-2 border-[#2056A8] rounded-2xl space-y-3.5 animate-fade-in">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-cyan-300" />
                    <span>Cargar Alumno Nuevo en el Dojo</span>
                  </h3>
                  <p className="text-[11px] text-blue-200 font-medium">
                    Si el alumno ya existe en el dojo o en clases de otro Sensei, te lo advertiremos para evitar duplicados.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-200">Nombre *</label>
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Ej: Joaquín"
                      className="w-full px-3 py-2 bg-[#08234D] border border-[#2056A8] rounded-xl text-white text-xs placeholder:text-blue-300/60 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-200">Apellido *</label>
                    <input
                      type="text"
                      value={nuevoApellido}
                      onChange={(e) => setNuevoApellido(e.target.value)}
                      placeholder="Ej: Martínez"
                      className="w-full px-3 py-2 bg-[#08234D] border border-[#2056A8] rounded-xl text-white text-xs placeholder:text-blue-300/60 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-200">Cinturón Inicial</label>
                    <select
                      value={nuevoCinturon}
                      onChange={(e) => setNuevoCinturon(e.target.value as KarateBelt)}
                      className="w-full px-2.5 py-2 bg-[#08234D] border border-[#2056A8] rounded-xl text-cyan-300 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      {KARATE_BELTS.map((belt) => (
                        <option key={belt} value={belt} className="bg-[#082552] text-white">
                          {belt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-200">Teléfono (Opcional)</label>
                    <input
                      type="text"
                      value={nuevoTelefono}
                      onChange={(e) => setNuevoTelefono(e.target.value)}
                      placeholder="+54 9 11..."
                      className="w-full px-3 py-2 bg-[#08234D] border border-[#2056A8] rounded-xl text-white text-xs placeholder:text-blue-300/60 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-200">Emergencia (Opcional)</label>
                    <input
                      type="text"
                      value={nuevoEmergencia}
                      onChange={(e) => setNuevoEmergencia(e.target.value)}
                      placeholder="Madre: ..."
                      className="w-full px-3 py-2 bg-[#08234D] border border-[#2056A8] rounded-xl text-white text-xs placeholder:text-blue-300/60 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>
                </div>

                {/* ALERTA DE COINCIDENCIAS / DUPLICADOS EN VIVO */}
                {duplicateMatches.length > 0 && (
                  <div className="p-3 bg-amber-500/15 border-2 border-amber-400/60 rounded-xl space-y-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>¡Atención! Ya existe un alumno con ese nombre en la academia:</span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
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
                              • Cinto: {match.cinturon_actual}
                            </span>
                            <span className="text-cyan-300 text-[11px] ml-2">
                              • Sensei: {match.profesores_nombres?.join(", ") || "Dojo General"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAsociarExistente(match)}
                            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-[#0F3E86] font-black text-[11px] rounded-lg shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer"
                          >
                            Asociar a mi lista
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón Guardar Alumno Nuevo */}
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleCrearAlumnoNuevo}
                    disabled={creandoAlumno || !nuevoNombre.trim() || !nuevoApellido.trim()}
                    className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{creandoAlumno ? "Registrando..." : "Guardar y Agregar a la Lista"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Contenido Pestañas 1, 2 y 3: LISTAS CON BUSCADOR Y EDICIÓN DE CINTOS */}
            {activeTab !== "NUEVO_ALUMNO" && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, apellido, cinto o Sensei..."
                      className="w-full pl-9 pr-3 py-2 bg-[#0B2E63] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300 text-xs focus:outline-none focus:ring-2 focus:ring-white transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab("NUEVO_ALUMNO")}
                      className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-[#0F3E86] font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Nuevo Alumno</span>
                    </button>

                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-blue-200 hover:text-white font-bold hover:underline cursor-pointer shrink-0"
                    >
                      {selectedAlumnoIds.length === filteredAlumnos.length && filteredAlumnos.length > 0
                        ? "Deseleccionar"
                        : "Seleccionar todos"}
                    </button>
                  </div>
                </div>

                {/* Lista de Alumnos de la Pestaña */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {filteredAlumnos.length === 0 ? (
                    <div className="text-center py-6 px-4 text-xs text-blue-200 font-medium bg-[#0B2E63]/40 rounded-xl border border-dashed border-[#2056A8] space-y-2">
                      <p>
                        {activeTab === "TODOS"
                          ? "No se encontraron alumnos en la academia con ese criterio de búsqueda."
                          : activeTab === "MIS_CLASES"
                          ? "No tienes alumnos en esta categoría. Puedes buscarlos en 'Todos' o crear un 'Alumno Nuevo'."
                          : "No se encontraron alumnos de otros Senseis con este criterio."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("NUEVO_ALUMNO")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-400/30 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Registrar un Nuevo Alumno Ahora</span>
                      </button>
                    </div>
                  ) : (
                    filteredAlumnos.map((alumno) => {
                      const isSelected = selectedAlumnoIds.includes(alumno.id);
                      const isEditingThisBelt = editingBeltAlumnoId === alumno.id;

                      return (
                        <div
                          key={alumno.id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isSelected
                              ? "bg-[#144EAA] border-white shadow-sm"
                              : "bg-[#0B2E63]/80 border-[#2056A8] hover:border-blue-300"
                          }`}
                        >
                          {/* Checkbox, Nombre y Sensei */}
                          <div
                            onClick={() => toggleAlumno(alumno.id)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          >
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? "bg-white border-white text-[#0F3E86]"
                                  : "border-blue-300 bg-transparent"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">
                                {alumno.apellido}, {alumno.nombre}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-blue-200 flex-wrap">
                                <span>
                                  Cinto: <strong className="text-white">{alumno.cinturon_actual}</strong>
                                </span>
                                {alumno.profesores_nombres && alumno.profesores_nombres.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-cyan-200 font-semibold bg-[#08234D] px-1.5 py-0.5 rounded border border-blue-400/30">
                                      Sensei: {alumno.profesores_nombres.join(", ")}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Edición de Cinturón directa */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            {isEditingThisBelt ? (
                              <div className="flex items-center gap-1 bg-[#0B2E63] p-1 rounded-xl border border-blue-300">
                                <select
                                  value={alumno.cinturon_actual}
                                  onChange={(e) =>
                                    handleCambiarCinturon(
                                      alumno.id,
                                      e.target.value as KarateBelt
                                    )
                                  }
                                  className="px-2 py-1 bg-white text-[#0F3E86] text-xs font-bold rounded-lg focus:outline-none cursor-pointer"
                                >
                                  {KARATE_BELTS.map((belt) => (
                                    <option key={belt} value={belt}>
                                      {belt}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setEditingBeltAlumnoId(null)}
                                  className="p-1 text-blue-200 hover:text-white"
                                  title="Cerrar edición"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBeltAlumnoId(alumno.id);
                                  }}
                                  className="p-1.5 bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white rounded-lg border border-white/20 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                  title="Editar cinturón"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span className="hidden sm:inline">Cinto</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-[#1E57A8] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-200 hover:text-white hover:bg-white/10 border border-white/20 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-blue-50 text-[#0F3E86] shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#0F3E86]" />
              <span>{loading ? "Creando..." : "Guardar Lista de Alumnos"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
