import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import { dalGetTorneos, dalGetAdminAlumnos } from "@/lib/dal";
import { AdminTorneosClient } from "@/components/admin/AdminTorneosClient";

export const dynamic = "force-dynamic";

export default async function AdminTorneosPage() {
  const currentUser = await requireAdmin();

  const [torneos, alumnos] = await Promise.all([
    dalGetTorneos(),
    dalGetAdminAlumnos(),
  ]);

  return (
    <AdminTorneosClient
      currentUser={currentUser}
      initialTorneos={torneos}
      alumnos={alumnos}
    />
  );
}
