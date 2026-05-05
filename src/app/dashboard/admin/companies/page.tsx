import Link from 'next/link'
import { redirect } from 'next/navigation'
import { adminUpdateCompanyStatusAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type AdminCompaniesPageProps = {
  searchParams: Promise<{
    error?: string
    message?: string
    status?: string
  }>
}

export default async function AdminCompaniesPage({
  searchParams,
}: AdminCompaniesPageProps) {
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const statusFilter = query.status ?? 'pending'

  const allowedStatuses = ['pending', 'verified', 'rejected', 'suspended']

  const finalStatusFilter = allowedStatuses.includes(statusFilter)
    ? statusFilter
    : 'pending'

  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
        id,
        name,
        registration_number,
        tax_number,
        status,
        verification_note,
        verified_at,
        rejected_at,
        suspended_at,
        created_at,
        profiles!profiles_company_id_fkey (
        full_name,
        role
        )
    `)
    .eq('status', finalStatusFilter)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 underline">
          Back to dashboard
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Admin panel
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Company Verification
          </h1>

          <p className="mt-2 text-slate-600">
            Review companies, verify legitimate organisations, reject invalid registrations,
            or suspend risky companies.
          </p>

          {query.error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {query.error}
            </div>
          )}

          {query.message && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {query.message}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {allowedStatuses.map((status) => (
              <Link
                key={status}
                href={`/dashboard/admin/companies?status=${status}`}
                className={
                  finalStatusFilter === status
                    ? 'rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white'
                    : 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50'
                }
              >
                {status}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                {finalStatusFilter} companies
              </h2>

              <p className="mt-2 text-slate-600">
                Companies currently marked as {finalStatusFilter}.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Total: {companies?.length ?? 0}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message}
            </div>
          )}

          {!companies || companies.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No companies found for this status.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {companies.map((company) => {
                const linkedProfiles = company.profiles ?? []

                return (
                  <article
                    key={company.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          {company.status}
                        </p>

                        <h3 className="mt-2 text-xl font-bold text-slate-950">
                          {company.name}
                        </h3>

                        <div className="mt-3 grid gap-1 text-sm text-slate-600">
                          <p>
                            Registration number:{' '}
                            <span className="font-medium text-slate-900">
                              {company.registration_number ?? 'Not provided'}
                            </span>
                          </p>

                          <p>
                            Tax number:{' '}
                            <span className="font-medium text-slate-900">
                              {company.tax_number ?? 'Not provided'}
                            </span>
                          </p>

                          <p>
                            Created:{' '}
                            {new Date(company.created_at).toLocaleString('en-ZA')}
                          </p>
                        </div>

                        {company.verification_note && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-950">
                              Latest admin note
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {company.verification_note}
                            </p>
                          </div>
                        )}

                        <div className="mt-4">
                          <p className="text-sm font-semibold text-slate-950">
                            Linked users
                          </p>

                          {linkedProfiles.length === 0 ? (
                            <p className="mt-1 text-sm text-slate-500">
                              No linked users found.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1 text-sm text-slate-600">
                              {linkedProfiles.map((profile: any, index: number) => (
                                <li key={index}>
                                  {profile.full_name ?? 'Unnamed user'} — {profile.role}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 md:max-w-sm">
                        <p className="font-semibold text-slate-950">
                          Admin decision
                        </p>

                        <form
                          action={adminUpdateCompanyStatusAction.bind(
                            null,
                            company.id,
                            'verified',
                            `/dashboard/admin/companies?status=${finalStatusFilter}`
                          )}
                          className="mt-4"
                        >
                          <textarea
                            name="note"
                            rows={2}
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                            placeholder="Optional verification note"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                          >
                            Verify company
                          </button>
                        </form>

                        <form
                          action={adminUpdateCompanyStatusAction.bind(
                            null,
                            company.id,
                            'rejected',
                            `/dashboard/admin/companies?status=${finalStatusFilter}`
                          )}
                          className="mt-4 border-t border-slate-200 pt-4"
                        >
                          <textarea
                            name="note"
                            rows={2}
                            required
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                            placeholder="Reason required for rejection"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                          >
                            Reject company
                          </button>
                        </form>

                        <form
                          action={adminUpdateCompanyStatusAction.bind(
                            null,
                            company.id,
                            'suspended',
                            `/dashboard/admin/companies?status=${finalStatusFilter}`
                          )}
                          className="mt-4 border-t border-slate-200 pt-4"
                        >
                          <textarea
                            name="note"
                            rows={2}
                            required
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                            placeholder="Reason required for suspension"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Suspend company
                          </button>
                        </form>
                      </div>
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