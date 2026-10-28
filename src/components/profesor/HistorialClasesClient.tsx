"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Usuario, ClaseHistorialItem } from "@/types";
import { formatDaysList, formatTime, getArgentinaDateTime } from "@/lib/utils";
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
  Edit2,
  Filter,
  X,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  User,
} from "lucide-react";
import { ModalEditarClaseHistorial } from "./ModalEditarClaseHistorial";

interface HistorialClasesClientProps {
  currentUser: Usuario;
  historialItems: ClaseHistorialItem[];
  profesoresDisponibles?: Usuario[];
}

type PeriodoFecha = "TODAS" | "HOY" | "7_DIAS" | "ESTE_MES" | "MES_ANTERIOR" | "PERSONALIZADO";
type NivelAsistencia = "TODAS" | "CON_ASISTENCIA" | "PENDIENTES" | "ALTA" | "MEDIA" | "BAJA" | "CON_AUSENCIAS" | "CON_TARDANZAS";
type CriterioOrden = "FECHA_DESC" | "FECHA_ASC" | "ASISTENCIA_DESC" | "ASISTENCIA_ASC" | "ALUMNOS_DESC";

/**
 * Helper para formatear fecha de clase de manera legible y contextual
 */
function formatearFechaLegible(fechaStr: string) {
  if (!fechaStr) {
    return {
      diaSemana: "",
      fechaFormateada: "Sin fecha",
      esHoy: false,
      esAyer: false,
    };
  }

  const parts = fechaStr.split("-");
  if (parts.length !== 3) {
    return {
      diaSemana: "",
      fechaFormateada: fechaStr,
      esHoy: false,
      esAyer: false,
    };
  }

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m, d);

  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const diaSemana = diasSemana[dateObj.getDay()] || "";
  const fechaFormateada = `${d} de ${meses[m]} ${y}`;

  const hoyArg = getArgentinaDateTime().fecha;
  const esHoy = fechaStr === hoyArg;

  // Calcular ayer en base a hoyArg
  const [tY, tM, tD] = hoyArg.split("-").map(Number);
  const ayerDate = new Date(tY, tM - 1, tD - 1);
  const ayerArg = `${ayerDate.getFullYear()}-${String(ayerDate.getMonth() + 1).padStart(2, "0")}-${String(ayerDate.getDate()).padStart(2, "0")}`;
  const esAyer = fechaStr === ayerArg;

  return {
    diaSemana,
    fechaFormateada,
    esHoy,
    esAyer,
  };
}

