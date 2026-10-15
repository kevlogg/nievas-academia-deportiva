"use client";

import React, { useState } from "react";
import Link from "next/link";
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
    <div className="space-y-6">
      {/* Cabecera y Navegación Atrás */}
      <div className="p-5 sm:p-6 bg-white border-2 border-blue-200/90 rounded-3xl shadow-lg shadow-blue-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href={isAdmin ? "/admin/dashboard" : "/profesor/clases"}
            className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#154495] transition-colors shadow-xs"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#154495] uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                Historial Oficial
              </span>
              <span className="text-xs text-blue-800 font-semibold">
                Nievas Academia Deportiva
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight mt-0.5">
              Historial de Clases & Tatami
            </h1>
            <p className="text-xs text-blue-700 font-medium">
              {isAdmin
                ? "Registro histórico completo de todas las clases de la academia"
                : `Registro histórico de todas las clases de ${currentUser.nombre_completo}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-[#154495] bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl">
          <History className="w-4 h-4 text-[#154495]" />
          <span>{filteredItems.length} Clases Registradas</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 bg-white border border-blue-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por clase, profesor o fecha..."
            className="w-full pl-9 pr-3 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 placeholder:text-blue-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#154495] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["TODAS", "CON_ASISTENCIA", "PENDIENTES"].map((est) => (
            <button
              key={est}
              onClick={() => setFilterEstado(est)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterEstado === est
                  ? "bg-[#154495] text-white shadow-xs"
                  : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
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

      {/* Lista de Cards Claras con texto y elementos azules */}
      {filteredItems.length === 0 ? (
        <div className="p-10 bg-white border-2 border-dashed border-blue-200 rounded-3xl text-center space-y-3">
          <History className="w-10 h-10 text-blue-300 mx-auto" />
          <p className="text-base font-bold text-blue-950">
            No se encontraron clases con los filtros seleccionados.
          </p>
          <p className="text-xs text-blue-600">
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
                className="bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl p-5 shadow-md shadow-blue-950/5 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#154495] bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#154495]" />
                      <span>{item.fecha}</span>
                    </span>
                    <span className="text-xs font-bold text-blue-950 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{item.totalInscriptos} alumnos</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-blue-950 tracking-tight leading-snug">
                      {item.clase.nombre}
                    </h3>
                    <p className="text-xs text-blue-800 font-medium mt-0.5">
                      Profesor: {item.clase.profesor_nombre || currentUser.nombre_completo}
                    </p>
                  </div>

                  {/* Horario y Días */}
                  <div className="space-y-1.5 text-xs text-blue-900 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#154495]" />
                      <span className="font-semibold">
                        {formatTime(item.clase.hora_inicio)} a {formatTime(item.clase.hora_fin)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-[#154495]" />
                      <span className="font-semibold">
                        {formatDaysList(item.clase.dias_semana)}
                      </span>
                    </div>
                  </div>

                  {/* Desglose de Asistencia */}
                  <div className="p-2.5 bg-white border border-blue-100 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-950">Presentismo</span>
                      <span className="text-[#154495]">{porcentaje}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#154495] h-2 rounded-full transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold pt-1">
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {item.totalPresentes} Presentes
                      </span>
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {item.totalTardes} Tardes
                      </span>
                      <span className="text-rose-700 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        {item.totalAusentes} Ausentes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón para Abrir Asistencia */}
                <Link
                  href={`/profesor/clases/${item.clase.id}/asistencia`}
                  className="w-full py-3 px-3 bg-[#154495] hover:bg-blue-800 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4 text-blue-200" />
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
