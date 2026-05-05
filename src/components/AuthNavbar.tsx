import Link from 'next/link'
import { logoutAction } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/server'

export default async function AuthNavbar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: {
    role: string
    full_name: string | null
  } | null = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    profile = data
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            TP
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950">
              Tender Platform
            </p>
            <p className="text-xs text-slate-500">
              Public accountability system
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/tenders"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Public tenders
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </Link>

              {profile?.role === 'bidder' && (
                <>
                  <Link
                    href="/dashboard/bids"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    My bids
                  </Link>

                  <Link
                    href="/dashboard/projects"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    My projects
                  </Link>
                </>
              )}

              {profile?.role === 'sponsor' && (
                <Link
                  href="/dashboard/tenders"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  My tenders
                </Link>
              )}

              {profile?.role === 'admin' && (
                <>
                  <Link
                    href="/dashboard/admin/companies"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Companies
                  </Link>

                  <Link
                    href="/dashboard/admin/documents"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Documents
                  </Link>
                </>
              )}

              <form action={logoutAction}>
                <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}