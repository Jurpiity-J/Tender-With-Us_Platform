import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(Number(value ?? 0))
}

export default async function Home() {
  const supabase = await createClient()

  const { data: tenders, error: tendersError } = await supabase
    .from('tenders')
    .select('id, title, description, status, estimated_value, region')
    .limit(10)

  const { data: flags, error: flagsError } = await supabase
    .from('flags')
    .select(`
      id,
      severity,
      reason,
      flag_type,
      created_at,
      tenders (
        id,
        title
      )
    `)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: newsFeed, error: newsError } = await supabase
    .from('news_feed')
    .select('id, title, body, event_type, published_at')
    .order('published_at', { ascending: false })
    .limit(10)

  const error = tendersError || newsError

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">Tender Platform</h1>

        <p className="mt-4 text-red-500">
          Supabase error: {error.message}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md md:p-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Transparent public procurement
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
              Public tender accountability platform
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Track tenders, bids, milestones, delays, fund releases, and public
              accountability records in one transparent system.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tenders"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Browse tenders
              </Link>

              <Link
                href="/register"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Register
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
            <h2 className="text-2xl font-bold text-slate-950">
              Public Tenders
            </h2>

            {!tenders || tenders.length === 0 ? (
              <p className="mt-4 text-slate-500">No public tenders yet.</p>
            ) : (
              <div className="mt-5 grid gap-4">
                {tenders.map((tender) => (
                  <Link
                    key={tender.id}
                    href={`/tenders/${tender.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-white hover:shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tender.status} • {tender.region ?? 'No region'}
                    </p>

                    <h3 className="mt-2 font-bold text-slate-950">
                      {tender.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {tender.description}
                    </p>

                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {new Intl.NumberFormat('en-ZA', {
                        style: 'currency',
                        currency: 'ZAR',
                      }).format(Number(tender.estimated_value))}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
            <h2 className="text-2xl font-bold text-slate-950">
              Public News Feed
            </h2>

            {!newsFeed || newsFeed.length === 0 ? (
              <p className="mt-4 text-slate-500">No public updates yet.</p>
            ) : (
              <div className="mt-5 grid gap-4">
                {newsFeed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {item.event_type}
                    </p>

                    <h3 className="mt-2 font-bold text-slate-950">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.body}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      {new Date(item.published_at).toLocaleString('en-ZA')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Public Accountability Flags
              </h2>

              <p className="mt-2 text-slate-600">
                Recent public risk signals detected across tenders.
              </p>
            </div>
          </div>

          {flagsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {flagsError.message}
            </div>
          )}

          {!flags || flags.length === 0 ? (
            <p className="mt-5 text-slate-500">
              No active public flags yet.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {flags.map((flag) => {
                const tender = Array.isArray(flag.tenders)
                  ? flag.tenders[0]
                  : flag.tenders

                return (
                  <Link
                    key={flag.id}
                    href={tender?.id ? `/tenders/${tender.id}` : '/tenders'}
                    className="block rounded-2xl border border-amber-200 bg-amber-50 p-5 hover:bg-amber-100"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      {flag.severity} • {flag.flag_type ?? 'general_flag'}
                    </p>

                    <h3 className="mt-2 font-bold text-amber-950">
                      {tender?.title ?? 'Tender flag'}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-amber-950">
                      {flag.reason}
                    </p>

                    <p className="mt-3 text-xs text-amber-700">
                      Created: {new Date(flag.created_at).toLocaleString('en-ZA')}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </section>
    </main>
  )
}