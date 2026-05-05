import Link from 'next/link'
import { redirect } from 'next/navigation'
import { submitMilestoneEvidenceAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type ProjectDetailPageProps = {
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

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'bidder' || !profile.company_id) {
    redirect('/dashboard')
  }

  const { data: winningBid, error: winningBidError } = await supabase
    .from('bids')
    .select(`
      id,
      amount,
      status,
      bidder_company_id,
      tenders!bids_tender_id_fkey (
        id,
        title,
        description,
        status,
        region,
        estimated_value,
        planned_start_date,
        planned_end_date
      )
    `)
    .eq('tender_id', id)
    .eq('status', 'awarded')
    .single()

  if (winningBidError || !winningBid) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-slate-600 underline"
          >
            Back to projects
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-slate-950">
            Project not found
          </h1>

          <p className="mt-2 text-red-600">
            {winningBidError?.message ??
              'This awarded project could not be loaded.'}
          </p>
        </div>
      </main>
    )
  }

  if (winningBid.bidder_company_id !== profile.company_id) {
    redirect('/dashboard/projects')
  }

  const tender = Array.isArray(winningBid.tenders)
    ? winningBid.tenders[0]
    : winningBid.tenders

  if (!tender) {
    redirect('/dashboard/projects')
  }

  const { data: milestones, error: milestonesError } = await supabase
    .from('milestones')
    .select(`
      id,
      title,
      description,
      sequence_number,
      due_date,
      amount,
      status,
      submitted_at,
      verified_at,
      rejected_at,
      progress_summary,
      evidence_url,
      verification_note
    `)
    .eq('tender_id', tender.id)
    .order('sequence_number', { ascending: true })

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard/projects"
          className="text-sm font-medium text-slate-600 underline"
        >
          Back to projects
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {tender.status} • {tender.region}
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            {tender.title}
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            {tender.description}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Winning bid
              </p>

              <p className="mt-2 font-bold text-slate-950">
                {formatMoney(winningBid.amount)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Tender value
              </p>

              <p className="mt-2 font-bold text-slate-950">
                {formatMoney(tender.estimated_value)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Planned dates
              </p>

              <p className="mt-2 font-bold text-slate-950">
                {tender.planned_start_date ?? 'No start'} →{' '}
                {tender.planned_end_date ?? 'No end'}
              </p>
            </div>
          </div>

          {query.error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {query.error}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-slate-950">
            Milestone Evidence
          </h2>

          <p className="mt-2 text-slate-600">
            Submit work evidence for sponsor verification. You cannot approve
            your own milestone.
          </p>

          {milestonesError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {milestonesError.message}
            </div>
          )}

          {!milestones || milestones.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No milestones have been created by the sponsor yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {milestones.map((milestone) => {
                const canSubmit =
                  milestone.status === 'pending' ||
                  milestone.status === 'rejected'

                return (
                  <article
                    key={milestone.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Milestone {milestone.sequence_number} •{' '}
                          {milestone.status}
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
                          Due:{' '}
                          {new Date(milestone.due_date).toLocaleDateString(
                            'en-ZA'
                          )}
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
                            className="mt-3 inline-flex text-sm font-semibold text-slate-950 underline"
                          >
                            Open evidence link
                          </a>
                        )}

                        {milestone.submitted_at && (
                          <p className="mt-3 text-xs text-slate-500">
                            Submitted:{' '}
                            {new Date(
                              milestone.submitted_at
                            ).toLocaleString('en-ZA')}
                          </p>
                        )}
                      </div>
                    )}

                    {milestone.status === 'submitted' && (
                      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-900">
                          Awaiting sponsor review
                        </p>

                        <p className="mt-2 text-sm leading-6 text-blue-800">
                          Your evidence has been submitted. The sponsor has not
                          approved or rejected it yet.
                        </p>
                      </div>
                    )}

                    {milestone.status === 'verified' && (
                      <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-semibold text-green-900">
                          Milestone approved
                        </p>

                        <p className="mt-2 text-sm leading-6 text-green-800">
                          The sponsor approved this milestone. Payment is now
                          pending release.
                        </p>

                        {milestone.verification_note && (
                          <div className="mt-3 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                              Sponsor note
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-700">
                              {milestone.verification_note}
                            </p>
                          </div>
                        )}

                        {milestone.verified_at && (
                          <p className="mt-3 text-xs text-green-700">
                            Approved:{' '}
                            {new Date(
                              milestone.verified_at
                            ).toLocaleString('en-ZA')}
                          </p>
                        )}
                      </div>
                    )}

                    {milestone.status === 'rejected' && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-900">
                          Milestone rejected
                        </p>

                        <p className="mt-2 text-sm leading-6 text-red-800">
                          The sponsor rejected this evidence. Review the reason
                          below and resubmit corrected evidence.
                        </p>

                        {milestone.verification_note && (
                          <div className="mt-3 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                              Rejection reason
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-700">
                              {milestone.verification_note}
                            </p>
                          </div>
                        )}

                        {milestone.rejected_at && (
                          <p className="mt-3 text-xs text-red-700">
                            Rejected:{' '}
                            {new Date(
                              milestone.rejected_at
                            ).toLocaleString('en-ZA')}
                          </p>
                        )}
                      </div>
                    )}

                    {milestone.status === 'paid' && (
                      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-semibold text-emerald-900">
                          Milestone paid
                        </p>

                        <p className="mt-2 text-sm leading-6 text-emerald-800">
                          This milestone was approved and the payment has been
                          released.
                        </p>

                        {milestone.verification_note && (
                          <div className="mt-3 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Sponsor note
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-700">
                              {milestone.verification_note}
                            </p>
                          </div>
                        )}

                        {milestone.verified_at && (
                          <p className="mt-3 text-xs text-emerald-700">
                            Approved:{' '}
                            {new Date(
                              milestone.verified_at
                            ).toLocaleString('en-ZA')}
                          </p>
                        )}
                      </div>
                    )}

                    {canSubmit && (
                      <form
                        action={submitMilestoneEvidenceAction.bind(
                          null,
                          tender.id,
                          milestone.id
                        )}
                        className="mt-6 space-y-4"
                      >
                        <div>
                          <label className="text-sm font-medium text-slate-900">
                            Progress summary
                          </label>

                          <textarea
                            name="progressSummary"
                            rows={5}
                            required
                            className="mt-1 w-full rounded-xl border px-3 py-2"
                            placeholder="Explain what was completed and what evidence is being provided."
                            defaultValue={milestone.progress_summary ?? ''}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-900">
                            Evidence link
                          </label>

                          <input
                            name="evidenceUrl"
                            type="url"
                            className="mt-1 w-full rounded-xl border px-3 py-2"
                            placeholder="https://example.com/evidence-folder"
                            defaultValue={milestone.evidence_url ?? ''}
                          />

                          <p className="mt-1 text-xs text-slate-500">
                            For now, paste a link to photos, PDFs, or a shared
                            evidence folder.
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-900">
                            Evidence file
                          </label>

                          <input
                            name="evidenceFile"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain"
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                          />

                          <p className="mt-1 text-xs text-slate-500">
                            Uploaded files are quarantined first. They become public only after admin approval.
                          </p>
                        </div>

                        <button
                          type="submit"
                          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          {milestone.status === 'rejected'
                            ? 'Resubmit corrected evidence'
                            : 'Submit milestone evidence'}
                        </button>
                      </form>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}