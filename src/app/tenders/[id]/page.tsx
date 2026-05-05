import Link from 'next/link'
import { submitBidAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type TenderDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    error?: string
  }>
}

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(Number(value ?? 0))
}

function clampPercent(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0)

  if (!Number.isFinite(numberValue)) {
    return 0
  }

  return Math.max(0, Math.min(100, numberValue))
}

function ProgressBar({ value }: { value: number }) {
  const percent = clampPercent(value)

  return (
    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-950"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function reputationLabel(score: number) {
  if (score >= 85) return 'Strong'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Watch'
  return 'High risk'
}

export default async function TenderDetailPage({
  params,
  searchParams,
}: TenderDetailPageProps) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: {
    role: string
    company_id: string | null
  } | null = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    profile = data
  }

  const { data, error } = await supabase.rpc(
    'get_public_tender_accountability',
    {
      p_tender_id: id,
    }
  )

  if (error || !data) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <Link href="/tenders" className="text-sm font-medium text-slate-600 underline">
            Back to tenders
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-slate-950">
            Tender not found
          </h1>

          <p className="mt-2 text-red-600">
            {error?.message ?? 'This tender could not be loaded.'}
          </p>
        </div>
      </main>
    )
  }

  const accountability = data as any
  const tender = accountability.tender
  const sponsor = accountability.sponsor
  const awardedBid = accountability.awarded_bid
  const reputation = accountability.winning_company_reputation
  const milestones = accountability.milestones ?? []
  const progress = accountability.progress
  const flags = accountability.flags ?? []

  const isBidder = profile?.role === 'bidder'
  const isOpen = tender.status === 'published'
  const deadlinePassed = new Date(tender.submission_deadline) <= new Date()

  const workProgress = clampPercent(progress?.work_progress_percentage)
  const paymentProgress = clampPercent(progress?.payment_progress_percentage)

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/tenders" className="text-sm font-medium text-slate-600 underline">
          Back to tenders
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {tender.status} • {tender.category ?? 'General'} • {tender.region}
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            {tender.title}
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            {tender.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Estimated value
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {formatMoney(tender.estimated_value)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Sponsor
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {sponsor?.name ?? 'Not available'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Expected start
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {tender.planned_start_date ?? 'Not set'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Expected finish
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {tender.planned_end_date ?? 'Not set'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-slate-950">
            Awarded Company & Progress
          </h2>

          {!awardedBid ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                This tender has not been awarded yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Winning company
                </p>

                <Link
                  href={`/companies/${awardedBid.company_id}`}
                  className="mt-2 block text-xl font-bold text-slate-950 underline"
                >
                  {awardedBid.company_name}
                </Link>

                <p className="mt-2 text-sm text-slate-600">
                  Award amount: {formatMoney(awardedBid.amount)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Work progress
                  </p>

                  <p className="text-sm font-bold text-slate-950">
                    {workProgress}%
                  </p>
                </div>

                <ProgressBar value={workProgress} />

                <p className="mt-3 text-sm text-slate-600">
                  Based on approved or paid milestone value.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Payment progress
                  </p>

                  <p className="text-sm font-bold text-slate-950">
                    {paymentProgress}%
                  </p>
                </div>

                <ProgressBar value={paymentProgress} />

                <p className="mt-3 text-sm text-slate-600">
                  Based on milestone payments released.
                </p>
              </div>

              {reputation && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">
                        Company reputation score
                      </h3>

                      <p className="mt-2 text-slate-600">
                        Score is based on awarded work, milestone progress, active flags,
                        rejected evidence, and overdue milestones.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-6 py-4 text-center text-white">
                      <p className="text-3xl font-bold">{reputation.score}</p>
                      <p className="text-sm">{reputationLabel(Number(reputation.score))}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-slate-500">Awarded tenders</p>
                      <p className="mt-1 text-xl font-bold">{reputation.awarded_tenders}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-slate-500">Active flags</p>
                      <p className="mt-1 text-xl font-bold">{reputation.active_flags}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-slate-500">Rejected milestones</p>
                      <p className="mt-1 text-xl font-bold">{reputation.rejected_milestones}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-slate-500">Overdue milestones</p>
                      <p className="mt-1 text-xl font-bold">{reputation.overdue_milestones}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Public Milestone Tracker
              </h2>

              <p className="mt-2 text-slate-600">
                Citizens can track progress from milestone creation to approval and payment.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {progress.total_milestones} milestone(s)
            </p>
          </div>

          {!milestones || milestones.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No public milestones have been created yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {milestones.map((milestone: any) => (
                <article
                  key={milestone.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Milestone {milestone.sequence_number} • {milestone.status}
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-slate-950">
                        {milestone.title}
                      </h3>

                      {milestone.description && (
                        <p className="mt-2 leading-7 text-slate-600">
                          {milestone.description}
                        </p>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-lg font-bold text-slate-950">
                        {formatMoney(milestone.amount)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Due: {new Date(milestone.due_date).toLocaleDateString('en-ZA')}
                      </p>
                    </div>
                  </div>

                  {milestone.progress_summary && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">
                        Submitted progress
                      </p>

                      <p className="mt-2 leading-7 text-slate-600">
                        {milestone.progress_summary}
                      </p>

                      {milestone.evidence_url && (
                        <a
                          href={milestone.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-semibold underline"
                        >
                          Open evidence link
                        </a>
                      )}
                    </div>
                  )}

                  {milestone.status === 'verified' && (
                    <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                      Approved. This milestone has been verified.
                    </div>
                  )}

                  {milestone.status === 'rejected' && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                      Rejected. Reason: {milestone.verification_note ?? 'No reason recorded.'}
                    </div>
                  )}

                  {milestone.status === 'paid' && (
                    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                      Paid. This milestone has been approved and payment has been released.
                    </div>
                  )}

                  {milestone.status === 'submitted' && (
                    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
                      Evidence submitted. Waiting for sponsor review.
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Public Accountability Flags
              </h2>

              <p className="mt-2 text-slate-600">
                Public risk indicators generated from tender activity.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Active flags: {flags.length}
            </p>
          </div>

          {flags.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-slate-600">
                No active public flags for this tender.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {flags.map((flag: any) => (
                <article
                  key={flag.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    {flag.severity} • {flag.flag_type ?? 'general_flag'}
                  </p>

                  <p className="mt-2 leading-7 text-amber-950">
                    {flag.reason}
                  </p>

                  <p className="mt-3 text-xs text-amber-700">
                    Created: {new Date(flag.created_at).toLocaleString('en-ZA')}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-slate-950">
            Submit a bid
          </h2>

          {!user && (
            <p className="mt-4 text-slate-600">
              You need to{' '}
              <Link href="/login" className="font-medium underline">
                log in
              </Link>{' '}
              as a bidder to submit a bid.
            </p>
          )}

          {user && !isBidder && (
            <p className="mt-4 text-slate-600">
              Only bidder accounts can submit bids.
            </p>
          )}

          {isBidder && !isOpen && (
            <p className="mt-4 text-slate-600">
              This tender is not currently open for bids.
            </p>
          )}

          {isBidder && isOpen && deadlinePassed && (
            <p className="mt-4 text-slate-600">
              The submission deadline has passed.
            </p>
          )}

          {query.error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {query.error}
            </div>
          )}

          {isBidder && isOpen && !deadlinePassed && (
            <form
              action={submitBidAction.bind(null, tender.id)}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="text-sm font-medium text-slate-900">
                  Bid amount
                </label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="750000"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900">
                  Proposal summary
                </label>
                <textarea
                  name="proposalSummary"
                  rows={5}
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Summarise your implementation plan, capacity, timeline, and accountability approach."
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Submit bid
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}