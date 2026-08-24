# Direct Umroh Booking System with Agent Affiliate Tracking

## Goal

Let jamaah book and pay for an Umroh package directly on musafartour.com — DP or full payment, with flexible installments after DP — while correctly and immutably attributing each booking to the referring agent (if any) so commission payouts never become a dispute between agents.

This is additive to the existing manual flow (`agents` / `agent_sales` / `log_agent_sale` RPC), which stays in place for off-platform deals. It does not replace it.

## Context: what already exists

The codebase already has a substantial agent portal (`src/pages/agent/*`, `src/components/agent/*`) with:

- `agents` table: Supabase Auth-backed accounts, `referral_code` (`MUS-XXXXXX`, generated at signup — used today for agent-recruits-agent referral, not customer attribution), level (bronze/silver/gold/platinum, cosmetic/gamification only), `total_sales`/`total_commission`/`available_balance` aggregate columns, bank details.
- `agent_sales`: a manually-populated commission ledger. The only write path is the `log_agent_sale` RPC, callable only by admin/agent_admin, which computes `commission_amount` from a percentage (`commission_rate`, default 4.5%) and syncs the `agents` aggregate columns — but only when inserted with `status = 'confirmed'`; it does not handle status transitions after insert.
- `agent_short_links`: a generic link shortener (`/l/{code}` → `original_url`, with `click_count`) agents use to share arbitrary links, resolved via the `redirect_agent_short_link` RPC.
- `packages.commission_rate` (numeric, percentage, default 4.5): the existing per-package commission field, used by the manual flow.
- `PackageShareModal.tsx` already builds share URLs of the form `/paket-umroh/{id}?ref={agentCode}` for agents to share — but no page currently reads or persists that `ref` param. Customer-side attribution does not exist today.
- No `bookings` table exists. Booking today happens entirely off-platform (WhatsApp), then gets logged manually.

## Architecture

**Postgres RPC-centric (matches the existing `log_agent_sale` / `redirect_agent_short_link` pattern).** Every operation that requires atomicity — locking a slot, recording a payment, crediting commission — is a `SECURITY DEFINER` Postgres function, called directly from the React client via `supabase.rpc(...)` wherever no secret is involved. Cloudflare Pages Functions are used only for the two things that must be server-side because they hold the Midtrans server key: creating a Midtrans transaction, and receiving/verifying the payment webhook. This was chosen over an API-centric design (all logic in Cloudflare Functions) because it requires materially less new code, matches patterns this codebase's reviewers already know, and keeps atomicity where it belongs — in the database — rather than reimplementing it in application code. Infra cost is identical either way (Supabase Pro compute is a flat monthly instance charge, not per-query; Cloudflare Pages Functions free tier is 100k req/day, far beyond this system's expected volume) — the difference is purely development and maintenance effort, which favors the RPC-centric approach.

## Data Model

### New tables

**`bookings`** — one row per party booking together (a family, a group sharing a room)

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `package_id` | uuid FK → packages | |
| `jamaah_id` | uuid FK → auth.users | the account that made the booking |
| `status` | text | `held` → `active` → `completed`, or `expired` / `cancelled` |
| `room_tier` | text | one of the package's `available_tiers` |
| `traveler_count` | int | |
| `price_per_person` | numeric | snapshotted at booking time — later price changes to the package don't retroactively affect this booking |
| `total_price` | numeric | `price_per_person * traveler_count` |
| `amount_paid` | numeric | running total, updated atomically as payments settle |
| `dp_required` | numeric | snapshot of `packages.dp_amount` at booking time |
| `agent_id` | uuid FK → agents, nullable | first-touch attribution, written once, never overwritten |
| `hold_expires_at` | timestamptz, nullable | only meaningful while `status = 'held'` |
| `commission_credited` | boolean, default false | guards against crediting commission twice |
| `created_at`, `updated_at` | timestamptz | |

**`booking_travelers`** — one row per person in the booking

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `booking_id` | uuid FK → bookings | |
| `full_name` | text | required |
| `passport_number` | text, nullable | may be filled in after booking |
| `date_of_birth` | date, nullable | may be filled in after booking |
| `is_primary_contact` | boolean | exactly one per booking |

