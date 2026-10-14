"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ChevronLeft } from "lucide-react";

export default function AsistenciaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en la toma de asistencia:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-red-900/50 rounded-2xl text-center space-y-4 shadow-2xl">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Error al cargar la sesión de Tatami
        </h2>
        <p className="text-xs text-slate-400">
          {error.message ||
            "Ocurrió un problema temporal al sincronizar la lista de alumnos."}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer touch-target-safe"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>

        <Link
          href="/profesor/clases"
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 touch-target-safe"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Clases</span>
        </Link>
      </div>
    </div>
  );
}
