import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/session";
import { dalGetProfesorMetricas } from "@/lib/dal";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  CalendarCheck,
  TrendingUp,
  Award,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfesorMetricasPage() {
  const currentUser = await getCurrentUser();
  const metricas = await dalGetProfesorMetricas(currentUser.id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Botón Volver y Badge Oficial */}
      <div className="flex items-center justify-between">
        <Link
          href="/profesor/clases"
          className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-[#154495] font-bold transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[#154495]" />
          <span>Volver a Tatami</span>
        </Link>

        <span className="text-xs font-bold text-[#154495] bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
          Métricas Oficiales del Mes
        </span>
      </div>

      {/* Tarjeta de Resumen del Sensei con Logo Oficial - Card Clara con acentos azules */}
      <div className="p-5 sm:p-6 bg-white border-2 border-blue-200/90 rounded-3xl shadow-lg shadow-blue-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#154495] border-2 border-blue-400/60 shadow-md shadow-blue-950/20 shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#154495] uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                Sensei Report
              </span>
              <span className="text-xs text-blue-800 font-semibold">Nievas Academia Deportiva</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight mt-0.5">
              {metricas.profesor.nombre_completo}
            </h1>
            <p className="text-xs text-blue-700 font-medium">
              Rendimiento de asistencia y evolución de alumnos en tatami
            </p>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-center min-w-[120px]">
            <div className="flex items-center justify-center gap-1 text-[11px] text-blue-700 font-bold mb-0.5">
              <CalendarCheck className="w-3.5 h-3.5 text-[#154495]" />
              <span>Clases Mes</span>
            </div>
            <span className="text-2xl font-black text-blue-950">
              {metricas.clasesDictadasMes}
            </span>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-center min-w-[120px]">
            <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-bold mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Promedio / Clase</span>
            </div>
            <span className="text-2xl font-black text-emerald-700">
              {metricas.promedioAsistencia}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Alumnos con % de Presentismo y Clases en Cinturón Actual */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#154495] text-white">
              <ShieldCheck className="w-4 h-4 text-blue-100" />
            </div>
            <h2 className="text-base font-bold text-blue-950 tracking-tight">
              Seguimiento de Alumnos & Examen de Cinturón
            </h2>
          </div>
          <span className="text-xs text-blue-700 font-bold">
            {metricas.alumnosMetrics.length} alumnos evaluados
          </span>
        </div>

        <div className="space-y-2.5">
          {metricas.alumnosMetrics.map((item) => {
            const isNearGraduation = item.clasesEnCinturonActual >= 15;

            return (
              <div
                key={item.alumno.id}
                className="p-4 bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl shadow-md shadow-blue-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                {/* Alumno info */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-sm text-[#154495]">
                    {item.alumno.nombre[0]}
                    {item.alumno.apellido[0]}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-blue-950 text-base">
                        {item.alumno.nombre} {item.alumno.apellido}
                      </span>
                      <BeltBadge
                        belt={item.alumno.cinturon_actual}
                        size="sm"
                      />
                    </div>
                    <p className="text-[11px] text-blue-800 font-medium">
                      Clases: {item.clasesNombre.join(", ")}
                    </p>
                  </div>
                </div>

                {/* Métricas del Alumno */}
                <div className="flex items-center gap-4 self-end sm:self-center">
                  {/* % Presentismo */}
                  <div className="text-right">
                    <span className="block text-[10px] text-blue-700 uppercase font-bold">
                      Presentismo
                    </span>
                    <span
                      className={`text-sm font-black ${
                        item.porcentajePresentismo >= 80
                          ? "text-emerald-700"
                          : item.porcentajePresentismo >= 60
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {item.porcentajePresentismo}%
                    </span>
                  </div>

                  {/* Clases en Cinturón Actual (Para derecho a examen) */}
                  <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-blue-700 font-bold">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>Clases en Cinto</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="text-base font-black text-blue-950">
                        {item.clasesEnCinturonActual}
                      </span>
                      <span className="text-[10px] text-blue-600 font-medium">
                        acumuladas
                      </span>
                    </div>

                    {isNearGraduation && (
                      <span className="inline-block mt-1 text-[9px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
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
