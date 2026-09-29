import type { Env } from "./env";

interface CreateVAResult {
  transaction_id: string;
  va_number: string;
  bank: string;
}

type MidtransVAResponse = {
  transaction_id: string;
  status_code?: string;
  status_message?: string;
  va_numbers?: { bank: string; va_number: string }[];
};

/** Look up an existing transaction's VA (used when the charge was already created). */
async function fetchExistingVA(auth: string, orderId: string): Promise<CreateVAResult | null> {
  const res = await fetch(`https://api.midtrans.com/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as MidtransVAResponse;
  const va = data.va_numbers?.[0];
  return va ? { transaction_id: data.transaction_id, va_number: va.va_number, bank: va.bank } : null;
}

export async function createMidtransVA(env: Env, orderId: string, grossAmount: number): Promise<CreateVAResult> {
  const auth = btoa(`${env.MIDTRANS_SERVER_KEY}:`);
  const res = await fetch("https://api.midtrans.com/v2/charge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      payment_type: "bank_transfer",
      // IDR has no minor unit; Midtrans rejects decimal gross_amount.
      transaction_details: { order_id: orderId, gross_amount: Math.round(grossAmount) },
      // Single bank for v1 - a bank picker is real added scope with no
      // requirement behind it yet; BCA is the most common Indonesian bank.
      bank_transfer: { bank: "bca" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Midtrans charge failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as MidtransVAResponse;

  const va = data.va_numbers?.[0];
  if (!va && data.status_code === "406") {
    // Duplicate order_id: the charge was already created (e.g. the earlier attempt
    // reached Midtrans but storing the VA failed, or the jamaah came back to a
    // pending payment). Re-sending can never succeed, so fetch the existing VA.
    const existing = await fetchExistingVA(auth, orderId);
    if (existing) return existing;
  }
  if (!va) {
    // Midtrans's Core API can return HTTP 200 with no va_numbers on a real
    // business-logic failure (e.g. a payment channel not activated on this
    // merchant account) - its actual error lives in the body's own
    // status_code/status_message, not the HTTP status. Surface both.
    throw new Error(
      `Midtrans response missing va_numbers (status_code=${data.status_code}, status_message=${data.status_message}, body=${JSON.stringify(data)})`
    );
  }

  return { transaction_id: data.transaction_id, va_number: va.va_number, bank: va.bank };
}

export async function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string
): Promise<boolean> {
  const input = orderId + statusCode + grossAmount + serverKey;
  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signatureKey;
}
