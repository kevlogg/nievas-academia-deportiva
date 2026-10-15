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
      <div className="w-full max-w-md bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-5 shadow-2xl shadow-blue-950/50 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E57A8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-amber-500 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Nota Privada Confidencial
              </h2>
              <p className="text-xs text-cyan-300 font-medium">
                Solo visible por el Dueño / Headmaster
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

        <div className="text-xs text-blue-200">
          Alumno:{" "}
          <span className="font-bold text-white">
            {alumno.nombre} {alumno.apellido}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Observaciones Médicas, Situaciones Familiares o Cuotas:
            </label>
            <textarea
              rows={4}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Escribe notas reservadas del alumno aquí..."
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/60"
            />
          </div>

          <div className="pt-3 border-t border-[#1E57A8] flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F3E86]" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#0F3E86]" />
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
