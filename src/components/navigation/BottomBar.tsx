"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, BarChart2, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";

interface BottomBarProps {
  userRole: UserRole;
}

export function BottomBar({ userRole }: BottomBarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "ADMIN";

  const navItems = [
    {
      label: "Clases",
      href: "/profesor/clases",
      icon: Calendar,
      active: pathname.startsWith("/profesor/clases"),
    },
    {
      label: "Métricas",
      href: "/profesor/metricas",
      icon: BarChart2,
      active: pathname === "/profesor/metricas",
    },
    ...(isAdmin
      ? [
          {
            label: "Dojo Admin",
            href: "/admin/dashboard",
            icon: Shield,
            active: pathname === "/admin/dashboard",
          },
          {
            label: "Alumnos",
            href: "/admin/alumnos",
            icon: Users,
            active: pathname.startsWith("/admin/alumnos"),
          },
        ]
      : []),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-blue-950/80 px-2 py-1.5 shadow-2xl safe-area-pb"
      aria-label="Navegación Móvil Tatami"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 touch-target-safe cursor-pointer",
                item.active
                  ? "text-blue-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-transform duration-150",
                  item.active && "bg-blue-950/80 text-blue-300 scale-110 shadow-xs shadow-blue-900/50 border border-blue-800/40"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
