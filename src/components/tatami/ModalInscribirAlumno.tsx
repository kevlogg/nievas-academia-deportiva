"use client";

import React, { useState, useTransition } from "react";
import { KarateBelt } from "@/types";
import { inscribirAlumnoRapidoAction } from "@/lib/actions/asistencia.actions";
import { UserCheck, X, Loader2, AlertCircle } from "lucide-react";

interface ModalInscribirAlumnoProps {
  isOpen: boolean;
  onClose: () => void;
  claseId: string;
  onAlumnoInscripto: (nuevoAlumno: {
    id: string;
    nombre: string;
    apellido: string;
    cinturon_actual: KarateBelt;
    telefono_contacto: string;
    contacto_emergencia: string;
  }) => void;
}

const BELTS: KarateBelt[] = [
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Naranja",
  "Verde",
  "Azul",
  "Marrón",
  "Negro",
];

export function ModalInscribirAlumno({
  isOpen,
  onClose,
  claseId,
  onAlumnoInscripto,
}: ModalInscribirAlumnoProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    fechaNacimiento: "2015-01-01",
    telefonoContacto: "",
    contactoEmergencia: "",
    cinturonActual: "Blanco" as KarateBelt,
  });

  const [isSubmitting, startSubmitting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startSubmitting(async () => {
      const res = await inscribirAlumnoRapidoAction({
        claseId,
        ...formData,
      });

      if (res.success) {
        onAlumnoInscripto({
          id: res.data.alumnoId,
          nombre: formData.nombre,
          apellido: formData.apellido,
          cinturon_actual: formData.cinturonActual,
          telefono_contacto: formData.telefonoContacto,
          contacto_emergencia: formData.contactoEmergencia,
        });
        onClose();
      } else {
        setError(res.error || "Ocurrió un error al inscribir el alumno");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-inscribir-title"
    >
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-950/70 border border-red-800/50 text-red-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="modal-inscribir-title"
                className="text-base font-bold text-white tracking-tight"
              >
                Inscribir Alumno en Tatami
              </h2>
              <p className="text-xs text-slate-400">
                Alta rápida y asignación inmediata a la clase actual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 touch-target-safe cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 my-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej. Lucas"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={formData.apellido}
                onChange={(e) =>
                  setFormData({ ...formData, apellido: e.target.value })
                }
                placeholder="Ej. Morales"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cinturón Actual
              </label>
              <select
                value={formData.cinturonActual}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cinturonActual: e.target.value as KarateBelt,
                  })
                }
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
              >
                {BELTS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fecha Nacimiento
              </label>
              <input
                type="date"
                required
                value={formData.fechaNacimiento}
                onChange={(e) =>
                  setFormData({ ...formData, fechaNacimiento: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Teléfono de Contacto *
            </label>
            <input
              type="tel"
              required
              value={formData.telefonoContacto}
              onChange={(e) =>
                setFormData({ ...formData, telefonoContacto: e.target.value })
              }
              placeholder="+54 9 11 1234-5678"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contacto de Emergencia & Parentesco *
            </label>
            <input
              type="text"
              required
              value={formData.contactoEmergencia}
              onChange={(e) =>
                setFormData({ ...formData, contactoEmergencia: e.target.value })
              }
              placeholder="Madre: Carolina +54 9 11 9876-5432"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors touch-target-safe cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 touch-target-safe cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inscribiendo...</span>
                </>
              ) : (
                <span>Confirmar Inscripción</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
