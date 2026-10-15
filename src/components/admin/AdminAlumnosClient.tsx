"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Alumno, KarateBelt } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { ModalGraduacion } from "./ModalGraduacion";
import { ModalNotaPrivada } from "./ModalNotaPrivada";
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

const BELT_OPTIONS: KarateBelt[] = [
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
  const [editandoNotaAlumno, setEditandoNotaAlumno] = useState<Alumno | null>(null);
  const [cambiandoCintoId, setCambiandoCintoId] = useState<string | null>(null);

  const filteredAlumnos = alumnos.filter((a) => {
    const matchesSearch =
      a.nombre.toLowerCase().includes(search.toLowerCase()) ||
      a.apellido.toLowerCase().includes(search.toLowerCase()) ||
      a.telefono_contacto.includes(search);

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
          prev.map((a) => (a.id === alumnoId ? { ...a, cinturon_actual: nuevoCinturon } : a))
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
          <span>Volver al Panel SuperAdmin</span>
        </Link>

        <span className="text-xs font-bold text-[#0F3E86] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Registro Oficial de Alumnos
        </span>
      </div>

      {/* Header con Logo Oficial - Card Azul Oficial #0F3E86 */}
      <div className="p-5 sm:p-6 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-xl shadow-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                Padrón de Karatecas
              </span>
              <span className="text-xs text-blue-200 font-medium">
                Nievas Academia Deportiva
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Gestión de Alumnos y Cinturones
            </h1>
            <p className="text-xs text-blue-200 font-medium">
              Cualquier Admin puede editar el cinturón de sus alumnos directamente aquí o al armar listas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/20 text-center">
            <span className="text-[10px] text-blue-200 block uppercase font-bold">
              Total Alumnos
            </span>
            <span className="text-xl font-black text-white">
              {alumnos.length}
            </span>
          </div>
        </div>
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
              className="p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-blue-400 rounded-2xl shadow-xl shadow-blue-950/15 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-sm text-cyan-300 shrink-0">
                  {alumno.nombre[0]}
                  {alumno.apellido[0]}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-white text-base">
                      {alumno.nombre} {alumno.apellido}
                    </span>
                    <BeltBadge belt={alumno.cinturon_actual} size="sm" />

                    {/* SELECTOR INLINE DE CINTURÓN (Permite al Admin cambiarlo de inmediato) */}
                    <div className="flex items-center gap-1 bg-[#0A2E65] border border-[#2056A8] rounded-lg px-2 py-0.5">
                      <span className="text-[10px] text-blue-200 font-bold">Editar:</span>
                      <select
                        value={alumno.cinturon_actual}
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

                  <div className="flex items-center gap-3 text-xs text-blue-200 font-medium">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-cyan-300" />
                      <span>{alumno.telefono_contacto}</span>
                    </span>
                    <span>•</span>
                    <span>Emergencia: {alumno.contacto_emergencia}</span>
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
                  onClick={() => setEditandoNotaAlumno(alumno)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 touch-target-safe cursor-pointer transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Nota Privada</span>
                </button>

                <button
                  onClick={() => setGraduandoAlumno(alumno)}
                  className="px-4 py-2 bg-white hover:bg-blue-50 text-[#0F3E86] font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 touch-target-safe cursor-pointer transition-transform active:scale-95"
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
