"use client";

import React, { useState, useTransition } from "react";
import { Alumno } from "@/types";
import { actualizarNotaPrivadaAction } from "@/lib/actions/alumnos.actions";
import { ShieldAlert, X, Loader2, Save, AlertCircle } from "lucide-react";

interface ModalNotaPrivadaProps {
  alumno: Alumno | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nuevaNota: string) => void;
}

export function ModalNotaPrivada({
  alumno,
  isOpen,
  onClose,
  onSuccess,
}: ModalNotaPrivadaProps) {
  const [nota, setNota] = useState(alumno?.notas_privadas || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !alumno) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await actualizarNotaPrivadaAction(alumno.id, nota);
      if (res.success) {
        onSuccess(nota);
        onClose();
      } else {
        setError(res.error || "Error al actualizar la nota confidencial");
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
            <div className="p-2 rounded-xl bg-red-950/80 border border-red-800/60 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Nota Privada Confidencial
              </h2>
              <p className="text-xs text-amber-400 font-medium">
                Solo visible por el Dueño / Headmaster
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

        <div className="text-xs text-slate-300">
          Alumno:{" "}
          <span className="font-bold text-white">
            {alumno.nombre} {alumno.apellido}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Observaciones Médicas, Situaciones Familiares o Cuotas:
            </label>
            <textarea
              rows={4}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Escribe notas reservadas del alumno aquí..."
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
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Nota</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
