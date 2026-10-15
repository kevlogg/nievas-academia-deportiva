import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { dalGetHistorialClasesProfesor } from "@/lib/dal";
import { HistorialClasesClient } from "@/components/profesor/HistorialClasesClient";

export const dynamic = "force-dynamic";

export default async function ProfesorHistorialPage() {
  const currentUser = await getCurrentUser();
  const historialItems = await dalGetHistorialClasesProfesor(currentUser.id);

  return (
    <HistorialClasesClient
      currentUser={currentUser}
      historialItems={historialItems}
    />
  );
}
