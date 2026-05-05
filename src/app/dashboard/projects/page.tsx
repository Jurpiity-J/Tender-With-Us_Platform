import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(Number(value ?? 0))
}

export default async function BidderProjectsPage() {
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

  const { data: awardedBids, error } = await supabase
    .from('bids')
    .select(`
      id,
      amount,
      status,
      submitted_at,
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
    .eq('status', 'awarded')
    .order('submitted_at', { ascending: false })

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 underline">
          Back to dashboard
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <h1 className="text-3xl font-bold text-slate-950">
            My Awarded Projects
          </h1>

          <p className="mt-2 text-slate-600">
            View awarded tenders and submit milestone progress evidence.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message}
            </div>
          )}

          {!awardedBids || awardedBids.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                You do not have any awarded projects yet.
              </p>

              <Link
                href="/tenders"
                className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Browse tenders
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5">
              {awardedBids.map((bid) => {
                const tender = Array.isArray(bid.tenders)
                  ? bid.tenders[0]
                  : bid.tenders

                if (!tender) {
                  return null
                }

                return (
                  <Link
                    key={bid.id}
                    href={`/dashboard/projects/${tender.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:bg-white hover:shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {tender.status} • {tender.region}
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-slate-950">
                      {tender.title}
                    </h2>

                    <p className="mt-2 leading-7 text-slate-600">
                      {tender.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <p className="font-semibold text-slate-950">
                        Winning bid: {formatMoney(bid.amount)}
                      </p>

                      <p className="text-slate-500">
                        Planned: {tender.planned_start_date ?? 'No start'} →{' '}
                        {tender.planned_end_date ?? 'No end'}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}