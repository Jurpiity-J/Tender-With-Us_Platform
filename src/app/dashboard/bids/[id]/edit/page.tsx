import Link from 'next/link'
import { redirect } from 'next/navigation'
import { updateBidAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type EditBidPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    error?: string
  }>
}

export default async function EditBidPage({
  params,
  searchParams,
}: EditBidPageProps) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: bid, error } = await supabase
    .from('bids')
    .select(`
      id,
      amount,
      proposal_summary,
      status,
      submitted_at,
      tenders!bids_tender_id_fkey (
        id,
        title,
        status,
        submission_deadline
      )
    `)
    .eq('id', id)
    .single()

  if (error || !bid) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <Link href="/dashboard/bids" className="text-sm text-gray-500 underline">
            Back to my bids
          </Link>

          <h1 className="mt-4 text-2xl font-bold">Bid not found</h1>

          <p className="mt-2 text-red-600">
            {error?.message ?? 'This bid could not be loaded.'}
          </p>
        </div>
      </main>
    )
  }

  const tender = Array.isArray(bid.tenders)
    ? bid.tenders[0]
    : bid.tenders

  const deadlinePassed = tender
    ? new Date(tender.submission_deadline) <= new Date()
    : true

  const canEdit =
    bid.status === 'submitted' &&
    tender?.status === 'published' &&
    !deadlinePassed

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/bids" className="text-sm text-gray-500 underline">
          Back to my bids
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Edit bid</h1>

          <p className="mt-2 text-gray-600">
            {tender?.title ?? 'Tender unavailable'}
          </p>

          <div className="mt-6 rounded-xl border bg-gray-50 p-4 text-sm">
            <p>
              Bid status: <span className="font-medium">{bid.status}</span>
            </p>

            <p className="mt-1">
              Submission deadline:{' '}
              {tender
                ? new Date(tender.submission_deadline).toLocaleString('en-ZA')
                : 'Not available'}
            </p>
          </div>

          {query.error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {query.error}
            </div>
          )}

          {!canEdit ? (
            <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              This bid can no longer be edited. Bids can only be edited while
              the tender is published and before the submission deadline.
            </div>
          ) : (
            <form
              action={updateBidAction.bind(null, bid.id)}
              className="mt-8 space-y-5"
            >
              <div>
                <label className="text-sm font-medium">Bid amount</label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  defaultValue={Number(bid.amount)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Proposal summary</label>
                <textarea
                  name="proposalSummary"
                  rows={6}
                  required
                  defaultValue={bid.proposal_summary}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Save bid changes
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}