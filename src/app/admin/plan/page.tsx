import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import {
  dalGetAdminClases,
  dalGetAdminDashboardMetrics,
  dalGetProfesores,
} from "@/lib/dal";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

interface AdminPlanPageProps {
  searchParams?: Promise<{ sub?: string }>;
}

export default async function AdminPlanPage({ searchParams }: AdminPlanPageProps) {
  const currentUser = await requireAdmin();

  const [metrics, clases, profesores, resolvedParams] = await Promise.all([
    dalGetAdminDashboardMetrics(),
    dalGetAdminClases(),
    dalGetProfesores(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  return (
    <AdminDashboardClient
      currentUser={currentUser}
      metrics={metrics}
      clases={clases}
      profesores={profesores}
      initialTab="plan"
      initialSubSuccess={resolvedParams?.sub === "success"}
    />
  );
}
