import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Token oficial de cobro de Kevin Loggia (KevDev) - Collector ID: 322263721
const MP_ACCESS_TOKEN =
  process.env.KEVDEV_MP_ACCESS_TOKEN ||
  process.env.MP_ACCESS_TOKEN ||
  "APP_USR-6048028823134972-082614-9caa0aa0e151104c1769457fec0a3bfa-322263721";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const payerEmail = (
      body.email ||
      user.email ||
      "francisco.nievas@nievasacademia.com"
    )
      .trim()
      .toLowerCase();

    // Determinar la URL base de retorno (Mercado Pago requiere HTTPS en producción)
    const hostHeader =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "nievas-academia-deportiva.vercel.app";
    const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
    const baseUrl = isLocal
      ? "https://nievas-academia-deportiva.vercel.app"
      : `https://${hostHeader}`;

    // 1. Verificación previa de suscripciones activas
    try {
      const searchRes = await fetch(
        `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(
          payerEmail
        )}`,
        {
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            "Cache-Control": "no-cache",
          },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const activeSub = (searchData.results || []).find(
          (r: any) => r.status === "authorized"
        );
        if (activeSub) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Ya contás con una suscripción de débito automático activa para este plan.",
              activeSubId: activeSub.id,
            },
            { status: 400 }
          );
        }
      }
    } catch (checkErr) {
      console.warn("[Subscribe] Error verificando suscripciones previas:", checkErr);
    }

    // 2. Crear suscripción recurrente en Mercado Pago
    const backUrl = `${baseUrl}/admin/dashboard?tab=plan&sub=success`;
    const notificationUrl = `${baseUrl}/api/admin/billing/webhook`;

    const subPayload = {
      payer_email: payerEmail,
      back_url: backUrl,
      notification_url: notificationUrl,
      reason: "Plan KevDev - Nievas Academia Deportiva",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 55000,
        currency_id: "ARS",
      },
      external_reference: "nievas_plan_kevdev",
      status: "pending",
    };

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subPayload),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error("[Subscribe] Error creando preapproval en Mercado Pago:", data);
      return NextResponse.json(
        {
          ok: false,
          error: data.message || "Error al comunicarse con Mercado Pago",
        },
        { status: mpRes.status }
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      init_point: data.init_point,
      status: data.status,
      next_payment_date: data.next_payment_date,
    });
  } catch (err: any) {
    console.error("[Subscribe] Error inesperado:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

