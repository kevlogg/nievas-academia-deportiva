"use client";

import React, { useTransition } from "react";
import { Usuario } from "@/types";
import { logoutAction } from "@/lib/actions/auth.actions";
import { Shield, User, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  currentUser: Usuario | null;
}

export function UserMenu({ currentUser }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  if (!currentUser) {
    return null;
  }

  const isAdmin = currentUser.rol === "ADMIN";

  const handleLogout = () => {
    if (isPending) return;
    startTransition(async () => {
      await logoutAction();
    });
  };

  // Obtener iniciales
  const initials = currentUser.nombre_completo
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-2">
      {/* Badge de Usuario Logueado */}
      <div className="flex items-center gap-2 px-2.5 py-1 bg-white/10 border border-white/20 rounded-xl shadow-inner text-xs">
        {/* Avatar Circular con Iniciales */}
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-sm",
            isAdmin
              ? "bg-amber-400 text-slate-950 border border-amber-300"
              : "bg-blue-500 text-white border border-blue-400"
          )}
          title={`Conectado como: ${currentUser.nombre_completo}`}
        >
          {initials}
        </div>

        {/* Nombre y Rol (Oculto en móviles chicos para ahorrar espacio) */}
        <div className="hidden sm:flex flex-col text-left">
          <span className="font-bold text-white leading-tight truncate max-w-[130px]">
            {currentUser.nombre_completo}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold tracking-wide uppercase",
              isAdmin ? "text-amber-300" : "text-blue-200"
            )}
          >
            {isAdmin ? "Dirección" : "Profesor"}
          </span>
        </div>
      </div>

      {/* Botón Cerrar Sesión */}
      <button
        onClick={handleLogout}
        disabled={isPending}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 hover:text-white rounded-xl text-xs font-semibold transition-all touch-target-safe cursor-pointer shrink-0"
        title="Cerrar sesión para cambiar de usuario"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">Salir</span>
      </button>
    </div>
  );
}
