import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { dalGetTodosAlumnos, dalGetPreExamenes, dalGetPreExamenSesiones } from "@/lib/dal";
import { PreExamenClient } from "@/components/admin/PreExamenClient";

export const dynamic = "force-dynamic";

export default async function PreExamenPage() {
  const currentUser = await requireAuth();
  const [alumnos, preExamenes, sesiones] = await Promise.all([
    dalGetTodosAlumnos(),
    dalGetPreExamenes(),
    dalGetPreExamenSesiones(),
  ]);

  return (
    <PreExamenClient
      currentUser={currentUser}
      initialAlumnos={alumnos}
      initialPreExamenes={preExamenes}
      initialSesiones={sesiones}
    />
  );
}
