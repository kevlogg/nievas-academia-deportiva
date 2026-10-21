"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { terminalSalirModoAction } from "@/lib/actions/terminal.actions";
import { Shield, X, Loader2, AlertCircle, KeyRound } from "lucide-react";

interface ModalSalirModoTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onExitSuccess?: () => void;
}

export function ModalSalirModoTerminal({
  isOpen,
  onClose,
  onExitSuccess,
}: ModalSalirModoTerminalProps) {
  const router = useRouter();
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPin || adminPin.length < 4) {
      setError("Ingresa el PIN de Administrador (mínimo 4 dígitos).");
      return;
    }

    startTransition(async () => {
      setError(null);
      const res = await terminalSalirModoAction({ adminPin });

      if (res.success) {
        try {
          localStorage.removeItem("nievas_kiosk_mode");
          window.dispatchEvent(new Event("kiosk_mode_change"));
        } catch {
          // Ignorar
        }

        if (onExitSuccess) {
          onExitSuccess();
        } else {
          onClose();
          router.push("/admin/dashboard");
          router.refresh();
        }
      } else {
        setError(res.error || "PIN de Administrador incorrecto.");
        setAdminPin("");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-[#0A2E65] text-white border-2 border-amber-400 rounded-3xl p-6 shadow-2xl shadow-blue-950/60 relative overflow-hidden">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono Cabecera */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center mb-3.5 shadow-lg">
          <Shield className="w-7 h-7" />
        </div>

        <div className="text-center space-y-1 mb-5">
          <h3 className="text-lg font-black text-white tracking-tight">
            Salir de Modo Tablet
          </h3>
          <p className="text-xs text-blue-200 font-medium">
            Ingresa el PIN de Administrador para desbloquear la tablet y volver al panel de Dirección.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full px-4 py-3 bg-[#082046] border-2 border-[#2056A8] focus:border-amber-400 rounded-2xl text-white text-center text-2xl font-mono font-black tracking-[0.3em] placeholder:tracking-normal placeholder:text-blue-300/40 focus:outline-none transition-all"
            />
            <div className="absolute left-3.5 top-3.5 text-blue-300/60 pointer-events-none">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl flex items-center gap-2 text-xs text-rose-200 font-semibold animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || adminPin.length < 4}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Validando...</span>
                </>
              ) : (
                <span>Desbloquear</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