Only the primary contact's `full_name` is required at booking time. Other travelers, and the primary contact's passport details, can be completed later from the jamaah dashboard — this keeps the booking/DP flow from blocking on documents that may not be ready yet for every family member.

**`booking_payments`** — the payment ledger; replaces the idea of a fixed termin schedule, since payments after DP are jamaah-initiated and flexible in amount and timing

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `booking_id` | uuid FK → bookings | |
| `amount` | numeric | jamaah-chosen amount (or `dp_required` for the first payment) |
| `admin_fee` | numeric | flat Rp 4.000, Midtrans VA fee passed to the customer |
| `total_charged` | numeric | `amount + admin_fee`, what's actually sent to Midtrans |
| `status` | text | `pending` / `settled` / `expired` / `failed` |
| `midtrans_order_id` | text, unique | idempotency key; created before the Midtrans API call |
| `midtrans_transaction_id`, `va_number`, `bank` | text, nullable | populated once Midtrans returns them |
| `paid_at` | timestamptz, nullable | |
| `created_at` | timestamptz | |

Note: a payment's own VA has its own expiry (Midtrans default ~24h), separate from `bookings.hold_expires_at` — letting one VA expire doesn't cancel the booking, the jamaah just requests a new one.

### Changes to existing tables

- **`packages`**: add `dp_amount` (numeric, flat Rupiah, admin-set) and `agent_commission_amount` (numeric, flat Rupiah, admin-set, varies per package). Drop `commission_rate` — full migration to flat commission, per explicit decision; the manual `log_agent_sale` flow is updated to read the new flat field instead of computing from a percentage.
- **`agent_sales`**: add `booking_id` (uuid, nullable FK → bookings) and `source` (text, `'manual'` default or `'booking'`). Manual and automated commission entries stay in one ledger, distinguishable by `source`, so existing agent-facing commission views keep working without needing a second table.

### Core RPCs

- **`create_booking(...)`** — atomic: checks `slots_filled + traveler_count <= slots_total`, inserts the booking (`status = 'held'`, `hold_expires_at = now() + 24h`) and traveler rows, increments `packages.slots_filled`, and records `agent_id` from the referral cookie if present — all in one transaction.
- **`release_expired_booking_holds()`** — run on a schedule; finds `held` bookings past `hold_expires_at`, sets them `expired`, and decrements `packages.slots_filled` back.
- **`record_booking_payment_settled(midtrans_order_id, ...)`** — called by the webhook handler after signature verification: marks the payment `settled`, updates `bookings.amount_paid`, transitions `held → active` on the first successful payment (clearing `hold_expires_at` — the slot is now durably held), and transitions to `completed` plus credits the flat commission (writing to `agent_sales` and the `agents` aggregate columns, setting `commission_credited = true`) once `amount_paid >= total_price`. Idempotent — re-invocation for an already-settled `midtrans_order_id` is a no-op.

## Referral Attribution

Builds directly on the existing `PackageShareModal.tsx` output (`/paket-umroh/{id}?ref={agentCode}`), which today generates a working share link that nothing reads.

