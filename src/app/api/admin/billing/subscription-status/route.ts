import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const MP_ACCESS_TOKEN =
  process.env.KEVDEV_MP_ACCESS_TOKEN ||
  process.env.MP_ACCESS_TOKEN ||
  "APP_USR-6048028823134972-082614-9caa0aa0e151104c1769457fec0a3bfa-322263721";

const NIEVAS_PREAPPROVAL_PLAN_ID = "dda0583fc8e3464e9dff9a26976c7c77";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const email = (
      url.searchParams.get("email") ||
      user.email ||
      "francisco.nievas@nievasacademia.com"
    )
      .trim()
      .toLowerCase();

    // 1. Buscar primero suscripciones activas asociadas al Plan de Nievas
    try {
      const planSearchUrl = `https://api.mercadopago.com/preapproval/search?preapproval_plan_id=${NIEVAS_PREAPPROVAL_PLAN_ID}`;
      const planRes = await fetch(planSearchUrl, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });

      if (planRes.ok) {
        const planData = await planRes.json();
        const results = planData.results || [];
        const activeSub = results.find((r: any) => r.status === "authorized");

        if (activeSub) {
          return NextResponse.json({
            ok: true,
            subscribed: true,
            status: "authorized",
            preapproval_id: activeSub.id,
            next_payment_date: activeSub.next_payment_date || null,
            amount: activeSub.auto_recurring?.transaction_amount || 55000,
            date_created: activeSub.date_created || null,
            payment_method_id: activeSub.payment_method_id || null,
            payer_email: activeSub.payer_email || null,
          });
        }
      }
    } catch (planErr) {
      console.warn("[SubscriptionStatus] Error buscando por plan:", planErr);
    }

    // 2. Buscar por email del pagador como fallback
    try {
      const emailSearchUrl = `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(
        email
      )}`;
      const emailRes = await fetch(emailSearchUrl, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        const results = emailData.results || [];
        const activeSub = results.find((r: any) => r.status === "authorized");

        if (activeSub) {
          return NextResponse.json({
            ok: true,
            subscribed: true,
            status: "authorized",
            preapproval_id: activeSub.id,
            next_payment_date: activeSub.next_payment_date || null,
            amount: activeSub.auto_recurring?.transaction_amount || 55000,
            date_created: activeSub.date_created || null,
            payment_method_id: activeSub.payment_method_id || null,
          });
        }
      }
    } catch (emailErr) {
      console.warn("[SubscriptionStatus] Error buscando por email:", emailErr);
    }

    return NextResponse.json({
      ok: true,
      subscribed: false,
      status: "none",
    });
  } catch (err: any) {
    console.error("[SubscriptionStatus] Error general:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Error consultando estado de suscripción" },
      { status: 500 }
    );
  }
}
