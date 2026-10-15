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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-recuperacion-title"
    >
      <div className="w-full sm:max-w-md bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl shadow-blue-950/50 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E57A8]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <UserPlus className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2
                id="modal-recuperacion-title"
                className="text-base font-bold text-white tracking-tight"
              >
                Alumno de Recuperación
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Buscar en todo el dojo para incorporar a esta clase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target-safe cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="my-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Buscar por nombre, apellido o cinturón..."
            className="w-full pl-9 pr-4 py-3 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-white touch-target-safe"
            autoFocus
          />
        </div>

        {error && (
          <div className="mb-3 p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div className="overflow-y-auto flex-1 space-y-2 pr-1 min-h-[160px]">
          {query.trim().length < 2 && (
            <div className="py-8 text-center text-blue-200 text-xs font-medium">
              Escribe al menos 2 caracteres para buscar alumnos del dojo
            </div>
          )}

          {query.trim().length >= 2 && results.length === 0 && !isSearching && (
            <div className="py-8 text-center text-blue-200 text-xs font-medium">
              No se encontraron alumnos disponibles para recuperación
            </div>
          )}

          {results.map((alumno) => (
            <button
              key={alumno.id}
              onClick={() => handleSelectAlumno(alumno)}
              disabled={isAdding}
              className="w-full flex items-center justify-between p-3 bg-[#0A2E65] hover:bg-[#124285] border border-[#2056A8] rounded-xl transition-all duration-150 text-left touch-target-safe group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xs text-cyan-300">
                  {alumno.nombre[0]}
                  {alumno.apellido[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    {alumno.nombre} {alumno.apellido}
                  </p>
                  <p className="text-[11px] text-blue-200">
                    Tel: {alumno.telefono_contacto}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                <span className="text-xs bg-white text-[#0F3E86] font-extrabold px-2.5 py-1 rounded-lg group-hover:bg-blue-50 transition-colors shadow-xs">
                  + Agregar
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#1E57A8] mt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors touch-target-safe cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
