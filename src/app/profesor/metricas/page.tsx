import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  dalGetProfesorMetricasCompletas,
  dalGetDojoMetricasCompletas,
} from "@/lib/dal";
import { ProfesorMetricasClient } from "@/components/profesor/ProfesorMetricasClient";

export const dynamic = "force-dynamic";

export default async function ProfesorMetricasPage() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser.rol === "ADMIN";

  const [metricasCompletas, dojoData] = await Promise.all([
    dalGetProfesorMetricasCompletas(currentUser.id),
    isAdmin ? dalGetDojoMetricasCompletas() : Promise.resolve(undefined),
  ]);

  return (
    <ProfesorMetricasClient
      initialData={metricasCompletas}
      dojoData={dojoData}
      userRole={currentUser.rol}
    />
  );
}
