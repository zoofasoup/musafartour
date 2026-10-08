-- Alur paket (migrations 20261010100000_package_codename, 20261010110000_package_flyer_gate).
-- Runs on the live linked project inside a transaction that always aborts (final RAISE EXCEPTION).
-- Run with: ./scripts/run-db-tests.sh tests/db/15_package_flow.sql
BEGIN;
DO $$
DECLARE _out text := ''; _id uuid; _id2 uuid; _code text; _code2 text; _r text; _pub int;
BEGIN
  -- codename is generated for a new package and stays unique for the same day/tier/airline
  INSERT INTO packages (package_name, departure_date, duration_days, flight, flight_type, available_tiers, status, slots_total, banner_image, slug)
  VALUES ('[TEST] a', '2030-01-05', 9, 'Saudia', 'direct', ARRAY['nyaman'], 'draft', 40, NULL, 'test-flow-a') RETURNING id, codename INTO _id, _code;
  INSERT INTO packages (package_name, departure_date, duration_days, flight, flight_type, available_tiers, status, slots_total, banner_image, slug)
  VALUES ('[TEST] b', '2030-01-05', 9, 'Saudia', 'direct', ARRAY['nyaman'], 'draft', 40, NULL, 'test-flow-b') RETURNING id, codename INTO _id2, _code2;
  IF _code = '0501/NYA/SVA/2030' THEN _out := _out || E'PASS FLOW-1: codename generated from date/tier/airline\n';
  ELSE _out := _out || format(E'FAIL FLOW-1: codename is %L\n', _code); END IF;
  IF _code2 = '0501/NYA/SVA/2030-2' THEN _out := _out || E'PASS FLOW-2: second package on the same day gets a suffix, not a duplicate\n';
  ELSE _out := _out || format(E'FAIL FLOW-2: second codename is %L\n', _code2); END IF;

  -- a draft without flyer cannot go live
  BEGIN
    UPDATE packages SET status = 'published' WHERE id = _id;
    _out := _out || E'FAIL FLOW-3: published without a flyer\n';
  EXCEPTION WHEN check_violation THEN
    _out := _out || E'PASS FLOW-3: Tayang is refused while the flyer is missing\n';
  END;

  -- Final does not need the flyer yet (the flyer is made after the price is final)
  UPDATE packages SET status = 'final' WHERE id = _id;
  _out := _out || E'PASS FLOW-4: Final is allowed without a flyer\n';

  -- with a flyer it can go live
  UPDATE packages SET banner_image = 'https://example.test/flyer.png' WHERE id = _id;
  UPDATE packages SET status = 'published' WHERE id = _id;
  _out := _out || E'PASS FLOW-5: Tayang works once the flyer exists\n';

  -- editing a live package (not its status) is not blocked even if its flyer is later removed
  UPDATE packages SET banner_image = NULL, package_name = '[TEST] a2' WHERE id = _id;
  _out := _out || E'PASS FLOW-6: editing an already-live package is not blocked by the gate\n';

  -- variants default to an empty list and are not readable by anon
  IF (SELECT flyer_variants FROM packages WHERE id = _id2) = '[]'::jsonb THEN _out := _out || E'PASS FLOW-7: flyer_variants defaults to []\n';
  ELSE _out := _out || E'FAIL FLOW-7: flyer_variants default\n'; END IF;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM flyer_variants FROM packages LIMIT 1;
    _out := _out || E'FAIL FLOW-8: anon can read flyer_variants\n';
  EXCEPTION WHEN insufficient_privilege THEN
    _out := _out || E'PASS FLOW-8: anon cannot read flyer_variants\n';
  END;
  RESET ROLE;

  -- every real package already has a codename
  IF (SELECT count(*) FROM packages WHERE codename IS NULL) = 0 THEN _out := _out || E'PASS FLOW-9: no package without a codename\n';
  ELSE _out := _out || E'FAIL FLOW-9: some packages have no codename\n'; END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END $$;
