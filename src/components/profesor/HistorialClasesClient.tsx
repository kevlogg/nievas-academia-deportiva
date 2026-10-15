"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Usuario, ClaseHistorialItem } from "@/types";
import { formatDaysList, formatTime } from "@/lib/utils";
import {
  History,
  Search,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  CalendarDays,
} from "lucide-react";

interface HistorialClasesClientProps {
  currentUser: Usuario;
  historialItems: ClaseHistorialItem[];
}

export function HistorialClasesClient({
  currentUser,
  historialItems,
}: HistorialClasesClientProps) {
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("TODAS");

  const isAdmin = currentUser.rol === "ADMIN";

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = currentUser.nombre_completo
    .replace(/\s*\((admin|superadmin|profesor)\)/gi, "")
    .trim();

  const filteredItems = historialItems.filter((item) => {
    const matchSearch =
      item.clase.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (item.clase.profesor_nombre &&
        item.clase.profesor_nombre.toLowerCase().includes(search.toLowerCase())) ||
      item.fecha.includes(search);

    if (filterEstado === "CON_ASISTENCIA") {
      return matchSearch && item.totalPresentes > 0;
    }
    if (filterEstado === "PENDIENTES") {
      return matchSearch && item.totalPresentes === 0;
    }
    return matchSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Banner Principal del Sensei - Card Reducida y Compacta en Azul Oficial #0F3E86 */}
      <div className="p-3.5 sm:p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-blue-950/15">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={isAdmin ? "/admin/dashboard" : "/profesor/clases"}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 cursor-pointer shrink-0"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
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
              Historial y registro de clases pasadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] font-bold text-cyan-300 bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-cyan-300" />
            <span>{filteredItems.length} Clases</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-blue-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por clase, profesor o fecha..."
            className="w-full pl-9 pr-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["TODAS", "CON_ASISTENCIA", "PENDIENTES"].map((est) => (
            <button
              key={est}
              onClick={() => setFilterEstado(est)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterEstado === est
                  ? "bg-white text-[#0F3E86] shadow-sm font-black"
                  : "bg-white/10 text-blue-100 border border-white/20 hover:bg-white/20"
              }`}
            >
              {est === "TODAS"
                ? "Todas"
                : est === "CON_ASISTENCIA"
                ? "Con Asistencia"
                : "Pendientes"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Cards Azules #0F3E86 */}
      {filteredItems.length === 0 ? (
        <div className="p-10 bg-[#0F3E86] text-white border-2 border-dashed border-[#1E57A8] rounded-3xl text-center space-y-3 shadow-lg">
          <History className="w-10 h-10 text-blue-300 mx-auto" />
          <p className="text-base font-bold text-white">
            No se encontraron clases con los filtros seleccionados.
          </p>
          <p className="text-xs text-blue-200">
            Prueba ajustando el texto de búsqueda o vuelve a la pestaña &quot;Todas&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const porcentaje =
              item.totalInscriptos > 0
                ? Math.round((item.totalPresentes / item.totalInscriptos) * 100)
                : 0;

            return (
              <div
                key={item.clase.id}
                className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-blue-400 rounded-2xl p-5 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-cyan-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-300" />
                      <span>{item.fecha}</span>
                    </span>
                    <span className="text-xs font-bold text-blue-100 bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-300" />
                      <span>{item.totalInscriptos} alumnos</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-white tracking-tight leading-snug">
                      {item.clase.nombre}
                    </h3>
                    <p className="text-xs text-blue-200 font-medium mt-0.5">
                      Profesor: {item.clase.profesor_nombre || currentUser.nombre_completo}
                    </p>
                  </div>

                  {/* Horario y Días */}
                  <div className="space-y-1.5 text-xs text-blue-100 bg-white/10 p-3 rounded-xl border border-white/15">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="font-semibold">
                        {formatTime(item.clase.hora_inicio)} a {formatTime(item.clase.hora_fin)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="font-semibold">
                        {formatDaysList(item.clase.dias_semana)}
                      </span>
                    </div>
                  </div>

                  {/* Desglose de Asistencia */}
                  <div className="p-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-100">Presentismo</span>
                      <span className="text-cyan-300">{porcentaje}%</span>
                    </div>
                    <div className="w-full bg-[#082552] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-2 rounded-full transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold pt-1">
                      <span className="text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {item.totalPresentes} Presentes
                      </span>
                      <span className="text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        {item.totalTardes} Tardes
                      </span>
                      <span className="text-rose-300 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        {item.totalAusentes} Ausentes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón para Abrir Asistencia */}
                <Link
                  href={`/profesor/clases/${item.clase.id}/asistencia`}
                  className="w-full py-3 px-3 bg-white hover:bg-blue-50 active:scale-98 text-[#0F3E86] font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#0F3E86]" />
                  <span>VER / GESTIONAR ASISTENCIA</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
