import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfesor } from "@/lib/auth/session";
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
  searchParams: Promise<{ sesionId?: string }>;
}

export default async function AsistenciaTatamiPage({
  params,
  searchParams,
}: AsistenciaPageProps) {
  const { id: claseId } = await params;
  const { sesionId } = await searchParams;
  const currentUser = await requireProfesor();

  const clase = await dalGetClaseById(claseId);
  if (!clase) {
    notFound();
  }

  // Si se especificó una sesionId (por ejemplo al editar asistencia de una clase cerrada del historial):
  let detalle;
  if (sesionId) {
    try {
      detalle = await dalGetSesionDetalle(sesionId);
    } catch {
      const sesion = await dalGetOrCreateSesionClase(claseId);
      detalle = await dalGetSesionDetalle(sesion.id);
    }
  } else {
    // Obtener o inicializar la sesión de tatami del día
    const sesion = await dalGetOrCreateSesionClase(claseId);
    detalle = await dalGetSesionDetalle(sesion.id);
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link
          href="/profesor/clases"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#0F3E86] hover:text-white py-2 px-3 rounded-xl bg-blue-50 hover:bg-[#0F3E86] border border-blue-200 transition-all touch-target-safe shadow-xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Clases</span>
        </Link>

        <span className="text-xs text-slate-700 font-bold bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-xs">
          Sensei: {currentUser.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim()}
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
