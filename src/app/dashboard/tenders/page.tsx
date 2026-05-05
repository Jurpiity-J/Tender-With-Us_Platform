import Link from 'next/link'
import { redirect } from 'next/navigation'
import { publishTenderAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type DashboardTendersPageProps = {
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

export default async function DashboardTendersPage({
  searchParams,
}: DashboardTendersPageProps) {
  const params = await searchParams
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

  if (!profile) {
    redirect('/dashboard')
  }

  const { data: tenders, error } = await supabase
    .from('tenders')
    .select(`
      id,
      title,
      description,
      status,
      estimated_value,
      region,
      submission_deadline,
      created_at
    `)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 underline"
            >
              Back to dashboard
            </Link>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
              My Tenders
            </h1>

            <p className="mt-2 text-slate-600">
              Manage tenders linked to your sponsor account.
            </p>

            {params.error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {params.error}
              </div>
            )}
          </div>

          {profile.role === 'sponsor' && (
            <Link
              href="/dashboard/tenders/new"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Create tender
            </Link>
          )}
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        {!tenders || tenders.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <p className="text-slate-600">No tenders found yet.</p>

            {profile.role === 'sponsor' && (
              <Link
                href="/dashboard/tenders/new"
                className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create your first tender
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {tenders.map((tender) => (
              <article
                key={tender.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {tender.status}
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                      {tender.title}
                    </h2>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      {tender.description}
                    </p>

                    <p className="mt-4 text-sm text-slate-500">
                      Submission deadline:{' '}
                      {new Date(tender.submission_deadline).toLocaleString(
                        'en-ZA'
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left md:text-right">
                    <p className="text-lg font-bold text-slate-950">
                      {formatMoney(tender.estimated_value)}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {tender.region ?? 'No region specified'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/tenders/${tender.id}`}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    View bids
                  </Link>

                  {profile.role === 'sponsor' && tender.status === 'draft' && (
                    <form action={publishTenderAction.bind(null, tender.id)}>
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Publish tender
                      </button>
                    </form>
                  )}

                  {tender.status === 'published' && (
                    <Link
                      href={`/tenders/${tender.id}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      View public page
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}