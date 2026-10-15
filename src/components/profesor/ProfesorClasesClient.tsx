"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Usuario,
  ClaseHistorialItem,
  ListaAlumnos,
  Alumno,
  Clase,
  ClaseAbiertaItem,
} from "@/types";
import { ModalCrearClaseProfesor } from "./ModalCrearClaseProfesor";
import { ModalCrearListaAlumnos } from "./ModalCrearListaAlumnos";
import { ModalVerListaAlumnos } from "./ModalVerListaAlumnos";
import { ModalEditarListaAlumnos } from "./ModalEditarListaAlumnos";
import { formatDaysList, formatTime } from "@/lib/utils";
import { cerrarClaseAction } from "@/lib/actions/asistencia.actions";
import { eliminarListaAlumnosAction } from "@/lib/actions/clases.actions";
import {
  CalendarDays,
  Clock,
  Users,
  ClipboardCheck,
  PlusCircle,
  History,
  ChevronRight,
  ListPlus,
  Sparkles,
  CheckCircle2,
  Radio,
  Lock,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";

interface ProfesorClasesClientProps {
  currentUser: Usuario;
  initialUltimasClases: ClaseHistorialItem[];
  initialListasAlumnos: ListaAlumnos[];
  alumnosDisponibles: Alumno[];
  initialClasesAbiertas?: ClaseAbiertaItem[];
}

export function ProfesorClasesClient({
  currentUser,
  initialUltimasClases,
  initialListasAlumnos,
  alumnosDisponibles,
  initialClasesAbiertas = [],
}: ProfesorClasesClientProps) {
  const [ultimasClases, setUltimasClases] =
    useState<ClaseHistorialItem[]>(initialUltimasClases);
  const [listasAlumnos, setListasAlumnos] =
    useState<ListaAlumnos[]>(initialListasAlumnos);
  const [clasesAbiertas, setClasesAbiertas] =
    useState<ClaseAbiertaItem[]>(initialClasesAbiertas);
  const [cerrandoSesionId, setCerrandoSesionId] = useState<string | null>(null);

  const [isCrearClaseOpen, setIsCrearClaseOpen] = useState(false);
  const [isCrearListaOpen, setIsCrearListaOpen] = useState(false);

  // Estados para Ver y Editar Listas de Alumnos Guardadas
  const [listaParaVer, setListaParaVer] = useState<ListaAlumnos | null>(null);
  const [listaParaEditar, setListaParaEditar] = useState<ListaAlumnos | null>(null);
  const [eliminandoListaId, setEliminandoListaId] = useState<string | null>(null);

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = currentUser.nombre_completo
    .replace(/\s*\((admin|superadmin|profesor)\)/gi, "")
    .trim();

  const handleListaCreada = (nuevaLista: ListaAlumnos) => {
    setListasAlumnos((prev) => [nuevaLista, ...prev]);
  };

  const handleListaActualizada = (listaActualizada: ListaAlumnos) => {
    setListasAlumnos((prev) =>
      prev.map((l) => (l.id === listaActualizada.id ? listaActualizada : l))
    );
  };

  const handleEliminarLista = async (lista: ListaAlumnos) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar la lista "${lista.nombre}"?`
    );
    if (!confirmar) return;

    setEliminandoListaId(lista.id);
    try {
      const res = await eliminarListaAlumnosAction(lista.id);
      if (res.success) {
        setListasAlumnos((prev) => prev.filter((l) => l.id !== lista.id));
        if (listaParaVer?.id === lista.id) setListaParaVer(null);
        if (listaParaEditar?.id === lista.id) setListaParaEditar(null);
      } else {
        alert(res.error || "No se pudo eliminar la lista");
      }
    } catch {
      alert("Error al eliminar la lista de alumnos");
    } finally {
      setEliminandoListaId(null);
    }
  };

  const handleClaseCreada = (nuevaClase: Clase) => {
    const nuevoItem: ClaseHistorialItem = {
      clase: nuevaClase,
      fecha: new Date().toISOString().split("T")[0],
      totalInscriptos: nuevaClase.total_inscriptos || 0,
      totalPresentes: 0,
      totalAusentes: nuevaClase.total_inscriptos || 0,
      totalTardes: 0,
    };
    setUltimasClases((prev) => [nuevoItem, ...prev.slice(0, 2)]);

    // Agregar a la lista de clases abiertas parpadeando
    const nuevaAbierta: ClaseAbiertaItem = {
      sesion: {
        id: "s" + Date.now().toString(36),
        clase_id: nuevaClase.id,
        profesor_id: currentUser.id,
        fecha: new Date().toISOString().split("T")[0],
        hora_apertura: new Date().toISOString(),
        estado: "ABIERTA",
        observaciones: "",
        created_at: new Date().toISOString(),
        clase_nombre: nuevaClase.nombre,
      },
      clase: nuevaClase,
      presentesCount: 0,
      totalCount: nuevaClase.total_inscriptos || 0,
    };
    setClasesAbiertas((prev) => [nuevaAbierta, ...prev]);
  };

  const handleCerrarClase = async (sesionId: string) => {
    const confirmar = window.confirm("¿Deseas cerrar y finalizar esta clase de tatami?");
    if (!confirmar) return;

    setCerrandoSesionId(sesionId);
    try {
      const res = await cerrarClaseAction(sesionId);
      if (res.success) {
        setClasesAbiertas((prev) => prev.filter((item) => item.sesion.id !== sesionId));
      } else {
        alert(res.error || "No se pudo cerrar la clase");
      }
    } catch {
      alert("Error de conexión al cerrar la clase");
    } finally {
      setCerrandoSesionId(null);
    }
  };

  return (
    <div className="space-y-6">
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
              Gestión de clases y asistencia en tatami
            </p>
          </div>
        </div>
      </div>

      {/* 2. CLASE ABIERTA PARPADEANDO (Aparece en la parte superior debajo de la card principal) */}
      {clasesAbiertas.length > 0 && (
        <div className="space-y-3">
          {clasesAbiertas.map((item) => (
            <div
              key={item.sesion.id}
              className="p-5 bg-gradient-to-r from-[#0F3E86] via-[#124694] to-[#0F3E86] text-white border-2 border-emerald-400 rounded-3xl shadow-xl animate-open-class transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      CLASE ABIERTA EN TATAMI
                    </span>
                    <span className="text-[11px] bg-white/10 text-blue-100 px-2 py-0.5 rounded-full border border-white/20">
                      En Vivo
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {item.clase.nombre}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200 mt-1 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-300" />
                        <span>
                          {formatTime(item.clase.hora_inicio)} a {formatTime(item.clase.hora_fin)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-cyan-300" />
                        <span>{item.totalCount} alumnos inscriptos</span>
                      </span>
                      <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-700/60">
                        {item.presentesCount} presentes marcados
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la Clase Abierta */}
                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
                  <Link
                    href={`/profesor/clases/${item.clase.id}/asistencia`}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-950/30 flex items-center gap-2 transition-all active:scale-98 touch-target-safe cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4 text-slate-950" />
                    <span>CONTINUAR ASISTENCIA</span>
                  </Link>
                  <button
                    onClick={() => handleCerrarClase(item.sesion.id)}
                    disabled={cerrandoSesionId === item.sesion.id}
                    className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 text-xs font-bold rounded-xl transition-all active:scale-98 touch-target-safe cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-300" />
                    <span>{cerrandoSesionId === item.sesion.id ? "Cerrando..." : "CERRAR CLASE"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. ACCIONES PRINCIPALES: Crear Nueva Clase & Crear Nueva Lista (Cards Azules #0F3E86) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Crear Nueva Clase */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-blue-400 rounded-3xl p-5 sm:p-6 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-4 transition-all group">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-300 group-hover:scale-105 group-hover:bg-white group-hover:text-[#0F3E86] transition-all shadow-sm">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Crear Nueva Clase
              </h2>
              <p className="text-xs text-blue-200 font-medium leading-relaxed">
                Selecciona una lista de alumnos y define el horario para iniciar de inmediato la toma de asistencia en el tatami.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="w-full py-3.5 px-4 bg-white hover:bg-blue-50 active:scale-98 text-[#0F3E86] font-extrabold text-sm rounded-2xl shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-target-safe"
          >
            <PlusCircle className="w-5 h-5 text-[#0F3E86]" />
            <span>CREAR NUEVA CLASE</span>
          </button>
        </div>

        {/* Card 2: Crear Nueva Lista de Alumnos */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-blue-400 rounded-3xl p-5 sm:p-6 shadow-xl shadow-blue-950/15 flex flex-col justify-between gap-4 transition-all group">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-300 group-hover:scale-105 group-hover:bg-white group-hover:text-[#0F3E86] transition-all shadow-sm">
              <ListPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Crear Nueva Lista de Alumnos
              </h2>
              <p className="text-xs text-blue-200 font-medium leading-relaxed">
                Agrupa alumnos de la academia para que aparezcan en las opciones de selección al crear clases y edita sus cinturones.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCrearListaOpen(true)}
            className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white border-2 border-white/40 active:scale-98 font-extrabold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer touch-target-safe"
          >
            <Users className="w-5 h-5 text-cyan-300" />
            <span>CREAR NUEVA LISTA</span>
          </button>
        </div>
      </div>

      {/* Resumen y Gestión de Listas de Alumnos Guardadas */}
      {listasAlumnos.length > 0 && (
        <div className="p-4 sm:p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-xl shadow-blue-950/15 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Listas de Alumnos Guardadas ({listasAlumnos.length})</span>
            </div>
            <button
              onClick={() => setIsCrearListaOpen(true)}
              className="text-xs text-cyan-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>+ Nueva Lista</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {listasAlumnos.map((lista) => (
              <div
                key={lista.id}
                className="p-3 bg-[#0A2E65] border border-[#2056A8] hover:border-cyan-400/50 rounded-2xl flex items-center justify-between gap-2.5 transition-all shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">
                      {lista.nombre}
                    </span>
                    <span className="font-mono text-[10px] bg-white/15 px-1.5 py-0.2 rounded-md font-bold text-cyan-200 shrink-0">
                      {lista.total_alumnos || lista.alumnos_ids.length}
                    </span>
                  </div>
                  {lista.descripcion && (
                    <p className="text-[10px] text-blue-200 truncate mt-0.5">
                      {lista.descripcion}
                    </p>
                  )}
                </div>

                {/* Acciones: Ver, Editar, Eliminar */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setListaParaVer(lista)}
                    title="Ver detalles de la lista y alumnos"
                    className="p-2 bg-white/10 hover:bg-white/20 text-cyan-300 hover:text-white rounded-xl transition-colors cursor-pointer touch-target-safe"
                    aria-label={`Ver lista ${lista.nombre}`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setListaParaEditar(lista)}
                    title="Editar información y alumnos"
                    className="p-2 bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white rounded-xl transition-colors cursor-pointer touch-target-safe"
                    aria-label={`Editar lista ${lista.nombre}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEliminarLista(lista)}
                    disabled={eliminandoListaId === lista.id}
                    title="Eliminar lista de alumnos"
                    className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50 touch-target-safe"
                    aria-label={`Eliminar lista ${lista.nombre}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HISTORIAL DE LAS ÚLTIMAS CLASES (Cards Azules #0F3E86) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0F3E86] border border-[#1E57A8] text-white shadow-xs">
              <History className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Historial de Últimas Clases
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mostrando las últimas 3 clases dictadas por este sensei
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#0F3E86] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            {ultimasClases.length} de 3
          </span>
        </div>

        {ultimasClases.length === 0 ? (
          <div className="p-8 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl text-center space-y-3 shadow-lg">
            <p className="text-sm font-bold text-white">
              Aún no tienes clases registradas en tu historial.
            </p>
            <p className="text-xs text-blue-200 max-w-md mx-auto">
              Utiliza el botón de arriba &quot;Crear Nueva Clase&quot; para seleccionar una lista de alumnos e iniciar el registro de asistencia en el tatami.
            </p>
            <button
              onClick={() => setIsCrearClaseOpen(true)}
              className="px-5 py-2.5 bg-white text-[#0F3E86] text-xs font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            >
              Crear mi primera clase
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ultimasClases.slice(0, 3).map((item) => (
              <div
                key={item.clase.id}
                className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-blue-400 rounded-2xl p-5 shadow-xl shadow-blue-950/20 flex flex-col justify-between gap-4 transition-all relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-cyan-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 uppercase tracking-wider">
                      {item.fecha || "Tatami"}
                    </span>
                    <span className="text-xs text-blue-100 font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-300" />
                      <span>{item.totalInscriptos} alumnos</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-white tracking-tight leading-snug">
                      {item.clase.nombre}
                    </h3>
                    <p className="text-xs text-blue-200 font-medium mt-1">
                      Profesor: {item.clase.profesor_nombre || currentUser.nombre_completo}
                    </p>
                  </div>

                  {/* Metadatos Horario y Días */}
                  <div className="space-y-1.5 text-xs text-blue-100 bg-white/10 p-2.5 rounded-xl border border-white/15">
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

                  {/* Estadísticas de Asistencia si hubo sesión */}
                  <div className="flex items-center justify-between text-xs font-semibold px-2">
                    <span className="flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{item.totalPresentes} presentes</span>
                    </span>
                    <span className="text-blue-300">
                      {item.totalAusentes} ausentes
                    </span>
                  </div>
                </div>

                {/* Botón Táctil para Abrir Asistencia */}
                <Link
                  href={`/profesor/clases/${item.clase.id}/asistencia`}
                  className="w-full py-3 px-3 bg-white hover:bg-blue-50 active:scale-98 text-[#0F3E86] font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#0F3E86]" />
                  <span>PASAR ASISTENCIA EN TATAMI</span>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* 5. BOTÓN: VER TODO EL HISTORIAL */}
        <div className="pt-2 flex justify-center">
          <Link
            href="/profesor/historial"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#0F3E86] hover:bg-[#144EAA] text-white border-2 border-[#1E57A8] rounded-2xl font-black text-sm shadow-xl shadow-blue-950/20 flex items-center justify-center gap-2.5 transition-all hover:scale-101 active:scale-98 touch-target-safe cursor-pointer"
          >
            <History className="w-4 h-4 text-cyan-300" />
            <span>VER TODO EL HISTORIAL DE CLASES</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </Link>
        </div>
      </section>

      {/* Modales */}
      <ModalCrearClaseProfesor
        isOpen={isCrearClaseOpen}
        onClose={() => setIsCrearClaseOpen(false)}
        listasDisponibles={listasAlumnos}
        onOpenCrearLista={() => {
          setIsCrearClaseOpen(false);
          setIsCrearListaOpen(true);
        }}
        profesorId={currentUser.id}
        onClaseCreada={handleClaseCreada}
      />

      <ModalCrearListaAlumnos
        isOpen={isCrearListaOpen}
        onClose={() => setIsCrearListaOpen(false)}
        alumnosDisponibles={alumnosDisponibles}
        onListaCreada={(nuevaLista) => {
          handleListaCreada(nuevaLista);
          setIsCrearClaseOpen(true);
        }}
      />

      {/* Modal para Ver Detalles de Alumnos de la Lista */}
      <ModalVerListaAlumnos
        isOpen={!!listaParaVer}
        lista={listaParaVer}
        alumnosDisponibles={alumnosDisponibles}
        onClose={() => setListaParaVer(null)}
        onEditar={(lista) => {
          setListaParaVer(null);
          setListaParaEditar(lista);
        }}
      />

      {/* Modal para Editar Nombre, Descripción, Alumnos y Cinturones */}
      <ModalEditarListaAlumnos
        isOpen={!!listaParaEditar}
        lista={listaParaEditar}
        alumnosDisponibles={alumnosDisponibles}
        onClose={() => setListaParaEditar(null)}
        onListaActualizada={(listaActualizada) => {
          handleListaActualizada(listaActualizada);
          setListaParaEditar(null);
        }}
      />
    </div>
  );
}
