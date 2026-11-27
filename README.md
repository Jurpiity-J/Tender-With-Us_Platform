# Public Tender Accountability Platform

A transparent public tender management and accountability platform built with Next.js, Supabase, PostgreSQL, Tailwind CSS, and Supabase Edge Functions.

The platform is designed to make public procurement more transparent by tracking tenders, bids, awarded companies, milestones, evidence submissions, payment releases, public risk flags and company reputation history.

## Purpose

Public tender systems often fail because citizens cannot easily see what was awarded, who won, how much was paid, whether the work was completed and whether delays or suspicious activity occurred.

This project provides a public-facing accountability layer where tenders are tracked from publication to completion.

## Core Features

- User authentication with role-based access
- Company registration and admin verification
- Sponsor tender creation and publishing
- Bidder bid submission and bid editing before deadline
- Tender award workflow
- Milestone planning for awarded tenders
- Bidder evidence submission
- Sponsor milestone approval or rejection
- Payment release tracking
- Automatic tender completion when all milestones are paid
- Public tender register with search and filters
- Free guided help chatbot with published-tender lookup
- Role-based Help Centre at `/help`
- Read-only public tender JSON API
- Public citizen view of awarded company, milestones, progress, payments, and flags
- Company reputation score and flag history
- Upload quarantine system for evidence files
- Automatic malware scanning workflow using Supabase Edge Functions
- Admin document quarantine review panel
- Immutable audit log records for important actions (pending)

## User Roles

### Public Citizens

Citizens can view public tenders, awarded companies, project progress, approved milestones, released payments, accountability flags, and company reputation history.

### Sponsors

Sponsors can create tenders, publish tenders, view bids, award a bidder, define milestones, verify or reject milestone evidence, and release payments.

### Bidders

Bidders can submit bids, edit bids before the deadline, view awarded projects, submit milestone evidence, and track whether evidence was approved, rejected, or paid.

### Admins

Admins can verify companies, reject or suspend companies, review quarantined documents, and manage file scan statuses.

### Auditors

Auditor functionality is planned as a read-only oversight role for tenders, companies, flags, documents, payments, and audit logs.

## Security design (partially implemented; database rules unverified)

- Role checks in selected Server Actions; complete authorization audit pending
- Supabase Row Level Security and private storage policies required but not versioned here
- Quarantine-first file upload model
- Uploads are intended to start as `pending_scan`, with unsafe files quarantined
- Allowed file extension, MIME type, signature and size checks at the action boundary
- Scanner credentials kept in Edge Function environment, not in client code
- Database-level audit logging is planned and not independently verified

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Edge Functions
- VirusTotal API integration for automatic scanning
- PostgreSQL functions, triggers and RLS policies

## Project Status

This is an MVP/prototype for a transparent public procurement platform.

Intended lifecycle represented by the code (end-to-end database testing still required):

1. Company registers
2. Admin verifies company
3. Sponsor publishes tender
4. Bidder submits bid
5. Sponsor awards bid
6. Sponsor creates milestones
7. Winning bidder submits milestone evidence
8. Sponsor approves or rejects evidence
9. Sponsor releases milestone payment
10. Tender auto-completes when all milestones are paid
11. Citizens can view public progress and accountability records

## Environment Variables

Create a `.env.local` file using the tracked `.env.example` as a guide. Only
public Supabase connection settings belong in Next.js environment variables.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VIRUSTOTAL_API_KEY`,
and `SCANNER_INTERNAL_TOKEN` **only** in the server-side Supabase Edge Function
environment. Never expose a service-role key, scanner token, or VirusTotal key
through a `NEXT_PUBLIC_` variable.

## Local development

Requires Node.js 24 or another version supported by the project's installed
Next.js 16 toolchain and an appropriately configured Supabase development project.

```bash
npm ci
npm run dev
```

Open the local URL printed by Next.js. The application requires the matching
Supabase database tables, storage bucket, RLS policies, and PostgreSQL RPCs.
**Their migrations are not currently included in this repository**, so a fresh
database cannot yet reproduce the complete tender workflow.

### Local quality checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The Next.js TypeScript project intentionally excludes the Deno Edge Function.
The function needs its own Deno validation and integration tests before release.

## Help Centre and public tender API

- `/help` gives visitors, bidders, sponsors and administrators short instructions
  and answers to common questions.
- The floating **Need help?** button opens a rule-based guide. It can explain
  platform workflows and query the public tender API; it does not use a paid AI
  service or store chat messages in Supabase.
- `GET /api/public/tenders?status=published&limit=5` returns a JSON object with
  `tenders` and `count`. Optional parameters: `status`, `q` (title search), and
  `limit` (default 5, maximum 20). This endpoint never changes records.

The endpoint permits only publicly visible tender statuses and selected public
fields. Supabase RLS is an additional access boundary; the API does not use a
service-role key. Test anonymously and as each role before production use.

## Security and readiness notes

- Server Actions now verify administrator role for company and document-review
  mutations, validate privileged enum inputs, and normalize dashboard return paths.
- Evidence uploads have a 10 MiB limit, restricted extensions/MIME types, basic
  file-signature checks, and a quarantine-first code path. These checks **do not
  replace** database storage policies or malware scanning.
- The scanner currently sends complete files to VirusTotal. **Do not process
  confidential tenders, personal information, or other sensitive evidence** until
  an appropriate data-sharing policy and consent or a private scanning method
  have been approved.
- Role-based PostgreSQL RPC permissions, RLS, storage bucket policies, and
  transaction behavior require a separate database audit. Their security has
  **not** been verified by the repository-only checks.
- This is an MVP/prototype, **not a verified production-ready procurement system**.

See [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) for prioritized requirements and
[PROJECT_STATUS.md](PROJECT_STATUS.md) for verified work and remaining blockers.
