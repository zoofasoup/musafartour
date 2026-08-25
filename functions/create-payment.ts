import { getSupabaseConfig, type Env } from "./_lib/env";
import { createMidtransVA } from "./_lib/midtrans";

interface BookingPaymentRow {
  midtrans_order_id: string;
  total_charged: number;
  va_number: string | null;
  bank: string | null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Fail closed and loudly if the Cloudflare secret was never set (e.g. the
  // deployment checklist step got missed). Without this, the Midtrans charge
  // below authenticates with the literal string "undefined" and surfaces as an
  // opaque "Failed to create Midtrans VA" 502.
  if (!context.env.MIDTRANS_SERVER_KEY) {
    return new Response("MIDTRANS_SERVER_KEY not configured", { status: 500 });
  }

  const { url, anonKey } = getSupabaseConfig(context.env);
  const authHeader = context.request.headers.get("authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await context.request.json()) as { order_id?: string };
  if (!body.order_id) {
    return new Response("order_id required", { status: 400 });
  }

  // authHeader carries the jamaah's own JWT, so RLS scopes this SELECT to
  // payments on their own bookings - no separate ownership check needed here.
  const paymentRes = await fetch(
    `${url}/rest/v1/booking_payments?select=midtrans_order_id,total_charged,va_number,bank&midtrans_order_id=eq.${encodeURIComponent(body.order_id)}&limit=1`,
    { headers: { apikey: anonKey, Authorization: authHeader } }
  );
  if (!paymentRes.ok) {
    return new Response("Failed to look up payment", { status: 502 });
  }
  const payments = (await paymentRes.json()) as BookingPaymentRow[];
  const payment = payments[0];
  if (!payment) {
    return new Response("Payment not found", { status: 404 });
  }

  if (payment.va_number) {
    return new Response(JSON.stringify(payment), { headers: { "content-type": "application/json" } });
  }

  let va;
  try {
    va = await createMidtransVA(context.env, payment.midtrans_order_id, payment.total_charged);
  } catch {
    return new Response("Failed to create Midtrans VA", { status: 502 });
  }

  const updateRes = await fetch(`${url}/rest/v1/rpc/record_payment_va_details`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: authHeader, "content-type": "application/json" },
    body: JSON.stringify({
      _order_id: payment.midtrans_order_id,
      _midtrans_transaction_id: va.transaction_id,
      _va_number: va.va_number,
      _bank: va.bank,
    }),
  });
  if (!updateRes.ok) {
    return new Response("Failed to store VA details", { status: 502 });
  }

  return new Response(
    JSON.stringify({ va_number: va.va_number, bank: va.bank, total_charged: payment.total_charged }),
    { headers: { "content-type": "application/json" } }
  );
};
