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
} from "@/types";
import { ModalCrearClaseProfesor } from "./ModalCrearClaseProfesor";
import { ModalCrearListaAlumnos } from "./ModalCrearListaAlumnos";
import { formatDaysList, formatTime } from "@/lib/utils";
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
} from "lucide-react";

interface ProfesorClasesClientProps {
  currentUser: Usuario;
  initialUltimasClases: ClaseHistorialItem[];
  initialListasAlumnos: ListaAlumnos[];
  alumnosDisponibles: Alumno[];
}

export function ProfesorClasesClient({
  currentUser,
  initialUltimasClases,
  initialListasAlumnos,
  alumnosDisponibles,
}: ProfesorClasesClientProps) {
  const [ultimasClases, setUltimasClases] =
    useState<ClaseHistorialItem[]>(initialUltimasClases);
  const [listasAlumnos, setListasAlumnos] =
    useState<ListaAlumnos[]>(initialListasAlumnos);

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
  };

  return (
    <div className="space-y-6">
      {/* 1. Banner de Bienvenida del Sensei - Card Clara con acentos azules */}
      <div className="p-5 sm:p-6 bg-white border-2 border-blue-200/90 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-blue-950/5">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#154495] border-2 border-blue-400/60 shadow-md shadow-blue-950/20 shrink-0">
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
              <span className="text-[10px] font-bold text-[#154495] uppercase tracking-widest bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                {currentUser.rol === "ADMIN" ? "SuperSensei Headmaster" : "Sensei Tatami"}
              </span>
              <span className="text-xs text-blue-800 font-semibold">
                Nievas Academia Deportiva
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight mt-0.5">
              {currentUser.nombre_completo}
            </h1>
            <p className="text-xs text-blue-700 font-medium">
              Crea una clase con tu lista de alumnos o retoma una de tus últimas clases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href="/profesor/metricas"
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#154495] text-xs font-bold rounded-xl border border-blue-300 flex items-center gap-1.5 transition-colors touch-target-safe cursor-pointer shadow-xs"
          >
            <span>Ver Mis Métricas</span>
            <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
          </Link>
        </div>
      </div>

      {/* 2. ACCIONES PRINCIPALES: Crear Nueva Clase & Crear Nueva Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Crear Nueva Clase */}
        <div className="bg-white border-2 border-blue-200 hover:border-[#154495] rounded-3xl p-5 sm:p-6 shadow-md shadow-blue-950/5 flex flex-col justify-between gap-4 transition-all group">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#154495] group-hover:scale-105 group-hover:bg-[#154495] group-hover:text-white transition-all shadow-xs">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-950">
                Crear Nueva Clase
              </h2>
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Selecciona una lista de alumnos y define el horario para iniciar de inmediato la toma de asistencia en el tatami.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="w-full py-3.5 px-4 bg-[#154495] hover:bg-blue-800 active:scale-98 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-target-safe"
          >
            <PlusCircle className="w-5 h-5 text-blue-200" />
            <span>CREAR NUEVA CLASE</span>
          </button>
        </div>

        {/* Card 2: Crear Nueva Lista de Alumnos */}
        <div className="bg-white border-2 border-blue-200 hover:border-[#154495] rounded-3xl p-5 sm:p-6 shadow-md shadow-blue-950/5 flex flex-col justify-between gap-4 transition-all group">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#154495] group-hover:scale-105 group-hover:bg-[#154495] group-hover:text-white transition-all shadow-xs">
              <ListPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-950">
                Crear Nueva Lista de Alumnos
              </h2>
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Agrupa alumnos de la academia para que aparezcan en las opciones de selección al crear clases.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCrearListaOpen(true)}
            className="w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 text-[#154495] border-2 border-[#154495] active:scale-98 font-extrabold text-sm rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer touch-target-safe"
          >
            <Users className="w-5 h-5 text-[#154495]" />
            <span>CREAR NUEVA LISTA</span>
          </button>
        </div>
      </div>

      {/* Resumen de Listas Disponibles */}
      {listasAlumnos.length > 0 && (
        <div className="p-4 bg-white border border-blue-200 rounded-2xl shadow-xs flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 mr-2">
            <Sparkles className="w-4 h-4 text-[#154495]" />
            <span>Listas de Alumnos Guardadas:</span>
          </div>
          {listasAlumnos.map((lista) => (
            <span
              key={lista.id}
              className="text-xs font-semibold px-3 py-1 rounded-xl bg-blue-50 text-[#154495] border border-blue-200 flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>{lista.nombre}</span>
              <span className="font-mono text-[10px] bg-blue-200/80 px-1.5 py-0.2 rounded-md font-bold">
                {lista.total_alumnos || lista.alumnos_ids.length}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* 3. HISTORIAL DE LAS ÚLTIMAS CLASES (Exactamente las últimas 3) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#154495] text-white shadow-xs">
              <History className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-blue-950 tracking-tight">
                Historial de Últimas Clases
              </h2>
              <p className="text-xs text-blue-700 font-medium">
                Mostrando las últimas 3 clases dictadas por este sensei
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#154495] bg-blue-100/70 px-3 py-1 rounded-full border border-blue-200">
            {ultimasClases.length} de 3
          </span>
        </div>

        {ultimasClases.length === 0 ? (
          <div className="p-8 bg-white border-2 border-dashed border-blue-200 rounded-3xl text-center space-y-3 shadow-sm">
            <p className="text-sm font-bold text-blue-950">
              Aún no tienes clases registradas en tu historial.
            </p>
            <p className="text-xs text-blue-700 max-w-md mx-auto">
              Utiliza el botón de arriba &quot;Crear Nueva Clase&quot; para seleccionar una lista de alumnos e iniciar el registro de asistencia en el tatami.
            </p>
            <button
              onClick={() => setIsCrearClaseOpen(true)}
              className="px-5 py-2.5 bg-[#154495] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-sm"
            >
              Crear mi primera clase
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ultimasClases.slice(0, 3).map((item) => (
              <div
                key={item.clase.id}
                className="bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl p-5 shadow-md shadow-blue-950/5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#154495] bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 uppercase tracking-wider">
                      {item.fecha || "Tatami"}
                    </span>
                    <span className="text-xs text-blue-900 font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{item.totalInscriptos} alumnos</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-blue-950 tracking-tight leading-snug">
                      {item.clase.nombre}
                    </h3>
                    <p className="text-xs text-blue-800 font-medium mt-1">
                      Profesor: {item.clase.profesor_nombre || currentUser.nombre_completo}
                    </p>
                  </div>

                  {/* Metadatos Horario y Días */}
                  <div className="space-y-1.5 text-xs text-blue-900/90 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
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

                  {/* Estadísticas de Asistencia si hubo sesión */}
                  <div className="flex items-center justify-between text-xs font-semibold px-2">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{item.totalPresentes} presentes</span>
                    </span>
                    <span className="text-slate-500">
                      {item.totalAusentes} ausentes
                    </span>
                  </div>
                </div>

                {/* Botón Táctil para Abrir Asistencia */}
                <Link
                  href={`/profesor/clases/${item.clase.id}/asistencia`}
                  className="w-full py-3 px-3 bg-[#154495] hover:bg-blue-800 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4 text-blue-200" />
                  <span>PASAR ASISTENCIA EN TATAMI</span>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* 4. BOTÓN: VER TODO EL HISTORIAL */}
        <div className="pt-2 flex justify-center">
          <Link
            href="/profesor/historial"
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-blue-50 text-[#154495] border-2 border-[#154495] rounded-2xl font-black text-sm shadow-md shadow-blue-950/10 flex items-center justify-center gap-2.5 transition-all hover:scale-101 active:scale-98 touch-target-safe cursor-pointer"
          >
            <History className="w-4 h-4 text-[#154495]" />
            <span>VER TODO EL HISTORIAL DE CLASES</span>
            <ChevronRight className="w-4 h-4 text-[#154495]" />
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
          setIsCrearClaseOpen(true); // Reabre el modal de clase para que pueda elegirla de inmediato
        }}
      />
    </div>
  );
}
