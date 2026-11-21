# Tender-With-Us — Engineering Roadmap

Last reviewed: 19 November 2026
Scope: existing Next.js / Supabase public-tender accountability MVP.
This roadmap is based on a code review of the repository, not a verified production deployment.

## Intended product

The platform aims to make public procurement traceable from tender publication through bidding, award, milestone evidence, payment and public accountability. Actors include **citizens, sponsors, bidders and administrators**, with auditor functionality planned. Public transparency must not expose private bids, sensitive documents or internal security data.

## Verified code inventory

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS. Public tender and company pages, login/registration, role-oriented dashboards and forms are present.
- **Backend:** Next.js Server Actions in `src/app/auth/actions.ts` and `src/app/tenders/actions.ts` use Supabase Auth, tables and PostgreSQL RPCs.
- **Scanning:** Deno Edge Function at `supabase/functions/scan-documents/index.ts` submits quarantined uploads to VirusTotal and polls analyses.
- **Missing from repository:** Supabase table/RLS/storage definitions and migration history, `.env.example`, automated test suite, deployment/runbook configuration.
- **Baseline checks:** dependency install completed; ESLint initially reports eight errors and a warning; TypeScript and production build fail because Next.js includes the Deno function in its type-check project.

## Priority issues and acceptance criteria

| ID | Priority | Finding / task | Acceptance criteria | Verification |
| --- | --- | --- | --- | --- |
| SEC-01 | P0 | Admin status and document-review Server Actions originally lacked explicit admin authorization. Award, review, payment and evidence RPC wrappers also needed sponsor/bidder ownership checks. | Unauthorized roles are rejected at the action boundary; DB-level permissions are independently reviewed. | Unit tests of validation helpers and Supabase integration tests with each role. |
| SEC-02 | P0 | Supabase schema, RLS policies, function grants and storage policies are absent from source control, so RPC and data-access security cannot be audited or reproduced. | Versioned, reviewed migrations match a known disposable instance; cross-tenant reads/writes and unauthorized RPC execution are denied. | Seeded integration suite against an isolated test Supabase project. **Requires authorized schema export.** |
| SEC-03 | P0 | The scanner submits uploaded evidence to VirusTotal, which may disclose commercially sensitive documents to a third party. | Explicit document-handling policy and informed consent or a privacy-preserving scanning alternative; no sensitive production upload until decided. | Data-flow/privacy review and controlled scanner tests. **Requires owner decision.** |
| SEC-04 | P1 | Some Server Actions accept untrusted return paths or runtime enum values. | Redirects remain on validated app paths; invalid status/decision values fail closed. | Automated negative-case tests. |
| DATA-01 | P1 | Milestone sequence numbers are allocated using read-then-insert, creating a concurrent insert race. | Sequence allocation is transaction-safe with an appropriate unique constraint. | Parallel milestone-creation integration test. **Requires DB migration.** |
| DATA-04 | P0 | The supplied table definitions show `currency character` although the app writes `ZAR`, and no uniqueness constraint on `(tender_id, bidder_company_id)` in `bids`. | Currency safely stores 3-letter codes, and concurrent duplicate company bids are prevented at the DB boundary. | Inspect existing values/duplicates, then test reviewed migration in an isolated database. |
| DATA-05 | P0 | `tenders.awarded_bid_id` references a bid ID without ensuring it belongs to the same tender. | Cross-tender awards are impossible, regardless of the client or RPC caller. | Negative-case DB integration tests against `award_tender` and relevant constraints. |
| DATA-02 | P1 | Evidence is submitted via RPC before file upload; failed upload may leave a submitted milestone without its intended file. | Partial-failure handling is explicitly represented, retriable and consistent with business rules. | Injected upload failure/integration tests. **Requires workflow decision/DB access.** |
| DATA-03 | P1 | Some multi-step workflows create audit/news records separately from their main mutation; failures may leave incomplete trails. | Mutations and audit side effects have agreed transactional or recoverable semantics. | Fault-injection tests against test DB. |
| BUILD-01 | P1 | Deno function is type-checked as part of Next.js app, breaking build. | Next.js `tsc` and build pass without masking app errors; Deno function has a separate validation path. | `npx tsc --noEmit`, `npm run build`, Deno check when available. |
| BUILD-02 | P1 | ESLint reports explicit-`any` usage in public/detail pages and unused import. | ESLint exits cleanly without disabling rules. | `npm run lint`. |
| TEST-01 | P1 | No test runner or automated tests. | Meaningful security/input tests exist and run in one documented command; critical workflows gain integration tests when DB is available. | `npm test`; CI on PRs. |
| AUTH-01 | P1 | Registration signs up then immediately signs in before profile completion; with email confirmation enabled, a user may have an Auth identity but no application profile. | Verified registration and confirmation lifecycle with a recoverable profile-completion flow. | Tests against a disposable Supabase Auth project configured with email confirmation. |
| OPS-01 | P1 | README references a missing `.env.example`; environment setup and deployment readiness are not reproducible. | Safe sample env file and accurate setup/troubleshooting instructions, with zero secrets. | Fresh installation and build. |
| UX-01 | P2 | Public pages and forms need responsive/accessibility audit and error-state testing. | Keyboard navigation, accessible labels, form errors and mobile layouts are manually or automatically verified. | Browser accessibility and viewport checks. |
| PERF-01 | P2 | Public RPC queries and table indexes cannot be evaluated without schema/query plans. | Representative filters and tender views meet agreed performance targets. | SQL `EXPLAIN ANALYZE` in an isolated database with realistic synthetic data. |
| DOC-01 | P2 | README currently describes some unverified backend guarantees as deployed features. | Documentation distinguishes repository code, DB-dependent features and planned work. | README/source consistency review. |
| FILE-01 | P1 | Evidence upload MIME and filename validation is insufficient on its own; Next.js default Server Action body limit is smaller than the stated 10 MiB upload cap. | Content signature and extension checks reject obvious mismatches; multipart limits support 10 MiB uploads without raising the per-file cap. | Unit tests and build; full upload integration tests after DB setup. |
| DEP-01 | P0 | Pinned Next.js and transitive dependencies contain published high/critical advisories. | Move to a patched stable Next.js release, update compatible dependencies and retain a clean production dependency audit. | `npm audit --omit=dev --audit-level=moderate`, test, lint, type-check, build, CI. |

