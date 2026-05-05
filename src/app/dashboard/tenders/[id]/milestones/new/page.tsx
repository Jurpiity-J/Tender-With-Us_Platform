import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createMilestoneAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type NewMilestonePageProps = {
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

export default async function NewMilestonePage({
  params,
  searchParams,
}: NewMilestonePageProps) {
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
    .select('id, title, status, sponsor_company_id, awarded_bid_id')
    .eq('id', id)
    .single()

  if (tenderError || !tender) {
    redirect('/dashboard/tenders')
  }

  if (tender.sponsor_company_id !== profile.company_id) {
    redirect('/dashboard/tenders')
  }

  if (!tender.awarded_bid_id) {
    redirect(`/dashboard/tenders/${id}`)
  }

  const { data: awardedBid } = await supabase
    .from('bids')
    .select('amount')
    .eq('id', tender.awarded_bid_id)
    .single()

  const { data: milestones } = await supabase
    .from('milestones')
    .select('amount')
    .eq('tender_id', id)

  const awardedAmount = Number(awardedBid?.amount ?? 0)
  const milestoneTotal =
    milestones?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0

  const remainingAmount = awardedAmount - milestoneTotal

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/dashboard/tenders/${id}`}
          className="text-sm font-medium text-slate-600 underline"
        >
          Back to tender
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Milestone planning
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Add milestone
          </h1>

          <p className="mt-2 text-slate-600">
            {tender.title}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Awarded amount
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {formatMoney(awardedAmount)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Allocated
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {formatMoney(milestoneTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Remaining
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {formatMoney(remainingAmount)}
              </p>
            </div>
          </div>

          {query.error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {query.error}
            </div>
          )}

          {remainingAmount <= 0 ? (
            <div className="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              The full awarded amount has already been allocated to milestones.
            </div>
          ) : (
            <form
              action={createMilestoneAction.bind(null, tender.id)}
              className="mt-8 space-y-5"
            >
              <div>
                <label className="text-sm font-medium text-slate-900">
                  Milestone title
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Foundation work completed"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={5}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Describe the evidence required before this milestone can be verified."
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-900">
                    Due date
                  </label>
                  <input
                    name="dueDate"
                    type="date"
                    required
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">
                    Milestone amount
                  </label>
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    max={remainingAmount}
                    step="0.01"
                    required
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="250000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create milestone
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}