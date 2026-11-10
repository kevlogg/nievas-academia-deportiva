import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import {
  dalGetAdminClases,
  dalGetAdminDashboardMetrics,
  dalGetProfesores,
} from "@/lib/dal";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

interface AdminDashboardPageProps {
  searchParams?: Promise<{ tab?: string; sub?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
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
      initialTab={resolvedParams?.tab}
      initialSubSuccess={resolvedParams?.sub === "success"}
    />
  );
}
