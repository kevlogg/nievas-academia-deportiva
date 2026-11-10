"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Gift,
  Award,
  Calendar,
  DollarSign,
  ArrowRight,
  Info,
} from "lucide-react";

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

interface PlanKevDevSectionProps {
  initialSubSuccess?: boolean;
}

export function PlanKevDevSection({ initialSubSuccess = false }: PlanKevDevSectionProps) {
  const [payments, setPayments] = useState<KevDevPayment[]>([]);
  const [estadoPago, setEstadoPago] = useState<string>("PENDIENTE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conditionsOpen, setConditionsOpen] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subNextDate, setSubNextDate] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(initialSubSuccess);
  const [payerEmail, setPayerEmail] = useState("francisco.nievas@nievasacademia.com");
  const [showEmailEdit, setShowEmailEdit] = useState(false);

  const planMonto = 55000;
  const fechaInicio = "10/11/2026";
  const whatsappKevDev = process.env.NEXT_PUBLIC_KEVDEV_WHATSAPP || "5492235851419";

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [paymentsRes, subRes] = await Promise.all([
        fetch(`/api/admin/billing/payments?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/billing/subscription-status?t=${Date.now()}`, { cache: "no-store" }).catch(
          () => null
        ),
      ]);

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        if (Array.isArray(data.payments)) {
          setPayments(data.payments);
        }
        if (data.estadoPago) {
          setEstadoPago(data.estadoPago);
        }
      }

      if (subRes && subRes.ok) {
        const subData = await subRes.json();
        if (subData.subscribed) {
          setIsSubscribed(true);
          if (subData.next_payment_date) {
            setSubNextDate(subData.next_payment_date.split("T")[0]);
          }
        }
      }
    } catch (err) {
      console.warn("[PlanKevDev] Error consultando pagos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubscribeMP = async () => {
    setSubscribing(true);
    setSubscribeError(null);
    try {
      const res = await fetch("/api/admin/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payerEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubscribeError(data.error || "No se pudo iniciar el proceso con Mercado Pago");
        return;
      }

      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (err: any) {
      setSubscribeError(err?.message || "Error al conectar con Mercado Pago");
    } finally {
      setSubscribing(false);
    }
  };

  // Determinar si la primera cuota (10/11/2026) o la actual ya está confirmada
  const hasFirstQuotaPaid = payments.some((p) => {
    const d = String(p.date || "");
    return (
      (d.startsWith("2026-11") || d.startsWith("2026-12")) && (p.confirmed ?? false)
    );
  });

  const getProximoDia10 = (alDia: boolean): string => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    const day = now.getDate();
    if (!alDia && day <= 10) {
      return `10/${String(month + 1).padStart(2, "0")}/${year}`;
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    return `10/${String(month + 1).padStart(2, "0")}/${year}`;
  };

  const formattedSubDate = subNextDate
    ? (() => {
        const parts = subNextDate.split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : null;
      })()
    : null;

  const isAlDia = estadoPago === "AL_DIA" || hasFirstQuotaPaid;
  const proximoVencimiento = formattedSubDate || getProximoDia10(isAlDia);
  const saldoPendiente = isAlDia ? 0 : planMonto;

  const whatsappUrl = `https://wa.me/${whatsappKevDev}?text=${encodeURIComponent(
    "Hola Kevin! Te contacto desde el panel de Dirección de Nievas Academia Deportiva por una consulta técnica o del servicio."
  )}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabecera de la Sección Plan KevDev */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-xl shadow-blue-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-xl shadow-xs font-black">
              ⚡
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Plan de Servicio KevDev
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
              OFICIAL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-blue-100 font-medium">
            Acuerdo de soporte, hosting, infraestructura en nube e historial de pagos de la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-white/15"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Sincronizando..." : "Actualizar"}</span>
          </button>
        </div>
      </div>

      {/* Banner de Confirmación por éxito en retorno de Mercado Pago */}
      {showSuccessBanner && (
        <div className="p-4 bg-emerald-950/90 border-2 border-emerald-500/80 rounded-2xl text-white shadow-lg flex items-start gap-3">
          <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0 font-bold">
            🎉
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-black text-sm text-emerald-300">
              ¡Pago confirmado y Débito Automático activado con éxito!
            </h4>
            <p className="text-emerald-100">
              Tu cuota fue acreditada correctamente. A partir del próximo período tu abono se debitará automáticamente cada día 10 a través de Mercado Pago para mantener tu plataforma y tatami siempre operativos.
            </p>
            <button
              onClick={() => setShowSuccessBanner(false)}
              className="text-[11px] underline text-emerald-300 font-bold mt-1 cursor-pointer"
            >
              Cerrar aviso
            </button>
          </div>
        </div>
      )}

      {/* Banner de Estado del Servicio */}
      <div
        className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-md ${
          isAlDia
            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
            : "bg-amber-50 border-amber-300 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-3">
          {isAlDia ? (
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base">
                Estado del servicio:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  isAlDia
                    ? "bg-emerald-200 text-emerald-900"
                    : "bg-amber-200 text-amber-900"
                }`}
              >
                {isAlDia ? "✓ Al día" : "⏳ Cuota a abonar"}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {isAlDia
                ? `Próximo vencimiento: ${proximoVencimiento} ($ ${planMonto.toLocaleString("es-AR")})`
                : `Vencimiento de cuota: ${proximoVencimiento} — Monto: $ ${planMonto.toLocaleString("es-AR")}`}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-xs">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            Desarrollador
          </span>
          <span className="font-black text-slate-900">Kevin Loggia</span>
        </div>
      </div>

      {/* CARD 1: PLAN ACTIVO & MÉTRICAS DEL ACUERDO */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-[#0F3E86] rounded-xl font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Plan Activo
              </h2>
              <p className="text-xs text-slate-500">
                Condiciones comerciales y calendario de pagos acordado
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-blue-50 text-[#0F3E86] border border-blue-200 font-black text-xs">
            Servicio Activo
          </span>
        </div>

        {/* Grid de Métricas Principales */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Inicio del plan
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900">
              {fechaInicio}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Modalidad
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900">
              Mensual
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Valor mensual
            </span>
            <span className="text-sm sm:text-base font-black text-[#0F3E86]">
              $ {planMonto.toLocaleString("es-AR")}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Próximo pago
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900">
              {proximoVencimiento}
            </span>
          </div>

          <div
            className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border space-y-1 ${
              saldoPendiente > 0
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Saldo pendiente
            </span>
            <span className="text-sm sm:text-base font-black">
              {saldoPendiente > 0
                ? `$ ${saldoPendiente.toLocaleString("es-AR")}`
                : "$ 0 (Al día)"}
            </span>
          </div>
        </div>

        {/* CAJA DE PAGO Y DÉBITO AUTOMÁTICO (MERCADO PAGO) */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-[#0F3E86] text-white rounded-2xl space-y-4">
          {isSubscribed ? (
            /* Estado: Débito Automático Activo */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 text-xl font-bold shrink-0">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-base text-white">
                        Débito Automático Activo
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        EN REGLA
                      </span>
                    </div>
                    <p className="text-xs text-blue-100/90 mt-0.5">
                      Tu tarjeta está asociada con Mercado Pago. Los cobros de $ {planMonto.toLocaleString("es-AR")} se debitan automáticamente los días 10 de cada mes.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-amber-300 text-xs font-bold">
                    Próximo débito: {subNextDate || proximoVencimiento}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-200">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Débito automático mensual activo a través de Mercado Pago</span>
                </span>
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Servicio protegido y al día con KevDev</span>
                </span>
              </div>
            </div>
          ) : (
            /* Estado: Pagar Cuota y Adherir al Débito Automático */
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Pagar Plan y Adherir al Débito Automático
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                    Aboná la cuota de este mes ($ {planMonto.toLocaleString("es-AR")}) asociando tu tarjeta de débito o crédito con Mercado Pago. A partir del próximo mes, tu servicio se debitará automáticamente cada día 10 para garantizar la continuidad ininterrumpida de tu servidor, tatami táctil y soporte.
                  </p>
                  <div className="pt-1 flex items-center gap-2 text-xs text-blue-200">
                    <span>Email titular MP: <strong className="text-white">{payerEmail}</strong></span>
                    <button
                      type="button"
                      onClick={() => setShowEmailEdit(!showEmailEdit)}
                      className="underline text-sky-300 hover:text-sky-200 font-bold text-[11px] cursor-pointer"
                    >
                      {showEmailEdit ? "cerrar" : "cambiar email"}
                    </button>
                  </div>
                  {showEmailEdit && (
                    <div className="pt-1 flex items-center gap-2">
                      <input
                        type="email"
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        placeholder="tu-email-mercadopago@gmail.com"
                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg border border-white/20 text-xs w-64 focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailEdit(false)}
                        className="px-2.5 py-1.5 bg-sky-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Listo
                      </button>
                    </div>
                  )}
                </div>

                {/* Botón Principal Mercado Pago */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <button
                    onClick={handleSubscribeMP}
                    disabled={subscribing}
                    className="px-5 py-3 bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <CreditCard className="w-4 h-4 text-slate-950" />
                    <span>
                      {subscribing
                        ? "Conectando con Mercado Pago..."
                        : `Pagar $ ${planMonto.toLocaleString("es-AR")} con Mercado Pago`}
                    </span>
                  </button>
                </div>
              </div>

              {subscribeError && (
                <p className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/50">
                  ⚠️ {subscribeError}
                </p>
              )}

              {/* Badges oficiales de Mercado Pago y canal de soporte técnico */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-200">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 text-white font-medium">
                    🔒 Procesado 100% oficial por Mercado Pago
                  </span>
                  <span>•</span>
                  <span>💳 Débito o Crédito (Visa, Mastercard, etc.)</span>
                  <span>•</span>
                  <span>🔄 Débito recurrente los días 10 de cada mes</span>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300 hover:text-white underline font-semibold flex items-center gap-1 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Soporte técnico con Kevin</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: HISTORIAL DE PAGOS (SINCRONIZADO CON KEVDEV) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Historial de Pagos
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <span>⚡</span> KevDev Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Registro oficial sincronizado en tiempo real con la cuenta de KevDev
              </p>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-semibold self-start sm:self-auto">
            {payments.length} {payments.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {/* Tabla Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                <th className="py-2.5 px-3 rounded-l-xl">Fecha</th>
                <th className="py-2.5 px-3">Concepto</th>
                <th className="py-2.5 px-3">Medio de Pago</th>
                <th className="py-2.5 px-3">Monto</th>
                <th className="py-2.5 px-3 text-right rounded-r-xl">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Cargando historial de pagos desde KevDev...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No hay pagos registrados aún en KevDev.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const dateStr = p.date || "S/F";
                  const formattedDate = dateStr.includes("-")
                    ? dateStr.split("-").reverse().join("/")
                    : dateStr;
                  const isConfirmed = p.confirmed ?? false;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">
                        {formattedDate}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        {p.concept || "Cuota Mensual"}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.medioPago || "Mercado Pago"}
                      </td>
                      <td className="py-3 px-3 font-black text-[#0F3E86] text-sm">
                        $ {Number(p.amount || 0).toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[11px] ${
                            isConfirmed
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {isConfirmed ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Confirmado</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cards Mobile */}
        <div className="md:hidden space-y-2.5">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
              Cargando historial desde KevDev...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
              No hay pagos registrados aún.
            </div>
          ) : (
            payments.map((p) => {
              const dateStr = p.date || "S/F";
              const formattedDate = dateStr.includes("-")
                ? dateStr.split("-").reverse().join("/")
                : dateStr;
              const isConfirmed = p.confirmed ?? false;

              return (
                <div
                  key={p.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-slate-900">
                        {p.concept || "Cuota Mensual"}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        📅 {formattedDate} • {p.medioPago || "Mercado Pago"}
                      </p>
                    </div>
                    <span className="font-black text-[#0F3E86] text-sm">
                      $ {Number(p.amount || 0).toLocaleString("es-AR")}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">Estado</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isConfirmed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isConfirmed ? "✓ Confirmado" : "⏳ Pendiente"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CARD 3: CONDICIONES DEL ACUERDO (ACORDEÓN) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setConditionsOpen((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#0F3E86] rounded-xl font-bold">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Condiciones del Acuerdo
              </h3>
              <p className="text-xs text-slate-500">
                Términos del servicio mensual, alcance y políticas de soporte
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${
              conditionsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {conditionsOpen && (
          <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs sm:text-sm text-slate-700">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-black text-sm text-[#0F3E86] flex items-center gap-2">
                <span>🥋</span> Plan Mensual Nievas Academia Deportiva
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600 leading-relaxed text-xs">
                <li>
                  <strong>Abono mensual fijo:</strong> $ 55.000 con vencimiento los días 10 de cada mes calendario.
                </li>
                <li>
                  <strong>Ajuste por inflación:</strong> Se actualiza semestralmente conforme a la variación acumulada del componente Servicios del IPC publicado por el INDEC de los 6 meses precedentes.
                </li>
                <li>
                  <strong>Infraestructura & Nube:</strong> El servicio cubre la totalidad del hosting de alta disponibilidad, base de datos PostgreSQL en Supabase, certificados SSL, monitoreo de servidor y almacenamiento de datos del dojo.
                </li>
                <li>
                  <strong>Mantenimiento continuo:</strong> Soporte técnico prioritario ante fallas operativas, bugs, actualización de parches de seguridad y garantía de funcionamiento en el tatami táctil.
                </li>
                <li>
                  <strong>Alcance de desarrollos adicionales:</strong> Nuevos módulos especiales, aplicaciones adicionales o rediseños mayores fuera del MVP acordado se presupuestan de forma independiente.
                </li>
              </ul>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Ante cualquier duda, consulta técnica o necesidad operativa, comunicarse de forma directa con Kevin Loggia a través del canal oficial de WhatsApp.
            </p>
          </div>
        )}
      </div>

      {/* CARD 4: PROGRAMA DE MESES BONIFICADOS POR REFERIDOS */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 rounded-3xl border-2 border-amber-300 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-bold shadow-xs">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Meses Bonificados por Referidos
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Recomendá KevDev a otros negocios, clubes o gimnasios y obtené meses 100% bonificados
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs">
            0 de 12 Referidos
          </span>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">
          Por cada cliente que recomiendes a KevDev y contrate su sitio web o sistema, se te bonifica automáticamente <strong>1 mes completo de suscripción ($ 55.000)</strong>. Al alcanzar los 12 referidos acumulados, el costo total del desarrollo queda 100% bonificado.
        </p>

        {/* Barra de Progreso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Progreso actual: 0 clientes referidos</span>
            <span className="text-amber-800">Meta: 12 Clientes</span>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: "2%" }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span>Inicio</span>
            <span>6 Meses (Semestral)</span>
            <span className="font-bold text-amber-800">🏆 12 (Desarrollo Bonificado)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

