"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function AppLayoutContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // En la pantalla terminal fija de recepción se usa pantalla completa sin márgenes
  if (pathname === "/terminal") {
    return <div className="flex-1 w-full">{children}</div>;
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-28 md:pb-8">
      {children}
    </main>
  );
}
