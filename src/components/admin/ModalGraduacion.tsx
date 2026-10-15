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
      <div className="w-full max-w-md bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-5 shadow-2xl shadow-blue-950/50 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E57A8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-amber-500 shadow-sm">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Examen y Graduación de Cinturón
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Ascenso formal en Nievas Academia Deportiva
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Alumno */}
        <div className="p-3 bg-[#0A2E65] rounded-xl border border-[#2056A8] flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200 font-medium">Alumno a graduar:</p>
            <p className="font-bold text-sm text-white">
              {alumno.nombre} {alumno.apellido}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-blue-200 mb-1 font-medium">Cinturón Actual:</p>
            <BeltBadge belt={alumno.cinturon_actual} size="sm" />
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Nuevo Cinturón Adquirido *
            </label>
            <select
              value={nuevoCinturon}
              onChange={(e) => setNuevoCinturon(e.target.value as KarateBelt)}
              className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            >
              {BELTS.map((b) => (
                <option key={b} value={b} className="bg-[#082552] text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Fecha de Graduación / Examen *
            </label>
            <input
              type="date"
              required
              value={fechaGraduacion}
              onChange={(e) => setFechaGraduacion(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Observaciones / Kata evaluado
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Demostró excelente kihon y kata Heian Nidan ante tribunal..."
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="pt-3 border-t border-[#1E57A8] flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
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
