"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Usuario } from "@/types";
import { logoutAction } from "@/lib/actions/auth.actions";
import { usuarioRegistrarBiometriaAction } from "@/lib/actions/terminal.actions";
import { ModalSalirModoTerminal } from "@/components/terminal/ModalSalirModoTerminal";
import {
  isBiometricsAvailable,
  registrarBiometriaDispositivo,
} from "@/lib/auth/webauthn-client";
import {
  Sparkles,
  Users,
  Fingerprint,
  Clock,
  LogOut,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";

interface TerminalSessionWatcherProps {
  currentUser: Usuario;
}

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
const WARNING_COUNTDOWN_SEC = 20; // 20 segundos antes muestra aviso

export function TerminalSessionWatcher({ currentUser }: TerminalSessionWatcherProps) {
  const router = useRouter();
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);
  const [isSalirModalOpen, setIsSalirModalOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Estados de enrolamiento biométrico de 1 toque
  const [canEnrollBiometrics, setCanEnrollBiometrics] = useState<boolean>(false);
  const [showBiometricsBanner, setShowBiometricsBanner] = useState<boolean>(false);
  const [bioLoading, setBioLoading] = useState<boolean>(false);
  const [bioSuccess, setBioSuccess] = useState<boolean>(false);
  const [bioError, setBioError] = useState<string | null>(null);

  // Estados de inactividad
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(WARNING_COUNTDOWN_SEC);
  const lastActivityRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Detectar si la tablet está en Modo Kiosk / Terminal
    try {
      const stored = localStorage.getItem("nievas_kiosk_mode");
      if (stored === "true") {
        setIsKioskMode(true);
      }
    } catch {
      // Ignorar
    }

    // 2. Verificar soporte de biometría en esta tablet
    isBiometricsAvailable().then((supported) => {
      if (supported && !currentUser.tiene_biometria) {
        // Verificar si el usuario ya descartó el banner en esta sesión
        const dismissed = sessionStorage.getItem(`nievas_bio_dismissed_${currentUser.id}`);
        if (!dismissed) {
          setCanEnrollBiometrics(true);
          setShowBiometricsBanner(true);
        }
      }
    });
  }, [currentUser]);

  // Manejo de Inactividad cuando está en Modo Kiosk
  useEffect(() => {
    if (!isKioskMode) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      if (showWarningModal) {
        setShowWarningModal(false);
      }
    };

    const events = ["mousedown", "mousemove", "touchstart", "scroll", "keydown"];
    events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const warningThreshold = INACTIVITY_TIMEOUT_MS - WARNING_COUNTDOWN_SEC * 1000;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Tiempo agotado: Salir a Terminal
        cerrarTurnoATerminal();
      } else if (elapsed >= warningThreshold) {
        // Activar aviso con cuenta regresiva
        const remaining = Math.max(
          1,
          Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000)
        );
        setSecondsRemaining(remaining);
        setShowWarningModal(true);
      } else {
        setShowWarningModal(false);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      events.forEach((evt) => window.removeEventListener(evt, resetActivity));
    };
  }, [isKioskMode, showWarningModal]);

  // Cerrar turno y volver al selector de profesores de la tablet
  const cerrarTurnoATerminal = () => {
    startTransition(async () => {
      try {
        await logoutAction();
      } catch {
        // Ignorar
      }
      router.push("/terminal");
    });
  };

  // Enrolamiento biométrico de 1 toque
  const handleEnrollBiometrics = async () => {
    setBioLoading(true);
    setBioError(null);

    try {
      const res = await registrarBiometriaDispositivo({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.nombre_completo,
      });

      if (res.success && res.credential) {
        const saveRes = await usuarioRegistrarBiometriaAction({
          credential: res.credential,
        });

        if (saveRes.success) {
          setBioSuccess(true);
          setTimeout(() => {
            setShowBiometricsBanner(false);
          }, 3000);
        } else {
          setBioError(saveRes.error || "Error al asociar biometría en el servidor.");
        }
      } else {
        setBioError(res.error || "No se completó la verificación biométrica.");
      }
    } catch (err: unknown) {
      setBioError(err instanceof Error ? err.message : "Error durante el registro biométrico.");
    } finally {
      setBioLoading(false);
    }
  };

  const handleDismissBiometrics = () => {
    setShowBiometricsBanner(false);
    try {
      sessionStorage.setItem(`nievas_bio_dismissed_${currentUser.id}`, "true");
    } catch {
      // Ignorar
    }
  };

  if (!isKioskMode && !showBiometricsBanner) {
    return null;
  }

  return (
    <>
      {/* 1. BARRA SUPERIOR PROMINENTE DE MODO TERMINAL (FIJA) */}
      {isKioskMode && (
        <div className="bg-linear-to-r from-[#0F3E86] via-[#1E57A8] to-[#0A2E65] text-white px-3 sm:px-4 py-2 border-b-2 border-amber-400/80 shadow-md flex items-center justify-between gap-3 text-xs mb-3 rounded-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-extrabold uppercase tracking-wide text-amber-300 shrink-0">
              Tablet Sede:
            </span>
            <span className="font-bold truncate text-white">
              {currentUser.nombre_completo}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSalirModalOpen(true)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-400/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-target-safe"
              title="Salir de Modo Tablet hacia el panel de Dirección (requiere PIN de Admin)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Salir Tablet (Admin)</span>
            </button>
            <button
              type="button"
              onClick={cerrarTurnoATerminal}
              disabled={isPending}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 touch-target-safe"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Users className="w-3.5 h-3.5" />
              )}
              <span>Cambiar de Profesor</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. BANNER INVITACIÓN BIOMÉTRICA DE 1 TOQUE (SI LA TABLET LO SOPORTA) */}
      {showBiometricsBanner && (
        <div className="mb-4 p-3.5 bg-linear-to-r from-cyan-950/80 to-[#0A2E65] border-2 border-cyan-400/50 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-cyan-200 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                ¿Deseas habilitar ingreso con Huella / FaceID en esta tablet?
              </p>
              <p className="text-[11px] text-cyan-100/80 mt-0.5">
                La próxima vez podrás desbloquear el tatami en 1 segundo con tu sensor dactilar.
              </p>
              {bioError && <p className="text-rose-300 font-bold mt-1">{bioError}</p>}
              {bioSuccess && (
                <p className="text-emerald-300 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ¡Huella vinculada con éxito para {currentUser.nombre_completo}!
                </p>
              )}
            </div>
          </div>

          {!bioSuccess && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                onClick={handleDismissBiometrics}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white/80 rounded-xl font-bold cursor-pointer"
              >
                Ahora no
              </button>
              <button
                onClick={handleEnrollBiometrics}
                disabled={bioLoading}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {bioLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Fingerprint className="w-4 h-4" />
                )}
                <span>Activar Huella</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. MODAL DE AVISO POR INACTIVIDAD (CUENTA REGRESIVA 20 SEG) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0A2E65] border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center animate-bounce">
              <Clock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">¿Sigues en el Tatami?</h3>
              <p className="text-xs text-blue-200 mt-1">
                Por seguridad de la tablet de sede, la sesión de{" "}
                <strong className="text-white">{currentUser.nombre_completo}</strong> se
                cerrará automáticamente para el siguiente profesor en:
              </p>
            </div>

            <div className="py-2">
              <span className="text-5xl font-black text-amber-300 font-mono">
                {secondsRemaining}s
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={cerrarTurnoATerminal}
                className="w-1/2 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar Turno Ya
              </button>
              <button
                onClick={() => {
                  lastActivityRef.current = Date.now();
                  setShowWarningModal(false);
                }}
                className="w-1/2 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Continuar en Clase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL PARA SALIR DE MODO TABLET HACIA DIRECCIÓN */}
      <ModalSalirModoTerminal
        isOpen={isSalirModalOpen}
        onClose={() => setIsSalirModalOpen(false)}
      />
    </>
  );
}
