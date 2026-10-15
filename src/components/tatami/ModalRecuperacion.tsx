"use client";

import React, { useState, useTransition } from "react";
import { Alumno } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { buscarAlumnosRecuperacionAction } from "@/lib/actions/alumnos.actions";
import { agregarAlumnoRecuperacionAction } from "@/lib/actions/asistencia.actions";
import { Search, UserPlus, X, Loader2, AlertCircle } from "lucide-react";

interface ModalRecuperacionProps {
  isOpen: boolean;
  onClose: () => void;
  sesionId: string;
  onAlumnoAgregado: (alumno: Alumno) => void;
}

export function ModalRecuperacion({
  isOpen,
  onClose,
  sesionId,
  onAlumnoAgregado,
}: ModalRecuperacionProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Alumno[]>([]);
  const [isSearching, startSearching] = useTransition();
  const [isAdding, startAdding] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setError(null);

    if (val.trim().length >= 2) {
      startSearching(async () => {
        const res = await buscarAlumnosRecuperacionAction(val, sesionId);
        if (res.success && res.data) {
          setResults(res.data);
        } else {
          setResults([]);
        }
      });
    } else {
      setResults([]);
    }
  };

  const handleSelectAlumno = (alumno: Alumno) => {
    startAdding(async () => {
      const res = await agregarAlumnoRecuperacionAction(sesionId, alumno.id);
      if (res.success) {
        onAlumnoAgregado(alumno);
        onClose();
      } else {
        setError(res.error || "Error al agregar alumno");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-recuperacion-title"
    >
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-950/70 border border-red-800/50 text-red-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="modal-recuperacion-title"
                className="text-base font-bold text-white tracking-tight"
              >
                Alumno de Recuperación
              </h2>
              <p className="text-xs text-slate-400">
                Buscar en todo el dojo para incorporar a esta clase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 touch-target-safe"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="my-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Buscar por nombre, apellido o cinturón..."
            className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 touch-target-safe"
            autoFocus
          />
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div className="overflow-y-auto flex-1 space-y-2 pr-1 min-h-[160px]">
          {query.trim().length < 2 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              Escribe al menos 2 caracteres para buscar alumnos del dojo
            </div>
          )}

          {query.trim().length >= 2 && results.length === 0 && !isSearching && (
            <div className="py-8 text-center text-slate-500 text-xs">
              No se encontraron alumnos disponibles para recuperación
            </div>
          )}

          {results.map((alumno) => (
            <button
              key={alumno.id}
              onClick={() => handleSelectAlumno(alumno)}
              disabled={isAdding}
              className="w-full flex items-center justify-between p-3 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl transition-all duration-150 text-left touch-target-safe group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                  {alumno.nombre[0]}
                  {alumno.apellido[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                    {alumno.nombre} {alumno.apellido}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Tel: {alumno.telefono_contacto}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                <span className="text-xs bg-blue-600/90 text-white font-semibold px-2.5 py-1 rounded-lg group-hover:bg-blue-500 transition-colors">
                  + Agregar
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 mt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors touch-target-safe cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
