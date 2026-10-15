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
import { formatDaysList, formatTime } from "@/lib/utils";
import { cerrarClaseAction } from "@/lib/actions/asistencia.actions";
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

  const handleListaCreada = (nuevaLista: ListaAlumnos) => {
    setListasAlumnos((prev) => [nuevaLista, ...prev]);
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
      {/* 1. Banner Principal del Sensei - Card Azul Oficial #0F3E86 */}
      <div className="p-5 sm:p-6 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-blue-950/20">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md shadow-blue-950/30 shrink-0">
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
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-md border border-white/20">
                {currentUser.rol === "ADMIN" ? "SuperAdmin" : "Admin Sensei"}
              </span>
              <span className="text-xs text-blue-200 font-semibold">
                Nievas Academia Deportiva
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {currentUser.nombre_completo}
            </h1>
            <p className="text-xs text-blue-200 font-medium">
              Crea una clase con tu lista de alumnos o retoma una de tus últimas clases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href="/profesor/metricas"
            className="px-4 py-2.5 bg-white hover:bg-blue-50 text-[#0F3E86] text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors touch-target-safe cursor-pointer"
          >
            <span>Ver Mis Métricas</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#0F3E86]" />
          </Link>
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

      {/* Resumen de Listas Disponibles */}
      {listasAlumnos.length > 0 && (
        <div className="p-4 bg-[#0F3E86] text-white border border-[#1E57A8] rounded-2xl shadow-md flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-100 mr-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Listas de Alumnos Guardadas:</span>
          </div>
          {listasAlumnos.map((lista) => (
            <span
              key={lista.id}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 text-white border border-white/20 flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-cyan-300" />
              <span>{lista.nombre}</span>
              <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded-md font-bold text-cyan-200">
                {lista.total_alumnos || lista.alumnos_ids.length}
              </span>
            </span>
          ))}
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
    </div>
  );
}
