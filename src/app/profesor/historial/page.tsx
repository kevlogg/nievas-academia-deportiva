import React from "react";
import { requireProfesor } from "@/lib/auth/session";
import { dalGetHistorialClasesProfesor, dalGetProfesores } from "@/lib/dal";
import { HistorialClasesClient } from "@/components/profesor/HistorialClasesClient";

export const dynamic = "force-dynamic";

export default async function ProfesorHistorialPage() {
  const currentUser = await requireProfesor();
  const historialItems = await dalGetHistorialClasesProfesor(
    currentUser.rol === "ADMIN" ? undefined : currentUser.id
  );
  const profesores = await dalGetProfesores();

  return (
    <HistorialClasesClient
      currentUser={currentUser}
      historialItems={historialItems}
      profesoresDisponibles={profesores}
    />
  );
}
