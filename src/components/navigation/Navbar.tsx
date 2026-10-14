import React from "react";
import Link from "next/link";
import { Usuario } from "@/types";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { Shield, Flame, BarChart3, Users, CalendarDays } from "lucide-react";

interface NavbarProps {
  currentUser: Usuario;
}

export function Navbar({ currentUser }: NavbarProps) {
  const isAdmin = currentUser.rol === "ADMIN";

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <Link
          href={isAdmin ? "/admin/dashboard" : "/profesor/clases"}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-md shadow-red-950/50 border border-red-500/30 group-hover:scale-105 transition-transform duration-200">
            <Flame className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">
                NIEVAS
              </span>
              <span className="text-[11px] font-mono tracking-widest text-red-400 font-semibold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/40">
                空手道
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Academia Deportiva
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/profesor/clases"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <CalendarDays className="w-4 h-4 text-red-400" />
            <span>Clases de Tatami</span>
          </Link>
          <Link
            href="/profesor/metricas"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Mis Métricas</span>
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Panel Headmaster</span>
              </Link>
              <Link
                href="/admin/alumnos"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span>Alumnos & Cintos</span>
              </Link>
            </>
          )}
        </nav>

        {/* Role Switcher & User Profile */}
        <div className="flex items-center gap-2">
          <RoleSwitcher currentUser={currentUser} />
        </div>
      </div>
    </header>
  );
}
