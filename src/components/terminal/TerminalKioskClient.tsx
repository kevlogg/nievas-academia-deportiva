"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfesorTerminalItem } from "@/types";
import {
  terminalVerificarPinAction,
  terminalVerificarBiometriaAction,
  terminalSalirModoAction,
  profesorSetupPinInicialAction,
} from "@/lib/actions/terminal.actions";
import {
  isBiometricsAvailable,
  autenticarConBiometria,
} from "@/lib/auth/webauthn-client";
import {
  Shield,
  Fingerprint,
  KeyRound,
  Lock,
  Unlock,
  X,
  Delete,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Smartphone,
  ChevronRight,
} from "lucide-react";

interface TerminalKioskClientProps {
  initialProfesores: ProfesorTerminalItem[];
}

export function TerminalKioskClient({ initialProfesores }: TerminalKioskClientProps) {
  const router = useRouter();
  const [profesores] = useState<ProfesorTerminalItem[]>(initialProfesores);
  const [selectedProfesor, setSelectedProfesor] = useState<ProfesorTerminalItem | null>(null);

  // Estados de entrada de PIN
  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [shake, setShake] = useState(false);

  // Soporte de Biometría
  const [hasBiometricsHardware, setHasBiometricsHardware] = useState(false);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);

  // Modo Setup Primer PIN
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupNuevoPin, setSetupNuevoPin] = useState("");
  const [setupConfirmPin, setSetupConfirmPin] = useState("");

  // Modal Salir Modo Terminal (Admin)
  const [isAdminExitOpen, setIsAdminExitOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  // Reloj digital en vivo
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    // Marcar en almacenamiento local que este dispositivo está en Modo Terminal
    try {
      localStorage.setItem("nievas_kiosk_mode", "true");
    } catch {
      // Ignorar
    }

    // Comprobar si el navegador soporta WebAuthn/Biometría
    isBiometricsAvailable().then((supported) => {
      setHasBiometricsHardware(supported);
    });

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Manejador de teclado táctil
  const handleKeyClick = (digit: string) => {
    if (pin.length >= 6) return;
    setErrorMsg(null);
    const newPin = pin + digit;
    setPin(newPin);

    // Auto-submit si llega a 4 o 6 dígitos y el profesor tiene PIN de esa longitud
    // Esperamos a que pulse "Entrar" o si son 4 dígitos podemos dejar que pulse o verificar
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg(null);
    setPin("");
  };

  // Enviar verificación de PIN
  const handleVerificarPin = (pinToVerify?: string) => {
    const finalPin = pinToVerify || pin;
    if (!selectedProfesor || finalPin.length < 4) {
      setErrorMsg("Ingresa al menos 4 dígitos");
      triggerShake();
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const res = await terminalVerificarPinAction({
        usuarioId: selectedProfesor.id,
        pin: finalPin,
      });

      if (res.success && res.redirectUrl) {
        // Redirigir a clases del profesor con indicador terminal
        router.push(res.redirectUrl);
      } else {
        if (res.sinPin) {
          setShowSetupPin(true);
        } else {
          setErrorMsg(res.error || "PIN incorrecto");
          triggerShake();
          setPin("");
        }
      }
    });
  };

  // Autenticación con Biometría
  const handleBiometricAuth = async () => {
    if (!selectedProfesor) return;
    setIsAuthenticatingBio(true);
    setErrorMsg(null);

    try {
      const bioResult = await autenticarConBiometria({
        allowedCredentialIds: selectedProfesor.credenciales_biometria_ids,
      });

      if (bioResult.success && bioResult.credentialId) {
        startTransition(async () => {
          const res = await terminalVerificarBiometriaAction({
            usuarioId: selectedProfesor.id,
            credentialId: bioResult.credentialId!,
          });

          if (res.success && res.redirectUrl) {
            router.push(res.redirectUrl);
          } else {
            setErrorMsg(res.error || "Biometría no reconocida.");
            triggerShake();
          }
        });
      } else {
        setErrorMsg(bioResult.error || "Lectura cancelada.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error biométrico");
    } finally {
      setIsAuthenticatingBio(false);
    }
  };

  // Configuración de PIN inicial guiada
  const handleSetupPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfesor) return;

    if (!setupPassword) {
      setErrorMsg("Ingresa la contraseña de tu cuenta.");
      return;
    }
    if (setupNuevoPin.length < 4 || setupNuevoPin.length > 6 || !/^\d+$/.test(setupNuevoPin)) {
      setErrorMsg("El nuevo PIN debe tener entre 4 y 6 números.");
      return;
    }
    if (setupNuevoPin !== setupConfirmPin) {
      setErrorMsg("Los dos PINs ingresados no coinciden.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const res = await profesorSetupPinInicialAction({
        usuarioId: selectedProfesor.id,
        passwordCuenta: setupPassword,
        nuevoPin: setupNuevoPin,
      });

      if (res.success && res.redirectUrl) {
        router.push(res.redirectUrl);
      } else {
        setErrorMsg(res.error || "Error al configurar PIN.");
        triggerShake();
      }
    });
  };

  // Salir de Modo Terminal con PIN de Administrador
  const handleSalirModoTerminal = () => {
    if (!adminPin || adminPin.length < 4) {
      setAdminError("Ingresa el PIN de Administrador (4 o más dígitos).");
      return;
    }

    startTransition(async () => {
      setAdminError(null);
      const res = await terminalSalirModoAction({ adminPin });
      if (res.success) {
        try {
          localStorage.removeItem("nievas_kiosk_mode");
        } catch {
          // Ignorar
        }
        router.push("/admin/dashboard");
      } else {
        setAdminError(res.error || "PIN de Admin incorrecto.");
        setAdminPin("");
      }
    });
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Capturar eventos de teclado físico (para tablets con dock o PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedProfesor || showSetupPin || isAdminExitOpen) return;

      if (e.key >= "0" && e.key <= "9") {
        if (pin.length < 6) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        if (pin.length >= 4) {
          handleVerificarPin(pin);
        }
      } else if (e.key === "Escape") {
        setSelectedProfesor(null);
        setPin("");
        setErrorMsg(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProfesor, pin, showSetupPin, isAdminExitOpen]);

  return (
    <div className="min-h-screen bg-linear-to-b from-[#071F4A] via-[#0A2E65] to-[#051530] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none relative overflow-x-hidden">
      {/* Fondo con patrones sutiles estilo dojo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />

      {/* HEADER SUPERIOR: Marca Oficial, Reloj y Salida de Kiosk */}
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Logo y Nombre Oficial */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white border-2 border-white/90 shadow-xl shadow-blue-950/40 shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-xl tracking-wider text-white uppercase font-sans">
                NIEVAS ACADEMIA DEPORTIVA
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Terminal Sede Central
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-200 font-medium">
              Control de Tatami & Asistencia Rápida para Profesores
            </p>
          </div>
        </div>

        {/* Reloj Digital & Botones de Navegación / Salida */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex flex-col text-right pr-2 border-r border-white/15">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
              {currentTime || "00:00:00"}
            </span>
            <span className="text-[11px] text-blue-200 capitalize font-medium">
              {currentDate || "Cargando fecha..."}
            </span>
          </div>

          {/* Botón Volver al Panel (Directo, para cuando un admin entra a inspeccionar el terminal) */}
          <Link
            href="/admin/dashboard"
            onClick={() => {
              try {
                localStorage.removeItem("nievas_kiosk_mode");
                window.dispatchEvent(new Event("kiosk_mode_change"));
              } catch {
                // Ignorar
              }
            }}
            title="Volver al panel directivo"
            className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer touch-target-safe"
          >
            <ArrowLeft className="w-4 h-4 text-blue-200" />
            <span>Volver</span>
          </Link>

          {/* Botón Salir de Kiosk */}
          <button
            onClick={() => {
              setIsAdminExitOpen(true);
              setAdminPin("");
              setAdminError(null);
            }}
            title="Salir de Modo Terminal (Requiere PIN de Admin)"
            className="p-3 sm:px-3.5 sm:py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer touch-target-safe"
          >
            <Lock className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline">Salir de Terminal</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL: Grilla de Profesores para Selección Táctil */}
      <main className="relative z-10 flex-1 my-6 flex flex-col justify-center max-w-5xl mx-auto w-full">
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 mb-2">
            PASO 1 DE 2: IDENTIFICACIÓN EN TATAMI
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            ¿Quién dicta la clase ahora?
          </h2>
          <p className="text-sm text-blue-100/80 mt-1 max-w-md mx-auto">
            Toca tu perfil de Sensei para desbloquear rápidamente tu tatami con tu PIN o huella dactilar.
          </p>
        </div>

        {/* Grilla de Profesores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {profesores.map((profesor) => {
            const initials = profesor.nombre_completo
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0].toUpperCase())
              .join("");

            const isAdmin = profesor.rol === "ADMIN";

            return (
              <button
                key={profesor.id}
                onClick={() => {
                  setSelectedProfesor(profesor);
                  setPin("");
                  setErrorMsg(null);
                  setShowSetupPin(false);
                }}
                className="group p-5 bg-[#0F3E86]/80 hover:bg-[#154ca0] active:scale-[0.98] border-2 border-[#1E57A8] hover:border-amber-400/80 rounded-3xl shadow-xl shadow-blue-950/30 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                {/* Resplandor hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/15 transition-all pointer-events-none" />

                <div className="flex items-center gap-4">
                  {/* Avatar con Iniciales y Borde Dorado para Admin */}
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-md shrink-0 border-2 transition-transform group-hover:scale-105 ${
                      isAdmin
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-blue-600 text-white border-blue-400"
                    }`}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-base sm:text-lg text-white group-hover:text-amber-200 transition-colors leading-tight truncate">
                      {profesor.nombre_completo}
                    </h3>
                    <p className="text-xs text-blue-200 font-medium mt-0.5">
                      {isAdmin ? "Dirección / Sensei" : "Profesor Instructor"}
                    </p>

                    {/* Chips de Seguridad / Métodos Disponibles */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {profesor.tiene_pin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          PIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Configurar PIN
                        </span>
                      )}

                      {profesor.tiene_biometria && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          <Fingerprint className="w-3 h-3" />
                          Huella
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón inferior de acción táctil */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-100 group-hover:text-white">
                  <span>Ingresar a Clase</span>
                  <div className="w-7 h-7 rounded-xl bg-white/10 group-hover:bg-amber-400 group-hover:text-slate-950 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* FOOTER: Información del Dojo y Convivencia Móvil */}
      <footer className="relative z-10 text-center text-xs text-blue-200/70 border-t border-white/10 pt-3">
        <p>
          Nievas Karate Dojo · Modo Terminal Kiosk para Tablet de Sede.
          Los profesores en otras sedes pueden iniciar sesión normalmente desde su celular con email y contraseña.
        </p>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL TÁCTIL: INGRESO DE PIN NUMÉRICO & BIOMETRÍA                          */}
      {/* ========================================================================= */}
      {selectedProfesor && !showSetupPin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm sm:max-w-md bg-[#0A2E65] border-2 border-[#1E57A8] rounded-3xl p-5 sm:p-6 shadow-2xl relative ${
              shake ? "animate-shake" : ""
            }`}
          >
            {/* Botón Cerrar */}
            <button
              onClick={() => {
                setSelectedProfesor(null);
                setPin("");
                setErrorMsg(null);
              }}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Profesor */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md mb-2">
                {selectedProfesor.nombre_completo
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {selectedProfesor.nombre_completo}
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                {selectedProfesor.tiene_pin
                  ? "Ingresa tu PIN de 4 a 6 dígitos"
                  : "Este perfil aún no tiene PIN asignado"}
              </p>
            </div>

            {/* Si no tiene PIN configurado, mostrar acceso al onboarding */}
            {!selectedProfesor.tiene_pin ? (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 bg-amber-500/15 border border-amber-400/30 rounded-2xl text-amber-200 text-xs text-left space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-300" />
                    Primer ingreso en esta tablet
                  </p>
                  <p className="text-amber-100/90 leading-relaxed">
                    Para habilitar el ingreso con 1 toque en el tatami, ingresa tu contraseña de cuenta una sola vez y define tu PIN numérico.
                  </p>
                </div>

                <button
                  onClick={() => setShowSetupPin(true)}
                  className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Configurar mi PIN ahora</span>
                </button>
              </div>
            ) : (
              <>
                {/* Visualizador de Dígitos PIN (Puntos protegidos) */}
                <div className="flex items-center justify-center gap-3 my-4">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const isFilled = idx < pin.length;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                          isFilled
                            ? "bg-amber-400 border-amber-300 scale-110 shadow-sm shadow-amber-400/50"
                            : "border-white/30 bg-white/5"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Mensaje de Error */}
                {errorMsg && (
                  <div className="p-2.5 mb-3 bg-rose-500/20 border border-rose-400/30 rounded-xl text-rose-200 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Opción Biometría (Si está enrolada para el profesor o el dispositivo lo permite) */}
                {(selectedProfesor.tiene_biometria || hasBiometricsHardware) && (
                  <button
                    onClick={handleBiometricAuth}
                    disabled={isAuthenticatingBio || isPending}
                    className="w-full mb-3 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 hover:text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    {isAuthenticatingBio ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                    ) : (
                      <Fingerprint className="w-4 h-4 text-cyan-300" />
                    )}
                    <span>Desbloquear con Huella / FaceID</span>
                  </button>
                )}

                {/* TECLADO NUMÉRICO TÁCTIL GIGANTE */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeyClick(num)}
                      disabled={isPending}
                      className="h-14 sm:h-16 bg-white/10 hover:bg-white/20 active:bg-amber-400 active:text-slate-950 border border-white/15 rounded-2xl text-xl sm:text-2xl font-black text-white flex items-center justify-center transition-all cursor-pointer shadow-sm select-none"
                    >
                      {num}
                    </button>
                  ))}

                  {/* Borrar Todo */}
                  <button
                    onClick={handleClear}
                    disabled={isPending}
                    className="h-14 sm:h-16 bg-white/5 hover:bg-white/10 active:bg-rose-500/30 text-rose-300 border border-white/10 rounded-2xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>

                  {/* 0 */}
                  <button
                    onClick={() => handleKeyClick("0")}
                    disabled={isPending}
                    className="h-14 sm:h-16 bg-white/10 hover:bg-white/20 active:bg-amber-400 active:text-slate-950 border border-white/15 rounded-2xl text-xl sm:text-2xl font-black text-white flex items-center justify-center transition-all cursor-pointer shadow-sm select-none"
                  >
                    0
                  </button>

                  {/* Backspace */}
                  <button
                    onClick={handleBackspace}
                    disabled={isPending}
                    className="h-14 sm:h-16 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 border border-white/10 rounded-2xl flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                </div>

                {/* Botón Entrar / Desbloquear */}
                <button
                  onClick={() => handleVerificarPin()}
                  disabled={isPending || pin.length < 4}
                  className="w-full mt-3.5 py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Ingresar al Tatami</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SETUP DEL PRIMER PIN POR EL PROFESOR                              */}
      {/* ========================================================================= */}
      {selectedProfesor && showSetupPin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0A2E65] border-2 border-[#1E57A8] rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSetupPin(false)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <h3 className="text-xl font-black text-white">Configurar PIN Rápido</h3>
              <p className="text-xs text-blue-200 mt-1">
                Profesor: <strong className="text-white">{selectedProfesor.nombre_completo}</strong>
              </p>
            </div>

            <form onSubmit={handleSetupPinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-blue-100 mb-1">
                  Tu contraseña habitual de cuenta
                </label>
                <input
                  type="password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Contraseña con la que inicias sesión"
                  required
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-100 mb-1">
                    Nuevo PIN (4 a 6 núm.)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={setupNuevoPin}
                    onChange={(e) => setSetupNuevoPin(e.target.value.replace(/\D/g, ""))}
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
                    value={setupConfirmPin}
                    onChange={(e) => setSetupConfirmPin(e.target.value.replace(/\D/g, ""))}
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

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar PIN e Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SALIR DE MODO TERMINAL (REQUIERE PIN ADMIN)                        */}
      {/* ========================================================================= */}
      {isAdminExitOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0A2E65] border-2 border-amber-400/50 rounded-3xl p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setIsAdminExitOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400/20 border border-amber-400 text-amber-300 flex items-center justify-center mb-3">
              <Shield className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white">Salir de Modo Terminal</h3>
            <p className="text-xs text-blue-200 mt-1 mb-4">
              Ingresa el PIN de Administrador (o PIN de emergencia) para desbloquear la tablet hacia el panel o login estándar.
            </p>

            <div className="space-y-3">
              <input
                type="password"
                maxLength={6}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))}
                placeholder="PIN de Admin"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl font-mono font-bold tracking-widest focus:outline-hidden focus:border-amber-400"
              />

              {adminError && (
                <p className="text-xs text-rose-300 font-semibold">{adminError}</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminExitOpen(false)}
                  className="w-1/2 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalirModoTerminal}
                  disabled={isPending || adminPin.length < 4}
                  className="w-1/2 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desbloquear"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