1. The package detail page reads `?ref=` on load and stores it in a `musafar_ref` cookie (30-day expiry) — **only if no such cookie already exists.** This is what makes attribution genuinely first-touch: a second agent's link clicked later does not overwrite an existing attribution.
2. `create_booking` receives the cookie's value and resolves it to `agent_id` server-side, writing it once to `bookings.agent_id`. The client never resolves the code itself.
3. Accepted trade-off: referral codes are visible/guessable (any agent's code could be put in a URL by a third party), so this is not spoofing-proof. This is not treated as a security problem worth defending against with signed tokens — the customer always pays full price regardless of which `ref` code is present; the only thing at stake is which agent gets credited, an internal operational concern rather than a way to extract money from the business.

## Booking Flow (jamaah-facing)

1. Land on `/paket-umroh/:id` (possibly via an agent's link) → click **"Booking Sekarang"** (new CTA, sits alongside the existing WhatsApp CTA — the manual/negotiated path stays available)
2. Sign up / log in if needed (Supabase Auth, matching the agent portal's email+password / Google pattern)
3. Choose room tier (from the package's `available_tiers`) and traveler count (capped sensibly per tier — e.g. quad ≤ 4)
4. Enter the primary contact's details; other travelers can be completed later from the dashboard
5. Review total price and required DP; choose to pay DP or pay in full
6. Get redirected to Midtrans VA payment instructions (bank, VA number, total including the Rp 4.000 admin fee, and a countdown until the hold/VA expires)
7. Once settled (via webhook), the booking becomes `active` and appears in the jamaah's dashboard with payment history and remaining balance
8. Any time before full payment, the jamaah can hit **"Bayar Sekarang"** in the dashboard, choose an amount (minimum ~Rp 500.000, to avoid many negligible-sized payments) and generate a new VA
9. Once `amount_paid >= total_price`, the booking is `completed` and, if attributed, the agent's flat commission is credited automatically

## Payment Integration (Midtrans)

Two new Cloudflare Pages Functions:

- **`create-payment.ts`** — called when the jamaah initiates a payment. Inserts a `pending` `booking_payments` row via RPC first (so a matching row always exists before Midtrans could possibly notify about it), then calls the Midtrans API (server key required, hence server-side) to create the VA, then updates the row with the VA details and returns them to the client.
- **`midtrans-webhook.ts`** — receives Midtrans's transaction status notifications:
  1. Verifies the signature (`SHA512(order_id + status_code + gross_amount + ServerKey)` against the payload's `signature_key`) — mandatory, since this endpoint marks money as received.
  2. Maps `transaction_status` → internal status (`settlement → settled`, `expire → expired`, `deny`/`cancel → failed`).
  3. On `settled`, calls `record_booking_payment_settled(...)`, which itself guards against duplicate processing (Midtrans retries notifications on failure).
  4. Responds `200` promptly.

Slot-hold expiry is enforced by `pg_cron` (~every 15 minutes, scheduled directly in Postgres) calling `release_expired_booking_holds()` — not a Cloudflare Cron Trigger, since Cron Triggers are a Workers-only feature and this project is a Pages project (`pages_build_output_dir` in `wrangler.toml`), which Pages Functions cannot use.

## Admin Views

`AgentManagement.tsx` today is agent-list-and-approval plus a manual "log sale" dialog — there's no cross-agent bookings view, so this is new surface:

- **`/admin/bookings`** — list of all bookings: jamaah, package, status, payment progress, attributed agent (if any), departure date; filterable by status and package.
- **Booking detail** — traveler list, full payment history, and a manual "mark as paid" override (for webhook-delivery failures) that still routes through `record_booking_payment_settled` so status and commission stay consistent — logged with which admin performed the override and why.
- **Commission views**: no new page needed. Because `agent_sales` carries both manual and booking-sourced rows (distinguished by `source`), the existing commission UI in the agent portal and `AgentManagement.tsx` picks up booking-sourced commission automatically once its queries include both sources. The manual "log sale" form's commission-rate input is updated to pull the flat `agent_commission_amount` for the selected package instead of taking a percentage.

## Explicitly Out of Scope / Open Items

These were surfaced during design but not decided, and should not be silently assumed during implementation:

- **Refund / cancellation policy** — what happens to a partially-paid booking that the jamaah cancels, and whether/how any paid amount is refunded.
- **Payment deadline enforcement relative to departure date** — what happens if a booking never reaches `completed` before the package's departure date.

## Cost

No new fixed monthly cost. Midtrans charges only per successful VA transaction (Rp 4.000, passed to the customer as `admin_fee`) — no setup or monthly fee. The additional Supabase/Cloudflare usage from this feature does not push either service into a more expensive tier: Supabase Pro compute is billed as a flat instance cost regardless of query volume, and Cloudflare Pages Functions usage stays far below the free tier's 100k requests/day at this system's expected volume.
