import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(Number(value ?? 0))
}

export default async function MyBidsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'bidder') {
    redirect('/dashboard')
  }

  const { data: bids, error } = await supabase
    .from('bids')
    .select(`
        id,
        amount,
        proposal_summary,
        status,
        submitted_at,
        updated_at,
        tenders!bids_tender_id_fkey (
        id,
        title,
        region,
        status,
        estimated_value,
        submission_deadline
        )
    `)
    .order('submitted_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-gray-500 underline">
          Back to dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-bold">My Bids</h1>

        <p className="mt-2 text-gray-600">
          Track bids submitted by your company.
        </p>

        {error && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        {!bids || bids.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-gray-500">You have not submitted any bids yet.</p>

            <Link
              href="/tenders"
              className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Browse tenders
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {bids.map((bid) => {
              const tender = Array.isArray(bid.tenders)
                ? bid.tenders[0]
                : bid.tenders

              return (
                <div key={bid.id} className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Bid status: {bid.status}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">
                        {tender?.title ?? 'Tender unavailable'}
                      </h2>

                      <p className="mt-2 text-sm text-gray-600">
                        {bid.proposal_summary}
                      </p>
                    </div>

                    <div className="text-right text-sm">
                      <p className="font-medium">{formatMoney(bid.amount)}</p>
                      <p className="mt-1 text-gray-500">
                        {new Date(bid.submitted_at).toLocaleString('en-ZA')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {tender && (
                        <Link
                        href={`/tenders/${tender.id}`}
                        className="inline-flex text-sm font-medium underline"
                        >
                        View tender
                        </Link>
                    )}

                    {tender &&
                        bid.status === 'submitted' &&
                        tender.status === 'published' &&
                        new Date(tender.submission_deadline) > new Date() && (
                        <Link
                            href={`/dashboard/bids/${bid.id}/edit`}
                            className="inline-flex text-sm font-medium underline"
                        >
                            Edit bid
                        </Link>
                        )}
                    </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}