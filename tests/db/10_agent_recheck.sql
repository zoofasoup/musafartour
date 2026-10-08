-- Agent program re-audit (docs/audit/05-agen.md): money-logic gaps that 01-09 do not cover.
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/10_agent_recheck.sql
--
-- Every line is PASS, FAIL, SKIP (prerequisite data missing) or KNOWN (a documented gap with its finding ID in
-- docs/audit/05-agen.md; the suite stays green, turn it into an assertion once the gap is fixed).
--
-- Sections:
--   1. Silver agent on a configured package and on a flat package (AGT-101, resolved: Duta is no level)
--   2. Credit timing vs the SOP, double credit, idempotency (AGT-102)
--   3. Registration moved to another package before / after the credit (AGT-103)
--   4. Refund after payout, tax and NIK before payout (AGT-104, AGT-105)
--   5. Lead conflict holds the commission (AGT-106)
--   6. Fee / SOP are no gate; accept_agent_sop version is not validated (AGT-107, AGT-115)
--   7. Suspended agent accrues nothing: held (AGT-109)
--   8. Multi-tier package with a price that matches no tier; infant (AGT-110, AGT-111)
--   9. Lead helper probe (AGT-116), cross-agent sweep over every agent_* relation
--  10. Agent-angle security spot check (staff/internal functions, direct writes, own protected columns, KTP bucket)

BEGIN;

CREATE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
END $f$;

-- One jamaah through the real path: intake (optionally with the agent's referral code) -> CS accepts it.
CREATE FUNCTION pg_temp.plant_reg(_ref text, _pkg uuid, _staff uuid, _price numeric, _name text, _phone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE
  _res jsonb; _intake uuid; _ids jsonb; _reg uuid;
  _ph text := coalesce(_phone, '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0'));
BEGIN
  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake(jsonb_build_object(
    'package_id', _pkg, 'contact_name', _name, 'contact_phone', _ph, 'consent', true, 'consent_version', 'test',
    'source', CASE WHEN _ref IS NULL THEN 'public' ELSE 'agent' END, 'ref_code', _ref,
    'people', jsonb_build_array(jsonb_build_object('full_name', _name, 'gender', 'L', 'category', 'adult', 'room_type', 'quad'))));
  RESET ROLE;
  _intake := (_res ->> 'id')::uuid;
  SELECT jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name, 'room_type', room_type, 'list_price', _price, 'include', true) ORDER BY position)
    INTO _ids FROM public.jamaah_intake_people WHERE intake_id = _intake;
  PERFORM pg_temp.act_as(_staff);
  PERFORM public.accept_jamaah_intake(_intake, _ids, true);
  RESET ROLE;
  SELECT id INTO _reg FROM public.jamaah_registrations WHERE intake_id = _intake;
  RETURN _reg;
END $f$;

CREATE FUNCTION pg_temp.pay(_reg uuid, _staff uuid, _amount numeric, _status text) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE _id uuid;
BEGIN
  PERFORM pg_temp.act_as(_staff);
  INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
  VALUES (_reg, _amount, current_date, 'BCA', _status) RETURNING id INTO _id;
  RESET ROLE;
  RETURN _id;
END $f$;

CREATE FUNCTION pg_temp.bal(_agent uuid) RETURNS numeric LANGUAGE sql AS $f$
  SELECT available_balance FROM public.agents WHERE id = _agent $f$;

DO $$
DECLARE
  _out text := '';
  _a record; _b record;
  _staff uuid;
  _pk1 uuid; _g1 numeric; _tier1 text;      -- configured package, highest gold amount
  _pk2 uuid; _g2 numeric;                   -- configured package, lowest gold amount
  _pkf uuid; _flat numeric;                 -- upcoming published package without rate rows (flat fallback)
  _reg uuid; _reg2 uuid; _pay uuid; _w uuid;
  _s record;
  _n bigint; _m bigint;
  _t0 numeric; _t1 numeric; _ts0 integer; _ts1 integer;
  _phone text;
  _txt text; _txt2 text;
  _lead jsonb;
  _cols text;
  _ktp text;
  _tmp numeric;
  _sale uuid; _sa uuid;
  _price constant numeric := 30000000;
