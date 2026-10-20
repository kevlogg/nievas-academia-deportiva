"use client";

import React, { useState, useTransition } from "react";
import { Usuario } from "@/types";
import { logoutAction } from "@/lib/actions/auth.actions";
import { LogOut, Loader2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModalMiPin } from "@/components/navigation/ModalMiPin";

interface UserMenuProps {
  currentUser: Usuario | null;
}

export function UserMenu({ currentUser }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

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
    <>
      <div className="flex items-center gap-2">
        {/* Badge de Usuario Logueado (Clickeable para abrir Mi PIN) */}
        <button
          type="button"
          onClick={() => setIsPinModalOpen(true)}
          className="w-14 h-14 sm:w-auto sm:h-12 sm:px-3 bg-white/10 hover:bg-white/15 active:scale-95 border border-white/20 rounded-2xl shadow-sm flex items-center justify-center sm:justify-start gap-2.5 text-xs transition-all shrink-0 cursor-pointer"
          title="Ver mi perfil y configurar mi PIN de tatami"
        >
        {/* Avatar Circular/Rounded con Iniciales */}
        <div
          className={cn(
            "w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-sm",
            isAdmin
              ? "bg-amber-400 text-slate-950 border border-amber-300"
              : "bg-blue-500 text-white border border-blue-400"
          )}
        >
          {initials}
        </div>

        {/* Nombre y Rol (Oculto en móvil chico para mantener el cuadrado perfecto, visible en desktop) */}
        <div className="hidden sm:flex flex-col text-left justify-center pr-1">
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
      </button>

      {/* Botón Cerrar Sesión (Misma altura h-14 mobile / h-12 desktop y rounded-2xl que el logo) */}
      <button
        onClick={handleLogout}
        disabled={isPending}
        className="w-14 h-14 sm:w-auto sm:h-12 sm:px-3.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 hover:text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all touch-target-safe cursor-pointer shrink-0 shadow-sm"
        title="Cerrar sesión para cambiar de usuario"
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
        )}
        <span className="hidden sm:inline font-bold">Salir</span>
      </button>
    </div>

    {/* Modal para que el usuario configure/cambie su propio PIN */}
    <ModalMiPin
      isOpen={isPinModalOpen}
      onClose={() => setIsPinModalOpen(false)}
      currentUser={currentUser}
    />
  </>
  );
}
