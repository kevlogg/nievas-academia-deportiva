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
    <header className="sticky top-0 z-40 bg-[#0F3E86] border-b border-[#1E57A8] px-3 sm:px-4 py-2 shadow-lg shadow-[#0F3E86]/25">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Official Logo */}
        <Link
          href={isAdmin ? "/admin/dashboard" : "/profesor/clases"}
          className="flex items-center gap-3 group shrink-0"
        >
          {/* Logo Bien Grande en Mobile y Desktop */}
          <div className="relative w-14 h-14 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Nievas Academia Deportiva"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Título: SOLO VISIBLE EN TABLET Y DESKTOP (oculto en mobile) */}
          <div className="hidden sm:flex flex-col">
            <span className="font-black text-sm sm:text-base tracking-wider text-white uppercase leading-tight font-sans">
              NIEVAS ACADEMIA DEPORTIVA
            </span>
            <span className="text-[11px] text-blue-100 font-semibold tracking-wide font-sans">
              Sistema de Tatami & Asistencia
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/profesor/clases"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all font-semibold"
          >
            <CalendarDays className="w-4 h-4 text-blue-200" />
            <span>Clases Tatami</span>
          </Link>
          <Link
            href={isAdmin ? "/admin/historial" : "/profesor/historial"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all font-semibold"
          >
            <History className="w-4 h-4 text-blue-200" />
            <span>Historial Clases</span>
          </Link>
          <Link
            href="/profesor/metricas"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all font-semibold"
          >
            <BarChart3 className="w-4 h-4 text-cyan-300" />
            <span>Métricas</span>
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all font-semibold"
              >
                <Shield className="w-4 h-4 text-amber-300" />
                <span>Panel SuperAdmin</span>
              </Link>
              <Link
                href="/admin/alumnos"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all font-semibold"
              >
                <Users className="w-4 h-4 text-emerald-300" />
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
