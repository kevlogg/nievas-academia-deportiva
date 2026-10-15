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
            label: "Dirección",
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F3E86] border-t border-[#1E57A8] px-2 py-1.5 shadow-2xl safe-area-pb"
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
                  ? "text-white font-extrabold"
                  : "text-blue-200 hover:text-white"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-transform duration-150",
                  item.active && "bg-white/20 text-white scale-110 shadow-sm border border-white/30"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-semibold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
