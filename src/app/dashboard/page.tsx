import { redirect } from 'next/navigation'
import { logoutAction } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      full_name,
      role,
      companies!profiles_company_id_fkey (
        name,
        status
      )
    `)
    .eq('id', user.id)
    .single()

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Dashboard</h1>

          <p className="mt-4 text-red-600">
            Could not load your profile: {error?.message ?? 'Profile not found'}
          </p>

          <form action={logoutAction} className="mt-6">
            <button className="rounded-lg border px-4 py-2 text-sm">
              Log out
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (!profile) {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <p className="mt-4 text-red-600">
          Your login account exists, but your platform profile was not created.
        </p>

        <p className="mt-2 text-sm text-gray-600">
          Delete this test user in Supabase Authentication, then register again.
        </p>

        <form action={logoutAction} className="mt-6">
          <button className="rounded-lg border px-4 py-2 text-sm">
            Log out
          </button>
        </form>
      </div>
    </main>
  )
}

  const company = Array.isArray(profile.companies)
    ? profile.companies[0]
    : profile.companies

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">
                Dashboard
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Welcome, {profile.full_name}
              </h1>

              <p className="mt-2 text-gray-600">
                Role: <span className="font-medium">{profile.role}</span>
              </p>
            </div>

            <form action={logoutAction}>
              <button className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
                Log out
              </button>
            </form>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border p-5">
              <h2 className="font-semibold">Company</h2>

              {company ? (
                <>
                  <p className="mt-2 text-gray-700">{company.name}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Verification status: {company.status}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-gray-500">
                  No company linked to this account.
                </p>
              )}
            </div>

            <div className="rounded-xl border p-5">
              <h2 className="font-semibold">Next available actions</h2>

              {profile.role === 'sponsor' && (
                <div className="mt-3">
                    <p className="text-gray-600">
                    Create and manage draft tenders for your company.
                    </p>

                    <Link
                    href="/dashboard/tenders"
                    className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                    >
                    Manage tenders
                    </Link>
                </div>
                    )}

              {profile.role === 'bidder' && (
                <div className="mt-3">
                    <p className="text-gray-600">
                    Browse published tenders and track your submitted bids.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                        href="/tenders"
                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                    >
                        Browse tenders
                    </Link>

                    <Link
                        href="/dashboard/bids"
                        className="rounded-lg border px-4 py-2 text-sm font-medium"
                    >
                        My bids
                    </Link>
                    <Link
                      href="/dashboard/projects"
                      className="rounded-lg border px-4 py-2 text-sm font-medium"
                    >
                      My awarded projects
                    </Link>
                    </div>
                </div>
                )}

              {profile.role === 'public_user' && (
                <p className="mt-2 text-gray-600">
                  Public users can follow tenders, flags, and public updates.
                </p>
              )}

              {profile.role === 'admin' && (
                <div className="mt-3">
                  <p className="text-gray-600">
                    Review company registrations and manage verification status.
                  </p>

                  <Link
                    href="/dashboard/admin/companies"
                    className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                  >
                    Company verification
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}