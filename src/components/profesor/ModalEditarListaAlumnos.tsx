"use client";

import React, { useState, useEffect } from "react";
import { ListaAlumnos, Alumno, KarateBelt } from "@/types";
import { actualizarListaAlumnosAction } from "@/lib/actions/clases.actions";
import { actualizarCinturonAction } from "@/lib/actions/alumnos.actions";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  X,
  Users,
  Search,
  Check,
  AlertCircle,
  Save,
  CheckSquare,
  Square,
} from "lucide-react";

interface ModalEditarListaAlumnosProps {
  lista: ListaAlumnos | null;
  isOpen: boolean;
  onClose: () => void;
  alumnosDisponibles: Alumno[];
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

export function ModalEditarListaAlumnos({
  lista,
  isOpen,
  onClose,
  alumnosDisponibles,
  onListaActualizada,
}: ModalEditarListaAlumnosProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedAlumnos, setSelectedAlumnos] = useState<string[]>([]);
  const [alumnosList, setAlumnosList] = useState<Alumno[]>(alumnosDisponibles);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen || !lista) return null;

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
      const res = await actualizarCinturonAction(alumnoId, nuevoCinturon);
      if (res.success) {
        setAlumnosList((prev) =>
          prev.map((a) =>
            a.id === alumnoId ? { ...a, cinturon_actual: nuevoCinturon } : a
          )
        );
      }
    } catch {
      // Ignorar o mantener estado
    }
  };

  const filteredAlumnos = alumnosList.filter(
    (a) =>
      a.nombre.toLowerCase().includes(search.toLowerCase()) ||
      a.apellido.toLowerCase().includes(search.toLowerCase()) ||
      a.cinturon_actual.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa un nombre para la lista");
      return;
    }
    if (selectedAlumnos.length === 0) {
      setError("Debes seleccionar al menos un alumno para esta lista");
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
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/50 overflow-hidden">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-[#0A2E65] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <Users className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Editar Lista de Alumnos
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Modifica los alumnos asignados y sus cinturones
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
            <div className="p-3 bg-rose-900/60 border border-rose-500/80 text-rose-100 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre de la lista */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Nombre de la Lista *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Infantiles Turno Tarde, Avanzados Kumite..."
              className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/60 focus:outline-none focus:ring-2 focus:ring-white text-sm font-medium transition-all"
            />
          </div>

          {/* Descripción opcional */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Descripción o Criterio (Opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Cinturones Blanco a Verde de 6 a 12 años"
              className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/60 focus:outline-none focus:ring-2 focus:ring-white text-sm font-medium transition-all"
            />
          </div>

          {/* Selección y Edición de Alumnos */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
                Selecciona Alumnos ({selectedAlumnos.length} seleccionados) *
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer"
              >
                {selectedAlumnos.length === filteredAlumnos.length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </button>
            </div>

            {/* Buscador de alumnos */}
            <div className="relative">
              <Search className="w-4 h-4 text-blue-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o cinturón..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#082552] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            {/* Listado con Checkbox y Selector de Cinturón */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 pt-1">
              {filteredAlumnos.map((alumno) => {
                const isSelected = selectedAlumnos.includes(alumno.id);
                return (
                  <div
                    key={alumno.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-[#0A2E65] border-white/40 text-white"
                        : "bg-[#082552] border-[#1E57A8] text-blue-200 opacity-75"
                    }`}
                  >
                    <div
                      onClick={() => toggleAlumno(alumno.id)}
                      className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                    >
                      <div className="shrink-0 text-cyan-300">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-300" />
                        ) : (
                          <Square className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-white block">
                          {alumno.nombre} {alumno.apellido}
                        </span>
                        <span className="text-[10px] text-blue-200">
                          {alumno.telefono_contacto}
                        </span>
                      </div>
                    </div>

                    {/* Selector de cinturón inline */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                      <select
                        value={alumno.cinturon_actual}
                        onChange={(e) =>
                          handleCambiarCinturonAlumno(
                            alumno.id,
                            e.target.value as KarateBelt
                          )
                        }
                        className="bg-[#082552] text-white border border-[#2056A8] rounded-md px-1.5 py-0.5 text-[11px] font-bold focus:outline-none cursor-pointer"
                        title="Editar cinturón"
                      >
                        {BELT_OPTIONS.map((belt) => (
                          <option key={belt} value={belt} className="bg-[#082552] text-white">
                            {belt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-[#1E57A8] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-200 hover:text-white hover:bg-white/10 border border-[#2056A8] transition-colors cursor-pointer"
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
