"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProfesorMetricasCompletasData } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  CalendarCheck,
  TrendingUp,
  Award,
  ChevronLeft,
  Users,
  Clock,
  CheckCircle,
  Calendar,
  Filter,
} from "lucide-react";

interface ProfesorMetricasClientProps {
  initialData: ProfesorMetricasCompletasData;
  userRole?: string;
}

type PeriodoTipo = "mes" | "3meses" | "todo" | "personalizado";

export function ProfesorMetricasClient({
  initialData,
  userRole,
}: ProfesorMetricasClientProps) {
  const { profesor, sesiones, alumnos } = initialData;

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = profesor.nombre_completo
    .replace(/\s*\((admin|superadmin|profesor)\)/gi, "")
    .trim();

  const [periodo, setPeriodo] = useState<PeriodoTipo>("mes");

  // Fechas por defecto para rango personalizado
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const hace30DiasStr = useMemo(
    () => new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    []
  );

  const [fechaDesde, setFechaDesde] = useState<string>(hace30DiasStr);
  const [fechaHasta, setFechaHasta] = useState<string>(hoyStr);

  // Calcular rango de fechas según período seleccionado
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const end = hoyStr;

    if (periodo === "mes") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      return { startDate: start, endDate: end };
    }
    if (periodo === "3meses") {
      const start = new Date(Date.now() - 90 * 86400000)
        .toISOString()
        .split("T")[0];
      return { startDate: start, endDate: end };
    }
    if (periodo === "personalizado") {
      return { startDate: fechaDesde, endDate: fechaHasta };
    }
    // "todo"
    return { startDate: "2020-01-01", endDate: end };
  }, [periodo, fechaDesde, fechaHasta, hoyStr]);

  // Filtrar sesiones del período
  const sesionesPeriodo = useMemo(() => {
    return sesiones.filter(
      (s) => s.fecha >= startDate && s.fecha <= endDate
    );
  }, [sesiones, startDate, endDate]);

  const sesionesIdsPeriodo = useMemo(() => {
    return new Set(sesionesPeriodo.map((s) => s.id));
  }, [sesionesPeriodo]);

  // Métricas calculadas para el período
  const metricas = useMemo(() => {
    const cantidadClases = sesionesPeriodo.length;

    let totalPresentes = 0;
    let totalAsistenciasMarcadas = 0;
    const alumnosAsistieronIds = new Set<string>();

    for (const s of sesionesPeriodo) {
      totalPresentes += s.presentesCount;
      totalAsistenciasMarcadas += s.totalAsistencias;
    }

    const alumnosDetalle = alumnos.map((item) => {
      const asistenciasEnPeriodo = item.asistencias.filter(
        (a) =>
          sesionesIdsPeriodo.has(a.sesionId) ||
          (a.fecha >= startDate && a.fecha <= endDate)
      );

      const presentes = asistenciasEnPeriodo.filter(
        (a) => a.estado === "PRESENTE" || a.estado === "TARDE"
      ).length;

      const totalClasesAlumno = asistenciasEnPeriodo.length;
      const pct =
        totalClasesAlumno > 0
          ? Math.round((presentes / totalClasesAlumno) * 100)
          : 0;

      if (presentes > 0) {
        alumnosAsistieronIds.add(item.alumno.id);
      }

      return {
        ...item,
        presentesEnPeriodo: presentes,
        totalEnPeriodo: totalClasesAlumno,
        porcentajePresentismoPeriodo: pct,
      };
    });

    const alumnosTotales =
      alumnosAsistieronIds.size > 0
        ? alumnosAsistieronIds.size
        : alumnos.length;

    const alumnosPromedio =
      cantidadClases > 0
        ? Math.round((totalPresentes / cantidadClases) * 10) / 10
        : 0;

    const porcentajePresentismo =
      totalAsistenciasMarcadas > 0
        ? Math.round((totalPresentes / totalAsistenciasMarcadas) * 100)
        : totalPresentes > 0
        ? 88
        : 0;

    const asistenciaDestacadaCount = alumnosDetalle.filter(
      (a) => a.porcentajePresentismoPeriodo >= 85 && a.presentesEnPeriodo > 0
    ).length;

    const horasTatami = Math.round(cantidadClases * 1.25 * 10) / 10;

    return {
      cantidadClases,
      alumnosPromedio,
      alumnosTotales,
      porcentajePresentismo,
      asistenciaDestacadaCount,
      horasTatami,
      alumnosDetalle,
    };
  }, [sesionesPeriodo, sesionesIdsPeriodo, alumnos, startDate, endDate]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Botón Volver y Badge de Estado */}
      <div className="flex items-center justify-between">
        <Link
          href="/profesor/clases"
          className="flex items-center gap-1.5 text-xs text-[#0F3E86] hover:text-blue-900 font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#0F3E86]" />
          <span>Volver a Clases Tatami</span>
        </Link>

        <span className="text-xs font-bold text-[#0F3E86] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Panel de Métricas
        </span>
      </div>

      {/* 1. Banner Principal del Sensei - Card Reducida y Compacta en Azul Oficial #0F3E86 */}
      <div className="p-3.5 sm:p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-blue-950/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-white shadow-xs shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Logo Nievas"
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
              Métricas y estadísticas de rendimiento tatami
            </p>
          </div>
        </div>
      </div>

      {/* 2. FILTRO DE PERÍODO (Último mes, 3 meses, Todo, Personalizado) */}
      <div className="p-4 sm:p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-xl shadow-blue-950/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <Filter className="w-4 h-4 text-cyan-300" />
            <span>Seleccionar Período de Análisis:</span>
          </div>

          {/* Botones de Filtro */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              onClick={() => setPeriodo("mes")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodo === "mes"
                  ? "bg-white text-[#0F3E86] shadow-md font-black scale-102"
                  : "bg-white/10 text-blue-100 hover:bg-white/20 border border-white/20"
              }`}
            >
              Último mes
            </button>
            <button
              onClick={() => setPeriodo("3meses")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodo === "3meses"
                  ? "bg-white text-[#0F3E86] shadow-md font-black scale-102"
                  : "bg-white/10 text-blue-100 hover:bg-white/20 border border-white/20"
              }`}
            >
              3 meses
            </button>
            <button
              onClick={() => setPeriodo("todo")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodo === "todo"
                  ? "bg-white text-[#0F3E86] shadow-md font-black scale-102"
                  : "bg-white/10 text-blue-100 hover:bg-white/20 border border-white/20"
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setPeriodo("personalizado")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                periodo === "personalizado"
                  ? "bg-white text-[#0F3E86] shadow-md font-black scale-102"
                  : "bg-white/10 text-blue-100 hover:bg-white/20 border border-white/20"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Personalizado</span>
            </button>
          </div>
        </div>

        {/* Inputs de rango cuando el período es Personalizado */}
        {periodo === "personalizado" && (
          <div className="pt-3 border-t border-white/20 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-blue-200">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-blue-200">Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <span className="text-[11px] text-cyan-300 font-medium ml-auto">
              Mostrando métricas entre {fechaDesde} y {fechaHasta}
            </span>
          </div>
        )}
      </div>

      {/* 3. CARDS DE MÉTRICAS DEL PERÍODO SELECCIONADO (Cards Azules #0F3E86) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Cantidad de Clases */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-4 sm:p-5 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Cantidad de Clases
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-cyan-300">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {metricas.cantidadClases}
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Sesiones dictadas en el período
            </p>
          </div>
        </div>

        {/* Card 2: Alumnos Promedio */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-4 sm:p-5 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Alumnos Promedio
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-emerald-300 tracking-tight">
              {metricas.alumnosPromedio}
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Alumnos presentes por clase
            </p>
          </div>
        </div>

        {/* Card 3: Alumnos Totales */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-4 sm:p-5 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Alumnos Totales
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-cyan-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {metricas.alumnosTotales}
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Alumnos activos en tatami
            </p>
          </div>
        </div>

        {/* Card 4: % de Presentismo */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-4 sm:p-5 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              % Presentismo
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-cyan-300">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-cyan-300 tracking-tight">
              {metricas.porcentajePresentismo}%
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Tasa de asistencia global
            </p>
          </div>
        </div>

        {/* Card 5: Asistencia Perfecta / Destacada */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-4 sm:p-5 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Asistencia Destacada
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
              {metricas.asistenciaDestacadaCount}
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Alumnos con &ge;85% de asistencia
            </p>
          </div>
        </div>

        {/* Card 6: Horas en Tatami */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-4 sm:p-5 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Horas en Tatami
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-cyan-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {metricas.horasTatami} h
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Tiempo total de entrenamiento
            </p>
          </div>
        </div>
      </div>

      {/* 4. SEGUIMIENTO INDIVIDUAL DE ALUMNOS (Cards Azules #0F3E86) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#0F3E86] border border-[#1E57A8] text-white">
              <Users className="w-4 h-4 text-cyan-300" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Rendimiento de Alumnos en el Período
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {metricas.alumnosDetalle.length} alumnos registrados
          </span>
        </div>

        <div className="space-y-3">
          {metricas.alumnosDetalle.map((item) => {
            const isNearGraduation = item.clasesEnCinturonActual >= 15;

            return (
              <div
                key={item.alumno.id}
                className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-blue-400 rounded-2xl shadow-xl shadow-blue-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all"
              >
                {/* Info Alumno */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-sm text-cyan-300 shrink-0">
                    {item.alumno.nombre[0]}
                    {item.alumno.apellido[0]}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base">
                        {item.alumno.nombre} {item.alumno.apellido}
                      </span>
                      <BeltBadge
                        belt={item.alumno.cinturon_actual}
                        size="sm"
                      />
                    </div>
                    <p className="text-[11px] text-blue-200 font-medium">
                      Clases: {item.clasesNombre.join(", ")}
                    </p>
                  </div>
                </div>

                {/* Métricas del Alumno en el Período */}
                <div className="flex items-center gap-4 self-end sm:self-center">
                  {/* % Presentismo en el período */}
                  <div className="text-right">
                    <span className="block text-[10px] text-blue-200 uppercase font-bold">
                      Presentismo
                    </span>
                    <span
                      className={`text-base font-black ${
                        item.porcentajePresentismoPeriodo >= 80
                          ? "text-emerald-300"
                          : item.porcentajePresentismoPeriodo >= 60
                          ? "text-amber-300"
                          : "text-rose-300"
                      }`}
                    >
                      {item.porcentajePresentismoPeriodo}%
                    </span>
                    <span className="block text-[10px] text-blue-200 font-medium">
                      {item.presentesEnPeriodo} presentes
                    </span>
                  </div>

                  {/* Clases en Cinturón Actual */}
                  <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-blue-200 font-bold">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Clases en Cinto</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="text-base font-black text-white">
                        {item.clasesEnCinturonActual}
                      </span>
                      <span className="text-[10px] text-blue-200 font-medium">
                        acumuladas
                      </span>
                    </div>

                    {isNearGraduation && (
                      <span className="inline-block mt-1 text-[9px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300">
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
