-- Tender-With-Us demo: prevent premature and concurrent awards.
--
-- The database patch was first dry-run in a transaction and then applied to
-- Supabase. This migration records the same change for the repository.
-- It accepts only the reviewed original function or the already-applied one.
-- Other function versions stop with an error and require manual review.

DO $migration$
DECLARE
  v_definition text := pg_get_functiondef(
    'public.award_tender(uuid,uuid)'::regprocedure
  );
  v_checksum text;
  v_old_lock text := E'  from tenders\n  where id = p_tender_id;';
  v_new_lock text := E'  from tenders\n  where id = p_tender_id\n  for update;';
  v_old_status text :=
    E'  if v_tender.status <> ''published'' then\n'
    || E'    raise exception ''Only published tenders can be awarded'';\n'
    || E'  end if;';
  v_new_status text;
BEGIN
  v_checksum := md5(v_definition);

  IF v_checksum = '2539a05fe4edd4e71cf3110191346b8f' THEN
    RAISE NOTICE 'Award protection is already installed.';
  ELSIF v_checksum = '88dfd6eba82cbe5ed372dac2f5ad4054' THEN
    -- The original stored function used Windows CRLF line endings.
    v_definition := replace(v_definition, E'\r\n', E'\n');

    v_new_status := v_old_status
      || E'\n\n'
      || E'  if v_tender.submission_deadline > now() then\n'
      || E'    raise exception ''Submission deadline has not passed'';\n'
      || E'  end if;';

    IF length(v_definition) - length(replace(v_definition, v_old_lock, ''))
       <> length(v_old_lock) THEN
      RAISE EXCEPTION 'Tender lock insertion point changed.';
    END IF;

    IF length(v_definition) - length(replace(v_definition, v_old_status, ''))
       <> length(v_old_status) THEN
      RAISE EXCEPTION 'Award deadline insertion point changed.';
    END IF;

    v_definition := replace(v_definition, v_old_lock, v_new_lock);
    v_definition := replace(v_definition, v_old_status, v_new_status);
    EXECUTE v_definition;
  ELSE
    RAISE EXCEPTION 'Unexpected award_tender definition: %', v_checksum;
  END IF;

  v_definition := pg_get_functiondef(
    'public.award_tender(uuid,uuid)'::regprocedure
  );

  IF v_definition NOT ILIKE '%submission_deadline > now()%'
     OR v_definition NOT ILIKE '%for update;%' THEN
    RAISE EXCEPTION 'Award protection verification failed.';
  END IF;
END;
$migration$;

-- The RPC is called by signed-in sponsors, and checks their company ownership.
REVOKE EXECUTE ON FUNCTION public.award_tender(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_tender(uuid, uuid) TO authenticated;
