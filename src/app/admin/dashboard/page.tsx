import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  dalGetAdminClases,
  dalGetAdminDashboardMetrics,
  dalGetProfesores,
} from "@/lib/dal";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();

  // Verificación de RBAC: Solo ADMIN
  if (currentUser.rol !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-red-900/50 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Acceso Restringido - Headmaster Solamente
          </h2>
          <p className="text-xs text-slate-400">
            Tu usuario actual ({currentUser.nombre_completo}) tiene rol{" "}
            <span className="font-semibold text-red-400">{currentUser.rol}</span>.
            Para acceder al panel administrativo directivo, cambia al rol Headmaster en la barra superior.
          </p>
        </div>
        <Link
          href="/profesor/clases"
          className="inline-block px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950 touch-target-safe"
        >
          Ir a mis Clases de Profesor
        </Link>
      </div>
    );
  }

  const [metrics, clases, profesores] = await Promise.all([
    dalGetAdminDashboardMetrics(),
    dalGetAdminClases(),
    dalGetProfesores(),
  ]);

  return (
    <AdminDashboardClient
      metrics={metrics}
      clases={clases}
      profesores={profesores}
    />
  );
}
