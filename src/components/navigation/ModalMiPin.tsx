"use client";

import React, { useState, useTransition } from "react";
import { Usuario } from "@/types";
import { profesorCambiarMiPinAction } from "@/lib/actions/terminal.actions";
import { KeyRound, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ModalMiPinProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Usuario;
}

export function ModalMiPin({ isOpen, onClose, currentUser }: ModalMiPinProps) {
  const [pinActual, setPinActual] = useState("");
  const [nuevoPin, setNuevoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const pin = nuevoPin.trim();
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setErrorMsg("El PIN debe tener entre 4 y 6 números.");
      return;
    }
    if (pin !== confirmarPin.trim()) {
      setErrorMsg("Los dos nuevos PINs ingresados no coinciden.");
      return;
    }

    startTransition(async () => {
      const res = await profesorCambiarMiPinAction({
        pinActual: pinActual.trim() || undefined,
        nuevoPin: pin,
      });

      if (res.success) {
        setSuccessMsg("¡Tu PIN de tatami se actualizó con éxito!");
        setTimeout(() => {
          setPinActual("");
          setNuevoPin("");
          setConfirmarPin("");
          setSuccessMsg(null);
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
            <h3 className="text-lg font-black text-white">Mi PIN de Tatami</h3>
            <p className="text-xs text-blue-200">
              Desbloqueo rápido para la tablet de la sede
            </p>
          </div>
        </div>

        <p className="text-xs text-blue-100/80 mb-4 leading-relaxed">
          Define o cambia tu PIN numérico personal de 4 a 6 dígitos para ingresar a tus clases en la tablet con un solo toque.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentUser.pin_activo && (
            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">
                PIN Actual
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinActual}
                onChange={(e) => setPinActual(e.target.value.replace(/\D/g, ""))}
                placeholder="Ingresa tu PIN actual"
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg font-mono font-bold focus:outline-hidden focus:border-amber-400"
              />
            </div>
          )}

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
                Confirmar Nuevo PIN
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
                <span>Guardar Mi PIN</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
