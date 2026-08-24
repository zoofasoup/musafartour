# Direct Umroh Booking System with Agent Affiliate Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let jamaah book and pay for an Umroh package directly on musafartour.com (DP or full payment, flexible installments after DP via Midtrans VA), with bookings immutably attributed to the referring agent so commission never becomes a dispute.

**Architecture:** Postgres `SECURITY DEFINER` RPCs own every operation needing atomicity (slot locking, payment recording, commission crediting) — matching the existing `log_agent_sale`/`redirect_agent_short_link` pattern. Cloudflare Pages Functions are used only for the two things needing the Midtrans server key: creating a VA transaction and verifying/handling the webhook. This is additive to the existing manual `agents`/`agent_sales`/`log_agent_sale` flow, which is not removed.

**Tech Stack:** React + Vite + TypeScript, Supabase (Postgres + Auth + RLS), Cloudflare Pages Functions, Midtrans (Core API, VA/bank-transfer only), `pg_cron` for scheduled slot-hold release.

**Spec:** `docs/superpowers/specs/2026-08-24-umroh-booking-affiliate-system-design.md`

## Global Constraints

- Do not remove or break `agents`, `agent_sales`, `log_agent_sale`, `agent_short_links`, or the existing agent portal — this system is additive.
- Commission is a full migration to flat Rupiah amounts. `packages.commission_rate` (percentage) is dropped; `agent_sales.commission_rate` becomes nullable and is no longer populated going forward (historical rows keep their value).
- No automated test framework exists in this codebase (no vitest/jest/RTL). Verification follows the project's actual convention: `npx tsc -p functions/tsconfig.json` for Functions, `npx supabase db push` + direct SQL checks for migrations, `npm run build` for the frontend, and manual exercise via `wrangler pages dev` where a change is live-testable — matching how `functions/meta-product-feed.csv.ts` was verified.
- Money-moving RPCs must be idempotent (`record_booking_payment_settled` no-ops if already settled) since Midtrans retries webhook delivery on failure.
- `record_booking_payment_settled` must **not** be directly callable by `anon`/`authenticated` — only by the webhook (via service role) or by `admin_mark_payment_settled` (which has its own admin check). This is the actual authorization boundary; the webhook's signature check alone is not enough if the RPC is left openly callable.
- Room selection is **room type** (quad/triple/double occupancy), not package **tier** (hemat/nyaman/five-star/pelataran) — a package has exactly one active tier (`available_tiers` is a single-element array, enforced in `PackageForm.tsx`'s zod schema), and that tier determines *which* price column (`package_price`, `hemat_package_price`, `five_star_package_price`, `pelataran_package_price`) to read `quad`/`triple`/`double` from. Don't conflate the two axes.

---

## File Structure

**New Supabase migrations** (`supabase/migrations/`):
- `20260824090000_flat_agent_commission.sql`
- `20260824090100_booking_tables.sql`
- `20260824090200_agent_sales_booking_source.sql`
- `20260824090300_booking_rpcs.sql`

**New Cloudflare Functions:**
- `functions/_lib/midtrans.ts` — VA creation + signature verification helpers
- `functions/create-payment.ts` — creates a Midtrans VA for a pending `booking_payments` row
- `functions/midtrans-webhook.ts` — receives and verifies Midtrans notifications

**Modified:**
- `functions/_lib/env.ts` — add `MIDTRANS_SERVER_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `src/integrations/supabase/types.ts` — regenerated after each migration task
- `src/pages/admin/PackageForm.tsx` — add `dp_amount`, `agent_commission_amount` fields
- `src/pages/admin/AgentManagement.tsx` — swap the log-sale dialog's percentage input for the package's flat commission
- `src/pages/PackageDetail.tsx` — capture `?ref=`, add "Booking Sekarang" CTA
- `src/App.tsx` — new routes

**New frontend files:**
- `src/hooks/useJamaahAuth.tsx` — jamaah auth context (mirrors `useAgentAuth.tsx`, no approval workflow)
- `src/hooks/useReferralCapture.tsx` — reads `?ref=`, sets the first-touch cookie
- `src/pages/JamaahAuth.tsx` — jamaah login/register page
- `src/pages/BookingCreate.tsx` — room/traveler selection → creates the booking
- `src/pages/BookingPayment.tsx` — VA payment instructions for one `booking_payments` row
- `src/pages/JamaahDashboard.tsx` — jamaah's bookings, payment history, "Bayar Sekarang"
- `src/pages/admin/BookingManagement.tsx` — admin bookings list, detail, manual override

---

### Task 1: Flat commission migration + `log_agent_sale` update

**Files:**
- Create: `supabase/migrations/20260824090000_flat_agent_commission.sql`
- Modify: `src/integrations/supabase/types.ts` (regenerate)
- Modify: `src/pages/admin/AgentManagement.tsx:84-90,101-112,221-239,742-745,762-765` (flat commission)
- Modify: `src/pages/admin/PackageForm.tsx:104-124,448-449,596-597,832-833,1200-1213` (new fields)

**Interfaces:**
- Produces: `packages.dp_amount NUMERIC`, `packages.agent_commission_amount NUMERIC`; `log_agent_sale(_agent_id, _customer_name, _customer_phone, _package_id, _package_name, _sale_amount, _commission_amount, _departure_date, _status, _notes) RETURNS UUID` (new signature — `_commission_rate` replaced by `_commission_amount`, no default).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260824090000_flat_agent_commission.sql

-- Full migration to flat per-package commission (was percentage-based).
-- packages.commission_rate existed but had no admin UI to edit it - every
-- sale used the log_agent_sale dialog's free-text rate, defaulting to 4.5%.
-- Going forward, commission is a flat Rupiah amount set per package.
ALTER TABLE public.packages ADD COLUMN dp_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN agent_commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.packages DROP COLUMN commission_rate;

-- agent_sales.commission_rate is now meaningless for new rows (nothing is
-- rate-based anymore) but historical rows keep their real value - just stop
-- requiring/defaulting it rather than losing history.
ALTER TABLE public.agent_sales ALTER COLUMN commission_rate DROP NOT NULL;
ALTER TABLE public.agent_sales ALTER COLUMN commission_rate DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.log_agent_sale(
  _agent_id UUID,
  _customer_name TEXT,
  _customer_phone TEXT,
  _package_id UUID,
  _package_name TEXT,
  _sale_amount NUMERIC,
  _commission_amount NUMERIC,
  _departure_date DATE DEFAULT NULL,
  _status TEXT DEFAULT 'confirmed',
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id UUID;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'agent_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to log agent sales';
  END IF;

  IF _sale_amount IS NULL OR _sale_amount <= 0 THEN
    RAISE EXCEPTION 'sale_amount must be positive';
  END IF;

  IF _commission_amount IS NULL OR _commission_amount < 0 THEN
    RAISE EXCEPTION 'commission_amount must not be negative';
  END IF;

  INSERT INTO public.agent_sales (
    agent_id, customer_name, customer_phone, package_id, package_name,
    sale_amount, commission_amount, status, departure_date, notes
  ) VALUES (
    _agent_id, _customer_name, _customer_phone, _package_id, _package_name,
    _sale_amount, _commission_amount, _status, _departure_date, _notes
  ) RETURNING id INTO _new_id;

  IF _status = 'confirmed' THEN
    UPDATE public.agents
    SET total_sales = total_sales + 1,
        total_commission = total_commission + _commission_amount,
        available_balance = available_balance + _commission_amount
    WHERE id = _agent_id;
  END IF;

  RETURN _new_id;
END;
$$;
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db push
```

Confirm via the Supabase SQL editor or `psql`: `select dp_amount, agent_commission_amount from packages limit 1;` returns `0, 0` for existing rows, and `select column_name from information_schema.columns where table_name = 'packages' and column_name = 'commission_rate';` returns no rows.

- [ ] **Step 3: Regenerate types**

```bash
npx supabase gen types typescript --project-id lcpjuaxiwbdzdozitwzi > src/integrations/supabase/types.ts
```

- [ ] **Step 4: Update `PackageForm.tsx` — add the two new fields**

In the zod schema (after line 123, `slots_total: z.number().min(1, "Wajib diisi"),`):

```typescript
  dp_amount: z.number().min(0, "Wajib diisi"),
  agent_commission_amount: z.number().min(0, "Wajib diisi"),
```

In `defaultValues` (after line 449, `slots_total: 40,`):

```typescript
      dp_amount: 5000000,
      agent_commission_amount: 500000,
```

In the edit-load mapping (after line 597, `slots_total: data.slots_total || 40,`):

```typescript
          dp_amount: data.dp_amount || 0,
          agent_commission_amount: data.agent_commission_amount || 0,
```

In the submit payload (after line 833, `slots_total: values.slots_total || null,`):

```typescript
        dp_amount: values.dp_amount || 0,
        agent_commission_amount: values.agent_commission_amount || 0,
```

In the JSX, right after the `max_discount` `FormField` (after line 1213, `)} />` closing it):

```tsx
                <FormField control={form.control} name="dp_amount" render={({ field }) => (
                  <FormItem className="md:col-span-3"><FormLabel>DP Wajib (Rp) <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input
                      type="text"
                      value={field.value ? `Rp ${new Intl.NumberFormat('id-ID').format(field.value)}` : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(raw ? parseInt(raw, 10) : 0);
                      }}
                      placeholder="Rp 5.000.000"
                    />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="agent_commission_amount" render={({ field }) => (
                  <FormItem className="md:col-span-3"><FormLabel>Komisi Agent (Rp) <span className="text-destructive">*</span></FormLabel><FormControl>
                    <Input
                      type="text"
                      value={field.value ? `Rp ${new Intl.NumberFormat('id-ID').format(field.value)}` : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(raw ? parseInt(raw, 10) : 0);
                      }}
                      placeholder="Rp 500.000"
                    />
                  </FormControl><FormMessage /></FormItem>
                )} />
```

- [ ] **Step 5: Update `AgentManagement.tsx` — flat commission in the log-sale dialog**

Replace state at line 86 (`const [saleCommissionRate, setSaleCommissionRate] = useState("4.5");`) with:

```typescript
  const [saleCommissionAmount, setSaleCommissionAmount] = useState("");
```

Replace the `publishedPackages` query select at line 106 (`.select('id, package_name, departure_date')`) with:

```typescript
        .select('id, package_name, departure_date, agent_commission_amount')
```

In `logSaleMutation` (lines 221-229), auto-fill commission from the selected package and pass it as `_commission_amount`:

```typescript
      const pkg = publishedPackages.find((p) => p.id === salePackageId);
      const { error } = await supabase.rpc('log_agent_sale', {
        _agent_id: logSaleAgent.id,
        _customer_name: saleCustomerName.trim(),
        _customer_phone: saleCustomerPhone.trim(),
        _package_id: salePackageId || null,
        _package_name: pkg?.package_name || "",
        _sale_amount: parseFloat(saleAmount),
        _commission_amount: parseFloat(saleCommissionAmount) || pkg?.agent_commission_amount || 0,
        _departure_date: pkg?.departure_date || null,
        _status: saleStatus,
        _notes: saleNotes.trim() || null,
      });
```

Replace the "Komisi (%)" input block (lines 742-745) with a flat-Rupiah input pre-filled from the package:

```tsx
              <div className="space-y-1.5">
                <Label>Komisi (Rp)</Label>
                <Input
                  type="number"
                  value={saleCommissionAmount}
                  onChange={(e) => setSaleCommissionAmount(e.target.value)}
                  placeholder={String(publishedPackages.find((p) => p.id === salePackageId)?.agent_commission_amount ?? "500000")}
                />
              </div>
```

Replace the estimate line (lines 762-765):

```tsx
            {saleAmount && (
              <p className="text-xs text-muted-foreground">
                Estimasi komisi: {formatCurrency(parseFloat(saleCommissionAmount) || publishedPackages.find((p) => p.id === salePackageId)?.agent_commission_amount || 0)}
              </p>
            )}
```

Also update `resetSaleForm` (around line 90) to reset `saleCommissionAmount` instead of `saleCommissionRate`.

- [ ] **Step 6: Typecheck and build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260824090000_flat_agent_commission.sql src/integrations/supabase/types.ts src/pages/admin/PackageForm.tsx src/pages/admin/AgentManagement.tsx
git commit -m "feat: migrate agent commission from percentage to flat per-package amount"
```

---

### Task 2: Booking core tables

**Files:**
- Create: `supabase/migrations/20260824090100_booking_tables.sql`
- Modify: `src/integrations/supabase/types.ts` (regenerate)

**Interfaces:**
- Consumes: `packages(id, dp_amount, slots_total, slots_filled)` from Task 1/existing schema.
- Produces: `bookings`, `booking_travelers` (with `phone`), `booking_payments` tables, all RLS-enabled, for RPCs in Task 4 to write to.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260824090100_booking_tables.sql

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id),
  jamaah_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','active','completed','expired','cancelled')),
  room_type TEXT NOT NULL CHECK (room_type IN ('quad','triple','double')),
  traveler_count INTEGER NOT NULL CHECK (traveler_count > 0),
  price_per_person NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  dp_required NUMERIC(12,2) NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  hold_expires_at TIMESTAMPTZ,
  commission_credited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  passport_number TEXT,
  date_of_birth DATE,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  admin_fee NUMERIC(12,2) NOT NULL DEFAULT 4000,
  total_charged NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','expired','failed')),
  midtrans_order_id TEXT NOT NULL UNIQUE,
  midtrans_transaction_id TEXT,
  va_number TEXT,
  bank TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

-- No direct INSERT policies: all writes to these three tables happen
-- through SECURITY DEFINER RPCs (Task 4), never raw client inserts.

CREATE POLICY "Jamaah can view their own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = jamaah_id);

CREATE POLICY "Agents can view bookings attributed to them"
ON public.bookings FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all bookings"
ON public.bookings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Jamaah can view travelers on their own bookings"
ON public.booking_travelers FOR SELECT
USING (booking_id IN (SELECT id FROM public.bookings WHERE jamaah_id = auth.uid()));

CREATE POLICY "Jamaah can update travelers on their own bookings"
ON public.booking_travelers FOR UPDATE
USING (booking_id IN (SELECT id FROM public.bookings WHERE jamaah_id = auth.uid()));

CREATE POLICY "Admins can view all travelers"
ON public.booking_travelers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all travelers"
ON public.booking_travelers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Jamaah can view payments on their own bookings"
ON public.booking_payments FOR SELECT
USING (booking_id IN (SELECT id FROM public.bookings WHERE jamaah_id = auth.uid()));

CREATE POLICY "Admins can view all payments"
ON public.booking_payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all payments"
ON public.booking_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_bookings_jamaah_id ON public.bookings(jamaah_id);
CREATE INDEX idx_bookings_package_id ON public.bookings(package_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_agent_id ON public.bookings(agent_id);
CREATE INDEX idx_booking_travelers_booking_id ON public.booking_travelers(booking_id);
CREATE INDEX idx_booking_payments_booking_id ON public.booking_payments(booking_id);
CREATE INDEX idx_booking_payments_order_id ON public.booking_payments(midtrans_order_id);
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db push
```

Confirm: `select * from bookings limit 0;` and equivalent for the other two tables succeed with no errors (columns exist as defined).

- [ ] **Step 3: Regenerate types**

```bash
npx supabase gen types typescript --project-id lcpjuaxiwbdzdozitwzi > src/integrations/supabase/types.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260824090100_booking_tables.sql src/integrations/supabase/types.ts
git commit -m "feat: add bookings, booking_travelers, booking_payments tables"
```

---

### Task 3: `agent_sales` gets `booking_id` + `source`

**Files:**
- Create: `supabase/migrations/20260824090200_agent_sales_booking_source.sql`
- Modify: `src/integrations/supabase/types.ts` (regenerate)

**Interfaces:**
- Consumes: `bookings(id)` from Task 2.
- Produces: `agent_sales.booking_id`, `agent_sales.source`, used by Task 4's `record_booking_payment_settled`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260824090200_agent_sales_booking_source.sql

ALTER TABLE public.agent_sales ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.agent_sales ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','booking'));

CREATE INDEX idx_agent_sales_booking_id ON public.agent_sales(booking_id);
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db push
```

Confirm: `select source from agent_sales limit 1;` returns `'manual'` for any existing row.

- [ ] **Step 3: Regenerate types**

```bash
npx supabase gen types typescript --project-id lcpjuaxiwbdzdozitwzi > src/integrations/supabase/types.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260824090200_agent_sales_booking_source.sql src/integrations/supabase/types.ts
git commit -m "feat: add booking_id and source to agent_sales for the automated commission path"
```

---

### Task 4: Booking RPCs

**Files:**
- Create: `supabase/migrations/20260824090300_booking_rpcs.sql`

**Interfaces:**
- Consumes: `packages(available_tiers, package_price, hemat_package_price, five_star_package_price, pelataran_package_price, dp_amount, agent_commission_amount, slots_total, slots_filled)`, `agents(id, referral_code, status)`, `bookings`/`booking_travelers`/`booking_payments` from Task 2, `agent_sales` from Task 3.
- Produces (called via `supabase.rpc(...)` from the frontend in later tasks, and from Cloudflare Functions in Task 6/7):
  - `create_booking(_package_id uuid, _room_type text, _traveler_count int, _primary_contact_name text, _primary_contact_phone text, _referral_code text default null) returns uuid`
  - `create_booking_payment(_booking_id uuid, _amount numeric) returns table(order_id text, total_charged numeric)`
  - `record_payment_va_details(_order_id text, _midtrans_transaction_id text, _va_number text, _bank text) returns void`
  - `record_booking_payment_settled(_order_id text) returns void` — **not** grantable to `anon`/`authenticated`
  - `admin_mark_payment_settled(_order_id text, _admin_notes text default null) returns void`
  - `release_expired_booking_holds() returns void`, scheduled via `pg_cron` every 15 minutes

- [ ] **Step 1: Enable `pg_cron` (manual prerequisite)**

In the Supabase dashboard: Database → Extensions → enable `pg_cron`, if not already enabled. `CREATE EXTENSION` in the migration below requires this to be allowed on the project; on some plans it must be toggled from the dashboard first rather than granted via a plain migration.

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/20260824090300_booking_rpcs.sql

CREATE OR REPLACE FUNCTION public.create_booking(
  _package_id UUID,
  _room_type TEXT,
  _traveler_count INTEGER,
  _primary_contact_name TEXT,
  _primary_contact_phone TEXT,
  _referral_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pkg RECORD;
  _price NUMERIC;
  _total NUMERIC;
  _agent_id UUID;
  _booking_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be logged in to book';
  END IF;

  IF _room_type NOT IN ('quad', 'triple', 'double') THEN
    RAISE EXCEPTION 'Invalid room_type';
  END IF;

  IF _traveler_count IS NULL OR _traveler_count <= 0 THEN
    RAISE EXCEPTION 'traveler_count must be positive';
  END IF;

  IF (_room_type = 'quad' AND _traveler_count > 4)
     OR (_room_type = 'triple' AND _traveler_count > 3)
     OR (_room_type = 'double' AND _traveler_count > 2) THEN
    RAISE EXCEPTION 'traveler_count exceeds room_type capacity';
  END IF;

  -- Lock the package row so two concurrent bookings can't both pass the slot check
  SELECT * INTO _pkg FROM public.packages WHERE id = _package_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  IF _pkg.slots_filled + _traveler_count > _pkg.slots_total THEN
    RAISE EXCEPTION 'Not enough slots available';
  END IF;

  -- A package has exactly one active tier (available_tiers is a single-element
  -- array); that tier picks which price column's quad/triple/double to read.
  _price := CASE
    WHEN _pkg.available_tiers[1] = 'hemat' THEN
      (_pkg.hemat_package_price ->> _room_type)::NUMERIC
    WHEN _pkg.available_tiers[1] = 'five-star' THEN
      (_pkg.five_star_package_price ->> _room_type)::NUMERIC
    WHEN _pkg.available_tiers[1] LIKE 'pelataran%' THEN
      (_pkg.pelataran_package_price ->> _room_type)::NUMERIC
    ELSE
      (_pkg.package_price ->> _room_type)::NUMERIC
  END;

  IF _price IS NULL OR _price <= 0 THEN
    RAISE EXCEPTION 'No price configured for this room type';
  END IF;

  _total := _price * _traveler_count;

  IF _referral_code IS NOT NULL THEN
    SELECT id INTO _agent_id FROM public.agents
    WHERE referral_code = upper(trim(_referral_code)) AND status = 'active';
  END IF;

  INSERT INTO public.bookings (
    package_id, jamaah_id, status, room_type, traveler_count,
    price_per_person, total_price, dp_required, agent_id, hold_expires_at
  ) VALUES (
    _package_id, auth.uid(), 'held', _room_type, _traveler_count,
    _price, _total, _pkg.dp_amount, _agent_id, now() + interval '24 hours'
  ) RETURNING id INTO _booking_id;

  INSERT INTO public.booking_travelers (booking_id, full_name, phone, is_primary_contact)
  VALUES (_booking_id, _primary_contact_name, _primary_contact_phone, true);

  UPDATE public.packages SET slots_filled = slots_filled + _traveler_count WHERE id = _package_id;

  RETURN _booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_payment(
  _booking_id UUID,
  _amount NUMERIC
)
RETURNS TABLE(order_id TEXT, total_charged NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking RECORD;
  _remaining NUMERIC;
  _order_id TEXT;
  _fee NUMERIC := 4000;
BEGIN
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id AND jamaah_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF _booking.status NOT IN ('held', 'active') THEN
    RAISE EXCEPTION 'Booking is not open for payment';
  END IF;

  _remaining := _booking.total_price - _booking.amount_paid;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  IF _amount > _remaining THEN
    RAISE EXCEPTION 'amount exceeds remaining balance';
  END IF;

  IF _booking.status = 'held' AND _amount < _booking.dp_required THEN
    RAISE EXCEPTION 'First payment must be at least the required DP';
  END IF;

  IF _booking.status = 'active' AND _amount < 500000 AND _amount < _remaining THEN
    RAISE EXCEPTION 'Minimum payment is Rp 500.000 unless paying off the remaining balance';
  END IF;

  _order_id := 'MUSBK-' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.booking_payments (booking_id, amount, admin_fee, total_charged, midtrans_order_id)
  VALUES (_booking_id, _amount, _fee, _amount + _fee, _order_id);

  RETURN QUERY SELECT _order_id, _amount + _fee;
END;
$$;

-- Called by create-payment.ts after Midtrans returns VA details. No auth.uid()
-- check: midtrans_order_id is an unguessable random token, and this only
-- writes display metadata (VA number/bank), never money-moving state.
CREATE OR REPLACE FUNCTION public.record_payment_va_details(
  _order_id TEXT,
  _midtrans_transaction_id TEXT,
  _va_number TEXT,
  _bank TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.booking_payments
  SET midtrans_transaction_id = _midtrans_transaction_id,
      va_number = _va_number,
      bank = _bank
  WHERE midtrans_order_id = _order_id;
$$;

CREATE OR REPLACE FUNCTION public.record_booking_payment_settled(_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment RECORD;
  _booking RECORD;
  _new_amount_paid NUMERIC;
  _commission NUMERIC;
  _contact_name TEXT;
  _contact_phone TEXT;
  _package_name TEXT;
BEGIN
  SELECT * INTO _payment FROM public.booking_payments WHERE midtrans_order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found for order_id %', _order_id;
  END IF;

  IF _payment.status = 'settled' THEN
    RETURN; -- idempotent no-op, already processed (Midtrans retries notifications)
  END IF;

  UPDATE public.booking_payments SET status = 'settled', paid_at = now() WHERE id = _payment.id;

  SELECT * INTO _booking FROM public.bookings WHERE id = _payment.booking_id FOR UPDATE;
  _new_amount_paid := _booking.amount_paid + _payment.amount;

  UPDATE public.bookings
  SET amount_paid = _new_amount_paid,
      status = CASE
        WHEN _new_amount_paid >= total_price THEN 'completed'
        WHEN status = 'held' THEN 'active'
        ELSE status
      END,
      hold_expires_at = CASE WHEN status = 'held' THEN NULL ELSE hold_expires_at END,
      updated_at = now()
  WHERE id = _booking.id;

  IF _new_amount_paid >= _booking.total_price AND NOT _booking.commission_credited AND _booking.agent_id IS NOT NULL THEN
    SELECT agent_commission_amount, package_name INTO _commission, _package_name
    FROM public.packages WHERE id = _booking.package_id;

    SELECT full_name, phone INTO _contact_name, _contact_phone
    FROM public.booking_travelers WHERE booking_id = _booking.id AND is_primary_contact = true LIMIT 1;

    INSERT INTO public.agent_sales (
      agent_id, customer_name, customer_phone, package_id, package_name,
      sale_amount, commission_amount, status, booking_id, source
    ) VALUES (
      _booking.agent_id, COALESCE(_contact_name, ''), COALESCE(_contact_phone, ''),
      _booking.package_id, COALESCE(_package_name, ''),
      _booking.total_price, COALESCE(_commission, 0), 'confirmed', _booking.id, 'booking'
    );

    UPDATE public.agents
    SET total_sales = total_sales + 1,
        total_commission = total_commission + COALESCE(_commission, 0),
        available_balance = available_balance + COALESCE(_commission, 0)
    WHERE id = _booking.agent_id;

    UPDATE public.bookings SET commission_credited = true WHERE id = _booking.id;
  END IF;
END;
$$;

-- Not directly callable by clients: only the webhook (service role) or
-- admin_mark_payment_settled (its own admin check) may invoke this.
REVOKE EXECUTE ON FUNCTION public.record_booking_payment_settled(TEXT) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_payment_settled(_order_id TEXT, _admin_notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM public.record_booking_payment_settled(_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_booking_holds()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _b RECORD;
BEGIN
  FOR _b IN
    SELECT id, package_id, traveler_count FROM public.bookings
    WHERE status = 'held' AND hold_expires_at < now()
    FOR UPDATE
  LOOP
    UPDATE public.bookings SET status = 'expired', hold_expires_at = NULL, updated_at = now() WHERE id = _b.id;
    UPDATE public.packages SET slots_filled = GREATEST(0, slots_filled - _b.traveler_count) WHERE id = _b.package_id;
  END LOOP;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'release-expired-booking-holds',
  '*/15 * * * *',
  $$SELECT public.release_expired_booking_holds();$$
);
```

- [ ] **Step 3: Apply and verify**

```bash
npx supabase db push
```

Verify with a throwaway manual check in the SQL editor (replace with a real `package_id` from your `packages` table that has `available_tiers`, prices, and `slots_total > slots_filled`):

```sql
select public.create_booking(
  '<a real package id>'::uuid, 'quad', 2, 'Test Contact', '081234567890', null
);
-- then, as the same auth session:
select * from public.bookings order by created_at desc limit 1;
```//confirm status='held', hold_expires_at ~24h out, total_price = price*2.

Also confirm the revoke took effect: `select has_function_privilege('anon', 'record_booking_payment_settled(text)', 'execute');` returns `false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260824090300_booking_rpcs.sql
git commit -m "feat: add booking RPCs (create_booking, payments, commission crediting, hold release)"
```

---

### Task 5: Midtrans env vars + shared helper

**Files:**
- Modify: `functions/_lib/env.ts`
- Create: `functions/_lib/midtrans.ts`

**Interfaces:**
- Produces: `createMidtransVA(env, orderId, grossAmount) => Promise<{transaction_id, va_number, bank}>`, `verifyMidtransSignature(orderId, statusCode, grossAmount, serverKey, signatureKey) => Promise<boolean>`, used by Task 6/7.

- [ ] **Step 1: Add Midtrans/service-role fields to `Env`**

```typescript
// functions/_lib/env.ts
import type { BrowserWorker } from "@cloudflare/puppeteer";

export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MIDTRANS_SERVER_KEY: string;
  BROWSER: BrowserWorker;
}

const FALLBACK_SUPABASE_URL = "https://lcpjuaxiwbdzdozitwzi.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

export function getSupabaseConfig(env: Env) {
  return {
    url: env.SUPABASE_URL || FALLBACK_SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
  };
}
```

`MIDTRANS_SERVER_KEY` and `SUPABASE_SERVICE_ROLE_KEY` have **no fallback** — unlike the anon key, leaking either is catastrophic (full Midtrans account access / full DB bypass). They must only ever come from Cloudflare secrets, never be hardcoded.

- [ ] **Step 2: Write the Midtrans helper**

```typescript
// functions/_lib/midtrans.ts
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
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p functions/tsconfig.json
```

Expected: fails only on the two new required `Env` fields not yet referenced anywhere real (that resolves once Task 6/7 add the Functions using them) — if it fails for any other reason, fix before proceeding.

- [ ] **Step 4: Commit**

```bash
git add functions/_lib/env.ts functions/_lib/midtrans.ts
git commit -m "feat: add Midtrans env config and VA/signature helpers"
```

---

### Task 6: `create-payment.ts` Cloudflare Function

**Files:**
- Create: `functions/create-payment.ts`

**Interfaces:**
- Consumes: `createMidtransVA` from Task 5, `create_booking_payment`/`record_payment_va_details` RPCs from Task 4.
- Produces: `POST /create-payment` — body `{order_id: string}`, header `Authorization: Bearer <jamaah JWT>` — returns `{va_number, bank, total_charged}`.

- [ ] **Step 1: Write the function**

```typescript
// functions/create-payment.ts
import { getSupabaseConfig, type Env } from "./_lib/env";
import { createMidtransVA } from "./_lib/midtrans";

interface BookingPaymentRow {
  midtrans_order_id: string;
  total_charged: number;
  va_number: string | null;
  bank: string | null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

  const va = await createMidtransVA(context.env, payment.midtrans_order_id, payment.total_charged);

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
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p functions/tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add functions/create-payment.ts
git commit -m "feat: add create-payment Cloudflare Function (Midtrans VA creation)"
```

---

### Task 7: `midtrans-webhook.ts` Cloudflare Function

**Files:**
- Create: `functions/midtrans-webhook.ts`

**Interfaces:**
- Consumes: `verifyMidtransSignature` from Task 5, `record_booking_payment_settled` RPC from Task 4 (called with the service role key, since it's revoked for `anon`/`authenticated`).
- Produces: `POST /midtrans-webhook` — Midtrans notification target URL.

- [ ] **Step 1: Write the function**

```typescript
// functions/midtrans-webhook.ts
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
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p functions/tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add functions/midtrans-webhook.ts
git commit -m "feat: add Midtrans webhook handler with signature verification"
```

---

### Task 8: Jamaah auth

**Files:**
- Create: `src/hooks/useJamaahAuth.tsx`
- Create: `src/pages/JamaahAuth.tsx`

**Interfaces:**
- Produces: `useJamaahAuth()` hook exposing `{user, session, loading, signUp, signIn, signOut}`; `<JamaahAuth />` page.

- [ ] **Step 1: Write the auth hook**

Mirror `src/hooks/useAgentAuth.tsx`'s Supabase Auth wiring (`onAuthStateChange` + `getSession`), but drop everything agent-specific: no `agents` table profile fetch, no approval-status gate, no referral-code generation. A jamaah is simply an authenticated `auth.users` row — `bookings.jamaah_id` references it directly (Task 2), no separate profile table.

```typescript
// src/hooks/useJamaahAuth.tsx
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface JamaahAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const JamaahAuthContext = createContext<JamaahAuthContextType | undefined>(undefined);

export const useJamaahAuth = () => {
  const context = useContext(JamaahAuthContext);
  if (!context) {
    throw new Error("useJamaahAuth must be used within a JamaahAuthProvider");
  }
  return context;
};

export const JamaahAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <JamaahAuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </JamaahAuthContext.Provider>
  );
};
```

- [ ] **Step 2: Write the auth page**

```tsx
// src/pages/JamaahAuth.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJamaahAuth } from "@/hooks/useJamaahAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const JamaahAuth = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useJamaahAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const result =
      mode === "login" ? await signIn(email, password) : await signUp(email, password, fullName);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || "Terjadi kesalahan");
      return;
    }

    if (mode === "register") {
      toast.success("Akun berhasil dibuat, silakan cek email untuk verifikasi");
      setMode("login");
      return;
    }

    navigate("/jamaah/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">
          {mode === "login" ? "Masuk" : "Daftar"} Akun Jamaah
        </h1>
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label>Nama Lengkap</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline block mx-auto"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
};

export default JamaahAuth;
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no errors (this task is not yet wired into `App.tsx` — that's Task 16 — so nothing calls it yet, but it must compile standalone).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useJamaahAuth.tsx src/pages/JamaahAuth.tsx
git commit -m "feat: add jamaah auth (no approval workflow, unlike agent auth)"
```

---

### Task 9: Referral capture + booking CTA on `PackageDetail.tsx`

**Files:**
- Create: `src/hooks/useReferralCapture.tsx`
- Modify: `src/pages/PackageDetail.tsx`

**Interfaces:**
- Produces: `useReferralCapture()` — call on mount, sets the `musafar_ref` cookie from `?ref=` if not already set; `getReferralCookie(): string | null` — reads it back, used by `BookingCreate.tsx` in Task 10.

- [ ] **Step 1: Write the capture hook**

```typescript
// src/hooks/useReferralCapture.tsx
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const COOKIE_NAME = "musafar_ref";
const COOKIE_DAYS = 30;

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

/** First-touch referral attribution: only sets the cookie if one doesn't
 * already exist, so a later agent's link never overwrites an earlier one. */
export function useReferralCapture() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && !getCookie(COOKIE_NAME)) {
      setCookie(COOKIE_NAME, ref, COOKIE_DAYS);
    }
  }, [searchParams]);
}

export function getReferralCookie(): string | null {
  return getCookie(COOKIE_NAME);
}
```

- [ ] **Step 2: Wire it into `PackageDetail.tsx` and add the CTA**

Read the file first to find the exact import block and the CTA area:

```bash
grep -n "^import\|PackageCtaButtons" src/pages/PackageDetail.tsx
```

Add the hook call near the top of the component body (alongside other hooks), and render a "Booking Sekarang" button that links to `/booking/baru/{id}`, next to wherever `PackageCtaButtons` (the WhatsApp CTA) is currently rendered — both stay visible side by side:

```tsx
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { Link } from "react-router-dom";
// ... inside the component:
useReferralCapture();
// ... in the JSX, alongside the existing WhatsApp CTA:
<Button asChild size="lg" className="w-full">
  <Link to={`/booking/baru/${pkg.id}`}>Booking Sekarang</Link>
</Button>
```

Adjust the exact placement/props to match the surrounding layout once the file is open — the point is: the hook runs unconditionally on mount, and the new button sits next to the existing WhatsApp CTA, not replacing it.

- [ ] **Step 3: Typecheck and build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useReferralCapture.tsx src/pages/PackageDetail.tsx
git commit -m "feat: capture first-touch referral code, add Booking Sekarang CTA"
```

---

### Task 10: `BookingCreate.tsx`

**Files:**
- Create: `src/pages/BookingCreate.tsx`

**Interfaces:**
- Consumes: `create_booking` RPC (Task 4), `getReferralCookie()` (Task 9), `useJamaahAuth()` (Task 8).
- Produces: booking creation flow at route `/booking/baru/:packageId` (wired in Task 16); on success, navigates to `/booking/:bookingId/bayar`.

- [ ] **Step 1: Write the page**

```tsx
// src/pages/BookingCreate.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useJamaahAuth } from "@/hooks/useJamaahAuth";
import { getReferralCookie } from "@/hooks/useReferralCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROOM_CAPACITY: Record<string, number> = { quad: 4, triple: 3, double: 2 };

const BookingCreate = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useJamaahAuth();

  const [roomType, setRoomType] = useState("quad");
  const [travelerCount, setTravelerCount] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: pkg } = useQuery({
    queryKey: ["booking-package", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, package_name, dp_amount")
        .eq("id", packageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });

  if (!authLoading && !user) {
    navigate(`/jamaah/auth?redirect=/booking/baru/${packageId}`);
    return null;
  }

  const handleSubmit = async () => {
    if (!packageId) return;
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Nama dan no. HP wajib diisi");
      return;
    }

    setSubmitting(true);
    const { data: bookingId, error } = await supabase.rpc("create_booking", {
      _package_id: packageId,
      _room_type: roomType,
      _traveler_count: travelerCount,
      _primary_contact_name: contactName.trim(),
      _primary_contact_phone: contactPhone.trim(),
      _referral_code: getReferralCookie(),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    navigate(`/booking/${bookingId}/bayar`);
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Booking {pkg?.package_name}</h1>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipe Kamar</Label>
          <Select value={roomType} onValueChange={(v) => { setRoomType(v); setTravelerCount(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quad">Quad (maks. 4 orang)</SelectItem>
              <SelectItem value="triple">Triple (maks. 3 orang)</SelectItem>
              <SelectItem value="double">Double (maks. 2 orang)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Jumlah Jamaah</Label>
          <Input
            type="number"
            min={1}
            max={ROOM_CAPACITY[roomType]}
            value={travelerCount}
            onChange={(e) => setTravelerCount(Math.min(ROOM_CAPACITY[roomType], Math.max(1, parseInt(e.target.value, 10) || 1)))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nama Kontak Utama</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>No. WhatsApp</Label>
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="08..." />
        </div>
        {pkg && (
          <p className="text-sm text-muted-foreground">
            DP wajib: Rp {new Intl.NumberFormat("id-ID").format(pkg.dp_amount)}
          </p>
        )}
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Memproses..." : "Lanjut ke Pembayaran"}
        </Button>
      </div>
    </div>
  );
};

export default BookingCreate;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/BookingCreate.tsx
git commit -m "feat: add booking creation page (room/traveler selection)"
```

---

### Task 11: `BookingPayment.tsx`

**Files:**
- Create: `src/pages/BookingPayment.tsx`

**Interfaces:**
- Consumes: `create_booking_payment` RPC (Task 4), `/create-payment` Function (Task 6).
- Produces: payment-instructions page at `/booking/:bookingId/bayar` (wired in Task 16).

- [ ] **Step 1: Write the page**

```tsx
// src/pages/BookingPayment.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VaDetails {
  va_number: string;
  bank: string;
  total_charged: number;
}

const BookingPayment = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [amount, setAmount] = useState<number | null>(null);
  const [va, setVa] = useState<VaDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("dp_required, status")
        .eq("id", bookingId)
        .single();
      if (!error && data) {
        setAmount(data.status === "held" ? data.dp_required : null);
      }
    };
    loadBooking();
  }, [bookingId]);

  const handleCreatePayment = async () => {
    if (!bookingId || amount === null) return;
    setLoading(true);

    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_booking_payment", {
      _booking_id: bookingId,
      _amount: amount,
    });
    if (rpcError || !rpcResult?.[0]) {
      toast.error(rpcError?.message || "Gagal membuat pembayaran");
      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/create-payment", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_id: rpcResult[0].order_id }),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error("Gagal membuat Virtual Account");
      return;
    }

    const data = (await res.json()) as VaDetails;
    setVa(data);
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Pembayaran</h1>
      {va ? (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Transfer ke Virtual Account {va.bank.toUpperCase()}</p>
          <p className="text-2xl font-bold tracking-wide">{va.va_number}</p>
          <p className="text-sm">
            Total: Rp {new Intl.NumberFormat("id-ID").format(va.total_charged)} (termasuk biaya admin Rp 4.000)
          </p>
        </div>
      ) : (
        <Button onClick={handleCreatePayment} disabled={loading || amount === null}>
          {loading ? "Memproses..." : "Buat Virtual Account"}
        </Button>
      )}
    </div>
  );
};

