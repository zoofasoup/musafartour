import type { Env } from "./env";

interface CreateVAResult {
  transaction_id: string;
  va_number: string;
  bank: string;
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
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      // Single bank for v1 - a bank picker is real added scope with no
      // requirement behind it yet; BCA is the most common Indonesian bank.
      bank_transfer: { bank: "bca" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Midtrans charge failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    transaction_id: string;
    va_numbers?: { bank: string; va_number: string }[];
  };

  const va = data.va_numbers?.[0];
  if (!va) {
    throw new Error("Midtrans response missing va_numbers");
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