## Execution order and dependencies

1. **Repository-only safety improvements:** `SEC-01` (action-boundary checks), `SEC-04`, `BUILD-01`, `BUILD-02`, `TEST-01`, `OPS-01`.
2. **Database restoration/audit:** obtain a sanitized schema export, migration history and access to a disposable Supabase environment; then address `SEC-02`, `DATA-01`, `DATA-02`, `DATA-03`.
   The first table-only description revealed additional `DATA-04` and `DATA-05`
   checks; see [docs/DATABASE_AUDIT.md](docs/DATABASE_AUDIT.md) for read-only SQL.
3. **Privacy decision:** resolve `SEC-03` before making document scanning available for sensitive real-world tender evidence.
4. **Feature verification:** registration, sponsor company verification, bidding, award, evidence, payment and public accountability in role-isolated integration tests.
5. **Product quality:** UX/accessibility, performance, deployment runbook and final security review.

## Release gates (not yet satisfied)

- All protected actions and PostgreSQL RPCs deny unauthorized use.
- Row-level security, function privileges and storage policies are tested across roles and companies.
- No secrets or real procurement/medical/personal data are committed.
- File scanning and privacy policy are approved and tested.
- Dependency checks, lint, type-check, unit/integration tests and build pass.
- A migration-based fresh install can reproduce the application on a disposable test environment.
- Accessibility and critical end-to-end workflows pass.
- Owner explicitly approves deployment. No production deployment is authorized by this roadmap.
