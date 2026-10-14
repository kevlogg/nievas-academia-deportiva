import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  dalGetClaseById,
  dalGetOrCreateSesionClase,
  dalGetSesionDetalle,
} from "@/lib/dal";
import { AsistenciaTatamiList } from "@/components/tatami/AsistenciaTatamiList";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface AsistenciaPageProps {
  params: Promise<{ id: string }>;
}

export default async function AsistenciaTatamiPage({
  params,
}: AsistenciaPageProps) {
  const { id: claseId } = await params;
  const currentUser = await getCurrentUser();

  const clase = await dalGetClaseById(claseId);
  if (!clase) {
    notFound();
  }

  // Obtener o inicializar la sesión de tatami del día
  const sesion = await dalGetOrCreateSesionClase(claseId);
  const detalle = await dalGetSesionDetalle(sesion.id);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link
          href="/profesor/clases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-slate-800 transition-colors touch-target-safe"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Clases</span>
        </Link>

        <span className="text-xs text-slate-500 font-mono">
          Sensei: {currentUser.nombre_completo}
        </span>
      </div>

      {/* Componente Interactivo Táctil Tatami */}
      <AsistenciaTatamiList
        clase={clase}
        initialSesion={detalle.sesion}
        initialItems={detalle.items}
        isAdmin={currentUser.rol === "ADMIN"}
      />
    </div>
  );
}
