import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  dalGetUltimasClasesProfesor,
  dalGetListasAlumnos,
  dalGetTodosAlumnos,
} from "@/lib/dal";
import { ProfesorClasesClient } from "@/components/profesor/ProfesorClasesClient";

export const dynamic = "force-dynamic";

export default async function ProfesorClasesPage() {
  const currentUser = await getCurrentUser();
  const ultimasClases = await dalGetUltimasClasesProfesor(currentUser.id, 3);
  const listasAlumnos = await dalGetListasAlumnos();
  const todosAlumnos = await dalGetTodosAlumnos();

  return (
    <ProfesorClasesClient
      currentUser={currentUser}
      initialUltimasClases={ultimasClases}
      initialListasAlumnos={listasAlumnos}
      alumnosDisponibles={todosAlumnos}
    />
  );
}
