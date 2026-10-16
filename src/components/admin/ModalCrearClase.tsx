"use client";

import React, { useState, useTransition } from "react";
import { Usuario } from "@/types";
import { crearClaseAction } from "@/lib/actions/clases.actions";
import { Calendar, X, Loader2, AlertCircle } from "lucide-react";

interface ModalCrearClaseProps {
  isOpen: boolean;
  onClose: () => void;
  profesores: Usuario[];
  onClaseCreada: () => void;
}

const DIAS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
];

export function ModalCrearClase({
  isOpen,
  onClose,
  profesores,
  onClaseCreada,
}: ModalCrearClaseProps) {
  const [nombre, setNombre] = useState("");
  const [profesorId, setProfesorId] = useState(
    profesores[0]?.id || "22222222-2222-2222-2222-222222222222"
  );
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 3, 5]);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [cupoMaximo, setCupoMaximo] = useState(25);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDia = (diaId: number) => {
    if (diasSemana.includes(diaId)) {
      if (diasSemana.length > 1) {
        setDiasSemana(diasSemana.filter((d) => d !== diaId));
      }
    } else {
      setDiasSemana([...diasSemana, diaId].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await crearClaseAction({
        nombre,
        profesorId,
        diasSemana,
        horaInicio,
        horaFin,
        cupoMaximo,
      });

      if (res.success) {
        onClaseCreada();
        onClose();
      } else {
        setError(res.error || "Error al crear la clase");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-5 shadow-2xl shadow-blue-950/50 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E57A8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <Calendar className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Crear Nueva Clase de Tatami
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Horario y profesor asignado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Nombre de la Clase *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Principiantes & Kata Shito Ryu"
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Profesor / Sensei a Cargo *
            </label>
            <select
              value={profesorId}
              onChange={(e) => setProfesorId(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            >
              {profesores.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#082552] text-white">
                  {p.nombre_completo} ({p.rol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Días de Entrenamiento *
            </label>
            <div className="flex gap-2">
              {DIAS.map((d) => {
                const selected = diasSemana.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDia(d.id)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      selected
                        ? "bg-white text-[#0F3E86] border-white shadow-xs"
                        : "bg-[#0A2E65] text-blue-200 border-[#2056A8] hover:bg-white/10"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">
                Hora Inicio
              </label>
              <input
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">
                Hora Fin
              </label>
              <input
                type="time"
                required
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Cupo Máximo de Alumnos en Tatami
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={cupoMaximo}
              onChange={(e) => setCupoMaximo(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="pt-3 border-t border-[#1E57A8] flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F3E86]" />
                  <span>Creando...</span>
                </>
              ) : (
                <span>Crear Clase</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
