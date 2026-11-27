import { createClient } from '@/lib/supabase/server'
import {
  parsePublicTenderApiQuery,
  PUBLIC_TENDER_STATUSES,
} from '@/lib/public-tenders'

// Public, read-only REST endpoint. Next.js does not cache this route by default.
// Both the explicit status filter AND Supabase RLS limit what can be returned.
export async function GET(request: Request) {
  const { query, error } = parsePublicTenderApiQuery(
    new URL(request.url).searchParams
  )

  const headers = { 'Cache-Control': 'no-store' }
  if (error || !query) {
    return Response.json({ error }, { status: 400, headers })
  }

  try {
    const supabase = await createClient()
    let requestQuery = supabase
      .from('tenders')
      .select(
        'id, title, category, region, status, estimated_value, submission_deadline, published_at',
        { count: 'exact' }
      )
      .in('status', [...PUBLIC_TENDER_STATUSES])

    if (query.status) {
      requestQuery = requestQuery.eq('status', query.status)
    }

    if (query.search) {
      // Supabase's query builder parameterizes the user-supplied search value.
      // Escape LIKE wildcards so the input is treated as a literal phrase.
      const literalSearch = query.search.replace(/[\\%_]/g, '\\$&')
      requestQuery = requestQuery.ilike('title', `%${literalSearch}%`)
    }

    const { data, count, error: dbError } = await requestQuery
      .order('published_at', { ascending: false })
      .limit(query.limit)

    if (dbError) {
      // Do not expose database or policy error details to anonymous callers.
      console.error('Public tender API database query failed', dbError.code)
      return Response.json(
        { error: 'Public tender information is currently unavailable.' },
        { status: 503, headers }
      )
    }

    return Response.json(
      { tenders: data ?? [], count: count ?? 0 },
      { status: 200, headers }
    )
  } catch {
    return Response.json(
      { error: 'Public tender information is currently unavailable.' },
      { status: 503, headers }
    )
  }
}
