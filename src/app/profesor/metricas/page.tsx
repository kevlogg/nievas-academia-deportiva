import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { dalGetProfesorMetricasCompletas } from "@/lib/dal";
import { ProfesorMetricasClient } from "@/components/profesor/ProfesorMetricasClient";

export const dynamic = "force-dynamic";

export default async function ProfesorMetricasPage() {
  const currentUser = await getCurrentUser();
  const metricasCompletas = await dalGetProfesorMetricasCompletas(currentUser.id);

  return (
    <ProfesorMetricasClient
      initialData={metricasCompletas}
      userRole={currentUser.rol}
    />
  );
}
