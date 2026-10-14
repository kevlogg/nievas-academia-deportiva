import Link from "next/link";
import { AlertCircle, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto my-16 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
        <AlertCircle className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Página no encontrada
        </h2>
        <p className="text-xs text-slate-400">
          La ruta solicitada no existe o no tienes permisos de acceso en Nievas Academia Deportiva.
        </p>
      </div>
      <Link
        href="/profesor/clases"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md touch-target-safe"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Ir a Clases de Tatami</span>
      </Link>
    </div>
  );
}
