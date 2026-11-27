// Keep the public endpoint intentionally small. Never return bidders, company
// verification details, private documents, or user profiles from this API.
export const PUBLIC_TENDER_STATUSES = [
  'published',
  'closed',
  'awarded',
  'in_progress',
  'completed',
] as const

export type PublicTenderStatus = (typeof PUBLIC_TENDER_STATUSES)[number]

export type PublicTenderApiQuery = {
  limit: number
  search: string
  status: PublicTenderStatus | null
}

export function parsePublicTenderApiQuery(
  params: URLSearchParams
): { query: PublicTenderApiQuery; error?: never } | { query?: never; error: string } {
  const rawLimit = params.get('limit')
  const limit = rawLimit === null ? 5 : Number(rawLimit)

  if (!Number.isInteger(limit) || limit < 1) {
    return { error: 'limit must be a positive whole number.' }
  }

  const search = (params.get('q') ?? '').trim()
  if (search.length > 80) {
    return { error: 'q must be 80 characters or fewer.' }
  }

  const rawStatus = params.get('status')?.trim() || null
  if (
    rawStatus !== null &&
    !PUBLIC_TENDER_STATUSES.some((status) => status === rawStatus)
  ) {
    return { error: 'status must be a public tender status.' }
  }

  return {
    query: {
      limit: Math.min(limit, 20),
      search,
      status: rawStatus as PublicTenderStatus | null,
    },
  }
}
