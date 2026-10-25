"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Alumno, KarateBelt, Usuario } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { ModalGraduacion } from "./ModalGraduacion";
import { ModalNotaPrivada } from "./ModalNotaPrivada";
import { ModalImportarAlumnosCsv } from "./ModalImportarAlumnosCsv";
import { ModalFichaAlumno } from "./ModalFichaAlumno";
import { actualizarCinturonAction } from "@/lib/actions/alumnos.actions";
import {
  Users,
  Search,
  Award,
  Phone,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Check,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

interface AdminAlumnosClientProps {
  currentUser?: Usuario;
  initialAlumnos: Alumno[];
  profesores?: Usuario[];
}

const BELTS: Array<KarateBelt | "TODOS"> = [
  "TODOS",
  "Blanco",
  "Amarillo",
  "Naranja",
  "Verde",
  "Violeta",
  "Marrón",
  "Negro",
];

const BELT_OPTIONS: KarateBelt[] = [
  "Blanco",
  "Amarillo",
  "Naranja",
  "Verde",
  "Violeta",
  "Marrón",
  "Negro",
];

export function AdminAlumnosClient({
  currentUser,
  initialAlumnos,
  profesores = [],
}: AdminAlumnosClientProps) {
  const [alumnos, setAlumnos] = useState<Alumno[]>(initialAlumnos);

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = currentUser?.nombre_completo
    ? currentUser.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim()
    : "Francisco Nievas";

  const [scope, setScope] = useState<"TODO_EL_DOJO" | "MIS_ALUMNOS">("TODO_EL_DOJO");
  const [selectedProfesorId, setSelectedProfesorId] = useState<string>("TODOS");
  const [search, setSearch] = useState("");
  const [beltFilter, setBeltFilter] = useState<KarateBelt | "TODOS">("TODOS");

  const [fichaAlumno, setFichaAlumno] = useState<Alumno | null>(null);
  const [graduandoAlumno, setGraduandoAlumno] = useState<Alumno | null>(null);
  const [editandoNotaAlumno, setEditandoNotaAlumno] = useState<Alumno | null>(null);
  const [cambiandoCintoId, setCambiandoCintoId] = useState<string | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const filteredAlumnos = alumnos.filter((a) => {
    // 1. Filtro de alcance: Mis Alumnos vs Todo el Dojo
    if (scope === "MIS_ALUMNOS") {
      if (currentUser?.id && !a.profesores_ids?.includes(currentUser.id)) {
        return false;
      }
    } else if (selectedProfesorId !== "TODOS") {
      if (!a.profesores_ids?.includes(selectedProfesorId)) {
        return false;
      }
    }

    // 2. Buscador por texto
    const matchesSearch =
      a.nombre.toLowerCase().includes(search.toLowerCase()) ||
      a.apellido.toLowerCase().includes(search.toLowerCase()) ||
      a.telefono_contacto.includes(search);

    // 3. Cinturón
    const matchesBelt =
      beltFilter === "TODOS" ? true : a.cinturon_actual === beltFilter;

    return matchesSearch && matchesBelt;
  });

  const handleCambiarCinturon = async (alumnoId: string, nuevoCinturon: KarateBelt) => {
    setCambiandoCintoId(alumnoId);
    try {
      const res = await actualizarCinturonAction(alumnoId, nuevoCinturon);
      if (res.success) {
        setAlumnos((prev) =>
          prev.map((a) => (a.id === alumnoId ? { ...a, cinturon_actual: res.data.cinturon_actual, subcategoria_actual: res.data.subcategoria_actual } : a))
        );
      } else {
        alert(res.error || "No se pudo actualizar el cinturón");
      }
    } catch {
      alert("Error al conectar con el servidor");
    } finally {
      setCambiandoCintoId(null);
    }
  };

  const handleNotaActualizada = (alumnoId: string, notasPrivadas: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === alumnoId ? { ...a, notas_privadas: notasPrivadas } : a))
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Botón Volver & Badge */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-1.5 text-xs text-[#0F3E86] hover:text-blue-900 font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#0F3E86]" />
          <span>Volver a Dirección</span>
        </Link>

        <span className="text-xs font-bold text-[#0F3E86] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Registro Oficial de Alumnos
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
              Gestión de alumnos, graduaciones y fichas individuales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-blue-50 active:scale-95 text-[#0F3E86] font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Importar alumnos masivamente desde CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0F3E86]" />
            <span>Cargar CSV</span>
          </button>

          <div className="text-[11px] font-bold text-cyan-300 bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>{filteredAlumnos.length} de {alumnos.length} Alumnos</span>
          </div>
        </div>
      </div>

      {/* 2. Filtro de Alcance de Dirección: Todo el Dojo vs Mis Alumnos & Selector por Sensei */}
      <div className="p-3.5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
            Alcance:
          </span>
          <div className="flex items-center bg-[#0A2E65] p-1 rounded-xl border border-[#2056A8]">
            <button
              onClick={() => {
                setScope("TODO_EL_DOJO");
                setSelectedProfesorId("TODOS");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                scope === "TODO_EL_DOJO"
                  ? "bg-white text-[#0F3E86] shadow-sm font-extrabold"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todo el Dojo</span>
            </button>
            <button
              onClick={() => {
                setScope("MIS_ALUMNOS");
                setSelectedProfesorId("TODOS");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                scope === "MIS_ALUMNOS"
                  ? "bg-white text-[#0F3E86] shadow-sm font-extrabold"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              <span>Mis Alumnos</span>
            </button>
          </div>
        </div>

        {/* Selector de Sensei Específico (cuando está activo Todo el Dojo) */}
        {scope === "TODO_EL_DOJO" && profesores && profesores.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-200 shrink-0">
              Sensei:
            </span>
            <select
              value={selectedProfesorId}
              onChange={(e) => setSelectedProfesorId(e.target.value)}
              className="px-3 py-1.5 bg-[#0A2E65] border border-[#2056A8] text-cyan-300 font-bold text-xs rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="bg-[#082552] text-white">
                Todos los Senseis
              </option>
              {profesores.map((prof) => (
                <option key={prof.id} value={prof.id} className="bg-[#082552] text-white">
                  {prof.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Barra de Búsqueda y Filtros de Cinturón */}
      <div className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-md space-y-3">
        {/* Input Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 text-blue-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o teléfono de emergencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>

        {/* Filtro por Cinturón */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-blue-200 mr-1 shrink-0">
            Filtrar cinto:
          </span>
          {BELTS.map((belt) => (
            <button
              key={belt}
              onClick={() => setBeltFilter(belt)}
              className={`px-3 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer ${
                beltFilter === belt
                  ? "bg-white text-[#0F3E86] shadow-sm font-extrabold"
                  : "bg-white/10 text-blue-100 hover:bg-white/20 border border-white/20"
              }`}
            >
              {belt}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Alumnos - Cards Azules #0F3E86 */}
      <div className="space-y-3">
        {filteredAlumnos.length === 0 ? (
          <div className="p-8 text-center text-blue-200 bg-[#0F3E86] rounded-2xl border-2 border-dashed border-[#1E57A8] text-sm font-medium">
            No se encontraron alumnos con los criterios seleccionados.
          </div>
        ) : (
          filteredAlumnos.map((alumno) => (
            <div
              key={alumno.id}
              className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-cyan-400/80 rounded-2xl shadow-xl shadow-blue-950/15 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            >
              <div
                onClick={() => setFichaAlumno(alumno)}
                className="flex items-start gap-3 cursor-pointer group flex-1"
                title="Haga clic para abrir la ficha individual completa"
              >
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 group-hover:border-cyan-300 flex items-center justify-center font-black text-sm text-cyan-300 shadow-sm shrink-0 transition-all">
                  {alumno.nombre[0]}
                  {alumno.apellido[0]}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-black text-white text-base group-hover:text-cyan-300 transition-colors">
                      {alumno.nombre} {alumno.apellido}
                    </span>
                    <BeltBadge
                      belt={alumno.cinturon_actual}
                      subcategoria={alumno.subcategoria_actual}
                      size="sm"
                    />

                    {/* SELECTOR INLINE DE CINTURÓN (Permite al Admin cambiarlo de inmediato) */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 bg-[#0A2E65] border border-[#2056A8] rounded-lg px-2 py-0.5"
                    >
                      <span className="text-[10px] text-blue-200 font-bold">Editar:</span>
                      <select
                        value={alumno.cinturon_actual === "Azul" ? "Violeta" : alumno.cinturon_actual}
                        disabled={cambiandoCintoId === alumno.id}
                        onChange={(e) => handleCambiarCinturon(alumno.id, e.target.value as KarateBelt)}
                        className="bg-transparent text-cyan-300 text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        {BELT_OPTIONS.map((belt) => (
                          <option key={belt} value={belt} className="bg-[#082552] text-white">
                            {belt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumen de Asistencia en el Tatami (Presentes, Tardes, Ausentes) */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {alumno.asistencias_resumen && alumno.asistencias_resumen.total > 0 ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{alumno.asistencias_resumen.presentes} Pres</span>
                        </span>
                        <span className="flex items-center gap-1 text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/40">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{alumno.asistencias_resumen.tardes} Tard</span>
                        </span>
                        <span className="flex items-center gap-1 text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-500/40">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>{alumno.asistencias_resumen.ausentes} Aus</span>
                        </span>
                        <span className="text-blue-200 font-medium text-[10px]">
                          ({alumno.asistencias_resumen.porcentajePresentismo}% presentismo)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-blue-300/80 font-medium">
                        0 clases computadas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-blue-200 font-medium flex-wrap pt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-cyan-300" />
                      <span>{alumno.telefono_contacto}</span>
                    </span>
                    <span>•</span>
                    <span>Emergencia: {alumno.contacto_emergencia}</span>
                    {alumno.profesores_nombres && alumno.profesores_nombres.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-200 font-bold bg-[#0A2E65] px-2 py-0.5 rounded-md border border-[#2056A8] text-[11px]">
                          Sensei: {alumno.profesores_nombres.join(", ")}
                        </span>
                      </>
                    )}
                  </div>

                  {alumno.notas_privadas && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-200 font-medium bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-700/60 mt-1 max-w-lg">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>Nota confidencial: {alumno.notas_privadas}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción Directa */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => setFichaAlumno(alumno)}
                  className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95"
                  title="Ver ficha individual del alumno con detalle de asistencias y graduaciones"
                >
                  <FileText className="w-4 h-4 text-slate-950" />
                  <span>Ver Ficha</span>
                </button>

                <button
                  onClick={() => setEditandoNotaAlumno(alumno)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 touch-target-safe cursor-pointer transition-colors"
                  title="Editar nota privada confidencial"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="hidden sm:inline">Nota</span>
                </button>

                <button
                  onClick={() => setGraduandoAlumno(alumno)}
                  className="px-3.5 py-2 bg-white hover:bg-blue-50 text-[#0F3E86] font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95"
                  title="Realizar pase oficial de cinturón o categoría"
                >
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Pase Oficial</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modales */}
      <ModalFichaAlumno
        alumno={fichaAlumno}
        isOpen={!!fichaAlumno}
        onClose={() => setFichaAlumno(null)}
        onOpenPaseOficial={(a) => {
          setFichaAlumno(null);
          setGraduandoAlumno(a);
        }}
        onNotaUpdated={(alumnoId, nuevaNota) => {
          handleNotaActualizada(alumnoId, nuevaNota);
        }}
      />

      <ModalGraduacion
        alumno={graduandoAlumno}
        isOpen={!!graduandoAlumno}
        onClose={() => setGraduandoAlumno(null)}
        onSuccess={(nuevoCinturon, nuevaSubcategoria) => {
          if (graduandoAlumno) {
            setAlumnos((prev) =>
              prev.map((a) =>
                a.id === graduandoAlumno.id
                  ? {
                      ...a,
                      cinturon_actual: nuevoCinturon,
                      subcategoria_actual: nuevaSubcategoria ?? a.subcategoria_actual,
                    }
                  : a
              )
            );
          }
          setGraduandoAlumno(null);
        }}
      />

      <ModalNotaPrivada
        alumno={editandoNotaAlumno}
        isOpen={!!editandoNotaAlumno}
        onClose={() => setEditandoNotaAlumno(null)}
        onSuccess={(nuevaNota) => {
          if (editandoNotaAlumno) {
            handleNotaActualizada(editandoNotaAlumno.id, nuevaNota);
          }
          setEditandoNotaAlumno(null);
        }}
      />

      <ModalImportarAlumnosCsv
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportadoExitoso={() => window.location.reload()}
      />
    </div>
  );
}
