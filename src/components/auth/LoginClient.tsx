"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  Shield,
  UserCheck,
  AlertCircle,
  UserPlus,
  User,
  CheckCircle2,
} from "lucide-react";
import { loginAction, registerAction } from "@/lib/actions/auth.actions";
import { UserRole } from "@/types";

export function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Campos de formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rol, setRol] = useState<UserRole>("PROFESOR");
  const [rememberMe, setRememberMe] = useState(true);

  // Estados visuales
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Por favor completa tu correo y contraseña.");
      return;
    }

    startTransition(async () => {
      const res = await loginAction({
        email,
        password,
        rememberMe,
      });

      if (!res.success) {
        setError(res.error || "Error al iniciar sesión.");
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl);
        router.refresh();
      }
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombreCompleto.trim()) {
      setError("Por favor ingresa tu nombre completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor verifícalas.");
      return;
    }

    startTransition(async () => {
      const res = await registerAction({
        nombreCompleto,
        email,
        password,
        rol,
        rememberMe,
      });

      if (!res.success) {
        setError(res.error || "Error al crear la cuenta.");
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md">
        {/* Card Contenedor con la estética oficial Azul de la Academia (#0F3E86) */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/50 relative overflow-hidden">
          {/* Luz decorativa superior */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-cyan-400 via-amber-400 to-cyan-400 rounded-b-full shadow-lg shadow-amber-400/30" />

          {/* Logo y Encabezado */}
          <div className="text-center mb-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 rounded-2xl overflow-hidden bg-white border-2 border-white/90 shadow-xl shadow-blue-950/40">
              <Image
                src="/nievas-logo.jpg"
                alt="Nievas Academia Deportiva"
                fill
                sizes="96px"
                className="object-cover"
                priority
              />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase font-sans">
              NIEVAS ACADEMIA
            </h1>
            <p className="text-xs text-blue-200 font-medium mt-0.5">
              Sistema de Tatami, Asistencia & Dirección
            </p>
          </div>

          {/* Pestañas de Alternancia: Iniciar Sesión / Registrarse */}
          <div className="grid grid-cols-2 p-1 bg-[#0A2E65] border border-[#1E57A8] rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "LOGIN"
                  ? "bg-white text-[#0F3E86] shadow-sm font-black"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "REGISTER"
                  ? "bg-white text-[#0F3E86] shadow-sm font-black"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* Alerta de Error */}
          {error && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500/80 rounded-2xl flex items-start gap-2.5 text-rose-200 text-xs animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-300 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* MODO 1: INICIAR SESIÓN */}
          {mode === "LOGIN" && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Input Correo */}
              <div className="space-y-1">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold text-blue-100 uppercase tracking-wider"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu.correo@ejemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-white focus:ring-2 focus:ring-white/20 rounded-xl text-white placeholder:text-blue-300/50 text-sm transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {/* Input Contraseña */}
              <div className="space-y-1">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-blue-100 uppercase tracking-wider"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-white focus:ring-2 focus:ring-white/20 rounded-xl text-white placeholder:text-blue-300/50 text-sm transition-all outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-blue-300 hover:text-white transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Checkbox Recordarme */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-blue-200 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2056A8] text-[#0F3E86] focus:ring-white/30 bg-[#0A2E65] cursor-pointer"
                  />
                  <span>Recordar sesión en este dispositivo</span>
                </label>
              </div>

              {/* Botón de Ingreso */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-white hover:bg-blue-50 text-[#0F3E86] font-black rounded-xl shadow-lg shadow-black/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0F3E86]" />
                    <span>Validando credenciales...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-[#0F3E86]" />
                    <span>Ingresar al Tatami</span>
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("REGISTER");
                    setError(null);
                  }}
                  className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold hover:underline cursor-pointer"
                >
                  ¿No tienes una cuenta aún? Regístrate aquí
                </button>
              </div>
            </form>
          )}

          {/* MODO 2: REGISTRARSE */}
          {mode === "REGISTER" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Input Nombre Completo */}
              <div className="space-y-1">
                <label
                  htmlFor="register-name"
                  className="block text-xs font-bold text-blue-100 uppercase tracking-wider"
                >
                  Nombre y Apellido *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="register-name"
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder="Ej: Francisco Nievas"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-white focus:ring-2 focus:ring-white/20 rounded-xl text-white placeholder:text-blue-300/50 text-sm transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {/* Input Correo */}
              <div className="space-y-1">
                <label
                  htmlFor="register-email"
                  className="block text-xs font-bold text-blue-100 uppercase tracking-wider"
                >
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu.correo@ejemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-white focus:ring-2 focus:ring-white/20 rounded-xl text-white placeholder:text-blue-300/50 text-sm transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {/* Selector de Rol */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Rol en la Academia *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRol("PROFESOR")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      rol === "PROFESOR"
                        ? "bg-white text-[#0F3E86] border-white shadow-sm font-black"
                        : "bg-[#0A2E65] text-blue-200 border-[#2056A8] hover:bg-[#144EAA] hover:text-white"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Sensei Profesor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRol("ADMIN")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      rol === "ADMIN"
                        ? "bg-white text-[#0F3E86] border-white shadow-sm font-black"
                        : "bg-[#0A2E65] text-blue-200 border-[#2056A8] hover:bg-[#144EAA] hover:text-white"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Dirección (Admin)</span>
                  </button>
                </div>
                <p className="text-[11px] text-blue-200/70 mt-1">
                  {rol === "ADMIN"
                    ? "Acceso completo a Dirección, métricas, profesores y alumnos."
                    : "Acceso a clases de Tatami, toma de asistencias y listas de alumnos."}
                </p>
              </div>

              {/* Input Contraseña */}
              <div className="space-y-1">
                <label
                  htmlFor="register-password"
                  className="block text-xs font-bold text-blue-100 uppercase tracking-wider"
                >
                  Contraseña *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-11 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-white focus:ring-2 focus:ring-white/20 rounded-xl text-white placeholder:text-blue-300/50 text-sm transition-all outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-blue-300 hover:text-white transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div className="space-y-1">
                <label
                  htmlFor="register-confirm"
                  className="block text-xs font-bold text-blue-100 uppercase tracking-wider"
                >
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="register-confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-white focus:ring-2 focus:ring-white/20 rounded-xl text-white placeholder:text-blue-300/50 text-sm transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {/* Botón de Registro */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-white hover:bg-blue-50 text-[#0F3E86] font-black rounded-xl shadow-lg shadow-black/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0F3E86]" />
                    <span>Creando tu cuenta...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#0F3E86]" />
                    <span>Crear Cuenta e Ingresar</span>
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError(null);
                  }}
                  className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold hover:underline cursor-pointer"
                >
                  ¿Ya tienes cuenta? Inicia sesión aquí
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
