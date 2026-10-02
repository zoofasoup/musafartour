-- "Jamaah Saya" for agents: the jamaah an agent brought in, with where each one stands on payment and commission.
--
-- SECURITY DEFINER because agents have no access to the registration tables; the function itself limits the rows to
-- the caller's own agent record (auth.uid() -> agents.user_id). It returns what an agent needs to follow up and
-- nothing else: no NIK, passport, documents, family data or private links. Money is from VERIFIED payments only,
-- the same rule CS sees (pending transfers are shown separately and never count).
--
-- pay_state follows src/lib/jamaah.ts payState(): lunas when nothing is owed, dp when the DP (Rp 5 jt, or the whole
-- price if lower) is verified, otherwise belum_dp. commission_status: earned = already credited to the agent
-- (agent_sales), waiting = credited when this jamaah is lunas, none = this jamaah carries no commission
-- (cancelled, skipped at import, or the package pays none).

CREATE OR REPLACE FUNCTION public.list_my_agent_jamaah()
RETURNS TABLE (
  registration_id uuid,
  full_name text,
  phone text,
  package_name text,
  departure_date date,
  room_type text,
  status text,
  agreed_price numeric,
  paid_verified numeric,
  paid_pending numeric,
  outstanding numeric,
  due_date date,
  pay_state text,
  commission_amount numeric,
  commission_status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.full_name,
    r.phone,
    pk.package_name,
    pk.departure_date::date,
    r.room_type,
    r.status,
    b.agreed_price,
    b.paid_verified,
    b.paid_pending,
    b.outstanding,
    b.due_date,
    CASE
      WHEN r.status = 'cancelled' THEN 'batal'
      WHEN b.outstanding < 0 THEN 'lebih'
      WHEN b.outstanding = 0 AND b.agreed_price > 0 THEN 'lunas'
      WHEN b.paid_verified >= least(5000000, b.agreed_price) THEN 'dp'
      ELSE 'belum_dp'
    END,
    CASE WHEN r.commission_skipped OR r.status = 'cancelled' THEN 0 ELSE coalesce(pk.agent_commission_amount, 0) END,
    CASE
      WHEN s.status IN ('confirmed', 'paid') THEN 'earned'
      WHEN r.status = 'active' AND NOT r.commission_skipped AND coalesce(pk.agent_commission_amount, 0) > 0 THEN 'waiting'
      ELSE 'none'
    END,
    r.created_at
  FROM public.jamaah_registrations r
  JOIN public.packages pk ON pk.id = r.package_id
  JOIN public.jamaah_registration_balances b ON b.registration_id = r.id
  LEFT JOIN public.agent_sales s ON s.registration_id = r.id
  WHERE r.agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid())
  ORDER BY r.created_at DESC
  LIMIT 500
$$;

REVOKE ALL ON FUNCTION public.list_my_agent_jamaah() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_agent_jamaah() TO authenticated;
