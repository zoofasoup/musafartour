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

  if (body.transaction_status !== "settlement" && body.transaction_status !== "capture") {
    // Other statuses (pending/expire/deny/cancel) don't need to move the
    // booking forward - the payment row stays 'pending' until it either
    // settles or its own VA expires client-side.
    return new Response("OK", { status: 200 });
  }

  const { url } = getSupabaseConfig(context.env);
  const res = await fetch(`${url}/rest/v1/rpc/record_booking_payment_settled`, {
    method: "POST",
    headers: {
      apikey: context.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ _order_id: body.order_id }),
  });

  if (!res.ok) {
    return new Response("Failed to process settlement", { status: 500 });
  }

  return new Response("OK", { status: 200 });
};
