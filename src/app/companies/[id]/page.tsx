import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type CompanyPageProps = {
  params: Promise<{
    id: string
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

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.rpc(
    'get_public_company_accountability',
    {
      p_company_id: id,
    }
  )

  if (error || !data) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <Link href="/tenders" className="text-sm font-medium text-slate-600 underline">
            Back to tenders
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-slate-950">
            Company not found
          </h1>

          <p className="mt-2 text-red-600">
            {error?.message ?? 'This company could not be loaded.'}
          </p>
        </div>
      </main>
    )
  }

  const snapshot = data as any
  const company = snapshot.company
  const reputation = snapshot.reputation
  const flags = snapshot.active_flags ?? []
  const awardedTenders = snapshot.awarded_tenders ?? []

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/tenders" className="text-sm font-medium text-slate-600 underline">
          Back to tenders
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Public company profile
          </p>

          <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                {company.name}
              </h1>

              <p className="mt-2 text-slate-600">
                Verification status: {company.status}
              </p>

              {company.registration_number && (
                <p className="mt-1 text-sm text-slate-500">
                  Registration number: {company.registration_number}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-950 px-8 py-5 text-center text-white">
              <p className="text-4xl font-bold">{reputation.score}</p>
              <p className="text-sm">
                {reputationLabel(Number(reputation.score))}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">Awarded tenders</p>
              <p className="mt-1 text-2xl font-bold">{reputation.awarded_tenders}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">Active flags</p>
              <p className="mt-1 text-2xl font-bold">{reputation.active_flags}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">Rejected milestones</p>
              <p className="mt-1 text-2xl font-bold">{reputation.rejected_milestones}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">Overdue milestones</p>
              <p className="mt-1 text-2xl font-bold">{reputation.overdue_milestones}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex justify-between">
                <p className="font-semibold text-slate-950">Work progress</p>
                <p className="font-bold">{reputation.work_progress_percentage}%</p>
              </div>

              <ProgressBar value={Number(reputation.work_progress_percentage)} />

              <p className="mt-3 text-sm text-slate-600">
                Based on approved or paid milestone value across awarded tenders.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex justify-between">
                <p className="font-semibold text-slate-950">Payment progress</p>
                <p className="font-bold">{reputation.payment_progress_percentage}%</p>
              </div>

              <ProgressBar value={Number(reputation.payment_progress_percentage)} />

              <p className="mt-3 text-sm text-slate-600">
                Based on released milestone payments across awarded tenders.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-slate-950">
            Awarded Tender History
          </h2>

          {awardedTenders.length === 0 ? (
            <p className="mt-5 text-slate-500">
              This company has no awarded tender history yet.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {awardedTenders.map((tender: any) => {
                const workProgress = clampPercent(tender.work_progress_percentage)
                const paymentProgress = clampPercent(tender.payment_progress_percentage)

                return (
                  <Link
                    key={tender.id}
                    href={`/tenders/${tender.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:bg-white hover:shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {tender.status} • {tender.region}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-slate-950">
                      {tender.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      Winning amount: {formatMoney(tender.winning_amount)}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Work progress</span>
                          <span className="font-semibold">{workProgress}%</span>
                        </div>
                        <ProgressBar value={workProgress} />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Payment progress</span>
                          <span className="font-semibold">{paymentProgress}%</span>
                        </div>
                        <ProgressBar value={paymentProgress} />
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-slate-500">
                      Expected: {tender.planned_start_date ?? 'No start'} →{' '}
                      {tender.planned_end_date ?? 'No finish'}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-slate-950">
            Active Flag History
          </h2>

          {flags.length === 0 ? (
            <p className="mt-5 text-slate-500">
              No active public flags for this company.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {flags.map((flag: any) => (
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
      </div>
    </main>
  )
}