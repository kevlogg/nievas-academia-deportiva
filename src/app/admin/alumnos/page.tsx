import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { dalGetAdminAlumnos } from "@/lib/dal";
import { AdminAlumnosClient } from "@/components/admin/AdminAlumnosClient";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAlumnosPage() {
  const currentUser = await getCurrentUser();

  if (currentUser.rol !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-red-900/50 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Acceso Reservado para Headmaster
          </h2>
          <p className="text-xs text-slate-400">
            Solo la dirección del dojo puede gestionar graduaciones de cinto y notas confidenciales.
          </p>
        </div>
        <Link
          href="/profesor/clases"
          className="inline-block px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md touch-target-safe"
        >
          Volver al Tatami
        </Link>
      </div>
    );
  }

  const alumnos = await dalGetAdminAlumnos();

  return <AdminAlumnosClient initialAlumnos={alumnos} />;
}
