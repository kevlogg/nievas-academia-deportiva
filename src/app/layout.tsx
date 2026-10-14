import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/navigation/Navbar";
import { BottomBar } from "@/components/navigation/BottomBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nievas Academia Deportiva | Karate Tradicional",
  description:
    "Sistema Mobile-First de gestión de asistencia en tatami, métricas deportivas y seguimiento de graduaciones para Nievas Academia Deportiva.",
  applicationName: "Nievas Karate Tatami",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nievas Tatami",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#090D14",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col selection:bg-red-600 selection:text-white">
        <Navbar currentUser={currentUser} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 md:pb-8">
          {children}
        </main>
        <BottomBar userRole={currentUser.rol} />
      </body>
    </html>
  );
}
