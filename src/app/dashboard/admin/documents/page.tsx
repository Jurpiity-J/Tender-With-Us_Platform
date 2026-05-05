import Link from 'next/link'
import { redirect } from 'next/navigation'
import { adminReviewDocumentAction } from '@/app/tenders/actions'
import { createClient } from '@/lib/supabase/server'

type AdminDocumentsPageProps = {
  searchParams: Promise<{
    error?: string
    message?: string
    status?: string
  }>
}

function formatFileSize(bytes: number | string | null) {
  const value = Number(bytes ?? 0)

  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export default async function AdminDocumentsPage({
  searchParams,
}: AdminDocumentsPageProps) {
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

  const statusFilter = query.status ?? 'pending_scan'

  const allowedStatuses = ['pending_scan', 'clean', 'quarantined', 'rejected']

  const finalStatusFilter = allowedStatuses.includes(statusFilter)
    ? statusFilter
    : 'pending_scan'

  const { data: documents, error } = await supabase
    .from('documents')
    .select(`
        id,
        file_name,
        storage_path,
        bucket_id,
        mime_type,
        file_size_bytes,
        purpose,
        scan_status,
        scan_note,
        created_at,
        tender:tenders!documents_tender_id_fkey (
        id,
        title
        ),
        milestone:milestones!documents_milestone_id_fkey (
        id,
        title
        ),
        uploader:profiles!documents_uploaded_by_fkey (
        full_name,
        role
        )
    `)
    .eq('scan_status', finalStatusFilter)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 underline">
          Back to dashboard
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Admin security panel
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Document Quarantine
          </h1>

          <p className="mt-2 text-slate-600">
            Uploaded files are boxed here first. Mark files clean only after review or scanning.
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
                href={`/dashboard/admin/documents?status=${status}`}
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
                {finalStatusFilter} documents
              </h2>

              <p className="mt-2 text-slate-600">
                Files with scan status: {finalStatusFilter}
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Total: {documents?.length ?? 0}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message}
            </div>
          )}

          {!documents || documents.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-600">
                No documents found for this status.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {documents.map((document) => {
                const tender = Array.isArray(document.tender)
                ? document.tender[0]
                : document.tender

                const milestone = Array.isArray(document.milestone)
                ? document.milestone[0]
                : document.milestone

                const uploader = Array.isArray(document.uploader)
                ? document.uploader[0]
                : document.uploader
                return (
                  <article
                    key={document.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          {document.scan_status} • {document.purpose ?? 'document'}
                        </p>

                        <h3 className="mt-2 text-xl font-bold text-slate-950">
                          {document.file_name}
                        </h3>

                        <div className="mt-3 grid gap-1 text-sm text-slate-600">
                          <p>Type: {document.mime_type ?? 'Unknown'}</p>
                          <p>Size: {formatFileSize(document.file_size_bytes)}</p>
                          <p>Uploaded: {new Date(document.created_at).toLocaleString('en-ZA')}</p>
                          <p>Uploaded by: {uploader?.full_name ?? 'Unknown'} — {uploader?.role ?? 'unknown role'}</p>
                          <p>Tender: {tender?.title ?? 'Not linked'}</p>
                          <p>Milestone: {milestone?.title ?? 'Not linked'}</p>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-950">
                            Security note
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {document.scan_note ?? 'No note recorded.'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-slate-950">
                          Review decision
                        </p>

                        <form
                          action={adminReviewDocumentAction.bind(
                            null,
                            document.id,
                            'clean',
                            `/dashboard/admin/documents?status=${finalStatusFilter}`
                          )}
                          className="mt-4"
                        >
                          <textarea
                            name="note"
                            rows={2}
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                            placeholder="Optional clean scan note"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                          >
                            Mark clean
                          </button>
                        </form>

                        <form
                          action={adminReviewDocumentAction.bind(
                            null,
                            document.id,
                            'quarantined',
                            `/dashboard/admin/documents?status=${finalStatusFilter}`
                          )}
                          className="mt-4 border-t border-slate-200 pt-4"
                        >
                          <textarea
                            name="note"
                            rows={2}
                            required
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                            placeholder="Reason required"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                          >
                            Keep quarantined
                          </button>
                        </form>

                        <form
                          action={adminReviewDocumentAction.bind(
                            null,
                            document.id,
                            'rejected',
                            `/dashboard/admin/documents?status=${finalStatusFilter}`
                          )}
                          className="mt-4 border-t border-slate-200 pt-4"
                        >
                          <textarea
                            name="note"
                            rows={2}
                            required
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                            placeholder="Reason required"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                          >
                            Reject document
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