"use client";

import React, { useState, useEffect } from "react";
import { ClaseHistorialItem, Usuario } from "@/types";
import { editarClaseHistorialAction } from "@/lib/actions/clases.actions";
import {
  X,
  Edit2,
  Calendar,
  Clock,
  User,
  AlertCircle,
  Save,
  CheckCircle2,
} from "lucide-react";

interface ModalEditarClaseHistorialProps {
  isOpen: boolean;
  onClose: () => void;
  item: ClaseHistorialItem | null;
  profesoresDisponibles: Usuario[];
  onClaseActualizada: (itemActualizado: ClaseHistorialItem) => void;
}

export function ModalEditarClaseHistorial({
  isOpen,
  onClose,
  item,
  profesoresDisponibles,
  onClaseActualizada,
}: ModalEditarClaseHistorialProps) {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [profesorId, setProfesorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setNombre(item.clase.nombre);
      setFecha(item.fecha);
      setHoraInicio(item.clase.hora_inicio.substring(0, 5));
      setHoraFin(item.clase.hora_fin.substring(0, 5));
      setProfesorId(item.clase.profesor_id);
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa un nombre para la clase");
      return;
    }
    if (!fecha) {
      setError("Por favor selecciona una fecha");
      return;
    }
    if (!horaInicio || !horaFin) {
      setError("Por favor completa los horarios de inicio y fin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await editarClaseHistorialAction({
        claseId: item.clase.id,
        nombre: nombre.trim(),
        fecha: fecha,
        horaInicio: `${horaInicio}:00`,
        horaFin: `${horaFin}:00`,
        profesorId: profesorId,
      });

      if (res.success) {
        const profObj = profesoresDisponibles.find((p) => p.id === profesorId);
        const itemActualizado: ClaseHistorialItem = {
          ...item,
          fecha: fecha,
          clase: {
            ...item.clase,
            nombre: nombre.trim(),
            hora_inicio: `${horaInicio}:00`,
            hora_fin: `${horaFin}:00`,
            profesor_id: profesorId,
            profesor_nombre: profObj?.nombre_completo || item.clase.profesor_nombre,
          },
        };

        onClaseActualizada(itemActualizado);
        onClose();
      } else {
        setError(res.error || "No se pudo actualizar la clase");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al actualizar la clase");
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
              <Edit2 className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Editar Registro de Clase
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Modifica horario, fecha o profesor de este registro (Dirección)
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

          {/* Nombre de la Clase */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Nombre de la Clase *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white transition-all"
            />
          </div>

          {/* Fecha de la Clase */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-300" />
              <span>Fecha del Registro *</span>
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white transition-all cursor-pointer"
            />
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                <span>Hora Inicio *</span>
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
                <span>Hora Cierre *</span>
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

          {/* Profesor / Sensei Asignado */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-300" />
              <span>Sensei / Profesor Asignado *</span>
            </label>
            <select
              value={profesorId}
              onChange={(e) => setProfesorId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            >
              {profesoresDisponibles.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#082552] text-white">
                  {p.nombre_completo.replace(/\s*\((admin|superadmin|profesor)\)/gi, "").trim()} ({p.rol})
                </option>
              ))}
            </select>
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
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-blue-50 text-[#0F3E86] shadow-lg flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#0F3E86]" />
              <span>{loading ? "Guardando..." : "Guardar Cambios"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
