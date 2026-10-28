"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Usuario } from "@/types";
import { UserMenu } from "@/components/navigation/UserMenu";
import { Shield, BarChart3, Users, CalendarDays, History, Tablet, Trophy } from "lucide-react";

interface NavbarProps {
  currentUser: Usuario | null;
}

export function Navbar({ currentUser }: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = currentUser?.rol === "ADMIN";
  // Limpieza preventiva: si el usuario está fuera de /terminal, aseguramos que ningún modo tablet residual bloquee componentes
  React.useEffect(() => {
    if (pathname !== "/terminal" && typeof window !== "undefined") {
      try {
        if (localStorage.getItem("nievas_kiosk_mode") === "true") {
          localStorage.removeItem("nievas_kiosk_mode");
          window.dispatchEvent(new Event("kiosk_mode_change"));
        }
      } catch {
        // Ignorar
      }
    }
  }, [pathname]);

  // Únicamente ocultar Navbar en la pantalla fija de bloqueo del terminal
  if (pathname === "/terminal") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-[#0F3E86] border-b border-[#1E57A8] px-3 sm:px-4 py-2 shadow-lg shadow-[#0F3E86]/25">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Official Logo */}
        <Link
          href={currentUser ? (isAdmin ? "/admin/dashboard" : "/profesor/clases") : "/login"}
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

          {/* Título: SOLO VISIBLE EN TABLET Y DESKTOP */}
          <div className="hidden sm:flex flex-col">
            <span className="font-black text-sm sm:text-base tracking-wider text-white uppercase leading-tight font-sans">
              NIEVAS ACADEMIA DEPORTIVA
            </span>
            <span className="text-[11px] text-blue-100 font-semibold tracking-wide font-sans">
              Sistema de Tatami & Asistencia
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (Solo visibles si hay sesión activa) */}
        {currentUser && (
          <nav className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-medium">
            {/* 1. Clases Tatami */}
            {(() => {
              const isActive = pathname.startsWith("/profesor/clases");
              return (
                <Link
                  href="/profesor/clases"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? "bg-white text-[#0F3E86] font-black shadow-md shadow-blue-950/25 ring-2 ring-white/80"
                      : "text-blue-100/90 hover:text-white hover:bg-white/10 font-bold"
                  }`}
                >
                  <CalendarDays
                    className={`w-4 h-4 ${isActive ? "text-[#0F3E86]" : "text-blue-200"}`}
                  />
                  <span>Clases Tatami</span>
                </Link>
              );
            })()}

            {/* 2. Historial Clases */}
            {(() => {
              const isActive =
                pathname === "/admin/historial" || pathname === "/profesor/historial";
              return (
                <Link
                  href={isAdmin ? "/admin/historial" : "/profesor/historial"}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? "bg-white text-[#0F3E86] font-black shadow-md shadow-blue-950/25 ring-2 ring-white/80"
                      : "text-blue-100/90 hover:text-white hover:bg-white/10 font-bold"
                  }`}
                >
                  <History
                    className={`w-4 h-4 ${isActive ? "text-[#0F3E86]" : "text-blue-200"}`}
                  />
                  <span>Historial Clases</span>
                </Link>
              );
            })()}

            {/* 3. Métricas */}
            {(() => {
              const isActive = pathname.startsWith("/profesor/metricas");
              return (
                <Link
                  href="/profesor/metricas"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? "bg-white text-[#0F3E86] font-black shadow-md shadow-blue-950/25 ring-2 ring-white/80"
                      : "text-blue-100/90 hover:text-white hover:bg-white/10 font-bold"
                  }`}
                >
                  <BarChart3
                    className={`w-4 h-4 ${isActive ? "text-cyan-600" : "text-cyan-300"}`}
                  />
                  <span>Métricas</span>
                </Link>
              );
            })()}

            {/* 4. Dirección & Alumnos (Solo ADMIN) */}
            {isAdmin && (
              <>
                {(() => {
                  const isActive =
                    pathname === "/admin/dashboard" || pathname.startsWith("/admin/clases");
                  return (
                    <Link
                      href="/admin/dashboard"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive
                          ? "bg-white text-[#0F3E86] font-black shadow-md shadow-blue-950/25 ring-2 ring-white/80"
                          : "text-blue-100/90 hover:text-white hover:bg-white/10 font-bold"
                      }`}
                    >
                      <Shield
                        className={`w-4 h-4 ${isActive ? "text-amber-500 fill-amber-500" : "text-amber-300"}`}
                      />
                      <span>Dirección</span>
                    </Link>
                  );
                })()}

                {(() => {
                  const isActive = pathname.startsWith("/admin/alumnos");
                  return (
                    <Link
                      href="/admin/alumnos"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive
                          ? "bg-white text-[#0F3E86] font-black shadow-md shadow-blue-950/25 ring-2 ring-white/80"
                          : "text-blue-100/90 hover:text-white hover:bg-white/10 font-bold"
                      }`}
                    >
                      <Users
                        className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-emerald-300"}`}
                      />
                      <span>Alumnos & Cintos</span>
                    </Link>
                  );
                })()}

                {(() => {
                  const isActive = pathname.startsWith("/admin/torneos");
                  return (
                    <Link
                      href="/admin/torneos"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive
                          ? "bg-white text-[#0F3E86] font-black shadow-md shadow-blue-950/25 ring-2 ring-white/80"
                          : "text-blue-100/90 hover:text-white hover:bg-white/10 font-bold"
                      }`}
                    >
                      <Trophy
                        className={`w-4 h-4 ${isActive ? "text-amber-500 fill-amber-500" : "text-amber-300"}`}
                      />
                      <span>Torneos</span>
                    </Link>
                  );
                })()}

                {(() => {
                  const isActive = pathname === "/terminal";
                  return (
                    <Link
                      href="/terminal"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all font-bold ${
                        isActive
                          ? "bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md"
                          : "bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border-amber-400/40 hover:text-white"
                      }`}
                      title="Fijar tablet en Modo Kiosk Terminal para la Sede"
                    >
                      <Tablet
                        className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-amber-300"}`}
                      />
                      <span>Modo Tablet</span>
                    </Link>
                  );
                })()}
              </>
            )}
          </nav>
        )}

        {/* User Menu & Log out */}
        <div className="flex items-center gap-2">
          <UserMenu currentUser={currentUser} />
        </div>
      </div>
    </header>
  );
}
