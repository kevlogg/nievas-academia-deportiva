"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function AppLayoutContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isKiosk, setIsKiosk] = React.useState(false);

  React.useEffect(() => {
    const checkKiosk = () => {
      try {
        const stored = localStorage.getItem("nievas_kiosk_mode") === "true";
        const hasParam = window.location.search.includes("terminal=1");
        setIsKiosk(stored || hasParam);
      } catch {
        setIsKiosk(false);
      }
    };
    checkKiosk();
    window.addEventListener("kiosk_mode_change", checkKiosk);
    window.addEventListener("storage", checkKiosk);
    return () => {
      window.removeEventListener("kiosk_mode_change", checkKiosk);
      window.removeEventListener("storage", checkKiosk);
    };
  }, []);

  const isTerminal = pathname === "/terminal" || isKiosk;

  if (isTerminal) {
    return <div className="flex-1 w-full">{children}</div>;
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 md:pb-8">
      {children}
    </main>
  );
}
