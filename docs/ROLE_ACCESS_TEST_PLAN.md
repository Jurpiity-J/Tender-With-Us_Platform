# Role-based login and access test plan

**Status:** Planned only — no login attempts, account creation or database
mutations have been performed as part of this checklist.

This is a separate manual test record for the Tender-With-Us **demo**. Use
fake accounts and test tenders in an isolated environment. It supplements,
but does not replace, automated Supabase RLS and RPC authorization tests.

## 1. Prepare demo identities (do not record credentials here)

| Alias | Application role | Company | Purpose |
| --- | --- | --- | --- |
| `SPONSOR_A` | `sponsor` (host) | Verified Sponsor Company A | Owns Tender A |
| `SPONSOR_B` | `sponsor` (host) | Verified Sponsor Company B | Owns Tender B; cross-company control |
| `BIDDER_A` | `bidder` | Verified Bidder Company A | Submits Bid A |
| `BIDDER_B` | `bidder` | Verified Bidder Company B | Submits Bid B; cross-company control |
| `PUBLIC_1` | `public_user` | None | Public account access |
| `ADMIN_1` | `admin` | As configured by trusted admin setup | Company and document moderation |
| `PENDING_BIDDER` | `bidder` | Pending Bidder Company C | Verification restriction |
| `VISITOR` | No session | None | Unauthenticated public access |

- Create/verify any needed accounts **only after a separate go-ahead**.
- Admin accounts must be provisioned through a trusted administrative path,
  not public registration.
- Use two separate sponsor companies and bidder companies to test boundaries.
- Never put passwords, session cookies, JWTs, service-role keys, or actual
  customer data in this file, screenshots, issues, or commit messages.
- If Supabase email confirmation is enabled, confirm the test identity before
  attempting its valid sign-in.

## 2. Two login attempts per signed-in role

Run these only when the demo identities are available. Repeat the two checks
for each of `SPONSOR_A`, `SPONSOR_B`, `BIDDER_A`, `BIDDER_B`, `PUBLIC_1`,
`ADMIN_1` and `PENDING_BIDDER`.

| Attempt | Action | Expected result | Result |
| --- | --- | --- | --- |
| `AUTH-01` | Sign in at `/login` with that identity's **correct** test credentials | Sign-in succeeds; `/dashboard` loads the identity's own role/profile | Not run |
| `AUTH-02` | Sign out; attempt sign-in with that identity's email and an **intentionally wrong** password | Sign-in is rejected; no authenticated dashboard/session is granted | Not run |

Before changing identities, sign out and use a clean/private browser context
so an old session cannot distort the result. `VISITOR` has no login attempts:
instead verify public pages without signing in.

## 3. One or two role-specific permission checks

Record both the intended result and the actual result. A denied database read
may produce an empty result rather than an HTTP 403; verify that **no protected
data was returned or changed**, not just the response code.

| Test ID | Identity | Test action | Expected outcome | Result |
| --- | --- | --- | --- | --- |
| `ACC-01` | `VISITOR` | Open `/tenders` and a published tender | Public tender information visible | Not run |
| `ACC-02` | `VISITOR` | Open `/dashboard/admin/companies` without a session | Protected administration access denied or login required | Not run |
| `ACC-03` | `PUBLIC_1` | Browse published tenders and news | Public information visible | Not run |
| `ACC-04` | `PUBLIC_1` | Try sponsor-only tender creation | Action denied; no tender created | Not run |
| `ACC-05` | `BIDDER_A` | Bid on an open tender while company is verified | Own valid bid accepted, if deadline and other conditions allow | Not run |
| `ACC-06` | `BIDDER_A` | Attempt to edit/read `BIDDER_B`'s private bid | Other bidder's private data and writes denied | Not run |
| `ACC-07` | `BIDDER_B` | Open a public tender and view own bid | Public tender and own bid visible | Not run |
| `ACC-08` | `BIDDER_B` | Attempt sponsor-only award action | Action denied; no award created | Not run |
| `ACC-09` | `PENDING_BIDDER` | Attempt to submit a bid before company verification | Submission denied | Not run |
| `ACC-10` | `SPONSOR_A` | Create a draft tender for own company | Own draft created | Not run |
| `ACC-11` | `SPONSOR_A` | Attempt to manage/award `SPONSOR_B`'s tender | Other company's tender changes denied | Not run |
| `ACC-12` | `SPONSOR_B` | View and manage its own draft tender | Own tender accessible | Not run |
| `ACC-13` | `SPONSOR_B` | Attempt to review a milestone belonging to `SPONSOR_A` | Other company's milestone changes denied | Not run |
| `ACC-14` | `ADMIN_1` | Open company and document review screens | Authorized admin controls visible | Not run |
| `ACC-15` | `ADMIN_1` | Approve one designated pending **test** company | Only the selected company is updated; the event is audited | Not run |

For each role, also perform the corresponding **direct API/RPC permission
assertions** in an isolated automated test suite. The browser UI hiding a
button is not sufficient evidence that the underlying operation is denied.
Add tests for document visibility, payment release, tender completion and
accountability scans after their intended access policies are reviewed.

## 4. Execution log — fill in later

| Date | Environment | Account alias | Test ID | Pass / Fail / Blocked | Evidence reference (no secrets) | Issue / follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | Not run | — | — |

**Completion criteria:** all intended allow/deny cases pass in the browser
*and* the database API/RPC layer; tests are repeatable on fresh demo data;
no privileged data or operation leaks across company or role boundaries.

## 5. Later automation

- Add role-isolation assertions under `supabase/tests/` using pgTAP once a
  reproducible schema/migration baseline exists.
- Add an application-level browser smoke suite for sign-in, sign-out and
  role-based dashboard navigation.
- Keep the manual execution log separate from security remediation details;
  record findings privately until the relevant fixes are deployed.
