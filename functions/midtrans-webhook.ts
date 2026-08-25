import { getSupabaseConfig, type Env } from "./_lib/env";
import { verifyMidtransSignature } from "./_lib/midtrans";

interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Fail closed and loudly if the Cloudflare secrets were never set (e.g. the
  // deployment checklist step got missed). Without this, the signature below is
  // computed against the literal string "undefined" and every real Midtrans
  // notification is rejected with a 403 - safe, but undiagnosable.
  if (!context.env.MIDTRANS_SERVER_KEY) {
    return new Response("MIDTRANS_SERVER_KEY not configured", { status: 500 });
  }
  if (!context.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("SUPABASE_SERVICE_ROLE_KEY not configured", { status: 500 });
  }

  const body = (await context.request.json()) as MidtransNotification;

  const valid = await verifyMidtransSignature(
    body.order_id,
    body.status_code,
    body.gross_amount,
    context.env.MIDTRANS_SERVER_KEY,
    body.signature_key
  );
  if (!valid) {
    return new Response("Invalid signature", { status: 403 });
  }

  const { url } = getSupabaseConfig(context.env);
  const callRpc = (fn: string, payload: Record<string, string>) =>
    fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: context.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

  const status = body.transaction_status;

  if (status === "settlement" || status === "capture") {
    const res = await callRpc("record_booking_payment_settled", { _order_id: body.order_id });
    if (!res.ok) {
      return new Response("Failed to process settlement", { status: 500 });
    }
    return new Response("OK", { status: 200 });
  }

  // A terminal non-payment outcome. Recording it stops the payment row sitting
  // at 'pending' forever, which is what made months-old abandoned VAs still
  // show an admin "Tandai Lunas" button and cluttered payment history.
  // record_booking_payment_failed never downgrades an already-settled row.
  const failedStatus =
    status === "expire" ? "expired" : status === "deny" || status === "cancel" ? "failed" : null;

  if (failedStatus) {
    const res = await callRpc("record_booking_payment_failed", {
      _order_id: body.order_id,
      _new_status: failedStatus,
    });
    if (!res.ok) {
      return new Response("Failed to record payment failure", { status: 500 });
    }
    return new Response("OK", { status: 200 });
  }

  // Anything else (notably 'pending', sent when the VA is first issued) is not
  // a state change worth recording - the row is already 'pending'.
  return new Response("OK", { status: 200 });
};
