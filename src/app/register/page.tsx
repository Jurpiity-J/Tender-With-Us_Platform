import Link from 'next/link'
import { registerAction } from '@/app/auth/actions'

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Create account</h1>

        <p className="mt-2 text-sm text-gray-600">
          Register as a sponsor, bidder, or public user.
        </p>

        {params.error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </div>
        )}

        <form action={registerAction} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              name="fullName"
              type="text"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Junior Mokoena"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Account type</label>
            <select
              name="role"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
              defaultValue="bidder"
            >
              <option value="bidder">Bidder / Contractor</option>
              <option value="sponsor">Sponsor / Funding department</option>
              <option value="public_user">Public user</option>
            </select>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <h2 className="font-semibold">Company details</h2>
            <p className="mt-1 text-xs text-gray-500">
              Required for sponsors and bidders. Public users can leave this blank.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Company name</label>
                <input
                  name="companyName"
                  type="text"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Vaal Infrastructure Department"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Registration number</label>
                <input
                  name="registrationNumber"
                  type="text"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="REG-001"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tax number</label>
                <input
                  name="taxNumber"
                  type="text"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="TAX-001"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-black underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}