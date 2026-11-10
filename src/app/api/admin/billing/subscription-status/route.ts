import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const MP_ACCESS_TOKEN =
  process.env.KEVDEV_MP_ACCESS_TOKEN ||
  process.env.MP_ACCESS_TOKEN ||
  "APP_USR-6048028823134972-082614-9caa0aa0e151104c1769457fec0a3bfa-322263721";

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

    const searchUrl = `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(
      email
    )}`;

    const mpRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    });

    if (!mpRes.ok) {
      console.warn("[SubscriptionStatus] Falló búsqueda en MP:", mpRes.status);
      return NextResponse.json({
        ok: true,
        subscribed: false,
        status: "error_querying_mp",
      });
    }

    const data = await mpRes.json();
    const results = data.results || [];

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

    const pendingSub = results.find((r: any) => r.status === "pending");

    return NextResponse.json({
      ok: true,
      subscribed: false,
      status: pendingSub ? "pending" : "none",
      pending_id: pendingSub?.id || null,
    });
  } catch (err: any) {
    console.error("[SubscriptionStatus] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Error consultando estado de suscripción" },
      { status: 500 }
    );
  }
}
