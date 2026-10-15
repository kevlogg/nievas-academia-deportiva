"use client";

import React, { useState } from "react";
import { Alumno, KarateBelt, ListaAlumnos } from "@/types";
import { crearListaAlumnosAction } from "@/lib/actions/clases.actions";
import { actualizarCinturonAction } from "@/lib/actions/alumnos.actions";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  X,
  Search,
  Check,
  Users,
  PlusCircle,
  AlertCircle,
  Award,
  Edit2,
} from "lucide-react";

interface ModalCrearListaAlumnosProps {
  isOpen: boolean;
  onClose: () => void;
  alumnosDisponibles: Alumno[];
  onListaCreada: (nuevaLista: ListaAlumnos) => void;
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

export function ModalCrearListaAlumnos({
  isOpen,
  onClose,
  alumnosDisponibles,
  onListaCreada,
}: ModalCrearListaAlumnosProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [alumnos, setAlumnos] = useState<Alumno[]>(alumnosDisponibles);
  const [selectedAlumnoIds, setSelectedAlumnoIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBeltAlumnoId, setEditingBeltAlumnoId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredAlumnos = alumnos.filter((a) => {
    const full = `${a.nombre} ${a.apellido} ${a.cinturon_actual}`.toLowerCase();
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

    const res = await crearListaAlumnosAction({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      alumnosIds: selectedAlumnoIds,
    });

    setLoading(false);

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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-[#0F3E86]/40 overflow-hidden">
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
                Agrupa alumnos y edita sus cinturones directamente
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

          {/* Selección y Edición de Cinturones de Alumnos */}
          <div className="space-y-2 pt-2 border-t border-[#1E57A8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Alumnos & Cinturones
                </span>
                <span className="text-xs font-bold bg-white text-[#0F3E86] px-2.5 py-0.5 rounded-full">
                  {selectedAlumnoIds.length} seleccionados
                </span>
              </div>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-200 hover:text-white font-bold hover:underline cursor-pointer"
              >
                {selectedAlumnoIds.length === filteredAlumnos.length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </button>
            </div>

            {/* Buscador de alumnos */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-blue-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumno por nombre o cinturón..."
                className="w-full pl-9 pr-3 py-2 bg-[#0B2E63] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300 text-xs focus:outline-none focus:ring-2 focus:ring-white transition-all"
              />
            </div>

            {/* Lista con checkboxes y selector de cinturón en vivo */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {filteredAlumnos.length === 0 ? (
                <p className="text-center py-4 text-xs text-blue-200 font-medium">
                  No se encontraron alumnos con ese criterio.
                </p>
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
                      {/* Checkbox y Nombre */}
                      <div
                        onClick={() => toggleAlumno(alumno.id)}
                        className="flex items-center gap-2.5 cursor-pointer flex-1"
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
                        <div>
                          <p className="text-xs font-bold text-white">
                            {alumno.apellido}, {alumno.nombre}
                          </p>
                          <p className="text-[10px] text-blue-200">
                            Cinto actual: <span className="font-bold text-white">{alumno.cinturon_actual}</span>
                          </p>
                        </div>
                      </div>

                      {/* Edición de Cinturón directa por el Admin */}
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
                              title="Editar cinturón de este alumno"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Cambiar Cinto</span>
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
