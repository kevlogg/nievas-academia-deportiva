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
      <div className="max-w-md mx-auto my-12 p-6 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-white/20 text-cyan-300 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Acceso Restringido - Headmaster Solamente
          </h2>
          <p className="text-xs text-blue-200">
            Tu usuario actual ({currentUser.nombre_completo}) tiene rol{" "}
            <span className="font-semibold text-cyan-300">{currentUser.rol}</span>.
            Para acceder al panel administrativo directivo, cambia al rol Headmaster en la barra superior.
          </p>
        </div>
        <Link
          href="/profesor/clases"
          className="inline-block px-5 py-2.5 bg-white hover:bg-blue-50 text-[#0F3E86] font-bold text-xs rounded-xl shadow-md transition-colors touch-target-safe cursor-pointer"
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
      currentUser={currentUser}
      metrics={metrics}
      clases={clases}
      profesores={profesores}
    />
  );
}
