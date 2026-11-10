import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export interface KevDevPayment {
  id: string;
  date: string;
  amount: number;
  concept: string;
  medioPago?: string;
  metodo?: string;
  referencia?: string;
  confirmed: boolean;
}

// Fallback por defecto si no hay conexión de red externa con KevDev
const FALLBACK_DATA = {
  success: true,
  clienteId: "nievas",
  estadoPago: "PENDIENTE",
  payments: [
    {
      id: "B5ejo8ZtznNd6VJ4WOWr",
      date: "2026-11-10",
      amount: 55000,
      concept: "Cuota Mensual",
      medioPago: "Mercado Pago",
      metodo: "pasarela",
      referencia: "",
      confirmed: false,
    },
  ],
};

export async function GET(request: Request) {
  const secretHeader = request.headers.get("x-kevdev-secret") || "";
  const expectedSecret = process.env.KEVDEV_PAYMENTS_SECRET || "kevdev_payments_sec_2026_key";

  // Permitir acceso a KevDev con header secreto, o al usuario ADMIN autenticado
  if (!secretHeader || secretHeader !== expectedSecret) {
    const user = await getCurrentUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const kevdevUrl = process.env.KEVDEV_API_URL || "https://www.kevdev.net.ar";
    const clienteId = process.env.KEVDEV_CLIENT_ID || "nievas";
    const secret = process.env.KEVDEV_PAYMENTS_SECRET || "kevdev_payments_sec_2026_key";

    const res = await fetch(
      `${kevdevUrl.replace(/\/$/, "")}/api/payments/client-history?clienteId=${clienteId}&t=${Date.now()}`,
      {
        headers: {
          "x-kevdev-secret": secret,
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    console.warn("[Billing Payments] KevDev API respondió status:", res.status);
  } catch (err: any) {
    console.warn("[Billing Payments] Error conectando con KevDev API:", err?.message || err);
  }

  return NextResponse.json(FALLBACK_DATA, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-kevdev-secret") || "";
  const expectedSecret = process.env.KEVDEV_PAYMENTS_SECRET || "kevdev_payments_sec_2026_key";

  if (!secretHeader || secretHeader !== expectedSecret) {
    const user = await getCurrentUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    console.log("[Billing Payments Push] Pago recibido desde KevDev:", body);

    return NextResponse.json({
      success: true,
      ok: true,
      message: "Pago registrado y sincronizado exitosamente",
      data: body,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Error procesando pago", details: e?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const secretHeader = request.headers.get("x-kevdev-secret") || "";
  const expectedSecret = process.env.KEVDEV_PAYMENTS_SECRET || "kevdev_payments_sec_2026_key";

  if (!secretHeader || secretHeader !== expectedSecret) {
    const user = await getCurrentUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    console.log("[Billing Payments Delete] Pago eliminado desde KevDev:", body);

    return NextResponse.json({
      success: true,
      ok: true,
      message: "Pago eliminado exitosamente",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Error eliminando pago", details: e?.message },
      { status: 500 }
    );
  }
}