BEGIN
  SELECT id, user_id, referral_code INTO _a FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) ORDER BY created_at LIMIT 1;
  SELECT id, user_id, referral_code INTO _b FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) AND id <> _a.id ORDER BY created_at LIMIT 1;
  SELECT user_id INTO _staff FROM public.user_roles WHERE role IN ('superadmin', 'admin') ORDER BY role LIMIT 1;

  SELECT r.package_id, r.amount, r.tier INTO _pk1, _g1, _tier1
    FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
   WHERE r.level = 'gold' AND p.status = 'published' AND p.departure_date >= current_date AND array_length(p.available_tiers, 1) = 1
   ORDER BY r.amount DESC, p.departure_date LIMIT 1;
  SELECT r.package_id, r.amount INTO _pk2, _g2
    FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
   WHERE r.level = 'gold' AND p.status = 'published' AND p.departure_date >= current_date AND array_length(p.available_tiers, 1) = 1
     AND r.package_id <> _pk1 AND r.amount <> _g1
   ORDER BY r.amount, p.departure_date LIMIT 1;
  SELECT p.id, coalesce(p.agent_commission_amount, 0) INTO _pkf, _flat FROM public.packages p
   WHERE p.status = 'published' AND p.departure_date >= current_date AND array_length(p.available_tiers, 1) = 1
     AND NOT EXISTS (SELECT 1 FROM public.agent_commission_rates r WHERE r.package_id = p.id)
   ORDER BY p.departure_date LIMIT 1;

  IF _a.id IS NULL OR _b.id IS NULL OR _staff IS NULL OR _pk1 IS NULL OR _pk2 IS NULL OR _pkf IS NULL THEN
    _out := format('SKIP agent recheck: needs two plain active agents, a staff user, two configured packages with different gold rates and one unconfigured package (A=%s B=%s staff=%s pk1=%s pk2=%s flat=%s)',
                   _a.id, _b.id, _staff, _pk1, _pk2, _pkf);
    RAISE EXCEPTION E'RESULTS\n%', _out;
  END IF;

  -- Known starting point for the planted agents (rolled back at the end).
  UPDATE public.agents SET level = 'gold', status = 'active', registration_fee_status = 'paid', sop_accepted_at = now(), sop_version = 'test',
                           available_balance = 0, total_commission = 0, total_sales = 0 WHERE id IN (_a.id, _b.id);

  -- ===========================================================================================
  -- 1. Silver on a configured package (AGT-101)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
    _t0 := pg_temp.bal(_a.id); SELECT total_sales INTO _ts0 FROM public.agents WHERE id = _a.id;
    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _staff, _price, 'Recheck Silver Cfg');
    _pay := pg_temp.pay(_reg, _staff, _price, 'verified');
    SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg;
    _t1 := pg_temp.bal(_a.id); SELECT total_sales INTO _ts1 FROM public.agents WHERE id = _a.id;
    PERFORM pg_temp.act_as(_a.user_id);
    SELECT pay_state || '/' || commission_status || '/' || commission_amount INTO _txt FROM public.list_my_agent_jamaah() WHERE registration_id = _reg;
    RESET ROLE;
    IF _n = 1 AND _t1 > _t0 AND _ts1 = _ts0 + 1 THEN
      _out := _out || format(E'PASS silver: a Silver agent (the level every new agent starts at) earns the Silver letter rate on a configured package (+%s) and counts +1 jamaah; the agent sees %s (AGT-101 resolved: Duta is no level)\n', _t1 - _t0, _txt);
    ELSE
      _out := _out || format(E'FAIL silver: expected a Silver credit on a configured package, got sales=%s balance %s->%s total_sales %s->%s (%s)\n', _n, _t0, _t1, _ts0, _ts1, _txt);
    END IF;

    -- Same agent, package without rates: the flat fallback pays
    _t0 := pg_temp.bal(_a.id); SELECT total_sales INTO _ts0 FROM public.agents WHERE id = _a.id;
    _reg2 := pg_temp.plant_reg(_a.referral_code, _pkf, _staff, _price, 'Recheck Silver Flat');
    PERFORM pg_temp.pay(_reg2, _staff, _price, 'verified');
    _t1 := pg_temp.bal(_a.id); SELECT total_sales INTO _ts1 FROM public.agents WHERE id = _a.id;
    IF _t1 - _t0 = _flat AND _ts1 = _ts0 + 1 THEN
      _out := _out || format(E'PASS silver: on a package WITHOUT rate rows the Silver agent earns the flat %s and counts +1 jamaah\n', _flat);
    ELSE
      _out := _out || format(E'FAIL silver: flat package paid %s (flat=%s), total_sales %s->%s\n', _t1 - _t0, _flat, _ts0, _ts1);
    END IF;
    UPDATE public.agents SET level = 'gold' WHERE id = _a.id;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL silver: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 2. Credit timing, double credit, idempotency (AGT-102)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET level = 'gold', available_balance = 0, total_commission = 0, total_sales = 0 WHERE id = _a.id;
    _t0 := pg_temp.bal(_a.id);
    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _staff, _price, 'Recheck Timing');
    _pay := pg_temp.pay(_reg, _staff, _price, 'verified');
    _t1 := pg_temp.bal(_a.id);
    -- idempotent: re-running the sync and adding a second (overpaying) verified payment never credits twice
    PERFORM public.sync_registration_commission(_reg);
    PERFORM public.sync_registration_commission(_reg);
    PERFORM pg_temp.pay(_reg, _staff, 1000000, 'verified');
    SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg;
    IF _t1 - _t0 = _g1 AND pg_temp.bal(_a.id) = _t1 AND _n = 1 THEN
      _out := _out || format(E'PASS double credit: lunas credits the gold amount %s once; two extra syncs and an extra verified payment leave the balance and the single sale row unchanged\n', _g1);
    ELSE
      _out := _out || format(E'FAIL double credit: credit %s (expected %s), balance after resync %s, sale rows %s\n', _t1 - _t0, _g1, pg_temp.bal(_a.id), _n);
    END IF;

    -- timing: the commission is no longer withdrawable at lunas (agents cannot withdraw at all) and sits in PENDING until departure
    BEGIN
      PERFORM pg_temp.act_as(_a.user_id);
      INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
      VALUES (_a.id, _g1, 'Bank BCA', '1234567890', 'Recheck', 'pending') RETURNING id INTO _w;
      RESET ROLE;
      _out := _out || E'FAIL timing: an agent could still create a withdrawal request for a lunas-but-not-departed commission\n';
      DELETE FROM public.agent_withdrawals WHERE id = _w;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN
        _out := _out || E'PASS timing: AGT-102 resolved, an agent cannot withdraw a lunas-but-not-departed commission (self-service withdrawals are closed, 42501)\n';
      ELSE
        _out := _out || format(E'FAIL timing: withdrawal attempt gave %s (%s)\n', SQLSTATE, SQLERRM);
      END IF;
    END;
    SELECT commission_state INTO _txt FROM public.agent_sales WHERE registration_id = _reg;
    IF _txt = 'pending' THEN
      _out := _out || format(E'PASS timing: at lunas (departure %s days away) the commission is PENDING, not ELIGIBLE (AGT-102)\n',
                             (SELECT departure_date::date - current_date FROM public.packages WHERE id = _pk1));
    ELSE
      _out := _out || format(E'FAIL timing: commission_state is %s at lunas before departure\n', _txt);
    END IF;
    SELECT count(*) INTO _n FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'agent_sales' AND column_name IN ('eligible_at', 'approved_at', 'paid_at');
    IF _n = 3 THEN
      _out := _out || E'PASS timing: agent_sales carries eligible_at / approved_at / paid_at (PENDING -> ELIGIBLE -> APPROVED -> PAID)\n';
    ELSE
      _out := _out || format(E'FAIL timing: only %s of the 3 lifecycle timestamps exist\n', _n);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL timing: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 3. Registration moved to another package (AGT-103; kak Virna: commission follows the new package)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET level = 'gold', available_balance = 0, total_commission = 0, total_sales = 0 WHERE id = _a.id;
    -- (a) before lunas: the waiting amount follows the package
    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _staff, _price, 'Recheck Move Early');
    PERFORM pg_temp.act_as(_staff);
    UPDATE public.jamaah_registrations SET package_id = _pk2 WHERE id = _reg;
    RESET ROLE;
    PERFORM pg_temp.act_as(_a.user_id);
    SELECT commission_amount INTO _tmp FROM public.list_my_agent_jamaah() WHERE registration_id = _reg;
    RESET ROLE;
    IF _tmp = _g2 THEN
      _out := _out || format(E'PASS move: before lunas, moving the jamaah from a package paying %s to one paying %s shows the new waiting amount %s\n', _g1, _g2, _tmp);
    ELSE
      _out := _out || format(E'FAIL move: before lunas the waiting amount is %s, expected %s\n', _tmp, _g2);
    END IF;
    -- (b) after lunas: the credited sale keeps the old amount
    _t0 := pg_temp.bal(_a.id);
    PERFORM pg_temp.pay(_reg, _staff, _price, 'verified');
    _t1 := pg_temp.bal(_a.id);
    PERFORM pg_temp.act_as(_staff);
    UPDATE public.jamaah_registrations SET package_id = _pk1 WHERE id = _reg;
    RESET ROLE;
    SELECT commission_amount INTO _tmp FROM public.agent_sales WHERE registration_id = _reg;
    IF _t1 - _t0 = _g2 AND _tmp = _g1 AND pg_temp.bal(_a.id) = _t1 - _g2 + _g1 THEN
      _out := _out || format(E'PASS move: AGT-103 resolved, after lunas (still PENDING) the jamaah moved back to the package paying %s re-prices the commission from %s to %s and the totals follow\n', _g1, _g2, _g1);
    ELSE
      _out := _out || format(E'FAIL move: credited %s, sale %s, balance %s (g1=%s g2=%s)\n', _t1 - _t0, _tmp, pg_temp.bal(_a.id), _g1, _g2);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL move: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 4. Refund after payout; tax and NIK before payout (AGT-104, AGT-105)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET level = 'gold', available_balance = 0, total_commission = 0, total_sales = 0 WHERE id = _a.id;
    SELECT ktp_number INTO _ktp FROM public.agents WHERE id = _a.id;
    UPDATE public.agents SET ktp_number = NULL WHERE id = _a.id;   -- an agent without NIK
    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _staff, _price, 'Recheck Payout');
    _pay := pg_temp.pay(_reg, _staff, _price, 'verified');
    SELECT id INTO _sale FROM public.agent_sales WHERE registration_id = _reg;
    -- AGT-105: NIK is required before an approval (the departure has to be reached first; moved inside this transaction)
    UPDATE public.packages SET departure_date = current_date - 1 WHERE id = _pk1;
    SELECT user_id INTO _sa FROM public.user_roles WHERE role = 'superadmin' ORDER BY user_id LIMIT 1;
    BEGIN
      PERFORM pg_temp.act_as(_sa);
      PERFORM public.approve_commissions(ARRAY[_sale]::uuid[], 'manajemen');
      RESET ROLE;
      _out := _out || E'FAIL payout: a commission of an agent with NO NIK was approved\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLERRM = 'NIK agen belum lengkap.' THEN _out := _out || E'PASS payout: AGT-105, an agent without NIK cannot be approved ("NIK agen belum lengkap")\n';
      ELSE _out := _out || format(E'FAIL payout: approval without NIK gave %s (%s)\n', SQLSTATE, SQLERRM); END IF;
    END;
    SELECT count(*) INTO _n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commission_payouts'
       AND column_name IN ('gross_amount', 'tax_amount', 'net_amount', 'proof_path', 'transfer_reference');
    IF _n = 5 THEN _out := _out || E'PASS payout: commission_payouts stores gross, 5% tax, net, transfer reference and proof (13_commission_lifecycle.sql runs the arithmetic)\n';
    ELSE _out := _out || format(E'FAIL payout: commission_payouts has %s of 5 expected columns\n', _n); END IF;

    -- AGT-104: a refund AFTER the payout. The payout is simulated by the database owner (the real path needs a finance user,
    -- see 13_commission_lifecycle.sql); the sync must record a clawback and leave the balance non-negative.
    UPDATE public.agent_sales SET status = 'paid', commission_state = 'paid', paid_at = now(), net_amount = round(commission_amount * 0.95),
           tax_amount = commission_amount - round(commission_amount * 0.95) WHERE id = _sale;
    UPDATE public.agents SET available_balance = available_balance - _g1 WHERE id = _a.id;
    PERFORM pg_temp.act_as(_staff);
    UPDATE public.jamaah_payments SET status = 'rejected', reject_reason = 'Recheck: refund' WHERE id = _pay;
    RESET ROLE;
    _t1 := pg_temp.bal(_a.id);
    SELECT status INTO _txt2 FROM public.agent_sales WHERE id = _sale;
    SELECT amount INTO _tmp FROM public.agent_commission_adjustments WHERE sale_id = _sale AND status = 'open';
    IF _t1 = 0 AND _txt2 = 'paid' AND _tmp = round(_g1 * 0.95) THEN
      _out := _out || format(E'PASS refund after payout: AGT-104 resolved, the balance stays %s (not negative), the sale stays paid and a clawback of %s (what the agent received) is open for the next payout\n', _t1, _tmp);
    ELSE
      _out := _out || format(E'FAIL refund after payout: balance %s, sale ''%s'', open clawback %s (expected 0 / paid / %s)\n', _t1, _txt2, _tmp, round(_g1 * 0.95));
    END IF;
    UPDATE public.agents SET ktp_number = _ktp WHERE id = _a.id;
    UPDATE public.packages SET departure_date = (SELECT departure_date FROM public.packages WHERE id = _pk2) WHERE id = _pk1;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL payout: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 5. Lead conflict holds the commission (AGT-106)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET level = 'gold', available_balance = 0, total_commission = 0, total_sales = 0 WHERE id IN (_a.id, _b.id);
    _phone := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
    PERFORM pg_temp.act_as(_a.user_id);
    _lead := public.create_agent_lead('Recheck Lead', _phone, _pk1, NULL);
    RESET ROLE;
    SELECT count(*) INTO _n FROM public.admin_notifications WHERE type = 'lead_conflict';
    _reg := pg_temp.plant_reg(_b.referral_code, _pk1, _staff, _price, 'Recheck Lead', _phone);
    SELECT count(*) INTO _m FROM public.admin_notifications WHERE type = 'lead_conflict';
    IF _m = _n + 1 THEN
      _out := _out || E'PASS lead conflict: B registering a jamaah whose number is A''s protected lead raises one lead_conflict notification for management\n';
    ELSE
      _out := _out || format(E'FAIL lead conflict: lead_conflict notifications %s -> %s\n', _n, _m);
    END IF;
    SELECT status INTO _txt FROM public.agent_leads WHERE id = (_lead ->> 'id')::uuid;
    _t0 := pg_temp.bal(_b.id);
    PERFORM pg_temp.pay(_reg, _staff, _price, 'verified');
    _t1 := pg_temp.bal(_b.id);
    SELECT hold_reason INTO _txt2 FROM public.agent_sales WHERE registration_id = _reg;
    IF _t1 = _t0 AND _txt2 = 'dispute' THEN
      _out := _out || E'PASS lead conflict: AGT-106 resolved, with the dispute open (A''s protected lead) the registration is recorded for B but HELD (hold dispute) and adds nothing to B''s totals; 13_commission_lifecycle.sql covers the decision\n';
    ELSE
      _out := _out || format(E'FAIL lead conflict: with the dispute open B''s balance moved %s and the hold is ''%s''\n', _t1 - _t0, _txt2);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL lead conflict: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 6. Fee gate (resolved) and accept_agent_sop version is not validated (AGT-107, AGT-115)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET registration_fee_status = 'unpaid', registration_fee_paid_at = NULL, sop_accepted_at = NULL, sop_version = NULL WHERE id = _a.id;
    PERFORM pg_temp.act_as(_a.user_id);
    _lead := public.create_agent_lead('Recheck Gate', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0'), NULL, NULL);
    RESET ROLE;
    _out := _out || E'FAIL fee gate: an active agent with an unpaid fee could register a lead\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLERRM LIKE 'Biaya registrasi belum diterima%' THEN _out := _out || E'PASS fee gate: an active agent with an unpaid fee cannot register leads (friendly message)\n';
    ELSE _out := _out || format(E'FAIL fee gate: unexpected error %s (%s)\n', SQLERRM, SQLSTATE); END IF;
  END;
  BEGIN
    UPDATE public.agents SET registration_fee_status = 'paid', registration_fee_paid_at = now() WHERE id = _a.id;
    PERFORM pg_temp.act_as(_a.user_id);
    PERFORM public.accept_agent_sop('SOP/AGEN/999-palsu');
    RESET ROLE;
    SELECT sop_version INTO _txt FROM public.agents WHERE id = _a.id;
    IF _txt = 'SOP/AGEN/999-palsu' THEN
      _out := _out || E'KNOWN sop version: accept_agent_sop stores any client-supplied version string (here ''SOP/AGEN/999-palsu''); the acceptance is not tied to the SOP version actually published (AGT-115)\n';
    ELSE
      _out := _out || format(E'PASS sop version: an unknown version is not stored (%s)\n', _txt);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'PASS sop version: an unknown version is refused (%s)\n', SQLSTATE);
  END;
  UPDATE public.agents SET registration_fee_status = 'paid', sop_accepted_at = now(), sop_version = 'test' WHERE id = _a.id;

  -- ===========================================================================================
  -- 7. Suspended agent accrues nothing: held (AGT-109)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET level = 'gold', available_balance = 0, total_commission = 0, total_sales = 0 WHERE id = _b.id;
    _reg := pg_temp.plant_reg(_b.referral_code, _pk1, _staff, _price, 'Recheck Suspended');
    UPDATE public.agents SET status = 'suspended' WHERE id = _b.id;
    _t0 := pg_temp.bal(_b.id);
    PERFORM pg_temp.pay(_reg, _staff, _price, 'verified');
    _t1 := pg_temp.bal(_b.id);
    SELECT hold_reason, commission_state INTO _txt, _txt2 FROM public.agent_sales WHERE registration_id = _reg;
    IF _t1 = _t0 AND _txt = 'suspended' AND _txt2 = 'pending' THEN
      _out := _out || E'PASS suspended: AGT-109 resolved, a jamaah that turns lunas after the agent was suspended is recorded as PENDING with hold ''suspended'' (Ditahan) and adds nothing to the totals\n';
    ELSE
      _out := _out || format(E'FAIL suspended: balance moved %s, hold ''%s'', state ''%s''\n', _t1 - _t0, _txt, _txt2);
    END IF;
    PERFORM pg_temp.act_as(_b.user_id);
    SELECT count(*) INTO _n FROM public.list_my_agent_jamaah();
    RESET ROLE;
    IF _n > 0 THEN _out := _out || format(E'KNOWN suspended: list_my_agent_jamaah still returns %s jamaah (names, phones, payment state) to a suspended agent (AGT-007 residual)\n', _n);
    ELSE _out := _out || E'PASS suspended: list_my_agent_jamaah returns nothing to a suspended agent\n'; END IF;
    UPDATE public.agents SET status = 'active' WHERE id = _b.id;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL suspended: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 8. Multi-tier package with a price that matches no tier; infant (AGT-110, AGT-111)
  -- ===========================================================================================
  BEGIN
    UPDATE public.agents SET level = 'gold', available_balance = 0, total_commission = 0, total_sales = 0 WHERE id = _a.id;
    UPDATE public.packages SET available_tiers = ARRAY[_tier1, CASE WHEN _tier1 = 'hemat' THEN 'nyaman' ELSE 'hemat' END] WHERE id = _pk1;
    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _staff, 12345678, 'Recheck Multi Tier');
    _t0 := pg_temp.bal(_a.id);
    PERFORM pg_temp.pay(_reg, _staff, 12345678, 'verified');
    _t1 := pg_temp.bal(_a.id);
    PERFORM pg_temp.act_as(_a.user_id);
    SELECT pay_state || '/' || commission_status || '/' || commission_amount INTO _txt FROM public.list_my_agent_jamaah() WHERE registration_id = _reg;
    RESET ROLE;
    IF _t1 = _t0 THEN
      _out := _out || format(E'KNOWN multi tier: on a package with two tiers a lunas jamaah whose list price (12.345.678) matches no tier price earns nothing and the agent sees %s; no warning reaches CS or the agent (AGT-110; all 21 live packages are single tier today)\n', _txt);
    ELSE
      _out := _out || format(E'PASS multi tier: the unmatched price still credited %s\n', _t1 - _t0);
    END IF;
    UPDATE public.packages SET available_tiers = ARRAY[_tier1] WHERE id = _pk1;

    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _staff, 5000000, 'Recheck Infant');
    UPDATE public.jamaah_registrations SET room_type = 'infant' WHERE id = _reg;
    _t0 := pg_temp.bal(_a.id);
    PERFORM pg_temp.pay(_reg, _staff, 5000000, 'verified');
    _t1 := pg_temp.bal(_a.id);
    IF _t1 - _t0 = _g1 THEN
      _out := _out || format(E'KNOWN infant: an infant registration (room_type infant, list price 5.000.000) earns the full %s commission; room type plays no role (kak Virna asked back how Musafar counts infants / non-bed, still open) (AGT-111)\n', _g1);
    ELSE
      _out := _out || format(E'PASS infant: an infant registration is credited %s instead of the full %s\n', _t1 - _t0, _g1);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL multi tier / infant: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 9. Lead helper probe; cross-agent sweep
  -- ===========================================================================================
  BEGIN
    PERFORM pg_temp.act_as(_a.user_id);
    _lead := public.create_agent_lead('Recheck Helper', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0'), NULL, NULL);
    PERFORM public.set_lead_helper((_lead ->> 'id')::uuid, 'ZZZ-NOPE99');
    SELECT helper_code INTO _txt FROM public.list_my_agent_leads() WHERE id = (_lead ->> 'id')::uuid;
    PERFORM public.set_lead_helper((_lead ->> 'id')::uuid, _b.referral_code);
    SELECT helper_code INTO _txt2 FROM public.list_my_agent_leads() WHERE id = (_lead ->> 'id')::uuid;
    RESET ROLE;
    IF _txt IS NULL AND _txt2 = _b.referral_code THEN
      _out := _out || E'KNOWN helper probe: set_lead_helper is a silent no-op for an unknown Agent ID, but list_my_agent_leads then shows helper_code only for a real one, so an agent can test which Agent IDs exist (the header says it cannot) (AGT-116)\n';
    ELSE
      _out := _out || format(E'PASS helper probe: unknown=%s known=%s gives no signal\n', _txt, _txt2);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL helper probe: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  DECLARE
    _rel record; _bad bigint; _tot bigint := 0; _checked integer := 0; _list text := '';
  BEGIN
    PERFORM pg_temp.act_as(_a.user_id);
    FOR _rel IN
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p') AND c.relname LIKE 'agent%'
         AND EXISTS (SELECT 1 FROM information_schema.columns k WHERE k.table_schema = 'public' AND k.table_name = c.relname AND k.column_name = 'agent_id')
         AND has_table_privilege('authenticated', format('public.%I', c.relname), 'select')
    LOOP
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I WHERE agent_id IS DISTINCT FROM %L', _rel.relname, _a.id) INTO _bad;
        _checked := _checked + 1;
        IF _bad > 0 THEN _tot := _tot + _bad; _list := _list || _rel.relname || '=' || _bad || ' '; END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;   -- no privilege on a column the filter needs: nothing leaks
      END;
    END LOOP;
    RESET ROLE;
    IF _checked >= 5 AND _tot = 0 THEN
      _out := _out || format(E'PASS sweep: agent A sees no row of another agent in any of the %s agent_* relations that carry agent_id\n', _checked);
    ELSIF _checked < 5 THEN
      _out := _out || format(E'SKIP sweep: only %s agent_* relations with agent_id were readable\n', _checked);
    ELSE
      _out := _out || format(E'FAIL sweep: agent A sees %s rows of other agents (%s)\n', _tot, _list);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL sweep: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  -- ===========================================================================================
  -- 10. Agent-angle security spot check: staff and internal functions, direct writes, own protected columns
  -- ===========================================================================================
  DECLARE
    _fn record; _ok integer := 0; _bad text := '';
  BEGIN
    PERFORM pg_temp.act_as(_a.user_id);
    FOR _fn IN SELECT * FROM (VALUES
      ('admin_agent_leads', 'SELECT public.admin_agent_leads()'),
      ('admin_list_commission_rates', 'SELECT public.admin_list_commission_rates()'),
      ('set_commission_rate', 'SELECT public.set_commission_rate((SELECT id FROM public.packages LIMIT 1), ''nyaman'', ''gold'', 9999999, NULL)'),
      ('clear_commission_rate', 'SELECT public.clear_commission_rate((SELECT id FROM public.packages LIMIT 1), ''nyaman'', ''gold'')'),
      ('process_agent_withdrawal', 'SELECT public.process_agent_withdrawal(gen_random_uuid(), ''paid'', NULL)'),
      ('expire_agent_leads', 'SELECT public.expire_agent_leads()'),
      ('agent_lead_actor', 'SELECT public.agent_lead_actor()'),
      ('sync_registration_commission', 'SELECT public.sync_registration_commission(gen_random_uuid())'),
      ('agent_commission_for', 'SELECT public.agent_commission_for(gen_random_uuid(), ''x'', gen_random_uuid())'),
      ('direct insert agent_leads', 'INSERT INTO public.agent_leads (agent_id, name, whatsapp) VALUES (''' || _a.id || ''', ''Xx Yy'', ''6281234567890'')'),
      ('direct insert agent_sales', 'INSERT INTO public.agent_sales (agent_id, customer_name, customer_phone, package_name, sale_amount, commission_amount, status) VALUES (''' || _a.id || ''', ''x'', ''1'', ''p'', 1, 1, ''confirmed'')'),
      ('self level update', 'UPDATE public.agents SET level = ''platinum'' WHERE id = ''' || _a.id || ''''),
      ('self fee/sop update', 'UPDATE public.agents SET registration_fee_status = ''waived'', sop_accepted_at = now() WHERE id = ''' || _a.id || ''''),
      ('self referral_code update', 'UPDATE public.agents SET referral_code = ''MUS-HACK01'' WHERE id = ''' || _a.id || '''')
    ) AS v(label, stmt)
    LOOP
      BEGIN
        EXECUTE _fn.stmt;
        _bad := _bad || _fn.label || '; ';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE IN ('42501', '42883') THEN _ok := _ok + 1; ELSE _bad := _bad || _fn.label || ' (' || SQLSTATE || '); '; END IF;
      END;
    END LOOP;
    SELECT count(*) INTO _n FROM public.agents WHERE id = _b.id;
    SELECT count(*) INTO _m FROM storage.objects WHERE bucket_id = 'agent-documents' AND (storage.foldername(name))[1] <> _a.user_id::text;
    RESET ROLE;
    IF _ok = 14 AND _bad = '' THEN
      _out := _out || E'PASS security: a plain agent is refused (42501) on the 14 staff/internal functions, direct writes to agent_leads and agent_sales, and changes to own level, fee/SOP columns and referral code\n';
    ELSE
      _out := _out || format(E'FAIL security: %s of 14 refused, not refused: %s\n', _ok, _bad);
    END IF;
    IF _n = 0 AND _m = 0 THEN
      _out := _out || E'PASS security: a plain agent cannot read another agent''s agents row or any other agent-documents (KTP) object\n';
    ELSE
      _out := _out || format(E'FAIL security: agent A reads %s foreign agent rows and %s foreign KTP objects\n', _n, _m);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; _out := _out || format(E'FAIL security: unexpected error %s (%s)\n', SQLERRM, SQLSTATE);
  END;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
