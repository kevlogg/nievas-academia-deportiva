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
    <div className="flex items-center gap-1 p-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-inner text-xs">
      <button
        onClick={() => handleToggle("PROFESOR")}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-200 touch-target-safe cursor-pointer",
          currentUser.rol === "PROFESOR"
            ? "bg-white text-[#0F3E86] shadow-md border border-white"
            : "text-blue-100 hover:text-white hover:bg-white/10"
        )}
        aria-pressed={currentUser.rol === "PROFESOR"}
        title="Cambiar a vista Admin (Sensei Profesor)"
      >
        {isPending && currentUser.rol !== "PROFESOR" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <UserCheck className="w-3.5 h-3.5" />
        )}
        <span>Admin</span>
      </button>

      <button
        onClick={() => handleToggle("ADMIN")}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-200 touch-target-safe cursor-pointer",
          currentUser.rol === "ADMIN"
            ? "bg-amber-400 text-slate-950 shadow-md border border-amber-300"
            : "text-blue-100 hover:text-white hover:bg-white/10"
        )}
        aria-pressed={currentUser.rol === "ADMIN"}
        title="Cambiar a vista Dirección (Francisco Nievas - Dueño)"
      >
        {isPending && currentUser.rol !== "ADMIN" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5" />
        )}
        <span>Dirección</span>
      </button>
    </div>
  );
}
