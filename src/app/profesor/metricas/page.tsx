import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { dalGetProfesorMetricas } from "@/lib/dal";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  BarChart3,
  CalendarCheck,
  TrendingUp,
  Award,
  ChevronLeft,
  Users,
  Flame,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfesorMetricasPage() {
  const currentUser = await getCurrentUser();
  const metricas = await dalGetProfesorMetricas(currentUser.id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/profesor/clases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-slate-800 transition-colors touch-target-safe"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Tatami</span>
        </Link>

        <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/60">
          Métricas del Mes
        </span>
      </div>

      {/* Tarjeta de Resumen del Sensei */}
      <div className="p-5 bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 border border-red-900/50 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
              Sensei Report
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {metricas.profesor.nombre_completo}
          </h1>
          <p className="text-xs text-slate-300">
            Rendimiento de asistencia y evolución de alumnos en tatami
          </p>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center min-w-[120px]">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <CalendarCheck className="w-3.5 h-3.5 text-red-400" />
              <span>Clases Mes</span>
            </div>
            <span className="text-2xl font-black text-white">
              {metricas.clasesDictadasMes}
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center min-w-[120px]">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Promedio / Clase</span>
            </div>
            <span className="text-2xl font-black text-emerald-400">
              {metricas.promedioAsistencia}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Alumnos con % de Presentismo y Clases en Cinturón Actual */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-600/90 text-white">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Seguimiento de Alumnos & Examen de Cinturón
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {metricas.alumnosMetrics.length} alumnos evaluados
          </span>
        </div>

        <div className="space-y-2.5">
          {metricas.alumnosMetrics.map((item) => {
            const isNearGraduation = item.clasesEnCinturonActual >= 15;

            return (
              <div
                key={item.alumno.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                {/* Alumno info */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-200">
                    {item.alumno.nombre[0]}
                    {item.alumno.apellido[0]}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {item.alumno.nombre} {item.alumno.apellido}
                      </span>
                      <BeltBadge
                        belt={item.alumno.cinturon_actual}
                        size="sm"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Clases: {item.clasesNombre.join(", ")}
                    </p>
                  </div>
                </div>

                {/* Métricas del Alumno */}
                <div className="flex items-center gap-4 self-end sm:self-center">
                  {/* % Presentismo */}
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">
                      Presentismo
                    </span>
                    <span
                      className={`text-sm font-black ${
                        item.porcentajePresentismo >= 80
                          ? "text-emerald-400"
                          : item.porcentajePresentismo >= 60
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {item.porcentajePresentismo}%
                    </span>
                  </div>

                  {/* Clases en Cinturón Actual (Para derecho a examen) */}
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Clases en Cinto</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="text-base font-extrabold text-amber-300">
                        {item.clasesEnCinturonActual}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        acumuladas
                      </span>
                    </div>

                    {isNearGraduation && (
                      <span className="inline-block mt-1 text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800">
                        Apto Examen 🥋
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
