"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Alumno, HistorialGraduacion, KarateBelt } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { ModalGraduacion } from "./ModalGraduacion";
import { ModalNotaPrivada } from "./ModalNotaPrivada";
import {
  Users,
  Search,
  Award,
  Phone,
  ShieldAlert,
  ArrowLeft,
  Calendar,
} from "lucide-react";

interface AdminAlumnosClientProps {
  initialAlumnos: Alumno[];
}

const BELTS: Array<KarateBelt | "TODOS"> = [
  "TODOS",
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Naranja",
  "Verde",
  "Azul",
  "Marrón",
  "Negro",
];

export function AdminAlumnosClient({
  initialAlumnos,
}: AdminAlumnosClientProps) {
  const [alumnos, setAlumnos] = useState<Alumno[]>(initialAlumnos);

  const [search, setSearch] = useState("");
  const [beltFilter, setBeltFilter] = useState<KarateBelt | "TODOS">("TODOS");

  const [graduandoAlumno, setGraduandoAlumno] = useState<Alumno | null>(null);
  const [editandoNotaAlumno, setEditandoNotaAlumno] = useState<Alumno | null>(
    null
  );

  const filteredAlumnos = alumnos.filter((a) => {
    const matchesSearch =
      a.nombre.toLowerCase().includes(search.toLowerCase()) ||
      a.apellido.toLowerCase().includes(search.toLowerCase()) ||
      a.telefono_contacto.includes(search);

    const matchesBelt =
      beltFilter === "TODOS" ? true : a.cinturon_actual === beltFilter;

    return matchesSearch && matchesBelt;
  });

  const handleNotaActualizada = (alumnoId: string, notasPrivadas: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === alumnoId ? { ...a, notas_privadas: notasPrivadas } : a))
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Botón Volver & Badge */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-[#154495] font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#154495]" />
          <span>Volver al Dashboard Directivo</span>
        </Link>

        <span className="text-xs font-bold text-[#154495] bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
          Registro Oficial de Alumnos
        </span>
      </div>

      {/* Header Headmaster con Logo Oficial - Card Clara con acentos azules */}
      <div className="p-5 sm:p-6 bg-white border-2 border-blue-200/90 rounded-3xl shadow-lg shadow-blue-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <Users className="w-4 h-4 text-[#154495]" />
              <span className="text-[10px] font-bold text-[#154495] uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                Padrón de Karatecas
              </span>
            </div>
            <h1 className="text-2xl font-black text-blue-950 tracking-tight mt-0.5">
              Gestión de Alumnos & Graduaciones
            </h1>
            <p className="text-xs text-blue-700 font-medium">
              Pase de cinto oficial, historial de graduación y notas confidenciales del Headmaster.
            </p>
          </div>
        </div>

        <div className="text-right self-start sm:self-center">
          <span className="text-2xl font-black text-blue-950">
            {alumnos.length}
          </span>
          <span className="block text-xs text-blue-700 font-medium">Alumnos en el dojo</span>
        </div>
      </div>

      {/* Buscador & Filtro por Cinturón */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o teléfono..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-blue-200 rounded-xl text-sm text-blue-950 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-[#154495] transition-all"
          />
        </div>

        <div className="relative">
          <select
            value={beltFilter}
            onChange={(e) =>
              setBeltFilter(e.target.value as KarateBelt | "TODOS")
            }
            className="w-full px-3 py-2.5 bg-white border-2 border-blue-200 rounded-xl text-sm font-semibold text-blue-950 focus:outline-none focus:ring-2 focus:ring-[#154495] cursor-pointer"
          >
            {BELTS.map((b) => (
              <option key={b} value={b}>
                {b === "TODOS" ? "Todos los Cinturones" : `Cinturón ${b}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Alumnos - Cards Claras con texto y acentos azules */}
      <div className="space-y-3">
        {filteredAlumnos.length === 0 ? (
          <div className="p-8 text-center text-blue-700 bg-white rounded-2xl border-2 border-dashed border-blue-200 text-sm font-medium">
            No se encontraron alumnos con los criterios seleccionados.
          </div>
        ) : (
          filteredAlumnos.map((alumno) => (
            <div
              key={alumno.id}
              className="p-4 bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl shadow-md shadow-blue-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-sm text-[#154495] shrink-0">
                  {alumno.nombre[0]}
                  {alumno.apellido[0]}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-blue-950 text-base">
                      {alumno.nombre} {alumno.apellido}
                    </span>
                    <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-blue-800 font-medium">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#154495]" />
                      <span>{alumno.telefono_contacto}</span>
                    </span>
                    <span>•</span>
                    <span>Emergencia: {alumno.contacto_emergencia}</span>
                  </div>

                  {alumno.notas_privadas && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 mt-1 max-w-lg">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>Nota privada: {alumno.notas_privadas}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción Directa */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => setEditandoNotaAlumno(alumno)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#154495] font-bold text-xs rounded-xl border border-blue-300 flex items-center gap-1.5 touch-target-safe cursor-pointer transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#154495]" />
                  <span>Nota Privada</span>
                </button>

                <button
                  onClick={() => setGraduandoAlumno(alumno)}
                  className="px-4 py-2 bg-[#154495] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950/20 flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>Pase de Cinto</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modales */}
      <ModalGraduacion
        alumno={graduandoAlumno}
        isOpen={!!graduandoAlumno}
        onClose={() => setGraduandoAlumno(null)}
        onSuccess={(nuevoCinturon) => {
          if (graduandoAlumno) {
            setAlumnos((prev) =>
              prev.map((a) =>
                a.id === graduandoAlumno.id
                  ? { ...a, cinturon_actual: nuevoCinturon }
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
    </div>
  );
}
