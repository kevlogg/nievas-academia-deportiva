import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { dalGetTodosAlumnos, dalGetPreExamenes } from "@/lib/dal";
import { PreExamenClient } from "@/components/admin/PreExamenClient";

export const dynamic = "force-dynamic";

export default async function PreExamenPage() {
  const currentUser = await requireAuth();
  const [alumnos, preExamenes] = await Promise.all([
    dalGetTodosAlumnos(),
    dalGetPreExamenes(),
  ]);

  return (
    <PreExamenClient
      currentUser={currentUser}
      initialAlumnos={alumnos}
      initialPreExamenes={preExamenes}
    />
  );
}
