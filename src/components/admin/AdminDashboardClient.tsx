"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdminDashboardMetricsData, Clase, Usuario } from "@/types";
import { ModalCrearClase } from "@/components/admin/ModalCrearClase";
import { formatDaysList, formatTime } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Award,
  Calendar,
  Phone,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

interface AdminDashboardClientProps {
  metrics: AdminDashboardMetricsData;
  clases: Clase[];
  profesores: Usuario[];
}

export function AdminDashboardClient({
  metrics,
  clases,
  profesores,
}: AdminDashboardClientProps) {
  const [isCrearClaseOpen, setIsCrearClaseOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Headmaster con Logo Oficial de Nievas */}
      <div className="p-5 bg-gradient-to-r from-[#154495]/40 via-slate-900 to-slate-900 border border-blue-900/50 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#154495] border-2 border-blue-400/50 shadow-lg shadow-blue-950/80 shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-800/60">
                Sensei Headmaster
              </span>
              <span className="text-xs text-blue-300 font-medium">Control Directivo Oficial</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
              Nievas Academia Deportiva
            </h1>
            <p className="text-xs text-slate-300">
              Panel directivo: métricas consolidadas, ausentismo crítico y desempeño de profesores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950 flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95 border border-blue-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Clase</span>
          </button>

          <Link
            href="/admin/alumnos"
            className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-blue-900/50 flex items-center gap-1.5 touch-target-safe"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Alumnos & Cintos</span>
          </Link>
        </div>
      </div>

      {/* KPIs Globales del Dojo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Alumnos Activos</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {metrics.totalAlumnosActivos}
          </p>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>100% matriculados</span>
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Promedio Asistencia</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {metrics.promedioGeneralAsistencia}%
          </p>
          <span className="text-[11px] text-slate-400">
            Asistencia global dojo
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Clases de Tatami</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{clases.length}</p>
          <span className="text-[11px] text-slate-400">
            Horarios semanales
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-red-900/60 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-red-400 text-xs">
            <span>Alertas Deserción</span>
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-red-400">
            {metrics.alertasDesercion.length}
          </p>
          <span className="text-[11px] text-red-300 font-semibold">
            ≥ 3 faltas seguidas
          </span>
        </div>
      </div>

      {/* SECCIÓN CRÍTICA: ALERTAS DE DESERCIÓN (3 O MÁS AUSENCIAS CONSECUTIVAS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-600 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Alertas de Deserción Escolar de Karate
            </h2>
          </div>
          <span className="text-xs text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded-full border border-red-800 font-semibold">
            Requiere Contacto Inmediato
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {metrics.alertasDesercion.map((alerta) => (
            <div
              key={alerta.alumno.id}
              className="p-4 bg-slate-900/90 border-2 border-red-800/80 rounded-2xl shadow-lg space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      {alerta.alumno.nombre} {alerta.alumno.apellido}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white uppercase">
                      {alerta.ausenciasConsecutivas} Ausencias
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cinturón: {alerta.alumno.cinturon_actual} • Última asistencia:{" "}
                    {alerta.ultimaClaseAsistida || "Sin registro reciente"}
                  </p>
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">
                    Contacto / Tutor
                  </p>
                  <p className="font-semibold text-slate-200">
                    {alerta.contactoEmergencia}
                  </p>
                </div>

                <a
                  href={`tel:${alerta.telefonoContacto}`}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm touch-target-safe cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN: DESEMPEÑO POR PROFESOR */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Desempeño y Cumplimiento de Profesores
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.desempenoProfesores.map((prof) => (
            <div
              key={prof.profesorId}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {prof.nombre}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sensei de Tatami Oficial
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                  {prof.retencionPorcentaje}% Retención
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    Clases Dictadas / Programadas
                  </span>
                  <span className="font-bold text-white text-sm">
                    {prof.clasesDictadasMes} / {prof.clasesProgramadasMes}
                  </span>
                </div>

                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    Promedio Alumnos / Clase
                  </span>
                  <span className="font-bold text-blue-400 text-sm">
                    {prof.promedioAlumnosPorClase}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN: CONVOCATORIA DE CLASES (MAYOR VS MENOR) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Convocatoria de Clases de Karate
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mayor Convocatoria */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <ArrowUpRight className="w-4 h-4" />
              <span>Mayor Convocatoria</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMayorConvocatoria.map((c) => (
                <div
                  key={c.claseId}
                  className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-white">{c.nombre}</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 block">
                      {c.promedioAsistencias} prom.
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {c.inscriptos} inscriptos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Menor Convocatoria */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
              <ArrowDownRight className="w-4 h-4" />
              <span>Menor Convocatoria (Reforzar Promoción)</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMenorConvocatoria.map((c) => (
                <div
                  key={c.claseId}
                  className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-white">{c.nombre}</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-300 block">
                      {c.promedioAsistencias} prom.
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {c.inscriptos} inscriptos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: GESTIÓN DE CLASES & HORARIOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Gestión de Horarios y Profesores Asignados
            </h2>
          </div>

          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
          >
            + Nueva Clase
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2"
            >
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-sm text-white">{clase.nombre}</h4>
              </div>
              <p className="text-xs text-slate-400">
                Sensei:{" "}
                <span className="text-slate-200 font-medium">
                  {clase.profesor_nombre || "Sensei"}
                </span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>{formatDaysList(clase.dias_semana)}</span>
                <span>
                  {formatTime(clase.hora_inicio)} -{" "}
                  {formatTime(clase.hora_fin)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal para Crear Nueva Clase */}
      <ModalCrearClase
        isOpen={isCrearClaseOpen}
        onClose={() => setIsCrearClaseOpen(false)}
        profesores={profesores}
        onClaseCreada={() => {
          setIsCrearClaseOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
