import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import { dalGetAdminAlumnos, dalGetProfesores } from "@/lib/dal";
import { AdminAlumnosClient } from "@/components/admin/AdminAlumnosClient";

export const dynamic = "force-dynamic";

export default async function AdminAlumnosPage() {
  const currentUser = await requireAdmin();

  const alumnos = await dalGetAdminAlumnos();
  const profesores = await dalGetProfesores();

  return (
    <AdminAlumnosClient
      currentUser={currentUser}
      initialAlumnos={alumnos}
      profesores={profesores}
    />
  );
}
