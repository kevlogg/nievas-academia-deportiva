import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MP_ACCESS_TOKEN =
  process.env.KEVDEV_MP_ACCESS_TOKEN ||
  process.env.MP_ACCESS_TOKEN ||
  "APP_USR-6048028823134972-082614-9caa0aa0e151104c1769457fec0a3bfa-322263721";

const KEVDEV_PAYMENTS_SECRET =
  process.env.KEVDEV_PAYMENTS_SECRET || "kevdev_payments_sec_2026_key";
const KEVDEV_API_URL = process.env.KEVDEV_API_URL || "https://www.kevdev.net.ar";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    const eventType = body.type || body.action || url.searchParams.get("type") || "";
    const dataId =
      body?.data?.id ||
      body?.id ||
      url.searchParams.get("data.id") ||
      url.searchParams.get("id");

    if (!dataId) {
      return NextResponse.json({ received: true, ignored: "no data id" });
    }

    // 1. Si es evento de pago recurrente ejecutado
    if (eventType.includes("payment") || !eventType) {
      try {
        const paymentRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${dataId}`,
          {
            headers: {
              Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
              "Cache-Control": "no-cache",
            },
          }
        );

        if (paymentRes.ok) {
          const payment = await paymentRes.json();
          const extRef = (payment.external_reference || "").toLowerCase();
          const payerEmail = (payment.payer?.email || "").toLowerCase();
          const description = (payment.description || "").toLowerCase();

          const isNievas =
            extRef.includes("nievas") ||
            payerEmail.includes("nievas") ||
            description.includes("nievas") ||
            description.includes("tatami");

          if (isNievas && payment.status === "approved") {
            const dateStr = payment.date_approved
              ? new Date(payment.date_approved).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0];

            await fetch(`${KEVDEV_API_URL.replace(/\/$/, "")}/api/payments/receive`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-kevdev-secret": KEVDEV_PAYMENTS_SECRET,
              },
              body: JSON.stringify({
                clienteId: "nievas",
                monto: Number(payment.transaction_amount || 55000),
                concepto: "Cuota Mensual (Débito Automático)",
                fecha: dateStr,
                medioPago: `Mercado Pago (${payment.payment_method_id || "Tarjeta"})`,
                metodo: "pasarela",
                referencia: String(payment.id),
                confirmado: true,
              }),
            });

            console.log(
              `[SubscriptionWebhook] Cobro ${payment.id} sincronizado exitosamente con KevDev`
            );
          }
        }
      } catch (payErr) {
        console.error("[SubscriptionWebhook] Error verificando pago:", payErr);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[SubscriptionWebhook] Error general:", err);
    return NextResponse.json({ received: true, error: err?.message });
  }
}

