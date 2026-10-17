import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import { dalGetHistorialClasesProfesor, dalGetProfesores } from "@/lib/dal";
import { HistorialClasesClient } from "@/components/profesor/HistorialClasesClient";

export const dynamic = "force-dynamic";

export default async function AdminHistorialPage() {
  const currentUser = await requireAdmin();
  const historialItems = await dalGetHistorialClasesProfesor();
  const profesores = await dalGetProfesores();

  return (
    <HistorialClasesClient
      currentUser={currentUser}
      historialItems={historialItems}
      profesoresDisponibles={profesores}
    />
  );
}
