# Database design audit — 19 November 2026

This is a **read-only design review** of a table-only SQL description supplied
by the project owner. The supplied text expressly says it is for context and
cannot be executed as a migration. It does **not** include PostgreSQL enum
definitions, functions, triggers, grants, RLS policies, storage bucket settings,
indexes created separately, or existing records. None of those have been
verified, and no SQL was run against the owner's database.

## Findings from the supplied table definitions

| Priority | Object | Finding and next safe action |
| --- | --- | --- |
| P0 | `tenders.currency` | Declared `character` (one character), while the app writes `ZAR`. Inspect stored values and prepare an explicit three-character currency migration, **after** a test backup and data check. |
| P0 | `bids` | No supplied unique constraint on `(tender_id, bidder_company_id)`; the app's existence check before insert is race-prone. Check existing duplicates before adding the constraint in a reviewed migration. |
| P0 | `milestones` | No supplied unique constraint on `(tender_id, sequence_number)`; the app calculates the next sequence using read-then-insert. Sequence allocation should be transactional with an accompanying uniqueness rule. |
| P0 | `tenders.awarded_bid_id` | A simple FK to `bids(id)` cannot prove that the awarded bid belongs to this tender. Verify `award_tender` and consider a composite FK or a controlled invariant in the database. |
| P0 | RLS, RPC grants, storage | Not included in export. Need policies and function definitions to verify tenant isolation, role changes, payment authorization and private document access. Do not infer that these protections are missing in production. |
| P1 | `transactions` | No supplied safeguard against duplicate milestone payment records or cross-tender milestone references. Confirm the intended ledger model and payment RPC before adding constraints. |
| P1 | `documents` | Multiple optional tender/bid/milestone/company references can point to unrelated records; review upload RPC/policies and define permitted combinations. The bucket must remain private. |
| P1 | `audit_log` | Table exists, but schema alone does not prove append-only behavior or a complete audit trail. Verify triggers/grants and whether sensitive JSON can be read by ordinary users. |
| P1 | `profiles` | Role and company association are high-impact columns. Confirm direct client UPDATE cannot escalate a role or attach another company's ID. |
| P1 | `flags` | `source_key` has no unique constraint in the supplied table definition. Confirm accountability scan idempotence and whether repeat scans duplicate flags. |

## Next evidence to request from Supabase (read-only)

In **Supabase Dashboard → SQL Editor**, run each query separately and inspect
the returned results. They contain schema metadata, not user-record exports.
Review results for confidential names or hardcoded secrets before sharing.

### 1. Table RLS flags and policies

```sql
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('r', 'p')
ORDER BY n.nspname, c.relname;

SELECT schemaname, tablename, policyname, permissive,
       roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
```

### 2. Public RPC security metadata

```sql
SELECT p.oid::regprocedure AS function_signature,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       p.proacl AS explicit_privileges,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.oid::regprocedure::text;
```

For a full authorization review, the function definitions are also required.
They can be retrieved individually with `pg_get_functiondef`, but **review
and redact hardcoded credentials before sharing**:

```sql
SELECT p.oid::regprocedure AS function_signature,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.oid::regprocedure::text;
```

### 3. Storage bucket configuration

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'tender-documents';
```

Storage object policies are included in the `pg_policies` query above. Never
share actual files from the bucket as part of the security audit.

### 4. Constraint collision checks (counts only)

```sql
SELECT COUNT(*) AS duplicate_company_bid_groups
FROM (
  SELECT tender_id, bidder_company_id
  FROM public.bids
  GROUP BY tender_id, bidder_company_id
  HAVING COUNT(*) > 1
) AS duplicates;

SELECT COUNT(*) AS duplicate_milestone_sequence_groups
FROM (
  SELECT tender_id, sequence_number
  FROM public.milestones
  GROUP BY tender_id, sequence_number
  HAVING COUNT(*) > 1
) AS duplicates;

SELECT COUNT(*) AS cross_tender_awarded_bids
FROM public.tenders AS t
JOIN public.bids AS b ON b.id = t.awarded_bid_id
WHERE b.tender_id IS DISTINCT FROM t.id;
```

## Change control

No production SQL edits or data changes are authorized by this document.
After examining the real RLS/function definitions and duplicate counts, write
reviewed, reversible migrations and test them against an isolated Supabase
project. Functions running with elevated privileges must enforce business
authorization internally even when Next.js actions check roles and ownership.
