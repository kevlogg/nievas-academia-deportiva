"use client";

import React from "react";
import { ListaAlumnos, Alumno } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { formatDaysList } from "@/lib/utils";
import { X, Users, Phone, Edit, Calendar, Clock } from "lucide-react";

interface ModalVerListaAlumnosProps {
  lista: ListaAlumnos | null;
  alumnosDisponibles: Alumno[];
  isOpen: boolean;
  onClose: () => void;
  onEditar: (lista: ListaAlumnos) => void;
}

export function ModalVerListaAlumnos({
  lista,
  alumnosDisponibles,
  isOpen,
  onClose,
  onEditar,
}: ModalVerListaAlumnosProps) {
  if (!isOpen || !lista) return null;

  const alumnosEnLista = alumnosDisponibles.filter((a) =>
    lista.alumnos_ids.includes(a.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl shadow-blue-950/50 overflow-hidden">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-[#0A2E65] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <Users className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {lista.nombre}
              </h2>
              <p className="text-xs text-cyan-300 font-medium">
                {alumnosEnLista.length} alumnos asignados
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

        {/* Contenido / Días, Horario y Descripción */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {((lista.dias_semana && lista.dias_semana.length > 0) || lista.horario) && (
            <div className="p-3 bg-[#0A2E65] rounded-2xl border border-[#2056A8] flex flex-wrap items-center gap-2">
              {lista.dias_semana && lista.dias_semana.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#082552] border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-300">
                  <Calendar className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>{formatDaysList(lista.dias_semana)}</span>
                </div>
              )}
              {lista.horario && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#082552] border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-200">
                  <Clock className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>{lista.horario}</span>
                </div>
              )}
            </div>
          )}

          {lista.descripcion && (
            <div className="p-3 bg-[#082552] rounded-xl border border-[#1E57A8] text-xs text-blue-200">
              <span className="font-bold text-cyan-300 block mb-0.5">Notas / Descripción:</span>
              <span>{lista.descripcion}</span>
            </div>
          )}

          {/* Listado de Alumnos */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center justify-between">
              <span>Alumnos en la lista</span>
              <span className="text-[11px] text-cyan-300 font-mono">
                {alumnosEnLista.length} integrantes
              </span>
            </h3>

            {alumnosEnLista.length === 0 ? (
              <p className="text-xs text-blue-300 italic p-4 text-center bg-[#082552] rounded-xl border border-[#1E57A8]">
                No hay alumnos asignados a esta lista todavía.
              </p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {alumnosEnLista.map((alumno) => (
                  <div
                    key={alumno.id}
                    className="p-3 bg-[#0A2E65] border border-[#2056A8] rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xs text-cyan-300 shrink-0">
                        {alumno.nombre[0]}
                        {alumno.apellido[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">
                            {alumno.nombre} {alumno.apellido}
                          </span>
                          <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-blue-200 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-cyan-300" />
                            <span>{alumno.telefono_contacto}</span>
                          </span>
                          {alumno.contacto_emergencia && (
                            <>
                              <span>•</span>
                              <span>Emerg: {alumno.contacto_emergencia}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0A2E65] border-t border-[#1E57A8] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-200 hover:text-white hover:bg-white/10 border border-[#2056A8] transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              onClose();
              onEditar(lista);
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-blue-50 text-[#0F3E86] shadow-md flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <Edit className="w-4 h-4 text-[#0F3E86]" />
            <span>Editar Lista</span>
          </button>
        </div>
      </div>
    </div>
  );
}