export default BookingPayment;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/BookingPayment.tsx
git commit -m "feat: add booking payment page (VA instructions)"
```

---

### Task 12: `JamaahDashboard.tsx`

**Files:**
- Create: `src/pages/JamaahDashboard.tsx`

**Interfaces:**
- Consumes: `bookings`/`booking_payments` tables (Task 2), `useJamaahAuth()` (Task 8).
- Produces: dashboard at `/jamaah/dashboard` (wired in Task 16), links into `BookingPayment.tsx` for further payments.

- [ ] **Step 1: Write the page**

```tsx
// src/pages/JamaahDashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useJamaahAuth } from "@/hooks/useJamaahAuth";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  held: "Menunggu DP",
  active: "Aktif (belum lunas)",
  completed: "Lunas",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

const JamaahDashboard = () => {
  const { user } = useJamaahAuth();

  const { data: bookings = [] } = useQuery({
    queryKey: ["jamaah-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, total_price, amount_paid, room_type, traveler_count, packages(package_name, departure_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="container mx-auto px-6 py-12 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Booking Saya</h1>
      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border p-4 space-y-2">
            <p className="font-semibold">{(b.packages as any)?.package_name}</p>
            <p className="text-sm text-muted-foreground">
              {b.room_type} · {b.traveler_count} orang · {STATUS_LABEL[b.status] ?? b.status}
            </p>
            <p className="text-sm">
              Terbayar: Rp {new Intl.NumberFormat("id-ID").format(b.amount_paid)} / Rp{" "}
              {new Intl.NumberFormat("id-ID").format(b.total_price)}
            </p>
            {(b.status === "held" || b.status === "active") && (
              <Button asChild size="sm">
                <Link to={`/booking/${b.id}/bayar`}>Bayar Sekarang</Link>
              </Button>
            )}
          </div>
        ))}
        {bookings.length === 0 && <p className="text-muted-foreground">Belum ada booking.</p>}
      </div>
    </div>
  );
};

