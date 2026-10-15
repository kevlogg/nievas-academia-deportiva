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
      <div className="w-full sm:max-w-md bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl shadow-blue-950/50 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E57A8]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <UserCheck className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2
                id="modal-inscribir-title"
                className="text-base font-bold text-white tracking-tight"
              >
                Inscribir Alumno en Tatami
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Alta rápida y asignación inmediata a la clase actual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target-safe cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 my-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">
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
                className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">
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
                className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">
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
                className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
              >
                {BELTS.map((b) => (
                  <option key={b} value={b} className="bg-[#082552] text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">
                Fecha Nacimiento
              </label>
              <input
                type="date"
                required
                value={formData.fechaNacimiento}
                onChange={(e) =>
                  setFormData({ ...formData, fechaNacimiento: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
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
              className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
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
              className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white placeholder:text-blue-300/60"
            />
          </div>

          <div className="pt-3 border-t border-[#1E57A8] flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors touch-target-safe cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 touch-target-safe cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F3E86]" />
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
