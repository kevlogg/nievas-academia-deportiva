"use client";

import React, { useState, useTransition } from "react";
import { Alumno, KarateBelt } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { registrarGraduacionAction } from "@/lib/actions/alumnos.actions";
import { Award, X, Loader2, AlertCircle } from "lucide-react";

interface ModalGraduacionProps {
  alumno: Alumno | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nuevoCinturon: KarateBelt) => void;
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

export function ModalGraduacion({
  alumno,
  isOpen,
  onClose,
  onSuccess,
}: ModalGraduacionProps) {
  const [nuevoCinturon, setNuevoCinturon] = useState<KarateBelt>("Amarillo");
  const [fechaGraduacion, setFechaGraduacion] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observaciones, setObservaciones] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !alumno) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await registrarGraduacionAction({
        alumnoId: alumno.id,
        nuevoCinturon,
        fechaGraduacion,
        observaciones,
      });

      if (res.success) {
        onSuccess(nuevoCinturon);
        onClose();
      } else {
        setError(res.error || "Error al registrar la graduación");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Examen y Graduación de Cinturón
              </h2>
              <p className="text-xs text-slate-400">
                Ascenso formal en Nievas Academia Deportiva
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Alumno */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Alumno a graduar:</p>
            <p className="font-bold text-sm text-white">
              {alumno.nombre} {alumno.apellido}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 mb-1">Cinturón Actual:</p>
            <BeltBadge belt={alumno.cinturon_actual} size="sm" />
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nuevo Cinturón Adquirido *
            </label>
            <select
              value={nuevoCinturon}
              onChange={(e) => setNuevoCinturon(e.target.value as KarateBelt)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
            >
              {BELTS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fecha de Graduación / Examen *
            </label>
            <input
              type="date"
              required
              value={fechaGraduacion}
              onChange={(e) => setFechaGraduacion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observaciones / Kata evaluado
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Demostró excelente kihon y kata Heian Nidan ante tribunal..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Confirmar Graduación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
