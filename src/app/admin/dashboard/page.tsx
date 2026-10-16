import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import {
  dalGetAdminClases,
  dalGetAdminDashboardMetrics,
  dalGetProfesores,
} from "@/lib/dal";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const currentUser = await requireAdmin();

  const [metrics, clases, profesores] = await Promise.all([
    dalGetAdminDashboardMetrics(),
    dalGetAdminClases(),
    dalGetProfesores(),
  ]);

  return (
    <AdminDashboardClient
      currentUser={currentUser}
      metrics={metrics}
      clases={clases}
      profesores={profesores}
    />
  );
}
