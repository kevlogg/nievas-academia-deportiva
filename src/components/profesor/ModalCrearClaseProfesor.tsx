"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ListaAlumnos, Clase } from "@/types";
import { crearClaseAction } from "@/lib/actions/clases.actions";
import { getArgentinaDateTime } from "@/lib/utils";
import {
  X,
  Users,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
  CalendarCheck,
} from "lucide-react";

interface ModalCrearClaseProfesorProps {
  isOpen: boolean;
  onClose: () => void;
  listasDisponibles: ListaAlumnos[];
  onOpenCrearLista: () => void;
  profesorId?: string;
  onClaseCreada?: (nuevaClase: Clase) => void;
  initialListaId?: string;
}

export function ModalCrearClaseProfesor({
  isOpen,
  onClose,
  listasDisponibles,
  onOpenCrearLista,
  profesorId,
  onClaseCreada,
  initialListaId,
}: ModalCrearClaseProfesorProps) {
  const router = useRouter();

  const [listaAlumnosId, setListaAlumnosId] = useState<string>(
    initialListaId || (listasDisponibles.length > 0 ? listasDisponibles[0].id : "")
  );
  const [horaInicio, setHoraInicio] = useState<string>("");
  const [horaFin, setHoraFin] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mantener sincronizado si cambian las listas o initialListaId
  React.useEffect(() => {
    if (isOpen) {
      const targetId = initialListaId || listaAlumnosId || (listasDisponibles.length > 0 ? listasDisponibles[0].id : "");
      if (targetId) setListaAlumnosId(targetId);

      const foundList = listasDisponibles.find((l) => l.id === targetId);
      if (foundList?.hora_inicio) {
        setHoraInicio(foundList.hora_inicio.slice(0, 5));
        if (foundList.hora_fin) {
          setHoraFin(foundList.hora_fin.slice(0, 5));
        } else {
          const [h, m] = foundList.hora_inicio.split(":").map(Number);
          const endH = (h + 1).toString().padStart(2, "0");
          setHoraFin(`${endH}:${(m || 0).toString().padStart(2, "0")}`);
        }
      } else {
        const { horaInicioInput, horaFinInput } = getArgentinaDateTime();
        if (!horaInicio) setHoraInicio(horaInicioInput);
        if (!horaFin) setHoraFin(horaFinInput);
      }
    }
  }, [isOpen, initialListaId, listasDisponibles]);

  if (!isOpen) return null;

  const listaSeleccionada =
    listasDisponibles.find((l) => l.id === listaAlumnosId) || listasDisponibles[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listaAlumnosId && !listaSeleccionada) {
      setError("Por favor selecciona una lista de alumnos para la clase");
      return;
    }

    const selectedId = listaAlumnosId || listaSeleccionada?.id;
    const selectedList = listasDisponibles.find((l) => l.id === selectedId);

    setLoading(true);
    setError(null);

    try {
      const res = await crearClaseAction({
        nombre: selectedList?.nombre,
        listaAlumnosId: selectedId,
        profesorId: profesorId,
        horaInicio: horaInicio ? `${horaInicio}:00` : undefined,
        horaFin: horaFin ? `${horaFin}:00` : undefined,
      });

      if (res.success) {
        if (onClaseCreada && res.data) {
          onClaseCreada(res.data);
        }
        onClose();
        if (res.data) {
          router.push(`/profesor/clases/${res.data.id}/asistencia`);
        }
      } else {
        setError(res.error || "No se pudo iniciar la clase");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al iniciar la clase";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/60 overflow-hidden">
        {/* Cabecera Modal */}
        <div className="px-5 py-4 bg-[#0A2E65] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <PlusCircle className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Iniciar Nueva Clase en Tatami
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Pasa asistencia rápida con tu lista de alumnos
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
            <div className="p-3 bg-rose-900/60 border border-rose-500/80 text-rose-100 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Lista de Alumnos */}
          <div className="space-y-2.5 p-4 bg-[#0A2E65] rounded-2xl border border-[#1E57A8]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-300" />
                <span>Lista de Alumnos a Entrenar *</span>
              </label>
              <span className="text-[11px] text-blue-200 font-medium">
                Determina el nombre de la clase
              </span>
            </div>

            {listasDisponibles.length === 0 ? (
              <div className="p-4 bg-[#082552] border border-[#1E57A8] rounded-xl text-center space-y-2.5">
                <p className="text-xs text-blue-200 font-medium">
                  Aún no tienes listas de alumnos guardadas.
                </p>
                <button
                  type="button"
                  onClick={onOpenCrearLista}
                  className="px-4 py-2 bg-white text-[#0F3E86] text-xs font-extrabold rounded-xl hover:bg-blue-50 transition-colors cursor-pointer shadow-sm"
                >
                  Crear mi primera lista de alumnos
                </button>
              </div>
            ) : (
              <select
                value={listaAlumnosId}
                onChange={(e) => setListaAlumnosId(e.target.value)}
                required
                className="w-full px-3.5 py-3 bg-[#082552] border-2 border-[#2056A8] hover:border-cyan-400/50 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white cursor-pointer transition-all"
              >
                {listasDisponibles.map((lista) => (
                  <option key={lista.id} value={lista.id} className="bg-[#082552] text-white">
                    {lista.nombre} — ({lista.total_alumnos || lista.alumnos_ids.length} alumnos)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selector de Horario de Clase */}
          <div className="space-y-2.5 p-4 bg-[#0A2E65] rounded-2xl border border-[#1E57A8]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-300" />
                <span>Horario de Clase (Hora Local)</span>
              </label>
              <span className="text-[11px] text-cyan-300 font-semibold">
                {horaInicio && horaFin ? `${horaInicio} - ${horaFin} hs` : "Automático"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Hora Inicio *
                </label>
                <input
                  type="time"
                  required
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#082552] border-2 border-[#2056A8] hover:border-cyan-400 focus:border-white rounded-xl text-white text-xs font-bold focus:outline-none transition-all cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Hora Fin *
                </label>
                <input
                  type="time"
                  required
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#082552] border-2 border-[#2056A8] hover:border-cyan-400 focus:border-white rounded-xl text-white text-xs font-bold focus:outline-none transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta de Confirmación / Vista Previa Automática */}
          {listaSeleccionada && (
            <div className="p-4 bg-gradient-to-br from-[#0A2E65] to-[#0D3878] rounded-2xl border-2 border-cyan-500/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/70 border border-cyan-500/50 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>Configuración de Tatami</span>
                </span>
                <span className="text-xs font-extrabold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  {listaSeleccionada.total_alumnos || listaSeleccionada.alumnos_ids.length} Alumnos
                </span>
              </div>

              <div>
                <p className="text-[11px] text-blue-200 uppercase font-bold tracking-wider">
                  Nombre de la clase
                </p>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {listaSeleccionada.nombre}
                </h3>
                {listaSeleccionada.descripcion && (
                  <p className="text-xs text-blue-200 mt-0.5">
                    {listaSeleccionada.descripcion}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-blue-100 bg-[#082552]/80 px-2.5 py-1.5 rounded-xl border border-white/10">
                  <CalendarCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="font-semibold">Fecha: Hoy</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-100 bg-[#082552]/80 px-2.5 py-1.5 rounded-xl border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="font-semibold">{horaInicio ? `${horaInicio} hs` : "En vivo"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-[#1E57A8] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 rounded-xl text-xs font-bold text-blue-200 hover:text-white hover:bg-white/10 border border-[#2056A8] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !listaSeleccionada}
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-black bg-white hover:bg-blue-50 text-[#0F3E86] shadow-xl shadow-blue-950/40 flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Iniciando clase..." : "INICIAR CLASE EN TATAMI"}</span>
              <ArrowRight className="w-4 h-4 text-[#0F3E86]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
