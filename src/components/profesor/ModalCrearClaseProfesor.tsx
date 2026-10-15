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

const DIAS_SEMANA_OPCIONES = [
  { val: 1, label: "Lun" },
  { val: 2, label: "Mar" },
  { val: 3, label: "Mié" },
  { val: 4, label: "Jue" },
  { val: 5, label: "Vie" },
  { val: 6, label: "Sáb" },
  { val: 0, label: "Dom" },
];

export function ModalCrearClaseProfesor({
  isOpen,
  onClose,
  listasDisponibles,
  onOpenCrearLista,
  profesorId,
  onClaseCreada,
}: ModalCrearClaseProfesorProps) {
  const router = useRouter();
  const hoyIndex = new Date().getDay();

  const [nombre, setNombre] = useState("");
  const [listaAlumnosId, setListaAlumnosId] = useState<string>(
    listasDisponibles.length > 0 ? listasDisponibles[0].id : ""
  );
  const [horaInicio, setHoraInicio] = useState("18:00");
  const [horaFin, setHoraFin] = useState("19:15");
  const [diasSemana, setDiasSemana] = useState<number[]>([hoyIndex]);
  const [cupoMaximo, setCupoMaximo] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDia = (dia: number) => {
    setDiasSemana((prev) =>
      prev.includes(dia)
        ? prev.length > 1
          ? prev.filter((d) => d !== dia)
          : prev
        : [...prev, dia]
    );
  };

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

    setLoading(true);
    setError(null);

    const res = await crearClaseAction({
      nombre: nombre.trim(),
      profesorId: profesorId,
      listaAlumnosId: listaAlumnosId,
      diasSemana: diasSemana,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white text-blue-950 border-2 border-blue-200 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/20 overflow-hidden">
        {/* Cabecera Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#154495] text-white shadow-sm">
              <PlusCircle className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-blue-950">
                Crear Nueva Clase en Tatami
              </h2>
              <p className="text-xs text-blue-700 font-medium">
                Configura el horario y asigna una lista de alumnos para pasar asistencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-blue-900 rounded-xl hover:bg-blue-100/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre de la clase */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Nombre de la Clase *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Infantiles Kata, Kumite Avanzado, Básico Tatami..."
              className="w-full px-3.5 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-[#154495] focus:bg-white text-sm font-medium transition-all"
            />
          </div>

          {/* Selector de Lista de Alumnos */}
          <div className="space-y-2 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#154495]" />
                <span>Lista de Alumnos para esta Clase *</span>
              </label>
              <button
                type="button"
                onClick={onOpenCrearLista}
                className="text-xs font-bold text-[#154495] hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>+ Crear nueva lista</span>
              </button>
            </div>

            {listasDisponibles.length === 0 ? (
              <div className="p-3 bg-white border border-blue-200 rounded-xl text-center space-y-2">
                <p className="text-xs text-blue-900 font-medium">
                  Aún no tienes listas de alumnos guardadas.
                </p>
                <button
                  type="button"
                  onClick={onOpenCrearLista}
                  className="px-3 py-1.5 bg-[#154495] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Crear mi primera lista de alumnos
                </button>
              </div>
            ) : (
              <select
                value={listaAlumnosId}
                onChange={(e) => setListaAlumnosId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-blue-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#154495] cursor-pointer"
              >
                <option value="" disabled>
                  Selecciona una lista de alumnos...
                </option>
                {listasDisponibles.map((lista) => (
                  <option key={lista.id} value={lista.id}>
                    {lista.nombre} — ({lista.total_alumnos || lista.alumnos_ids.length} alumnos)
                  </option>
                ))}
              </select>
            )}

            {listaSeleccionada && (
              <div className="px-3 py-2 bg-white rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
                <span className="text-blue-900 font-medium">
                  {listaSeleccionada.descripcion || "Lista seleccionada"}
                </span>
                <span className="font-bold text-[#154495] bg-blue-100 px-2 py-0.5 rounded-full">
                  {listaSeleccionada.total_alumnos || listaSeleccionada.alumnos_ids.length} alumnos asignados
                </span>
              </div>
            )}
          </div>

          {/* Horario de la Clase */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Hora Inicio</span>
              </label>
              <input
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#154495] focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Hora Fin</span>
              </label>
              <input
                type="time"
                required
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#154495] focus:bg-white"
              />
            </div>
          </div>

          {/* Días de la semana */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Días de Entrenamiento</span>
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {DIAS_SEMANA_OPCIONES.map((dia) => {
                const isSelected = diasSemana.includes(dia.val);
                return (
                  <button
                    key={dia.val}
                    type="button"
                    onClick={() => toggleDia(dia.val)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all text-center ${
                      isSelected
                        ? "bg-[#154495] text-white shadow-xs"
                        : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-blue-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-950 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#154495] hover:bg-blue-800 text-white shadow-md shadow-blue-950/20 flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Creando..." : "Crear Clase e Iniciar en Tatami"}</span>
              <ArrowRight className="w-4 h-4 text-blue-200" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
