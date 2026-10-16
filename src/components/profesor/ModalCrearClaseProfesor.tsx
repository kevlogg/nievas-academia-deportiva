"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ListaAlumnos, Clase } from "@/types";
import { crearClaseAction } from "@/lib/actions/clases.actions";
import { X, Calendar, Clock, Users, PlusCircle, AlertCircle, ArrowRight } from "lucide-react";

interface ModalCrearClaseProfesorProps {
  isOpen: boolean;
  onClose: () => void;
  listasDisponibles: ListaAlumnos[];
  onOpenCrearLista: () => void;
  profesorId?: string;
  onClaseCreada?: (nuevaClase: Clase) => void;
}

export function ModalCrearClaseProfesor({
  isOpen,
  onClose,
  listasDisponibles,
  onOpenCrearLista,
  profesorId,
  onClaseCreada,
}: ModalCrearClaseProfesorProps) {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [listaAlumnosId, setListaAlumnosId] = useState<string>(
    listasDisponibles.length > 0 ? listasDisponibles[0].id : ""
  );
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [cupoMaximo, setCupoMaximo] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa un nombre para la clase");
      return;
    }
    if (!listaAlumnosId) {
      setError("Por favor selecciona una lista de alumnos para la clase");
      return;
    }
    if (!fecha) {
      setError("Por favor selecciona la fecha de la clase");
      return;
    }
    if (!horaInicio || !horaFin) {
      setError("Por favor completa los horarios de inicio y fin de la clase");
      return;
    }

    setLoading(true);
    setError(null);

    const fechaObj = new Date(`${fecha}T12:00:00`);
    const diaSemana = isNaN(fechaObj.getDay()) ? new Date().getDay() : fechaObj.getDay();

    const res = await crearClaseAction({
      nombre: nombre.trim(),
      profesorId: profesorId,
      listaAlumnosId: listaAlumnosId,
      fecha: fecha,
      diasSemana: [diaSemana],
      horaInicio: `${horaInicio}:00`,
      horaFin: `${horaFin}:00`,
      cupoMaximo: cupoMaximo,
    });

    setLoading(false);

    if (res.success) {
      if (onClaseCreada && res.data) {
        onClaseCreada(res.data);
      }
      onClose();
      if (res.data) {
        router.push(`/profesor/clases/${res.data.id}/asistencia`);
      }
    } else {
      setError(res.error || "No se pudo crear la clase");
    }
  };

  const listaSeleccionada = listasDisponibles.find((l) => l.id === listaAlumnosId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/50 overflow-hidden">
        {/* Cabecera Modal */}
        <div className="px-5 py-4 bg-[#0A2E65] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <PlusCircle className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Crear Nueva Clase en Tatami
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Configura el horario y asigna una lista de alumnos para pasar asistencia
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-900/60 border border-rose-500/80 text-rose-100 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre de la clase */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Nombre de la Clase *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Infantiles Kata, Kumite Avanzado, Básico Tatami..."
              className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white placeholder:text-blue-300/60 focus:outline-none focus:ring-2 focus:ring-white focus:bg-[#082552] text-sm font-medium transition-all"
            />
          </div>

          {/* Selector de Lista de Alumnos */}
          <div className="space-y-2 p-3.5 bg-[#0A2E65]/70 rounded-2xl border border-[#1E57A8]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-300" />
                <span>Lista de Alumnos para esta Clase *</span>
              </label>
            </div>

            {listasDisponibles.length === 0 ? (
              <div className="p-3 bg-[#082552] border border-[#1E57A8] rounded-xl text-center space-y-2">
                <p className="text-xs text-blue-200 font-medium">
                  Aún no tienes listas de alumnos guardadas.
                </p>
                <button
                  type="button"
                  onClick={onOpenCrearLista}
                  className="px-3 py-1.5 bg-white text-[#0F3E86] text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Crear mi primera lista de alumnos
                </button>
              </div>
            ) : (
              <select
                value={listaAlumnosId}
                onChange={(e) => setListaAlumnosId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#082552] border border-[#2056A8] rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
              >
                <option value="" disabled className="text-slate-400">
                  Selecciona una lista de alumnos...
                </option>
                {listasDisponibles.map((lista) => (
                  <option key={lista.id} value={lista.id} className="bg-[#082552] text-white">
                    {lista.nombre} — ({lista.total_alumnos || lista.alumnos_ids.length} alumnos)
                  </option>
                ))}
              </select>
            )}

            {listaSeleccionada && (
              <div className="px-3 py-2 bg-[#082552] rounded-xl border border-[#1E57A8] flex items-center justify-between text-xs">
                <span className="text-blue-200 font-medium">
                  {listaSeleccionada.descripcion || "Lista seleccionada"}
                </span>
                <span className="font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 px-2 py-0.5 rounded-full">
                  {listaSeleccionada.total_alumnos || listaSeleccionada.alumnos_ids.length} alumnos asignados
                </span>
              </div>
            )}
          </div>

          {/* Horario de la Clase */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                <span>Hora Inicio</span>
              </label>
              <input
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                <span>Hora Fin</span>
              </label>
              <input
                type="time"
                required
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>

          {/* Fecha de la Clase */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-300" />
              <span>Fecha de la Clase *</span>
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white transition-all cursor-pointer"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-[#1E57A8] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-200 hover:text-white hover:bg-white/10 border border-[#2056A8] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-blue-50 text-[#0F3E86] shadow-lg shadow-black/20 flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Creando..." : "Crear Clase e Iniciar en Tatami"}</span>
              <ArrowRight className="w-4 h-4 text-[#0F3E86]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
