import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Usuario } from "@/types";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { Shield, BarChart3, Users, CalendarDays, History } from "lucide-react";

interface NavbarProps {
  currentUser: Usuario;
}

export function Navbar({ currentUser }: NavbarProps) {
  const isAdmin = currentUser.rol === "ADMIN";

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-blue-900/40 px-4 py-2 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Official Logo */}
        <Link
          href={isAdmin ? "/admin/dashboard" : "/profesor/clases"}
          className="flex items-center gap-3 group"
        >
          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#154495] border-2 border-blue-400/50 shadow-md shadow-blue-950/60 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase leading-tight font-sans">
              NIEVAS ACADEMIA DEPORTIVA
            </span>
            <span className="text-[11px] text-blue-200 font-semibold tracking-wide font-sans">
              Sistema de Tatami & Asistencia
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/profesor/clases"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-blue-950/50 hover:border-blue-800/50 border border-transparent transition-all"
          >
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <span>Clases Tatami</span>
          </Link>
          <Link
            href={isAdmin ? "/admin/historial" : "/profesor/historial"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-blue-950/50 hover:border-blue-800/50 border border-transparent transition-all"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span>Historial Clases</span>
          </Link>
          <Link
            href="/profesor/metricas"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-blue-950/50 hover:border-blue-800/50 border border-transparent transition-all"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Mis Métricas</span>
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-blue-950/50 hover:border-blue-800/50 border border-transparent transition-all"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Panel Headmaster</span>
              </Link>
              <Link
                href="/admin/alumnos"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-blue-950/50 hover:border-blue-800/50 border border-transparent transition-all"
              >
                <Users className="w-4 h-4 text-emerald-400" />
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
