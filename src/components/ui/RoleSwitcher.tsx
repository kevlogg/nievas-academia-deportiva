"use client";

import React, { useTransition } from "react";
import { UserRole, Usuario } from "@/types";
import { switchDemoRoleAction } from "@/lib/actions/auth.actions";
import { ShieldCheck, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleSwitcherProps {
  currentUser: Usuario;
}

export function RoleSwitcher({ currentUser }: RoleSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (targetRole: UserRole) => {
    if (currentUser.rol === targetRole || isPending) return;
    startTransition(async () => {
      await switchDemoRoleAction(targetRole);
    });
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900/95 border border-blue-900/50 rounded-xl shadow-inner text-xs">
      <button
        onClick={() => handleToggle("PROFESOR")}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all duration-200 touch-target-safe cursor-pointer",
          currentUser.rol === "PROFESOR"
            ? "bg-[#154495] text-white shadow-md shadow-blue-950 font-bold border border-blue-400/40"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        )}
        aria-pressed={currentUser.rol === "PROFESOR"}
        title="Cambiar a vista Sensei (Profesor en Tatami)"
      >
        {isPending && currentUser.rol !== "PROFESOR" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <UserCheck className="w-3.5 h-3.5 text-blue-200" />
        )}
        <span>Sensei</span>
      </button>

      <button
        onClick={() => handleToggle("ADMIN")}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all duration-200 touch-target-safe cursor-pointer",
          currentUser.rol === "ADMIN"
            ? "bg-slate-800 text-amber-300 shadow-md font-bold border border-amber-500/60"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        )}
        aria-pressed={currentUser.rol === "ADMIN"}
        title="Cambiar a vista Headmaster Sensei (Admin Dueño)"
      >
        {isPending && currentUser.rol !== "ADMIN" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span>Headmaster</span>
      </button>
    </div>
  );
}
