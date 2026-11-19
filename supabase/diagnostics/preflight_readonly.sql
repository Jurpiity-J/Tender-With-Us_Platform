-- Tender-With-Us database hardening preflight (READ ONLY).
-- Run in Supabase SQL Editor, ideally one SELECT at a time. Export the result
-- tables as CSV. No command below creates, updates, deletes or resets data.
-- Review exported metadata for sensitive information before sharing.

-- 1) Discover any triggers that may already enforce business constraints.
-- Includes auth.users because an auth signup trigger might populate profiles.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid, true) AS trigger_definition
FROM pg_trigger AS t
JOIN pg_class AS c ON c.oid = t.tgrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND (
    (n.nspname = 'auth' AND c.relname = 'users') OR
    (n.nspname = 'public' AND c.relname IN (
      'profiles', 'companies', 'tenders', 'bids', 'milestones',
      'transactions', 'documents', 'flags', 'audit_log'
    ))
  )
ORDER BY schema_name, table_name, trigger_name;

-- 2) Count violations of proposed uniqueness/integrity rules, without
-- returning any user or tender record data.
SELECT
  (SELECT count(*) FROM (
    SELECT tender_id, bidder_company_id
    FROM public.bids
    GROUP BY tender_id, bidder_company_id
    HAVING count(*) > 1
  ) AS x) AS duplicate_company_bid_groups,
  (SELECT count(*) FROM (
    SELECT tender_id, sequence_number
    FROM public.milestones
    GROUP BY tender_id, sequence_number
    HAVING count(*) > 1
  ) AS x) AS duplicate_milestone_sequence_groups,
  (SELECT count(*) FROM (
    SELECT milestone_id
    FROM public.transactions
    WHERE milestone_id IS NOT NULL AND status <> 'reversed'
    GROUP BY milestone_id
    HAVING count(*) > 1
  ) AS x) AS duplicate_active_milestone_payment_groups,
  (SELECT count(*) FROM (
    SELECT source_key
    FROM public.flags
    WHERE source_key IS NOT NULL AND is_resolved = false
    GROUP BY source_key
    HAVING count(*) > 1
  ) AS x) AS duplicate_unresolved_flag_groups,
  (SELECT count(*)
   FROM public.tenders AS t
   JOIN public.bids AS b ON b.id = t.awarded_bid_id
   WHERE b.tender_id IS DISTINCT FROM t.id) AS cross_tender_awarded_bids,
  (SELECT count(*)
   FROM public.transactions AS tx
   JOIN public.milestones AS m ON m.id = tx.milestone_id
   WHERE m.tender_id IS DISTINCT FROM tx.tender_id) AS cross_tender_milestone_payments;

-- 3) Confirm whether the evidence bucket is private. Private Storage still
-- requires correct object-level RLS; malware-clean != approved-for-publication.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'tender-documents';

-- 4) Detect schema CREATE privileges relevant to SECURITY DEFINER functions
-- that currently use search_path=public.
SELECT
  has_schema_privilege('anon', 'public', 'CREATE') AS anon_can_create_in_public,
  has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_can_create_in_public;

-- 5) Check whether the stored currency matches the application's ZAR usage.
-- This returns only an aggregate count per code, not tender records.
SELECT trim(currency::text) AS stored_currency, count(*) AS tender_count
FROM public.tenders
GROUP BY trim(currency::text)
ORDER BY stored_currency;
