"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminDashboardMetricsData, Clase, Usuario } from "@/types";
import { ModalCrearClase } from "./ModalCrearClase";
import { formatDaysList, formatTime } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Phone,
  Plus,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  ShieldCheck,
  History,
} from "lucide-react";

interface AdminDashboardClientProps {
  currentUser?: Usuario;
  metrics: AdminDashboardMetricsData;
  clases: Clase[];
  profesores: Usuario[];
}

export function AdminDashboardClient({
  currentUser,
  metrics,
  clases,
  profesores,
}: AdminDashboardClientProps) {
  const [isCrearClaseOpen, setIsCrearClaseOpen] = useState(false);

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = currentUser?.nombre_completo
    ? currentUser.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim()
    : "Francisco Nievas";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Banner Principal del Sensei / Directivo - Card Reducida y Compacta en Azul Oficial #0F3E86 */}
      <div className="p-3.5 sm:p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-blue-950/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-white shadow-xs shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
              {cleanNombre}
            </h1>
            <p className="text-[11px] text-blue-200 font-medium truncate">
              Dirección general del dojo y retención de alumnos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-blue-50 text-[#0F3E86] font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 text-[#0F3E86]" />
            <span>Nueva Clase</span>
          </button>
        </div>
      </div>

      {/* Resumen Directivo del Dojo - Cards Azules #0F3E86 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-[#0F3E86] text-white border-2 border-rose-400 rounded-2xl shadow-xl shadow-blue-950/15 space-y-1">
          <div className="flex items-center justify-between text-rose-300 text-xs font-bold">
            <span>Alertas de Deserción</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-rose-300">
            {metrics.alertasDesercion.length}
          </p>
          <span className="text-[11px] text-rose-200 font-semibold">
            Alumnos con &ge; 3 faltas seguidas
          </span>
        </div>

        <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 space-y-1">
          <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
            <span>Padrón de Alumnos</span>
            <Users className="w-4 h-4 text-cyan-300" />
          </div>
          <p className="text-3xl font-black text-white">
            {metrics.totalAlumnosActivos}
          </p>
          <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-semibold">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Alumnos activos en el dojo</span>
          </span>
        </div>

        <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 space-y-1">
          <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
            <span>Equipo Docente</span>
            <ShieldCheck className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-3xl font-black text-amber-300">
            {metrics.totalProfesoresActivos}
          </p>
          <span className="text-[11px] text-blue-200 font-medium">
            Senseis profesores activos
          </span>
        </div>
      </div>

      {/* SECCIÓN CRÍTICA: ALERTAS DE DESERCIÓN */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-600 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Alertas de Deserción Escolar de Karate
            </h2>
          </div>
          <span className="text-xs text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-bold">
            Requiere Contacto Inmediato
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {metrics.alertasDesercion.map((alerta) => (
            <div
              key={alerta.alumno.id}
              className="p-4 bg-[#0F3E86] text-white border-2 border-rose-400 rounded-2xl shadow-xl shadow-blue-950/15 space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      {alerta.alumno.nombre} {alerta.alumno.apellido}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white uppercase">
                      {alerta.ausenciasConsecutivas} Ausencias
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 font-medium mt-0.5">
                    Cinturón: {alerta.alumno.cinturon_actual} • Última asistencia:{" "}
                    {alerta.ultimaClaseAsistida || "Sin registro reciente"}
                  </p>
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="p-2.5 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-blue-200 uppercase font-bold">
                    Contacto / Tutor
                  </p>
                  <p className="font-bold text-white">
                    {alerta.contactoEmergencia}
                  </p>
                </div>

                <a
                  href={`tel:${alerta.telefonoContacto}`}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm touch-target-safe cursor-pointer transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN: DESEMPEÑO POR PROFESOR (Cards Azules #0F3E86) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#0F3E86]" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Desempeño y Cumplimiento de Profesores (Admins)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.desempenoProfesores.map((prof) => (
            <div
              key={prof.profesorId}
              className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {prof.nombre}
                  </h3>
                  <p className="text-xs text-cyan-300 font-medium">
                    Sensei Profesor (Admin)
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-700/60">
                  {prof.retencionPorcentaje}% Retención
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
                  <span className="text-[10px] text-blue-200 block font-bold">
                    Clases Dictadas
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {prof.clasesDictadas}
                  </span>
                </div>

                <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
                  <span className="text-[10px] text-blue-200 block font-bold">
                    Promedio Alumnos / Clase
                  </span>
                  <span className="font-extrabold text-cyan-300 text-sm">
                    {prof.promedioAlumnosPorClase}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN: CONVOCATORIA DE CLASES (Cards Azules #0F3E86) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#0F3E86]" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Convocatoria de Clases de Karate
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mayor Convocatoria */}
          <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl space-y-3 shadow-xl shadow-blue-950/15">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Mayor Convocatoria</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMayorConvocatoria.map((c) => (
                <div
                  key={c.claseId}
                  className="p-2.5 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-white">{c.nombre}</span>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-300 block">
                      {c.promedioAsistencias} prom.
                    </span>
                    <span className="text-[10px] text-blue-200 font-medium">
                      {c.inscriptos} inscriptos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Menor Convocatoria */}
          <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl space-y-3 shadow-xl shadow-blue-950/15">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
              <ArrowDownRight className="w-4 h-4 text-cyan-400" />
              <span>Menor Convocatoria (Reforzar Promoción)</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMenorConvocatoria.map((c) => (
                <div
                  key={c.claseId}
                  className="p-2.5 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-white">{c.nombre}</span>
                  <div className="text-right">
                    <span className="font-extrabold text-cyan-300 block">
                      {c.promedioAsistencias} prom.
                    </span>
                    <span className="text-[10px] text-blue-200 font-medium">
                      {c.inscriptos} inscriptos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: CLASES REGISTRADAS DE LA ACADEMIA */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0F3E86]" />
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Clases Registradas de la Academia
              </h2>
              <p className="text-[11px] text-slate-500">
                Clases y turnos para que cada Sensei dicte e inicie asistencia en tatami
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="text-xs text-[#0F3E86] hover:text-blue-900 font-bold cursor-pointer"
          >
            + Nueva Clase
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl space-y-2 shadow-xl shadow-blue-950/15"
            >
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-sm text-white">{clase.nombre}</h4>
              </div>
              <p className="text-xs text-blue-200 font-medium">
                Profesor:{" "}
                <span className="text-white font-bold">
                  {clase.profesor_nombre || "Sensei"}
                </span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-blue-200 font-semibold pt-1 border-t border-white/15">
                <span>{formatDaysList(clase.dias_semana)}</span>
                <span>
                  {formatTime(clase.hora_inicio)} - {formatTime(clase.hora_fin)}
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
