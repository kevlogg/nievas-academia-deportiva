"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registrado con éxito:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Error registrando Service Worker:", err);
        });
    }

    // 2. Check standalone mode (already installed & running as app)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const alreadyInstalled = checkStandalone();
    if (alreadyInstalled) {
      return; // No need to show install prompts
    }

    // 3. Check dismissed flag in localStorage
    const dismissedUntil = localStorage.getItem("nievas_pwa_dismissed_until");
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // 4. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      userAgent.includes("safari") &&
      !userAgent.includes("chrome") &&
      !userAgent.includes("crios") &&
      !userAgent.includes("fxios");

    if (isIosDevice && isSafari && !alreadyInstalled) {
      setIsIos(true);
      // Wait 3 seconds before showing banner to avoid jarring the user
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // 5. Listen for beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => setShowBanner(true), 2500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      console.log("[PWA] Aplicación instalada exitosamente");
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      alert("Para instalar la app, abre las opciones de tu navegador (los 3 puntos arriba a la derecha) y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'.");
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Dismiss for 5 days
    localStorage.setItem("nievas_pwa_dismissed_until", (Date.now() + 5 * 24 * 60 * 60 * 1000).toString());
  };

  if (isStandalone || (!showBanner && !showIosModal)) {
    return null;
  }

  return (
    <>
      {/* Floating Install Banner */}
      {showBanner && (
        <aside
          role="region"
          aria-label="Descargar aplicación"
          className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-50 bg-[#0c1933]/95 backdrop-blur-md border border-[#2056a8] shadow-2xl shadow-blue-950/80 rounded-2xl p-3.5 text-white animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-blue-500/30 shrink-0 shadow">
              <Image
                src="/icons/icon-192x192.png"
                alt="Nievas Tatami Logo"
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 font-bold text-sm text-cyan-100">
                <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">Instalar como App</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                Usá Nievas Tatami a pantalla completa y sin barras de navegador.
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isIos ? "Ver cómo instalar" : "Descargar App"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition"
                  title="Cerrar"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* iOS Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#0F2347] to-[#0A162D] border border-blue-500/40 rounded-2xl p-5 shadow-2xl text-white relative">
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              aria-label="Cerrar instrucciones"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-cyan-400/30">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="Nievas Tatami"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-base text-cyan-200">Instalar en iPhone / iPad</h3>
                <p className="text-xs text-slate-300">Nievas Tatami en tu pantalla</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-200 bg-[#081225]/80 p-3.5 rounded-xl border border-blue-900/50">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 text-cyan-300">
                  <Share className="w-4 h-4" />
                </div>
                <p>
                  1. En la barra inferior de Safari, toca el botón <strong>Compartir</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 text-cyan-300">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <p>
                  2. Baja y selecciona <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-300 font-bold">
                  ✓
                </div>
                <p>
                  3. Toca <strong>&quot;Agregar&quot;</strong> arriba a la derecha. ¡Listo!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIosModal(false);
                setShowBanner(false);
              }}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition active:scale-95 shadow-md"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
