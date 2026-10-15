"use client";

import React, { useState } from "react";
import { Alumno, ListaAlumnos } from "@/types";
import { crearListaAlumnosAction } from "@/lib/actions/clases.actions";
import { X, Search, Check, Users, PlusCircle, AlertCircle } from "lucide-react";

interface ModalCrearListaAlumnosProps {
  isOpen: boolean;
  onClose: () => void;
  alumnosDisponibles: Alumno[];
  onListaCreada: (nuevaLista: ListaAlumnos) => void;
}

export function ModalCrearListaAlumnos({
  isOpen,
  onClose,
  alumnosDisponibles,
  onListaCreada,
}: ModalCrearListaAlumnosProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedAlumnoIds, setSelectedAlumnoIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredAlumnos = alumnosDisponibles.filter((a) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white text-blue-950 border-2 border-blue-200 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/20 overflow-hidden">
        {/* Cabecera Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#154495] text-white shadow-sm">
              <Users className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-blue-950">
                Crear Nueva Lista de Alumnos
              </h2>
              <p className="text-xs text-blue-700 font-medium">
                Agrupa alumnos para asignarlos rápidamente a cualquier clase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-blue-900 rounded-xl hover:bg-blue-100/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Nombre de la Lista *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Infantiles Turno Tarde, Avanzados Kumite..."
              className="w-full px-3.5 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-[#154495] focus:bg-white text-sm font-medium transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Descripción (Opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Cinturones Blanco a Verde, 6 a 12 años"
              className="w-full px-3.5 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-[#154495] focus:bg-white text-xs font-medium transition-all"
            />
          </div>

          {/* Selección de Alumnos */}
          <div className="space-y-2 pt-2 border-t border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Seleccionar Alumnos
                </span>
                <span className="text-xs font-bold bg-[#154495] text-white px-2 py-0.5 rounded-full">
                  {selectedAlumnoIds.length} seleccionados
                </span>
              </div>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-[#154495] hover:text-blue-700 font-bold hover:underline"
              >
                {selectedAlumnoIds.length === filteredAlumnos.length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </button>
            </div>

            {/* Buscador de alumnos */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumno por nombre o cinturón..."
                className="w-full pl-9 pr-3 py-2 bg-blue-50/40 border border-blue-200 rounded-xl text-blue-950 placeholder:text-blue-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#154495] focus:bg-white transition-all"
              />
            </div>

            {/* Lista con checkboxes táctiles */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {filteredAlumnos.length === 0 ? (
                <p className="text-center py-4 text-xs text-blue-600 font-medium">
                  No se encontraron alumnos con ese criterio.
                </p>
              ) : (
                filteredAlumnos.map((alumno) => {
                  const isSelected = selectedAlumnoIds.includes(alumno.id);
                  return (
                    <div
                      key={alumno.id}
                      onClick={() => toggleAlumno(alumno.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50 border-[#154495] shadow-xs"
                          : "bg-white border-blue-100 hover:border-blue-300 hover:bg-blue-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#154495] border-[#154495] text-white"
                              : "border-blue-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-950">
                            {alumno.apellido}, {alumno.nombre}
                          </p>
                          <p className="text-[10px] text-blue-600 font-medium">
                            Cinto: {alumno.cinturon_actual}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100/70 text-[#154495] border border-blue-200">
                        {alumno.cinturon_actual}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-blue-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-950 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#154495] hover:bg-blue-800 text-white shadow-md shadow-blue-950/20 flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4 text-blue-200" />
              <span>{loading ? "Creando..." : "Guardar Lista de Alumnos"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
