import React from "react";
import { requireProfesor } from "@/lib/auth/session";
import {
  dalGetUltimasClasesProfesor,
  dalGetListasAlumnos,
  dalGetTodosAlumnos,
  dalGetClasesAbiertas,
} from "@/lib/dal";
import { ProfesorClasesClient } from "@/components/profesor/ProfesorClasesClient";

export const dynamic = "force-dynamic";

export default async function ProfesorClasesPage() {
  const currentUser = await requireProfesor();
  const ultimasClases = await dalGetUltimasClasesProfesor(
    currentUser.rol === "ADMIN" ? undefined : currentUser.id,
    3
  );
  const listasAlumnos = await dalGetListasAlumnos();
  const todosAlumnos = await dalGetTodosAlumnos();
  const clasesAbiertas = await dalGetClasesAbiertas(
    currentUser.rol === "ADMIN" ? undefined : currentUser.id
  );

  return (
    <ProfesorClasesClient
      currentUser={currentUser}
      initialUltimasClases={ultimasClases}
      initialListasAlumnos={listasAlumnos}
      alumnosDisponibles={todosAlumnos}
      initialClasesAbiertas={clasesAbiertas}
    />
  );
}
