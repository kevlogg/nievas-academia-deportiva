"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error no controlado:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto my-16 p-6 bg-slate-900 border border-red-900/50 rounded-2xl text-center space-y-4 shadow-xl">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Algo no salió como se esperaba
        </h2>
        <p className="text-xs text-slate-400">
          {error.message || "Ocurrió un error inesperado en el sistema del dojo."}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer touch-target-safe"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>

        <Link
          href="/profesor/clases"
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl touch-target-safe"
        >
          Ir al Inicio
        </Link>
      </div>
    </div>
  );
}
