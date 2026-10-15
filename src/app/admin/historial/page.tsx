import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { dalGetHistorialClasesProfesor } from "@/lib/dal";
import { HistorialClasesClient } from "@/components/profesor/HistorialClasesClient";

export const dynamic = "force-dynamic";

export default async function AdminHistorialPage() {
  const currentUser = await getCurrentUser();
  // Para admin traemos el historial de todas las clases
  const historialItems = await dalGetHistorialClasesProfesor();

  return (
    <HistorialClasesClient
      currentUser={currentUser}
      historialItems={historialItems}
    />
  );
}
