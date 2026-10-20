"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function AppLayoutContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTerminal = pathname === "/terminal";

  if (isTerminal) {
    return <div className="flex-1 w-full">{children}</div>;
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 md:pb-8">
      {children}
    </main>
  );
}
