export default function Loading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />

        <h1 className="mt-6 text-xl font-bold text-slate-950">
          Loading tender data
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Please wait while we prepare the latest records.
        </p>
      </div>
    </main>
  )
}