export function HistorialClasesClient({
  currentUser,
  historialItems,
  profesoresDisponibles = [],
}: HistorialClasesClientProps) {
  const [items, setItems] = useState<ClaseHistorialItem[]>(historialItems);
  
  // Sincronizar items si las props cambian
  useEffect(() => {
    setItems(historialItems);
  }, [historialItems]);

  // Estados de filtros
  const [search, setSearch] = useState("");
  const [tipoClase, setTipoClase] = useState<string>("TODAS");
  const [profesorFiltro, setProfesorFiltro] = useState<string>("TODOS");
  const [periodoFecha, setPeriodoFecha] = useState<PeriodoFecha>("TODAS");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [nivelAsistencia, setNivelAsistencia] = useState<NivelAsistencia>("TODAS");
  const [orden, setOrden] = useState<CriterioOrden>("FECHA_DESC");
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Modal para edición
  const [claseParaEditar, setClaseParaEditar] = useState<ClaseHistorialItem | null>(null);

  const isAdmin = currentUser.rol === "ADMIN";

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = currentUser.nombre_completo
    .replace(/\s*\((admin|superadmin|profesor)\)/gi, "")
    .trim();

  const handleClaseActualizada = (itemActualizado: ClaseHistorialItem) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.sesion?.id && itemActualizado.sesion?.id) {
          return it.sesion.id === itemActualizado.sesion.id ? itemActualizado : it;
        }
        return it.clase.id === itemActualizado.clase.id && it.fecha === itemActualizado.fecha
          ? itemActualizado
          : it;
      })
    );
  };

  // Opciones únicas de tipos / nombres de clase
  const opcionesClases = useMemo(() => {
    const nombres = new Set<string>();
    items.forEach((it) => {
      if (it.clase.nombre) nombres.add(it.clase.nombre.trim());
    });
    return Array.from(nombres).sort();
  }, [items]);

  // Opciones únicas de profesores
  const opcionesProfesores = useMemo(() => {
    const nombres = new Set<string>();
    items.forEach((it) => {
      const nombreProf = it.clase.profesor_nombre || "";
      if (nombreProf.trim()) nombres.add(nombreProf.trim());
    });
    // Añadir también de profesoresDisponibles si no estaban
    profesoresDisponibles.forEach((p) => {
      if (p.nombre_completo) nombres.add(p.nombre_completo.trim());
    });
    return Array.from(nombres).sort();
  }, [items, profesoresDisponibles]);

  // Verificar si hay algún filtro activo que modifique la vista por defecto
  const tieneFiltrosActivos = useMemo(() => {
    return (
      search.trim().length > 0 ||
      tipoClase !== "TODAS" ||
      profesorFiltro !== "TODOS" ||
      periodoFecha !== "TODAS" ||
      fechaDesde !== "" ||
      fechaHasta !== "" ||
      nivelAsistencia !== "TODAS" ||
      orden !== "FECHA_DESC"
    );
  }, [search, tipoClase, profesorFiltro, periodoFecha, fechaDesde, fechaHasta, nivelAsistencia, orden]);

  const limpiarFiltros = () => {
    setSearch("");
    setTipoClase("TODAS");
    setProfesorFiltro("TODOS");
    setPeriodoFecha("TODAS");
    setFechaDesde("");
    setFechaHasta("");
    setNivelAsistencia("TODAS");
    setOrden("FECHA_DESC");
  };

  // Filtrado y Ordenamiento
  const filteredAndSortedItems = useMemo(() => {
    const hoyArg = getArgentinaDateTime().fecha;
    const [tY, tM, tD] = hoyArg.split("-").map(Number);
    const hoyDate = new Date(tY, tM - 1, tD);

    // Calcular mes previo
    const prevMonthDate = new Date(tY, tM - 2, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const searchLower = search.toLowerCase().trim();

    const filtered = items.filter((item) => {
      // 1. Búsqueda por texto (nombre de clase, profesor, fecha u observaciones)
      if (searchLower) {
        const matchNombre = item.clase.nombre?.toLowerCase().includes(searchLower);
        const matchProf = item.clase.profesor_nombre?.toLowerCase().includes(searchLower);
        const matchFecha = item.fecha?.includes(searchLower);
        const matchObs = item.sesion?.observaciones?.toLowerCase().includes(searchLower);
        if (!matchNombre && !matchProf && !matchFecha && !matchObs) {
          return false;
        }
      }

      // 2. Filtro por Tipo de Clase
      if (tipoClase !== "TODAS" && item.clase.nombre !== tipoClase) {
        return false;
      }

      // 3. Filtro por Profesor
      if (profesorFiltro !== "TODOS") {
        const profActual = item.clase.profesor_nombre || "";
        if (profActual !== profesorFiltro) {
          return false;
        }
      }

      // 4. Filtro por Período de Fecha
      if (periodoFecha === "HOY") {
        if (item.fecha !== hoyArg) return false;
      } else if (periodoFecha === "7_DIAS") {
        if (!item.fecha) return false;
        const [iY, iM, iD] = item.fecha.split("-").map(Number);
        const itemDate = new Date(iY, iM - 1, iD);
        const diffMs = hoyDate.getTime() - itemDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (periodoFecha === "ESTE_MES") {
        if (!item.fecha || !item.fecha.startsWith(hoyArg.substring(0, 7))) return false;
      } else if (periodoFecha === "MES_ANTERIOR") {
        if (!item.fecha || !item.fecha.startsWith(prevMonthStr)) return false;
      } else if (periodoFecha === "PERSONALIZADO") {
        if (fechaDesde && item.fecha < fechaDesde) return false;
        if (fechaHasta && item.fecha > fechaHasta) return false;
      }

      // 5. Filtro por Nivel de Asistencia
      const pct = item.totalInscriptos > 0 ? (item.totalPresentes / item.totalInscriptos) * 100 : 0;
      if (nivelAsistencia === "CON_ASISTENCIA" && item.totalPresentes === 0) return false;
      if (nivelAsistencia === "PENDIENTES" && item.totalPresentes > 0) return false;
      if (nivelAsistencia === "ALTA" && pct < 80) return false;
      if (nivelAsistencia === "MEDIA" && (pct < 50 || pct >= 80)) return false;
      if (nivelAsistencia === "BAJA" && pct >= 50) return false;
      if (nivelAsistencia === "CON_AUSENCIAS" && item.totalAusentes === 0) return false;
      if (nivelAsistencia === "CON_TARDANZAS" && item.totalTardes === 0) return false;

      return true;
    });

    // Ordenamiento estricto
    filtered.sort((a, b) => {
      if (orden === "FECHA_DESC") {
        // Orden por fecha descendente (más reciente primero)
        const cmpFecha = b.fecha.localeCompare(a.fecha);
        if (cmpFecha !== 0) return cmpFecha;
        const horaA = a.sesion?.hora_apertura || a.clase.hora_inicio || "";
        const horaB = b.sesion?.hora_apertura || b.clase.hora_inicio || "";
        return horaB.localeCompare(horaA);
      }
      if (orden === "FECHA_ASC") {
        // Orden por fecha ascendente (más antigua primero)
        const cmpFecha = a.fecha.localeCompare(b.fecha);
        if (cmpFecha !== 0) return cmpFecha;
        const horaA = a.sesion?.hora_apertura || a.clase.hora_inicio || "";
        const horaB = b.sesion?.hora_apertura || b.clase.hora_inicio || "";
        return horaA.localeCompare(horaB);
      }
      if (orden === "ASISTENCIA_DESC") {
        const pctA = a.totalInscriptos > 0 ? a.totalPresentes / a.totalInscriptos : 0;
        const pctB = b.totalInscriptos > 0 ? b.totalPresentes / b.totalInscriptos : 0;
        return pctB - pctA;
      }
      if (orden === "ASISTENCIA_ASC") {
        const pctA = a.totalInscriptos > 0 ? a.totalPresentes / a.totalInscriptos : 0;
        const pctB = b.totalInscriptos > 0 ? b.totalPresentes / b.totalInscriptos : 0;
        return pctA - pctB;
      }
      if (orden === "ALUMNOS_DESC") {
        return b.totalInscriptos - a.totalInscriptos;
      }
      return 0;
    });

    return filtered;
  }, [items, search, tipoClase, profesorFiltro, periodoFecha, fechaDesde, fechaHasta, nivelAsistencia, orden]);

  // Métricas agregadas de los resultados filtrados
  const metricasResumen = useMemo(() => {
    const totalClases = filteredAndSortedItems.length;
    let sumPresentes = 0;
    let sumAusentes = 0;
    let sumTardes = 0;
    let sumInscriptos = 0;

    filteredAndSortedItems.forEach((it) => {
      sumPresentes += it.totalPresentes;
      sumAusentes += it.totalAusentes;
      sumTardes += it.totalTardes;
      sumInscriptos += it.totalInscriptos;
    });

    const promedioAsistencia =
      sumInscriptos > 0 ? Math.round((sumPresentes / sumInscriptos) * 100) : 0;

    return {
      totalClases,
      sumPresentes,
      sumAusentes,
      sumTardes,
      sumInscriptos,
      promedioAsistencia,
    };
  }, [filteredAndSortedItems]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-20">
      {/* 1. Banner Principal del Sensei / Dirección */}
      <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-blue-950/15">
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
              Historial y bitácora de clases del tatami
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] font-bold text-cyan-300 bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-cyan-300" />
            <span>{filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? "Clase" : "Clases"}</span>
          </div>
        </div>
      </div>

      {/* 2. Mini Barra de Métricas y Rendimiento del Filtro Actual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#0F3E86] border border-[#1E57A8] rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-blue-200 flex items-center gap-1">
            <History className="w-3 h-3 text-cyan-300" /> Clases Listadas
          </span>
          <span className="text-lg sm:text-xl font-black text-white mt-1">
            {metricasResumen.totalClases}
          </span>
        </div>

        <div className="bg-[#0F3E86] border border-[#1E57A8] rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-blue-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-300" /> Promedio Presentismo
          </span>
          <span className="text-lg sm:text-xl font-black text-cyan-300 mt-1">
            {metricasResumen.promedioAsistencia}%
          </span>
        </div>

        <div className="bg-[#0F3E86] border border-[#1E57A8] rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-blue-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Total Presentes
          </span>
          <span className="text-lg sm:text-xl font-black text-emerald-300 mt-1">
            {metricasResumen.sumPresentes}
          </span>
        </div>

        <div className="bg-[#0F3E86] border border-[#1E57A8] rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-medium text-blue-200 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" /> Total Ausencias
          </span>
          <span className="text-lg sm:text-xl font-black text-rose-300 mt-1">
            {metricasResumen.sumAusentes}
          </span>
        </div>
      </div>

      {/* 3. Panel de Búsqueda y Filtros Avanzados */}
      <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-md space-y-3.5">
        {/* Fila 1: Buscador de texto + Toggle de filtros avanzados + Limpiar filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-blue-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por clase, profesor, fecha u observaciones..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-blue-300 hover:text-white transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mostrarFiltrosAvanzados || tieneFiltrosActivos
                  ? "bg-white text-[#0F3E86] shadow-sm font-black"
                  : "bg-white/10 text-blue-100 border border-white/20 hover:bg-white/20"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros {tieneFiltrosActivos ? "(Activos)" : ""}</span>
            </button>

            {tieneFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-3 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: Filtros rápidos siempre visibles (Píldoras de período de fecha) */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-200 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-300" /> Filtrar por Período:
            </span>
            <span className="text-[10px] text-blue-300 font-medium">
              Orden actual: <strong className="text-white">{orden === "FECHA_DESC" ? "Más recientes" : orden === "FECHA_ASC" ? "Más antiguas" : "Por asistencia"}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "TODAS", label: "Todas las fechas" },
              { id: "HOY", label: "Hoy" },
              { id: "7_DIAS", label: "Últimos 7 días" },
              { id: "ESTE_MES", label: "Este mes" },
              { id: "MES_ANTERIOR", label: "Mes anterior" },
              { id: "PERSONALIZADO", label: "Rango personalizado..." },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodoFecha(p.id as PeriodoFecha)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodoFecha === p.id
                    ? "bg-cyan-400 text-[#072450] font-black shadow-sm"
                    : "bg-white/10 text-blue-100 border border-white/15 hover:bg-white/20"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Rango de fechas manual si seleccionó Personalizado */}
          {periodoFecha === "PERSONALIZADO" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-[#0A2E65] border border-[#2056A8] rounded-xl mt-2 animate-fade-in">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-blue-200">Desde:</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-[#082552] border border-[#2056A8] text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-300"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-blue-200">Hasta:</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-[#082552] border border-[#2056A8] text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-300"
                />
              </div>

              {(fechaDesde || fechaHasta) && (
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  className="text-[11px] text-cyan-300 hover:text-white underline font-semibold ml-auto"
                >
                  Restablecer fechas
                </button>
              )}
            </div>
          )}
        </div>

        {/* Fila 3: Filtros avanzados desplegables */}
        {(mostrarFiltrosAvanzados || tieneFiltrosActivos) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/10 animate-fade-in">
            {/* Filtro: Tipo de Clase */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-200 block">
                Tipo / Nombre de Clase:
              </label>
              <select
                value={tipoClase}
                onChange={(e) => setTipoClase(e.target.value)}
                className="w-full bg-[#0A2E65] border border-[#2056A8] rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-300"
              >
                <option value="TODAS" className="bg-[#0F3E86] text-white">
                  Todas las clases ({items.length})
                </option>
                {opcionesClases.map((nom) => {
                  const cant = items.filter((it) => it.clase.nombre === nom).length;
                  return (
                    <option key={nom} value={nom} className="bg-[#0F3E86] text-white">
                      {nom} ({cant})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filtro: Profesor / Sensei */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-200 block">
                Profesor a cargo:
              </label>
              <select
                value={profesorFiltro}
                onChange={(e) => setProfesorFiltro(e.target.value)}
                className="w-full bg-[#0A2E65] border border-[#2056A8] rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-300"
              >
                <option value="TODOS" className="bg-[#0F3E86] text-white">
                  Todos los profesores
                </option>
                {opcionesProfesores.map((prof) => (
                  <option key={prof} value={prof} className="bg-[#0F3E86] text-white">
                    Sensei {prof}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Nivel de Asistencia */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-200 block">
                Nivel de Asistencia:
              </label>
              <select
                value={nivelAsistencia}
                onChange={(e) => setNivelAsistencia(e.target.value as NivelAsistencia)}
                className="w-full bg-[#0A2E65] border border-[#2056A8] rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-300"
              >
                <option value="TODAS" className="bg-[#0F3E86] text-white">Todos los niveles</option>
                <option value="CON_ASISTENCIA" className="bg-[#0F3E86] text-white">Con presentes marcados</option>
                <option value="ALTA" className="bg-[#0F3E86] text-white">Alta asistencia (≥ 80%)</option>
                <option value="MEDIA" className="bg-[#0F3E86] text-white">Media asistencia (50% a 79%)</option>
                <option value="BAJA" className="bg-[#0F3E86] text-white">Baja asistencia (&lt; 50%)</option>
                <option value="CON_AUSENCIAS" className="bg-[#0F3E86] text-white">Con ausencias</option>
                <option value="CON_TARDANZAS" className="bg-[#0F3E86] text-white">Con tardanzas registradas</option>
                <option value="PENDIENTES" className="bg-[#0F3E86] text-white">Pendientes (0 presentes)</option>
              </select>
            </div>

            {/* Filtro: Ordenamiento */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-200 block">
                Ordenar lista por:
              </label>
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as CriterioOrden)}
                className="w-full bg-[#0A2E65] border border-[#2056A8] rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-300"
              >
                <option value="FECHA_DESC" className="bg-[#0F3E86] text-white">Más recientes primero</option>
                <option value="FECHA_ASC" className="bg-[#0F3E86] text-white">Más antiguas primero</option>
                <option value="ASISTENCIA_DESC" className="bg-[#0F3E86] text-white">Mayor % de asistencia</option>
                <option value="ASISTENCIA_ASC" className="bg-[#0F3E86] text-white">Menor % de asistencia</option>
                <option value="ALUMNOS_DESC" className="bg-[#0F3E86] text-white">Mayor cant. de alumnos</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. Lista Vertical de Clases: Una Abajo de la Otra por Fecha Reciente */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="p-10 bg-[#0F3E86] text-white border-2 border-dashed border-[#1E57A8] rounded-3xl text-center space-y-3.5 shadow-lg">
          <History className="w-10 h-10 text-blue-300 mx-auto" />
          <p className="text-base font-bold text-white">
            No se encontraron clases con los filtros seleccionados.
          </p>
          <p className="text-xs text-blue-200 max-w-md mx-auto">
            Prueba ajustando el texto de búsqueda, cambiando el período o haciendo clic en &quot;Limpiar Filtros&quot;.
          </p>
          {tieneFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0F3E86] font-bold text-xs rounded-xl shadow-md hover:bg-blue-50 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver todas las clases</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredAndSortedItems.map((item) => {
            const porcentaje =
              item.totalInscriptos > 0
                ? Math.round((item.totalPresentes / item.totalInscriptos) * 100)
                : 0;

            const fechaInfo = formatearFechaLegible(item.fecha);
            const claveUnica = item.sesion?.id || `${item.clase.id}-${item.fecha}`;

            return (
              <div
                key={claveUnica}
                className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-cyan-400 rounded-2xl p-4 sm:p-5 shadow-lg shadow-blue-950/20 transition-all flex flex-col gap-3.5"
              >
                {/* Encabezado Superior de la Card: Metadatos Rápidos */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Fecha y Día de la semana */}
                    <span className="text-xs font-bold text-white bg-white/15 px-3 py-1 rounded-xl border border-white/20 flex items-center gap-1.5 shadow-xs">
                      <Calendar className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      <span className="capitalize font-black text-cyan-200">
                        {fechaInfo.diaSemana || "Clase"}
                      </span>
                      <span>·</span>
                      <span>{fechaInfo.fechaFormateada}</span>
                    </span>

                    {/* Tag Hoy / Ayer */}
                    {fechaInfo.esHoy && (
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 bg-emerald-400 px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse" />
                        Hoy
                      </span>
                    )}
                    {fechaInfo.esAyer && (
                      <span className="text-[11px] font-black uppercase tracking-wider text-cyan-950 bg-cyan-300 px-2.5 py-0.5 rounded-lg shadow-xs">
                        Ayer
                      </span>
                    )}

                    {/* Badge Horario */}
                    <span className="text-xs font-medium text-blue-100 bg-[#0A2E65] px-2.5 py-1 rounded-xl border border-[#2056A8] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      <span>
                        {formatTime(item.clase.hora_inicio)} a {formatTime(item.clase.hora_fin)}
                      </span>
                    </span>

                    {/* Badge Profesor a cargo */}
                    <span className="text-xs font-medium text-blue-100 bg-[#0A2E65] px-2.5 py-1 rounded-xl border border-[#2056A8] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      <span>
                        Prof: <strong className="text-white font-bold">{item.clase.profesor_nombre || currentUser.nombre_completo}</strong>
                      </span>
                    </span>
                  </div>

                  {/* Estado de la Sesión */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-cyan-200 bg-cyan-950/60 border border-cyan-400/30 px-2.5 py-0.5 rounded-lg">
                      {item.sesion?.estado || "FINALIZADA"}
                    </span>
                  </div>
                </div>

                {/* Contenido Central: Fila Horizontal (Desktop) / Columna (Móvil) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Columna Izquierda (lg:col-span-4): Nombre de clase, días habituales, notas */}
                  <div className="lg:col-span-4 space-y-1.5">
                    <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight leading-snug">
                      {item.clase.nombre}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-blue-200">
                      <CalendarDays className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      <span>
                        Días habituales: <strong className="text-white font-semibold">{formatDaysList(item.clase.dias_semana)}</strong>
                      </span>
                    </div>

                    {item.sesion?.observaciones && (
                      <p className="text-[11px] text-blue-100/90 bg-[#0A2E65]/80 p-2 rounded-xl border border-[#2056A8] line-clamp-2">
                        📝 <strong className="text-cyan-200">Nota:</strong> {item.sesion.observaciones}
                      </p>
                    )}
                  </div>

                  {/* Columna Central (lg:col-span-5): Métricas de Asistencia destacadas */}
                  <div className="lg:col-span-5 bg-[#0A2E65] border border-[#2056A8] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-100">Presentismo</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                            porcentaje >= 80
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : porcentaje >= 50
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {porcentaje >= 80 ? "Alta asistencia" : porcentaje >= 50 ? "Media asistencia" : "Baja asistencia"}
                        </span>
                      </div>
                      <span className="text-sm sm:text-base font-black text-white">
                        {porcentaje}%
                      </span>
                    </div>

                    {/* Barra visual de porcentaje */}
                    <div className="w-full bg-[#082552] rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          porcentaje >= 80 ? "bg-emerald-400" : porcentaje >= 50 ? "bg-cyan-400" : "bg-rose-400"
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>

                    {/* Badges de Conteo en 1 Vista */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-bold">
                      <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{item.totalPresentes} Presentes</span>
                      </span>

                      {item.totalTardes > 0 && (
                        <span className="bg-amber-950/70 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{item.totalTardes} Tarde</span>
                        </span>
                      )}

                      <span className="bg-rose-950/70 text-rose-300 border border-rose-500/40 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{item.totalAusentes} Ausentes</span>
                      </span>

                      <span className="bg-white/10 text-blue-200 border border-white/15 px-2 py-1 rounded-lg flex items-center gap-1.5 sm:ml-auto">
                        <Users className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                        <span>{item.totalInscriptos} Inscriptos</span>
                      </span>
                    </div>
                  </div>

                  {/* Columna Derecha (lg:col-span-3): Acciones Táctiles */}
                  <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-2">
                    <Link
                      href={`/profesor/clases/${item.clase.id}/asistencia${item.sesion?.id ? `?sesionId=${item.sesion.id}` : ""}`}
                      className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 active:scale-98 text-[#0F3E86] font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer text-center"
                    >
                      <ClipboardCheck className="w-4 h-4 text-[#0F3E86] shrink-0" />
                      <span>VER ASISTENCIA</span>
                    </Link>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setClaseParaEditar(item)}
                        className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-98 text-cyan-200 hover:text-white border border-cyan-400/30 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer text-center"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                        <span>Editar Registro</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edición de Historial para Dirección */}
      <ModalEditarClaseHistorial
        isOpen={!!claseParaEditar}
        onClose={() => setClaseParaEditar(null)}
        item={claseParaEditar}
        profesoresDisponibles={profesoresDisponibles}
        onClaseActualizada={handleClaseActualizada}
      />
    </div>
  );
}
