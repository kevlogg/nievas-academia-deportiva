import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/session";
import { dalGetProfesorClases } from "@/lib/dal";
import { formatDaysList, formatTime } from "@/lib/utils";
import {
  CalendarDays,
  Clock,
  Users,
  ClipboardCheck,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfesorClasesPage() {
  const currentUser = await getCurrentUser();
  const clases = await dalGetProfesorClases(currentUser.id);

  // Determinar el día de hoy (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
  const hoyIndex = new Date().getDay();

  // Filtrar o priorizar clases que se dictan hoy
  const clasesHoy = clases.filter((c) => c.dias_semana.includes(hoyIndex));
  const otrasClases = clases.filter((c) => !c.dias_semana.includes(hoyIndex));

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida al Sensei con Logo Oficial */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#154495]/40 via-slate-900 to-slate-900 border border-blue-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#154495] border-2 border-blue-400/50 shadow-lg shadow-blue-950/80 shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Logo Nievas"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest bg-blue-950/90 px-2 py-0.5 rounded-md border border-blue-800/60">
                Tatami Sensei
              </span>
              <span className="text-xs text-slate-400 font-medium">Nievas Academia Deportiva</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {currentUser.nombre_completo}
            </h1>
            <p className="text-xs text-slate-300">
              Selecciona la clase para iniciar o continuar la toma de asistencia en el tatami.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href="/profesor/metricas"
            className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-blue-900/50 flex items-center gap-1.5 transition-colors touch-target-safe cursor-pointer shadow-sm"
          >
            <span>Ver Mis Métricas</span>
            <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
          </Link>
        </div>
      </div>

      {/* SECCIÓN 1: CLASES DE HOY (Detección Automática) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#154495] text-white shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-200" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Clases de Hoy (Enfoque Tatami)
            </h2>
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Día actual detectado
          </span>
        </div>

        {clasesHoy.length === 0 ? (
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">
              No tienes clases programadas para el día de hoy según el calendario oficial.
            </p>
            <p className="text-xs text-slate-500">
              Puedes acceder a cualquiera de tus clases habituales en la lista debajo para registrar entrenamientos especiales.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clasesHoy.map((clase) => (
              <div
                key={clase.id}
                className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-blue-600/60 rounded-2xl shadow-xl space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-[#154495] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs border-b border-l border-blue-400/30">
                  Hoy en Tatami
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {clase.nombre}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {formatTime(clase.hora_inicio)} a{" "}
                        {formatTime(clase.hora_fin)}
                      </span>
                    </span>

                    <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                      <span>{formatDaysList(clase.dias_semana)}</span>
                    </span>

                    <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {clase.total_inscriptos || 0} / {clase.cupo_maximo} cupo
                      </span>
                    </span>
                  </div>
                </div>

                {/* Botón Táctil Gigante para Tatami con color de marca */}
                <Link
                  href={`/profesor/clases/${clase.id}/asistencia`}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-950/80 border border-blue-400/40 flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer"
                >
                  <ClipboardCheck className="w-5 h-5 text-blue-200" />
                  <span>PASAR ASISTENCIA EN TATAMI</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECCIÓN 2: OTRAS CLASES DE LA SEMANA */}
      {otrasClases.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-300 tracking-tight">
              Otras Clases Asignadas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otrasClases.map((clase) => (
              <div
                key={clase.id}
                className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-blue-900/60 transition-colors flex items-center justify-between gap-3 shadow-md"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-white">
                    {clase.nombre}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      {formatTime(clase.hora_inicio)} -{" "}
                      {formatTime(clase.hora_fin)}
                    </span>
                    <span>•</span>
                    <span>{formatDaysList(clase.dias_semana)}</span>
                  </div>
                </div>

                <Link
                  href={`/profesor/clases/${clase.id}/asistencia`}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1 touch-target-safe cursor-pointer"
                >
                  <span>Abrir</span>
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
