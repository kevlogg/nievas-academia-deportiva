"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ListaAlumnos, Alumno, KarateBelt, Usuario } from "@/types";
import { actualizarListaAlumnosAction } from "@/lib/actions/clases.actions";
import { actualizarCinturonAction, crearAlumnoRapidoAction } from "@/lib/actions/alumnos.actions";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  X,
  Users,
  Search,
  Check,
  AlertCircle,
  Save,
  UserPlus,
  UserCheck,
  PlusCircle,
  Sparkles,
  Edit2,
} from "lucide-react";

interface ModalEditarListaAlumnosProps {
  lista: ListaAlumnos | null;
  isOpen: boolean;
  onClose: () => void;
  alumnosDisponibles: Alumno[];
  currentUser?: Usuario;
  onListaActualizada: (listaActualizada: ListaAlumnos) => void;
}

const BELT_OPTIONS: KarateBelt[] = [
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Naranja",
  "Verde",
  "Azul",
  "Marrón",
  "Negro",
];

type TabModo = "MIS_CLASES" | "OTRO_SENSEI" | "NUEVO_ALUMNO";

export function ModalEditarListaAlumnos({
  lista,
  isOpen,
  onClose,
  alumnosDisponibles,
  currentUser,
  onListaActualizada,
}: ModalEditarListaAlumnosProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedAlumnos, setSelectedAlumnos] = useState<string[]>([]);
  const [alumnosList, setAlumnosList] = useState<Alumno[]>(alumnosDisponibles);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBeltAlumnoId, setEditingBeltAlumnoId] = useState<string | null>(null);

  // Modo de Selección de Alumnos (Pestañas)
  const [activeTab, setActiveTab] = useState<TabModo>("MIS_CLASES");

  // Formulario de Alumno Nuevo
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [nuevoCinturon, setNuevoCinturon] = useState<KarateBelt>("Blanco");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmergencia, setNuevoEmergencia] = useState("");
  const [creandoAlumno, setCreandoAlumno] = useState(false);
  const [mensajeExitoAlumno, setMensajeExitoAlumno] = useState<string | null>(null);

  useEffect(() => {
    if (lista) {
      setNombre(lista.nombre);
      setDescripcion(lista.descripcion || "");
      setSelectedAlumnos(lista.alumnos_ids || []);
    }
  }, [lista]);

  useEffect(() => {
    setAlumnosList(alumnosDisponibles);
  }, [alumnosDisponibles]);

  // Alumnos existentes en mis clases vs otros Senseis
  const misAlumnos = useMemo(() => {
    if (!currentUser?.id) return alumnosList;
    return alumnosList.filter(
      (a) =>
        a.profesores_ids?.includes(currentUser.id) ||
        !a.profesores_ids ||
        a.profesores_ids.length === 0
    );
  }, [alumnosList, currentUser?.id]);

  const otrosSenseisAlumnos = useMemo(() => {
    if (!currentUser?.id) return [];
    return alumnosList.filter(
      (a) =>
        !a.profesores_ids?.includes(currentUser.id) &&
        a.profesores_ids &&
        a.profesores_ids.length > 0
    );
  }, [alumnosList, currentUser?.id]);

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

    return alumnosList.filter((a) => {
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
  }, [nuevoNombre, nuevoApellido, alumnosList]);

  if (!isOpen || !lista) return null;

  // Alumnos mostrados en la pestaña activa según búsqueda
  const currentTabPool = activeTab === "MIS_CLASES" ? misAlumnos : otrosSenseisAlumnos;
  const filteredAlumnos = currentTabPool.filter((a) => {
    const full = `${a.nombre} ${a.apellido} ${a.cinturon_actual} ${
      a.profesores_nombres?.join(" ") || ""
    }`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  const toggleAlumno = (alumnoId: string) => {
    setSelectedAlumnos((prev) =>
      prev.includes(alumnoId)
        ? prev.filter((id) => id !== alumnoId)
        : [...prev, alumnoId]
    );
  };

  const selectAll = () => {
    if (selectedAlumnos.length === filteredAlumnos.length) {
      setSelectedAlumnos([]);
    } else {
      setSelectedAlumnos(filteredAlumnos.map((a) => a.id));
    }
  };

  const handleCambiarCinturonAlumno = async (
    alumnoId: string,
    nuevoCinturon: KarateBelt
  ) => {
    try {
      setAlumnosList((prev) =>
        prev.map((a) =>
          a.id === alumnoId ? { ...a, cinturon_actual: nuevoCinturon } : a
        )
      );
      setEditingBeltAlumnoId(null);
      await actualizarCinturonAction(alumnoId, nuevoCinturon);
    } catch {
      // Ignorar o mantener estado
    }
  };

  // Asociar alumno existente desde el detector de duplicados
  const handleAsociarExistente = (alumnoMatch: Alumno) => {
    if (!selectedAlumnos.includes(alumnoMatch.id)) {
      setSelectedAlumnos((prev) => [...prev, alumnoMatch.id]);
    }
    setMensajeExitoAlumno(
      `¡${alumnoMatch.nombre} ${alumnoMatch.apellido} (${alumnoMatch.cinturon_actual}) asociado a la lista!`
    );
    setNuevoNombre("");
    setNuevoApellido("");
    setNuevoTelefono("");
    setNuevoEmergencia("");
    setTimeout(() => setMensajeExitoAlumno(null), 4000);
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

    const res = await crearAlumnoRapidoAction({
      nombre: nuevoNombre.trim(),
      apellido: nuevoApellido.trim(),
      cinturonActual: nuevoCinturon,
      telefonoContacto: nuevoTelefono.trim() || undefined,
      contactoEmergencia: nuevoEmergencia.trim() || undefined,
    });

    setCreandoAlumno(false);

    if (res.success) {
      const created = res.data;
      setAlumnosList((prev) => [created, ...prev]);
      setSelectedAlumnos((prev) => [...prev, created.id]);
      setMensajeExitoAlumno(
        `¡${created.nombre} ${created.apellido} registrado y añadido a la lista!`
      );
      setNuevoNombre("");
      setNuevoApellido("");
      setNuevoTelefono("");
      setNuevoEmergencia("");
      setTimeout(() => setMensajeExitoAlumno(null), 4000);
    } else {
      setError(res.error || "No se pudo registrar el nuevo alumno");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre de la lista es requerido");
      return;
    }

    if (selectedAlumnos.length === 0) {
      setError("Debes seleccionar al menos un alumno para la lista");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await actualizarListaAlumnosAction(lista.id, {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      alumnosIds: selectedAlumnos,
    });

    setLoading(false);

    if (res.success) {
      onListaActualizada(res.data);
      onClose();
    } else {
      setError(res.error || "No se pudo actualizar la lista");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl shadow-[#0F3E86]/40 overflow-hidden">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-[#0B2E63] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <Users className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Editar Lista de Alumnos</h2>
              <p className="text-xs text-blue-200 font-medium">
                Modifica integrantes, cinturones o añade nuevos alumnos
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

          {/* Nombre y Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Nombre de la Lista *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Infantiles Kumite..."
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
              placeholder="Ej: Turno tarde lunes y miércoles"
              className="w-full px-3.5 py-2 bg-[#0B2E63] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-white text-xs font-medium transition-all"
            />
          </div>

          {/* Pestañas de Alumnos */}
          <div className="pt-2 border-t border-[#1E57A8] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
                Integrantes de la Lista
              </span>
              <span className="text-xs font-black bg-white text-[#0F3E86] px-2.5 py-0.5 rounded-full shadow-sm">
                {selectedAlumnos.length} seleccionados
              </span>
            </div>

            {/* Selector de Pestañas */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#092652] rounded-2xl border border-[#2056A8]">
              <button
                type="button"
                onClick={() => setActiveTab("MIS_CLASES")}
                className={`px-2.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "MIS_CLASES"
                    ? "bg-white text-[#0F3E86] shadow-sm font-black"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="truncate">Mis Clases ({misAlumnos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("OTRO_SENSEI")}
                className={`px-2.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "OTRO_SENSEI"
                    ? "bg-white text-[#0F3E86] shadow-sm font-black"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">Otro Sensei ({otrosSenseisAlumnos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("NUEVO_ALUMNO")}
                className={`px-2.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "NUEVO_ALUMNO"
                    ? "bg-white text-[#0F3E86] shadow-sm font-black"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="truncate">Alumno Nuevo</span>
              </button>
            </div>

            {/* Contenido Pestaña 3: ALUMNO NUEVO */}
            {activeTab === "NUEVO_ALUMNO" && (
              <div className="p-4 bg-[#0B2E63] border-2 border-[#2056A8] rounded-2xl space-y-3.5 animate-fade-in">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-cyan-300" />
                    <span>Cargar Alumno Nuevo en el Dojo</span>
                  </h3>
                  <p className="text-[11px] text-blue-200 font-medium">
                    Evita duplicados: te mostraremos si ya existe alguien con este nombre en otra lista.
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
                      {BELT_OPTIONS.map((belt) => (
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

                {/* ALERTA DUPLICADOS */}
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
                            Asociar a la lista
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón Guardar */}
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

            {/* Contenido Pestañas 1 y 2 */}
            {activeTab !== "NUEVO_ALUMNO" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 mr-2">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-300" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nombre, apellido, cinto o Sensei..."
                      className="w-full pl-9 pr-3 py-2 bg-[#0B2E63] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300 text-xs focus:outline-none focus:ring-2 focus:ring-white transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-blue-200 hover:text-white font-bold hover:underline cursor-pointer shrink-0"
                  >
                    {selectedAlumnos.length === filteredAlumnos.length && filteredAlumnos.length > 0
                      ? "Deseleccionar"
                      : "Seleccionar todos"}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {filteredAlumnos.length === 0 ? (
                    <div className="text-center py-6 text-xs text-blue-200 font-medium bg-[#0B2E63]/40 rounded-xl border border-dashed border-[#2056A8]">
                      {activeTab === "MIS_CLASES"
                        ? "No tienes alumnos en esta categoría."
                        : "No se encontraron alumnos de otros Senseis con este criterio."}
                    </div>
                  ) : (
                    filteredAlumnos.map((alumno) => {
                      const isSelected = selectedAlumnos.includes(alumno.id);
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

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            {isEditingThisBelt ? (
                              <div className="flex items-center gap-1 bg-[#0B2E63] p-1 rounded-xl border border-blue-300">
                                <select
                                  value={alumno.cinturon_actual}
                                  onChange={(e) =>
                                    handleCambiarCinturonAlumno(
                                      alumno.id,
                                      e.target.value as KarateBelt
                                    )
                                  }
                                  className="px-2 py-1 bg-white text-[#0F3E86] text-xs font-bold rounded-lg focus:outline-none cursor-pointer"
                                >
                                  {BELT_OPTIONS.map((belt) => (
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

          {/* Botones */}
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
              <Save className="w-4 h-4 text-[#0F3E86]" />
              <span>{loading ? "Guardando..." : "Guardar Cambios"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
