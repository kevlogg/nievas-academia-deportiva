"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Alumno, KarateBelt } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { ModalGraduacion } from "@/components/admin/ModalGraduacion";
import { ModalNotaPrivada } from "@/components/admin/ModalNotaPrivada";
import {
  Users,
  Search,
  Award,
  ShieldAlert,
  ChevronLeft,
  Phone,
  Filter,
} from "lucide-react";

interface AdminAlumnosClientProps {
  initialAlumnos: Alumno[];
}

const BELTS: (KarateBelt | "TODOS")[] = [
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

  // Estados de modales
  const [graduandoAlumno, setGraduandoAlumno] = useState<Alumno | null>(null);
  const [editandoNotaAlumno, setEditandoNotaAlumno] = useState<Alumno | null>(
    null
  );

  const filteredAlumnos = alumnos.filter((alumno) => {
    const matchesSearch =
      search.trim() === "" ||
      alumno.nombre.toLowerCase().includes(search.toLowerCase()) ||
      alumno.apellido.toLowerCase().includes(search.toLowerCase()) ||
      alumno.telefono_contacto.includes(search);

    const matchesBelt =
      beltFilter === "TODOS" || alumno.cinturon_actual === beltFilter;

    return matchesSearch && matchesBelt;
  });

  const handleGraduacionSuccess = (alumnoId: string, nuevoCinto: KarateBelt) => {
    setAlumnos((prev) =>
      prev.map((a) =>
        a.id === alumnoId ? { ...a, cinturon_actual: nuevoCinto } : a
      )
    );
  };

  const handleNotaSuccess = (alumnoId: string, nuevaNota: string) => {
    setAlumnos((prev) =>
      prev.map((a) =>
        a.id === alumnoId ? { ...a, notas_privadas: nuevaNota } : a
      )
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-slate-800 transition-colors touch-target-safe"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </Link>

        <span className="text-xs text-amber-400 font-semibold bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/60">
          Registro Oficial de Alumnos
        </span>
      </div>

      <div className="p-5 bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 border border-red-900/50 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
              Padrón de Karatecas
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Gestión de Alumnos & Graduaciones
          </h1>
          <p className="text-xs text-slate-300">
            Pase de cinto oficial, historial de graduación y notas confidenciales del Headmaster.
          </p>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-white">
            {alumnos.length}
          </span>
          <span className="block text-xs text-slate-400">Alumnos en el dojo</span>
        </div>
      </div>

      {/* Buscador & Filtro por Cinturón */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o teléfono..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500"
          />
        </div>

        <div className="relative">
          <select
            value={beltFilter}
            onChange={(e) =>
              setBeltFilter(e.target.value as KarateBelt | "TODOS")
            }
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
          >
            {BELTS.map((b) => (
              <option key={b} value={b}>
                {b === "TODOS" ? "Todos los Cinturones" : `Cinturón ${b}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Alumnos */}
      <div className="space-y-3">
        {filteredAlumnos.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800 text-sm">
            No se encontraron alumnos con los criterios seleccionados.
          </div>
        ) : (
          filteredAlumnos.map((alumno) => (
            <div
              key={alumno.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-200 shrink-0">
                  {alumno.nombre[0]}
                  {alumno.apellido[0]}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-base">
                      {alumno.nombre} {alumno.apellido}
                    </span>
                    <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{alumno.telefono_contacto}</span>
                    </span>
                    <span>•</span>
                    <span>Emergencia: {alumno.contacto_emergencia}</span>
                  </div>

                  {alumno.notas_privadas && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-900/60 mt-1 max-w-lg">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>Nota privada: {alumno.notas_privadas}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción Directa */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => setEditandoNotaAlumno(alumno)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 touch-target-safe cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nota Privada</span>
                </button>

                <button
                  onClick={() => setGraduandoAlumno(alumno)}
                  className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 touch-target-safe cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-200" />
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
        onSuccess={(nuevoCinto) => {
          if (graduandoAlumno) {
            handleGraduacionSuccess(graduandoAlumno.id, nuevoCinto);
          }
        }}
      />

      <ModalNotaPrivada
        alumno={editandoNotaAlumno}
        isOpen={!!editandoNotaAlumno}
        onClose={() => setEditandoNotaAlumno(null)}
        onSuccess={(nuevaNota) => {
          if (editandoNotaAlumno) {
            handleNotaSuccess(editandoNotaAlumno.id, nuevaNota);
          }
        }}
      />
    </div>
  );
}
