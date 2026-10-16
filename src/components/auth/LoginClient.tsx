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
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { loginAction } from "@/lib/actions/auth.actions";

export function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
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

  const handleSelectAccount = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md">
        {/* Card Contenedor con estética Glassmorphism & Navy Oficial */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40 relative overflow-hidden">
          {/* Luz decorativa superior */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-blue-500 via-amber-400 to-blue-500 rounded-b-full shadow-lg shadow-amber-400/30" />

          {/* Logo y Encabezado */}
          <div className="text-center mb-7">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 rounded-3xl overflow-hidden bg-white border-4 border-white/90 shadow-xl shadow-blue-900/40 transform hover:scale-105 transition-transform duration-300">
              <Image
                src="/nievas-logo.jpg"
                alt="Nievas Academia Deportiva"
                fill
                className="object-cover"
                priority
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase font-sans">
              NIEVAS ACADEMIA
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/80 font-medium mt-1">
              Sistema de Tatami, Asistencia & Dirección
            </p>
          </div>

          {/* Alerta de Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs sm:text-sm animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulario de Inicio de Sesión */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Correo */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej: francisco.nievas@nievasacademia.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-white placeholder:text-slate-500 text-sm transition-all outline-none"
                  required
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-white placeholder:text-slate-500 text-sm transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500/30 bg-slate-950/80 cursor-pointer"
                />
                <span>Recordar sesión en este dispositivo</span>
              </label>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0F3E86] to-[#1A5BB8] hover:from-[#134CA2] hover:to-[#2069D1] text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 touch-target-safe cursor-pointer text-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar al Tatami</span>
                </>
              )}
            </button>
          </form>

          {/* Accesos rápidos de prueba / cuentas configuradas en dojo */}
          <div className="mt-7 pt-6 border-t border-slate-800/80">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-3 text-center">
              Cuentas Registradas en el Dojo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opción Francisco Nievas (Dirección) */}
              <button
                type="button"
                onClick={() =>
                  handleSelectAccount(
                    "francisco.nievas@nievasacademia.com",
                    "Nievas2026!"
                  )
                }
                className="p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-400/50 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      Francisco Nievas
                    </p>
                    <p className="text-[10px] text-amber-400 font-semibold truncate">
                      Dirección (Admin)
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción Sensei Lucas Benítez (Profesor) */}
              <button
                type="button"
                onClick={() =>
                  handleSelectAccount(
                    "sensei.benitez@nievasacademia.com",
                    "Nievas2026!"
                  )
                }
                className="p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-400/50 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                      Sensei Lucas Benítez
                    </p>
                    <p className="text-[10px] text-blue-400 font-semibold truncate">
                      Profesor Tatami
                    </p>
                  </div>
                </div>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-500 mt-3 font-sans">
              Contraseña por defecto: <code className="text-slate-400 font-mono">Nievas2026!</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
