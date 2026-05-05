import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createTenderAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type NewTenderPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function NewTenderPage({ searchParams }: NewTenderPageProps) {
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
    .select(`
      role,
      companies!profiles_company_id_fkey (
        name,
        status
      )
    `)
    .eq('id', user.id)
    .single()
    
  if (!profile || profile.role !== 'sponsor') {
    redirect('/dashboard')
  }

  const company = Array.isArray(profile.companies)
    ? profile.companies[0]
    : profile.companies

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/tenders" className="text-sm text-gray-500 underline">
          Back to my tenders
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Create tender</h1>

          <p className="mt-2 text-gray-600">
            Create a draft tender. We will add publishing and milestone controls next.
          </p>

          {company && (
            <div className="mt-6 rounded-xl border bg-gray-50 p-4 text-sm">
              <p className="font-medium">{company.name}</p>
              <p className="mt-1 text-gray-500">
                Company status: {company.status}
              </p>
            </div>
          )}

          {params.error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </div>
          )}

          <form action={createTenderAction} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-medium">Tender title</label>
              <input
                name="title"
                type="text"
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Road Repair Tender - Phase 2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                required
                rows={5}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Describe the work, expected outcome, and accountability requirements."
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Category</label>
                <input
                  name="category"
                  type="text"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Infrastructure"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Region</label>
                <input
                  name="region"
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Gauteng"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Estimated value</label>
              <input
                name="estimatedValue"
                type="number"
                min="1"
                step="0.01"
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="2500000"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Submission deadline</label>
              <input
                name="submissionDeadline"
                type="datetime-local"
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Planned start date</label>
                <input
                  name="plannedStartDate"
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Planned end date</label>
                <input
                  name="plannedEndDate"
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
            >
              Save draft tender
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}