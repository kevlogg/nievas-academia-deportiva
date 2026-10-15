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
      {/* Header Headmaster con Logo Oficial de Nievas - Card Clara con acentos azules */}
      <div className="p-5 sm:p-6 bg-white border-2 border-blue-200/90 rounded-3xl shadow-lg shadow-blue-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#154495] border-2 border-blue-400/60 shadow-md shadow-blue-950/20 shrink-0">
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
              <span className="text-[10px] font-bold text-[#154495] uppercase tracking-widest bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200">
                SuperSensei Headmaster
              </span>
              <span className="text-xs text-blue-800 font-semibold">
                Control Directivo Oficial
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight mt-0.5">
              Nievas Academia Deportiva
            </h1>
            <p className="text-xs text-blue-700 font-medium">
              Panel directivo: métricas consolidadas, ausentismo crítico y gestión institucional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="px-4 py-2.5 bg-[#154495] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950/20 flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Clase</span>
          </button>

          <Link
            href="/admin/historial"
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#154495] font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 touch-target-safe"
          >
            <History className="w-4 h-4 text-[#154495]" />
            <span>Ver Historial</span>
          </Link>

          <Link
            href="/admin/alumnos"
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#154495] font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 touch-target-safe"
          >
            <Award className="w-4 h-4 text-[#154495]" />
            <span>Alumnos & Cintos</span>
          </Link>
        </div>
      </div>

      {/* KPIs Globales del Dojo - Cards Claras con texto y elementos azules */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border-2 border-blue-200/90 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>Alumnos Activos</span>
            <Users className="w-4 h-4 text-[#154495]" />
          </div>
          <p className="text-2xl font-black text-blue-950">
            {metrics.totalAlumnosActivos}
          </p>
          <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>100% matriculados</span>
          </span>
        </div>

        <div className="p-4 bg-white border-2 border-blue-200/90 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>Promedio Asistencia</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">
            {metrics.promedioGeneralAsistencia}%
          </p>
          <span className="text-[11px] text-blue-700 font-medium">
            Asistencia global dojo
          </span>
        </div>

        <div className="p-4 bg-white border-2 border-blue-200/90 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>Clases de Tatami</span>
            <Calendar className="w-4 h-4 text-[#154495]" />
          </div>
          <p className="text-2xl font-black text-blue-950">{clases.length}</p>
          <span className="text-[11px] text-blue-700 font-medium">
            Horarios semanales
          </span>
        </div>

        <div className="p-4 bg-white border-2 border-rose-300 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Alertas Deserción</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-rose-700">
            {metrics.alertasDesercion.length}
          </p>
          <span className="text-[11px] text-rose-700 font-semibold">
            ≥ 3 faltas seguidas
          </span>
        </div>
      </div>

      {/* SECCIÓN CRÍTICA: ALERTAS DE DESERCIÓN (Cards Claras con elementos azules/rojos) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-600 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-blue-950 tracking-tight">
              Alertas de Deserción Escolar de Karate
            </h2>
          </div>
          <span className="text-xs text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200 font-bold">
            Requiere Contacto Inmediato
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {metrics.alertasDesercion.map((alerta) => (
            <div
              key={alerta.alumno.id}
              className="p-4 bg-white border-2 border-rose-200 hover:border-rose-300 rounded-2xl shadow-md space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-950 text-base">
                      {alerta.alumno.nombre} {alerta.alumno.apellido}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white uppercase">
                      {alerta.ausenciasConsecutivas} Ausencias
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 font-medium mt-0.5">
                    Cinturón: {alerta.alumno.cinturon_actual} • Última asistencia:{" "}
                    {alerta.ultimaClaseAsistida || "Sin registro reciente"}
                  </p>
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-blue-700 uppercase font-bold">
                    Contacto / Tutor
                  </p>
                  <p className="font-bold text-blue-950">
                    {alerta.contactoEmergencia}
                  </p>
                </div>

                <a
                  href={`tel:${alerta.telefonoContacto}`}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm touch-target-safe cursor-pointer transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN: DESEMPEÑO POR PROFESOR (Cards Claras con texto azul) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#154495]" />
          <h2 className="text-base font-bold text-blue-950 tracking-tight">
            Desempeño y Cumplimiento de Profesores
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.desempenoProfesores.map((prof) => (
            <div
              key={prof.profesorId}
              className="p-4 bg-white border-2 border-blue-200 rounded-2xl shadow-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-950 text-base">
                    {prof.nombre}
                  </h3>
                  <p className="text-xs text-blue-700 font-medium">
                    Sensei de Tatami Oficial
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {prof.retencionPorcentaje}% Retención
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-blue-700 block font-bold">
                    Clases Dictadas / Programadas
                  </span>
                  <span className="font-extrabold text-blue-950 text-sm">
                    {prof.clasesDictadasMes} / {prof.clasesProgramadasMes}
                  </span>
                </div>

                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-blue-700 block font-bold">
                    Promedio Alumnos / Clase
                  </span>
                  <span className="font-extrabold text-[#154495] text-sm">
                    {prof.promedioAlumnosPorClase}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN: CONVOCATORIA DE CLASES */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#154495]" />
          <h2 className="text-base font-bold text-blue-950 tracking-tight">
            Convocatoria de Clases de Karate
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mayor Convocatoria */}
          <div className="p-4 bg-white border-2 border-blue-200 rounded-2xl space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>Mayor Convocatoria</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMayorConvocatoria.map((c) => (
                <div
                  key={c.claseId}
                  className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-blue-950">{c.nombre}</span>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-700 block">
                      {c.promedioAsistencias} prom.
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium">
                      {c.inscriptos} inscriptos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Menor Convocatoria */}
          <div className="p-4 bg-white border-2 border-blue-200 rounded-2xl space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-[#154495] text-xs font-bold">
              <ArrowDownRight className="w-4 h-4 text-[#154495]" />
              <span>Menor Convocatoria (Reforzar Promoción)</span>
            </div>

            <div className="space-y-2">
              {metrics.clasesConMenorConvocatoria.map((c) => (
                <div
                  key={c.claseId}
                  className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-blue-950">{c.nombre}</span>
                  <div className="text-right">
                    <span className="font-extrabold text-[#154495] block">
                      {c.promedioAsistencias} prom.
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium">
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
            <Calendar className="w-5 h-5 text-[#154495]" />
            <h2 className="text-base font-bold text-blue-950 tracking-tight">
              Gestión de Horarios y Profesores Asignados
            </h2>
          </div>

          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="text-xs text-[#154495] hover:text-blue-800 font-bold cursor-pointer"
          >
            + Nueva Clase
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className="p-4 bg-white border-2 border-blue-200 rounded-2xl space-y-2 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-sm text-blue-950">{clase.nombre}</h4>
              </div>
              <p className="text-xs text-blue-800 font-medium">
                Sensei:{" "}
                <span className="text-blue-950 font-bold">
                  {clase.profesor_nombre || "Sensei"}
                </span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-blue-700 font-semibold pt-1 border-t border-blue-100">
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
