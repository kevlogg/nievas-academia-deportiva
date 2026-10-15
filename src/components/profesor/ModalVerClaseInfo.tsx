"use client";

import React from "react";
import Link from "next/link";
import { ClaseHistorialItem } from "@/types";
import { formatDaysList, formatTime } from "@/lib/utils";
import {
  X,
  History,
  Calendar,
  Clock,
  CalendarDays,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Edit2,
} from "lucide-react";

interface ModalVerClaseInfoProps {
  item: ClaseHistorialItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ModalVerClaseInfo({
  item,
  isOpen,
  onClose,
}: ModalVerClaseInfoProps) {
  if (!isOpen || !item) return null;

  const porcentajePresentismo =
    item.totalInscriptos > 0
      ? Math.round((item.totalPresentes / item.totalInscriptos) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-md flex flex-col shadow-2xl shadow-blue-950/50 overflow-hidden">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-[#0A2E65] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <History className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                {item.clase.nombre}
              </h2>
              <p className="text-xs text-cyan-300 font-medium">
                Detalles de Clase Cerrada
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4 text-xs">
          {/* Metadatos Generales */}
          <div className="p-3.5 bg-[#0A2E65] rounded-2xl border border-[#2056A8] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-blue-200 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-cyan-300" />
                Fecha dictada:
              </span>
              <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/20">
                {item.fecha || "Tatami"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-blue-200 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                Horario:
              </span>
              <span className="font-bold text-white">
                {formatTime(item.clase.hora_inicio)} a {formatTime(item.clase.hora_fin)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-blue-200 flex items-center gap-1.5 font-medium">
                <CalendarDays className="w-3.5 h-3.5 text-cyan-300" />
                Días de clase:
              </span>
              <span className="font-bold text-white">
                {formatDaysList(item.clase.dias_semana)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-blue-200 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-cyan-300" />
                Profesor:
              </span>
              <span className="font-bold text-cyan-200">
                {item.clase.profesor_nombre || "Sensei"}
              </span>
            </div>
          </div>

          {/* Estadísticas de Asistencia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-blue-200 font-bold uppercase tracking-wider text-[11px]">
              <span>Resumen de Asistencia</span>
              <span className="text-cyan-300 font-mono">
                {porcentajePresentismo}% presentismo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-center space-y-1">
                <span className="text-[10px] text-blue-200 block font-semibold">
                  Inscriptos
                </span>
                <span className="text-lg font-black text-white flex items-center justify-center gap-1">
                  <Users className="w-4 h-4 text-cyan-300" />
                  {item.totalInscriptos}
                </span>
              </div>

              <div className="p-3 bg-[#0A2E65] border border-emerald-500/30 rounded-xl text-center space-y-1">
                <span className="text-[10px] text-emerald-300 block font-semibold">
                  Presentes
                </span>
                <span className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {item.totalPresentes}
                </span>
              </div>

              <div className="p-3 bg-[#0A2E65] border border-rose-500/30 rounded-xl text-center space-y-1">
                <span className="text-[10px] text-rose-300 block font-semibold">
                  Ausentes
                </span>
                <span className="text-lg font-black text-rose-300 flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  {item.totalAusentes}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0A2E65] border-t border-[#1E57A8] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <Link
            href={`/profesor/clases/${item.clase.id}/asistencia`}
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-blue-50 text-[#0F3E86] font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#0F3E86]" />
            <span>Editar Asistencia</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
