import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  awardTenderAction,
  reviewMilestoneEvidenceAction,
  releaseMilestonePaymentAction,
  runAccountabilityScanAction,
  checkTenderCompletionAction,
} from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type SponsorTenderDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(Number(value ?? 0))
}

export default async function SponsorTenderDetailPage({
  params,
  searchParams,
}: SponsorTenderDetailPageProps) {
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

  if (!profile || profile.role !== 'sponsor') {
    redirect('/dashboard')
  }

  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .select(`
      id,
      title,
      description,
      status,
      region,
      category,
      estimated_value,
      submission_deadline,
      planned_start_date,
      planned_end_date,
      awarded_bid_id,
      sponsor_company_id
    `)
    .eq('id', id)
    .single()

  if (tenderError || !tender) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <Link
            href="/dashboard/tenders"
            className="text-sm font-medium text-slate-600 underline"
          >
            Back to my tenders
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-slate-950">
            Tender not found
          </h1>

          <p className="mt-2 text-red-600">
            {tenderError?.message ?? 'This tender could not be loaded.'}
          </p>
        </div>
      </main>
    )
  }

  if (tender.sponsor_company_id !== profile.company_id) {
    redirect('/dashboard/tenders')
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

  const milestoneTotal =
    milestones?.reduce(
      (sum, milestone) => sum + Number(milestone.amount ?? 0),
      0
    ) ?? 0

    const paidMilestones =
      milestones?.filter((milestone) => milestone.status === 'paid').length ?? 0

    const totalMilestones = milestones?.length ?? 0

    const allMilestonesPaid =
      totalMilestones > 0 && paidMilestones === totalMilestones

  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select(`
      id,
      milestone_id,
      amount,
      status,
      released_at,
      created_at
    `)
    .eq('tender_id', tender.id)
    .order('created_at', { ascending: false })
    
  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select(`
      id,
      file_name,
      mime_type,
      file_size_bytes,
      purpose,
      scan_status,
      scan_note,
      storage_path,
      bucket_id,
      tender_id,
      milestone_id,
      created_at,
      uploader:profiles!documents_uploaded_by_fkey (
        full_name,
        role
      )
    `)
    .eq('tender_id', tender.id)
    .order('created_at', { ascending: false })

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (document) => {
      if (document.scan_status !== 'clean') {
        return {
          ...document,
          signedUrl: null,
        }
      }

      const { data } = await supabase.storage
        .from(document.bucket_id ?? 'tender-documents')
        .createSignedUrl(document.storage_path, 60 * 10)

      return {
        ...document,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )

    const { data: flags, error: flagsError } = await supabase
    .from('flags')
    .select(`
      id,
      severity,
      reason,
      flag_type,
      created_at
    `)
    .eq('tender_id', tender.id)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })

  const { data: bids, error: bidsError } = await supabase
    .from('bids')
    .select(`
      id,
      amount,
      proposal_summary,
      status,
      submitted_at,
      updated_at,
      companies!bids_bidder_company_id_fkey (
        id,
        name,
        status
      ),
      profiles!bids_submitted_by_fkey (
        full_name
      )
    `)
    .eq('tender_id', tender.id)
    .order('submitted_at', { ascending: true })

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard/tenders"
          className="text-sm font-medium text-slate-600 underline"
        >
          Back to my tenders
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          {query.message && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {query.message}
            </div>
          )}

          <form
            action={runAccountabilityScanAction.bind(
              null,
              `/dashboard/tenders/${tender.id}`
            )}
            className="mt-6"
          >
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Run accountability scan
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">
              Completion status
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Paid milestones: {paidMilestones} / {totalMilestones}
            </p>

            {tender.status === 'completed' ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                This tender is completed. All milestones have been paid and the awarded amount is accounted for.
              </div>
            ) : allMilestonesPaid ? (
              <form
                action={checkTenderCompletionAction.bind(null, tender.id)}
                className="mt-4"
              >
                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Check and complete tender
                </button>
              </form>
            ) : (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                Tender will complete once all milestones are paid and the full awarded amount has been allocated.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                {tender.status} • {tender.category ?? 'General'} •{' '}
                {tender.region}
              </p>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                {tender.title}
              </h1>

              <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                {tender.description}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm">
              <p className="font-semibold text-slate-950">
                {formatMoney(tender.estimated_value)}
              </p>

              <p className="mt-2 text-slate-600">
                Deadline:{' '}
                {new Date(tender.submission_deadline).toLocaleString('en-ZA')}
              </p>

              <p className="mt-2 text-slate-600">
                Planned: {tender.planned_start_date ?? 'No start'} →{' '}
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
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Accountability Flags
              </h2>

              <p className="mt-2 text-slate-600">
                Public risk signals automatically detected for this tender.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Active flags: {flags?.length ?? 0}
            </p>
          </div>

          {flagsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {flagsError.message}
            </div>
          )}

          {!flags || flags.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No active accountability flags for this tender.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {flags.map((flag) => (
                <article
                  key={flag.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
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
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Milestones
              </h2>

              <p className="mt-2 text-slate-600">
                Define payment-linked work stages for the awarded tender.
              </p>
            </div>

            {tender.status === 'awarded' || tender.status === 'in_progress' ? (
              <Link
                href={`/dashboard/tenders/${tender.id}/milestones/new`}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Add milestone
              </Link>
            ) : null}
          </div>

          {milestonesError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {milestonesError.message}
            </div>
          )}

          {transactionsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {transactionsError.message}
            </div>
          )}

          {documentsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {documentsError.message}
            </div>
          )}

          {!milestones || milestones.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No milestones have been created yet.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Total allocated to milestones
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {formatMoney(milestoneTotal)}
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                {milestones.map((milestone) => {
                  const milestoneTransaction = transactions?.find(
                    (transaction) => transaction.milestone_id === milestone.id
                  )

                  const milestoneDocuments =
                    documentsWithUrls.filter((document) => document.milestone_id === milestone.id) ?? []

                  return (
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
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-950">
                            Submitted evidence
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
                              Submitted: {new Date(milestone.submitted_at).toLocaleString('en-ZA')}
                            </p>
                          )}
                        </div>
                      )}

                      {milestone.verification_note && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-950">
                            Sponsor review note
                          </p>

                          <p className="mt-2 leading-7 text-slate-600">
                            {milestone.verification_note}
                          </p>

                          {milestone.verified_at && (
                            <p className="mt-3 text-xs text-green-700">
                              Verified: {new Date(milestone.verified_at).toLocaleString('en-ZA')}
                            </p>
                          )}

                          {milestone.rejected_at && (
                            <p className="mt-3 text-xs text-red-700">
                              Rejected: {new Date(milestone.rejected_at).toLocaleString('en-ZA')}
                            </p>
                          )}
                        </div>
                      )}

                      {milestone.status === 'submitted' && (
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                          <form
                            action={reviewMilestoneEvidenceAction.bind(
                              null,
                              tender.id,
                              milestone.id,
                              'verified'
                            )}
                            className="rounded-2xl border border-green-200 bg-green-50 p-4"
                          >
                            <h4 className="font-semibold text-green-900">
                              Verify milestone
                            </h4>

                            <p className="mt-1 text-sm text-green-800">
                              This confirms the submitted evidence is acceptable and creates a pending payment transaction.
                            </p>

                            <textarea
                              name="note"
                              rows={3}
                              className="mt-4 w-full rounded-xl border px-3 py-2"
                              placeholder="Optional verification note"
                            />

                            <button
                              type="submit"
                              className="mt-4 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                            >
                              Verify milestone
                            </button>
                          </form>

                          <form
                            action={reviewMilestoneEvidenceAction.bind(
                              null,
                              tender.id,
                              milestone.id,
                              'rejected'
                            )}
                            className="rounded-2xl border border-red-200 bg-red-50 p-4"
                          >
                            <h4 className="font-semibold text-red-900">
                              Reject evidence
                            </h4>

                            <p className="mt-1 text-sm text-red-800">
                              Rejecting requires a reason. The bidder will be able to resubmit evidence.
                            </p>

                            <textarea
                              name="note"
                              rows={3}
                              required
                              className="mt-4 w-full rounded-xl border px-3 py-2"
                              placeholder="Explain what must be fixed before resubmission"
                            />

                            <button
                              type="submit"
                              className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                            >
                              Reject evidence
                            </button>
                          </form>
                        </div>
                      )}

                      {milestone.status === 'verified' && (
                        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                          This milestone is verified. A pending payment transaction has been created.
                        </div>
                      )}

                      {milestone.status === 'rejected' && (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                          This milestone was rejected. The winning bidder can resubmit corrected evidence.
                        </div>
                      )}

                      {milestone.status === 'paid' && (
                        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                          This milestone has been paid.
                        </div>
                      )}

                      {milestoneDocuments.length > 0 && (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-950">
                            Attached evidence files
                          </p>

                          <div className="mt-3 grid gap-3">
                            {milestoneDocuments.map((document) => {
                              const uploader = Array.isArray(document.uploader)
                                ? document.uploader[0]
                                : document.uploader

                              return (
                                <div
                                  key={document.id}
                                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                >
                                  <p className="font-semibold text-slate-950">
                                    {document.file_name}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-600">
                                    Status: {document.scan_status}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-600">
                                    Type: {document.mime_type ?? 'Unknown'}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-600">
                                    Uploaded by: {uploader?.full_name ?? 'Unknown user'}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Uploaded: {new Date(document.created_at).toLocaleString('en-ZA')}
                                  </p>

                                  {document.scan_status === 'pending_scan' && (
                                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                      This file is boxed in quarantine and is waiting for admin review.
                                    </div>
                                  )}

                                  {document.scan_status === 'clean' && (
                                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                      This file has been marked clean by an admin.
                                    </div>
                                  )}

                                  {document.scan_status === 'clean' && document.signedUrl && (
                                    <a
                                      href={document.signedUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-3 inline-flex text-sm font-semibold text-slate-950 underline"
                                    >
                                      Open approved file
                                    </a>
                                  )}

                                  {(document.scan_status === 'quarantined' ||
                                    document.scan_status === 'rejected') && (
                                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                      This file is not safe for access.
                                      {document.scan_note ? ` Reason: ${document.scan_note}` : ''}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {milestoneTransaction && (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-950">
                            Payment transaction
                          </p>

                          <p className="mt-2 text-sm text-slate-600">
                            Amount: {formatMoney(milestoneTransaction.amount)}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            Status: {milestoneTransaction.status}
                          </p>

                          {milestoneTransaction.released_at && (
                            <p className="mt-1 text-xs text-green-700">
                              Released:{' '}
                              {new Date(milestoneTransaction.released_at).toLocaleString('en-ZA')}
                            </p>
                          )}

                          {milestone.status === 'verified' &&
                            milestoneTransaction.status === 'pending' && (
                              <form
                                action={releaseMilestonePaymentAction.bind(
                                  null,
                                  tender.id,
                                  milestoneTransaction.id
                                )}
                                className="mt-4"
                              >
                                <button
                                  type="submit"
                                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                >
                                  Release payment
                                </button>
                              </form>
                            )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Submitted bids
              </h2>

              <p className="mt-2 text-slate-600">
                Review bidder submissions and award one bid.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Total bids: {bids?.length ?? 0}
            </p>
          </div>

          {bidsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {bidsError.message}
            </div>
          )}

          {!bids || bids.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No bids have been submitted for this tender yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {bids.map((bid) => {
                const company = Array.isArray(bid.companies)
                  ? bid.companies[0]
                  : bid.companies

                const submittedBy = Array.isArray(bid.profiles)
                  ? bid.profiles[0]
                  : bid.profiles

                const isAwarded = tender.awarded_bid_id === bid.id
                const canAward =
                  tender.status === 'published' && bid.status === 'submitted'

                return (
                  <article
                    key={bid.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Bid status: {bid.status}
                        </p>

                        <h3 className="mt-2 text-xl font-bold text-slate-950">
                          {company?.name ?? 'Unknown company'}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Company status: {company?.status ?? 'unknown'}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Submitted by:{' '}
                          {submittedBy?.full_name ?? 'Unknown user'}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xl font-bold text-slate-950">
                          {formatMoney(bid.amount)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {new Date(bid.submitted_at).toLocaleString('en-ZA')}
                        </p>

                        {bid.updated_at && (
                          <p className="mt-1 text-xs text-slate-500">
                            Updated:{' '}
                            {new Date(bid.updated_at).toLocaleString('en-ZA')}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-5 leading-7 text-slate-700">
                      {bid.proposal_summary}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      {isAwarded && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                          Awarded bid
                        </span>
                      )}

                      {bid.status === 'rejected' && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                          Rejected
                        </span>
                      )}

                      {canAward && (
                        <form
                          action={awardTenderAction.bind(
                            null,
                            tender.id,
                            bid.id
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Award this bid
                          </button>
                        </form>
                      )}
                    </div>
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