export default JamaahDashboard;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/JamaahDashboard.tsx
git commit -m "feat: add jamaah dashboard (bookings, payment progress)"
```

---

### Task 13: Admin `BookingManagement.tsx`

**Files:**
- Create: `src/pages/admin/BookingManagement.tsx`

**Interfaces:**
- Consumes: `bookings`/`booking_travelers`/`booking_payments` tables (Task 2), `admin_mark_payment_settled` RPC (Task 4).
- Produces: admin page at `/admin/bookings` (wired in Task 16).

- [ ] **Step 1: Write the page**

```tsx
// src/pages/admin/BookingManagement.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  held: "Menunggu DP",
  active: "Aktif",
  completed: "Lunas",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

const BookingManagement = () => {
  const queryClient = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, total_price, amount_paid, created_at, packages(package_name), agents(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-booking-payments", detailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("id, amount, status, midtrans_order_id, created_at, paid_at")
        .eq("booking_id", detailId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!detailId,
  });

  const handleMarkPaid = async (orderId: string) => {
    const notes = window.prompt("Alasan override manual (misal: webhook gagal masuk):");
    if (notes === null) return;

    const { error } = await supabase.rpc("admin_mark_payment_settled", {
      _order_id: orderId,
      _admin_notes: notes,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pembayaran ditandai lunas");
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-booking-payments", detailId] });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kelola Booking</h1>
      <div className="space-y-2">
        {bookings.map((b) => (
          <button
            key={b.id}
            onClick={() => setDetailId(b.id)}
            className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex justify-between">
              <span className="font-semibold">{(b.packages as any)?.package_name}</span>
              <span className="text-sm text-muted-foreground">{STATUS_LABEL[b.status] ?? b.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Rp {new Intl.NumberFormat("id-ID").format(b.amount_paid)} / Rp{" "}
              {new Intl.NumberFormat("id-ID").format(b.total_price)}
              {(b.agents as any)?.name && ` · Agent: ${(b.agents as any).name}`}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Riwayat Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="text-sm">Rp {new Intl.NumberFormat("id-ID").format(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{p.status} · {p.midtrans_order_id}</p>
                </div>
                {p.status !== "settled" && (
                  <Button size="sm" variant="outline" onClick={() => handleMarkPaid(p.midtrans_order_id)}>
                    Tandai Lunas
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingManagement;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/BookingManagement.tsx
git commit -m "feat: add admin booking management page with manual payment override"
```

---

### Task 14: Wire routes in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `JamaahAuthProvider`/`JamaahAuth` (Task 8), `BookingCreate`/`BookingPayment` (Task 10/11), `JamaahDashboard` (Task 12), `BookingManagement` (Task 13).

- [ ] **Step 1: Add imports and routes**

Read the file first to find the exact provider-nesting and route-array structure (it already nests `AgentAuthProvider` around agent routes — mirror that for jamaah):

```bash
grep -n "AgentAuthProvider\|Route path=\"/agent\|Route path=\"/l/:code\|agents\" element" src/App.tsx
```

Add:
- `<JamaahAuthProvider>` wrapping a new route group (mirroring how `AgentAuthProvider` wraps `/agent/*`)
- `<Route path="/jamaah/auth" element={<JamaahAuth />} />`
- `<Route path="/jamaah/dashboard" element={<JamaahDashboard />} />`
- `<Route path="/booking/baru/:packageId" element={<BookingCreate />} />`
- `<Route path="/booking/:bookingId/bayar" element={<BookingPayment />} />`
- Inside the existing admin nested routes (alongside `<Route path="agents" element={<AgentManagement />} />`): `<Route path="bookings" element={<BookingManagement />} />`

- [ ] **Step 2: Typecheck and build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

```bash
npm run build && npx wrangler pages dev dist --port 8799 --compatibility-date=2026-07-29 --compatibility-flags=nodejs_compat
```

Visit `http://127.0.0.1:8799/paket-umroh/<a real slug>?ref=<a real agent referral_code>`, confirm the "Booking Sekarang" button appears and `document.cookie` contains `musafar_ref` after load (check via browser devtools). Visit `/jamaah/auth`, register a test account, confirm redirect to `/jamaah/dashboard` after login.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire jamaah/booking/admin-bookings routes"
```

---

### Task 15: Deployment checklist (not code)

**Files:** none — operational steps only.

- [ ] Set Cloudflare Pages secrets (never commit these):
  ```bash
  npx wrangler pages secret put MIDTRANS_SERVER_KEY
  npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY
  ```
- [ ] In the Midtrans dashboard, set the payment notification URL to `https://musafartour.com/midtrans-webhook`.
- [ ] Confirm `pg_cron` is enabled for the Supabase project (Task 4, Step 1) and that `select * from cron.job where jobname = 'release-expired-booking-holds';` shows the schedule after Task 4's migration is applied.
- [ ] For each existing published package, set a real `dp_amount` and `agent_commission_amount` via `PackageForm.tsx` (Task 1) — both default to `0`, which would mean no required DP and no commission until an admin sets them.
- [ ] Decide and implement (follow-up, not in this plan): refund/cancellation policy, and payment-deadline-vs-departure-date enforcement — both were explicitly deferred in the design spec.

---

## Self-Review Notes

- **Spec coverage:** every section of the spec (architecture, data model, referral attribution, booking flow, payment integration, admin views, cost) maps to at least one task above. The two explicitly-deferred items (refund policy, payment deadline) are called out in Task 15 rather than silently implemented with an invented policy.
- **Type consistency:** `create_booking`'s `_room_type` parameter and the `bookings.room_type` column both use `quad`/`triple`/`double` throughout (Task 4, Task 10); `create_booking_payment`'s returned `order_id`/`total_charged` field names match what `BookingPayment.tsx` (Task 11) destructures (`rpcResult[0].order_id`); `record_booking_payment_settled`'s revoke-from-anon/authenticated (Task 4) is matched by `midtrans-webhook.ts` (Task 7) using the service role key, and by `admin_mark_payment_settled` (Task 4) providing the authenticated-admin path used by `BookingManagement.tsx` (Task 13).
- **Corrected during planning:** the spec originally said "Cloudflare Cron Trigger" for hold expiry — this doesn't exist for Pages Functions (Workers-only feature), so the spec and this plan use `pg_cron` instead (Task 4).
