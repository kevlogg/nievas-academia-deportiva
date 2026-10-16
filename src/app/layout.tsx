import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/navigation/Navbar";
import { BottomBar } from "@/components/navigation/BottomBar";
import { PwaManager } from "@/components/pwa/PwaManager";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nievas Academia Deportiva | Karate Tradicional",
  description:
    "Sistema oficial de gestión de asistencia en tatami, métricas deportivas y seguimiento de graduaciones para Nievas Academia Deportiva.",
  applicationName: "Nievas Tatami",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.jpg" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
  themeColor: "#080D1A",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col selection:bg-blue-600 selection:text-white">
        <Navbar currentUser={currentUser} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 md:pb-8">
          {children}
        </main>
        <BottomBar userRole={currentUser?.rol} />
        <PwaManager />
      </body>
    </html>
  );
}
