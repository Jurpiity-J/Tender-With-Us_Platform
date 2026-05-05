import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type PublicTendersPageProps = {
  searchParams: Promise<{
    q?: string
    status?: string
    region?: string
    category?: string
    company?: string
    severity?: string
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
    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-950"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export default async function PublicTendersPage({
  searchParams,
}: PublicTendersPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const search = params.q?.trim() ?? ''
  const status = params.status?.trim() ?? ''
  const region = params.region?.trim() ?? ''
  const category = params.category?.trim() ?? ''
  const company = params.company?.trim() ?? ''
  const severity = params.severity?.trim() ?? ''

  const { data: tenders, error } = await supabase.rpc('search_public_tenders', {
    p_search: search || null,
    p_status: status || null,
    p_region: region || null,
    p_category: category || null,
    p_company: company || null,
    p_flag_severity: severity || null,
  })

  const hasFilters =
    search || status || region || category || company || severity

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <Link
          href={user ? '/dashboard' : '/'}
          className="text-sm font-medium text-slate-600 underline"
        >
          {user ? 'Back to dashboard' : 'Back home'}
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Public tender register
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            Search public tenders
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Browse public tenders from publication through award, implementation,
            payment, and completion. Citizens can search by project, company,
            region, status, and public accountability flags.
          </p>

          <form className="mt-8 grid gap-4 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-900">
                Search
              </label>
              <input
                name="q"
                type="text"
                defaultValue={search}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Roads, school, clinic..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">
                Status
              </label>
              <select
                name="status"
                defaultValue={status}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="awarded">Awarded</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">
                Region
              </label>
              <input
                name="region"
                type="text"
                defaultValue={region}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Gauteng"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">
                Category
              </label>
              <input
                name="category"
                type="text"
                defaultValue={category}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Infrastructure"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">
                Flag severity
              </label>
              <select
                name="severity"
                defaultValue={severity}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                <option value="">Any severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-900">
                Company
              </label>
              <input
                name="company"
                type="text"
                defaultValue={company}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Sponsor or winning company"
              />
            </div>

            <div className="flex items-end gap-3 lg:col-span-4">
              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Search register
              </button>

              {hasFilters && (
                <Link
                  href="/tenders"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Clear filters
                </Link>
              )}
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Public results
              </h2>

              <p className="mt-2 text-slate-600">
                {tenders?.length ?? 0} tender(s) found.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message}
            </div>
          )}

          {!tenders || tenders.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No public tenders match these filters.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {tenders.map((tender: any) => {
                const workProgress = clampPercent(
                  tender.work_progress_percentage
                )
                const paymentProgress = clampPercent(
                  tender.payment_progress_percentage
                )

                return (
                  <Link
                    key={tender.id}
                    href={`/tenders/${tender.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          {tender.status} • {tender.category ?? 'General'} •{' '}
                          {tender.region ?? 'No region'}
                        </p>

                        <h3 className="mt-2 text-2xl font-bold text-slate-950">
                          {tender.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {tender.description}
                        </p>

                        <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                          <p>
                            Sponsor:{' '}
                            <span className="font-semibold text-slate-950">
                              {tender.sponsor_company_name ?? 'Not available'}
                            </span>
                          </p>

                          <p>
                            Winning company:{' '}
                            <span className="font-semibold text-slate-950">
                              {tender.awarded_company_name ?? 'Not awarded yet'}
                            </span>
                          </p>

                          <p>
                            Expected start:{' '}
                            <span className="font-semibold text-slate-950">
                              {tender.planned_start_date ?? 'Not set'}
                            </span>
                          </p>

                          <p>
                            Expected finish:{' '}
                            <span className="font-semibold text-slate-950">
                              {tender.planned_end_date ?? 'Not set'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 lg:max-w-sm">
                        <p className="text-sm text-slate-500">
                          Estimated value
                        </p>

                        <p className="mt-1 text-xl font-bold text-slate-950">
                          {formatMoney(tender.estimated_value)}
                        </p>

                        {tender.awarded_amount && (
                          <p className="mt-2 text-sm text-slate-600">
                            Awarded amount:{' '}
                            <span className="font-semibold text-slate-950">
                              {formatMoney(tender.awarded_amount)}
                            </span>
                          </p>
                        )}

                        <div className="mt-5">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              Work progress
                            </span>
                            <span className="font-semibold text-slate-950">
                              {workProgress}%
                            </span>
                          </div>
                          <ProgressBar value={workProgress} />
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              Payment progress
                            </span>
                            <span className="font-semibold text-slate-950">
                              {paymentProgress}%
                            </span>
                          </div>
                          <ProgressBar value={paymentProgress} />
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-950">
                            Active flags: {tender.active_flags_count}
                          </p>

                          {tender.highest_flag_severity ? (
                            <p className="mt-1 text-sm text-amber-700">
                              Highest severity: {tender.highest_flag_severity}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-slate-500">
                              No active flag severity.
                            </p>
                          )}
                        </div>
                      </div>
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