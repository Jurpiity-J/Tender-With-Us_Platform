-- Tender-With-Us demo: lock payment and milestone rows, and validate all
-- sponsor/tender/milestone/payee relationships before marking a payment released.
--
-- Applied and verified in Supabase after a transaction-only dry run. The known
-- original and final checksums make reapplication safe for this demo database;
-- unexpected versions require manual review instead of being overwritten.

DO $migration$
DECLARE
  v_definition text := pg_get_functiondef(
    'public.release_milestone_payment(uuid)'::regprocedure
  );
  v_checksum text;
  v_old_transaction_lock text :=
    E'  from transactions\n  where id = p_transaction_id;';
  v_new_transaction_lock text :=
    E'  from transactions\n  where id = p_transaction_id\n  for update;';
  v_old_milestone_lock text :=
    E'  from milestones\n  where id = v_transaction.milestone_id;';
  v_new_milestone_lock text :=
    E'  from milestones\n  where id = v_transaction.milestone_id\n  for update;';
  v_old_check text :=
    E'  if v_milestone.status <> ''verified'' then\n'
    || E'    raise exception ''Only verified milestones can be paid'';\n'
    || E'  end if;';
  v_new_check text;
BEGIN
  v_checksum := md5(v_definition);

  IF v_checksum = 'c5ffa63caccde8c15fdbab180f590794' THEN
    RAISE NOTICE 'Milestone payment protections are already installed.';
  ELSIF v_checksum = 'f09ef1affb6017dd2efe978fefc4df5d' THEN
    -- The original function contained Windows CRLF line endings.
    v_definition := replace(v_definition, E'\r\n', E'\n');

    v_new_check := v_old_check
      || E'\n\n'
      || E'  if v_transaction.sponsor_company_id is distinct from v_tender.sponsor_company_id then\n'
      || E'    raise exception ''Transaction sponsor does not match tender sponsor'';\n'
      || E'  end if;'
      || E'\n\n'
      || E'  if v_milestone.tender_id is distinct from v_tender.id then\n'
      || E'    raise exception ''Payment milestone does not belong to this tender'';\n'
      || E'  end if;'
      || E'\n\n'
      || E'  if not exists (\n'
      || E'    select 1 from bids\n'
      || E'    where bids.id = v_tender.awarded_bid_id\n'
      || E'    and bids.tender_id = v_tender.id\n'
      || E'    and bids.bidder_company_id = v_transaction.payee_company_id\n'
      || E'  ) then\n'
      || E'    raise exception ''Payment payee must be the winning bidder company'';\n'
      || E'  end if;';

    IF length(v_definition)
       - length(replace(v_definition, v_old_transaction_lock, ''))
       <> length(v_old_transaction_lock) THEN
      RAISE EXCEPTION 'Transaction lock insertion point changed.';
    END IF;

    IF length(v_definition)
       - length(replace(v_definition, v_old_milestone_lock, ''))
       <> length(v_old_milestone_lock) THEN
      RAISE EXCEPTION 'Milestone lock insertion point changed.';
    END IF;

    IF length(v_definition)
       - length(replace(v_definition, v_old_check, ''))
       <> length(v_old_check) THEN
      RAISE EXCEPTION 'Payment integrity insertion point changed.';
    END IF;

    v_definition := replace(
      v_definition, v_old_transaction_lock, v_new_transaction_lock
    );
    v_definition := replace(
      v_definition, v_old_milestone_lock, v_new_milestone_lock
    );
    v_definition := replace(v_definition, v_old_check, v_new_check);
    EXECUTE v_definition;
  ELSE
    RAISE EXCEPTION 'Unexpected release_milestone_payment definition: %',
      v_checksum;
  END IF;

  v_definition := pg_get_functiondef(
    'public.release_milestone_payment(uuid)'::regprocedure
  );

  IF v_definition NOT ILIKE '%where id = p_transaction_id%for update;%'
     OR v_definition NOT ILIKE '%where id = v_transaction.milestone_id%for update;%'
     OR v_definition NOT ILIKE '%v_transaction.sponsor_company_id is distinct from v_tender.sponsor_company_id%'
     OR v_definition NOT ILIKE '%v_milestone.tender_id is distinct from v_tender.id%'
     OR v_definition NOT ILIKE '%bids.bidder_company_id = v_transaction.payee_company_id%' THEN
    RAISE EXCEPTION 'Milestone payment protection verification failed.';
  END IF;
END;
$migration$;

-- Signed-in sponsors may request a release; the function verifies ownership.
REVOKE EXECUTE ON FUNCTION public.release_milestone_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_milestone_payment(uuid) TO authenticated;
