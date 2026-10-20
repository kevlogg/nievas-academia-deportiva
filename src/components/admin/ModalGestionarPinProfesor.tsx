"use client";

import React, { useState, useTransition } from "react";
import { Usuario } from "@/types";
import { adminConfigurarPinProfesorAction } from "@/lib/actions/terminal.actions";
import { KeyRound, X, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";

interface ModalGestionarPinProfesorProps {
  isOpen: boolean;
  onClose: () => void;
  profesor: Usuario | null;
  onPinActualizado?: () => void;
}

export function ModalGestionarPinProfesor({
  isOpen,
  onClose,
  profesor,
  onPinActualizado,
}: ModalGestionarPinProfesorProps) {
  const [nuevoPin, setNuevoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !profesor) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const pin = nuevoPin.trim();
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setErrorMsg("El PIN debe contener entre 4 y 6 dígitos numéricos.");
      return;
    }
    if (pin !== confirmarPin.trim()) {
      setErrorMsg("Los PINs ingresados no coinciden.");
      return;
    }

    startTransition(async () => {
      const res = await adminConfigurarPinProfesorAction({
        profesorId: profesor.id,
        nuevoPin: pin,
      });

      if (res.success) {
        setSuccessMsg(`¡PIN actualizado con éxito para ${profesor.nombre_completo}!`);
        setTimeout(() => {
          setNuevoPin("");
          setConfirmarPin("");
          setSuccessMsg(null);
          onPinActualizado?.();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || "No se pudo actualizar el PIN.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-sm sm:max-w-md bg-[#0A2E65] border-2 border-[#1E57A8] rounded-3xl p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400 text-amber-300 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Gestionar PIN de Acceso</h3>
            <p className="text-xs text-blue-200">
              Profesor: <strong className="text-white">{profesor.nombre_completo}</strong>
            </p>
          </div>
        </div>

        <p className="text-xs text-blue-100/80 mb-4 leading-relaxed">
          Asigna o restablece el PIN numérico de 4 a 6 dígitos para que este Sensei pueda ingresar de inmediato en la tablet de la sede central sin escribir contraseñas largas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">
                Nuevo PIN (4-6 núm.)
              </label>
              <input
                type="password"
                maxLength={6}
                value={nuevoPin}
                onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 1234"
                required
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg font-mono font-bold focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">
                Confirmar PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Repite el PIN"
                required
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg font-mono font-bold focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-500/20 border border-rose-400/30 rounded-xl text-rose-200 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || nuevoPin.length < 4}
              className="w-1/2 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Guardar PIN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
