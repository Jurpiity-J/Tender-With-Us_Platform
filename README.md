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

## Security Features

- Role-based access control
- Supabase Row Level Security policies
- Private file storage bucket
- Quarantine-first file upload model
- Uploaded files start as `pending_scan`
- Only `clean` files can be exposed publicly
- Suspicious files remain `quarantined`
- Blocked file extensions for dangerous upload types
- File size and MIME type checks
- Scanner token kept server-side
- Audit logging for key actions

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

Current lifecycle supported:

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

Create a `.env.local` file using `.env.example` as a guide.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
SCANNER_INTERNAL_TOKEN=your_private_scanner_token