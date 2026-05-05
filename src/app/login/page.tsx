import Link from 'next/link'
import { loginAction } from '@/app/auth/actions'

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Log in</h1>

        <p className="mt-2 text-sm text-gray-600">
          Access your tender platform dashboard.
        </p>

        {params.error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {params.message}
          </div>
        )}

        <form action={loginAction} className="mt-8 space-y-5">
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
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          No account yet?{' '}
          <Link href="/register" className="font-medium text-black underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}