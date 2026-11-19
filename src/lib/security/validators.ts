/**
 * Server Action arguments are untrusted, including arguments bound to forms.
 * Keep navigation inside the dashboard and discard unexpected URL components.
 */
const DASHBOARD_PATH = /^\/dashboard(?:\/[A-Za-z0-9_-]+)*\/?$/

const FILTER_STATUSES = new Set([
  'pending', 'verified', 'rejected', 'suspended',
  'pending_scan', 'clean', 'quarantined',
])

export function safeDashboardReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  // Browsers interpret backslashes as separators in some URL contexts.
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) {
    return '/dashboard'
  }

  try {
    const url = new URL(value, 'https://internal.invalid')

    if (url.origin !== 'https://internal.invalid' || !DASHBOARD_PATH.test(url.pathname)) {
      return '/dashboard'
    }

    // The admin lists preserve a single known filter. Never echo arbitrary
    // query parameters, fragments, or possible redirect destinations.
    const queryKeys = [...url.searchParams.keys()]
    if (
      queryKeys.length === 1 &&
      queryKeys[0] === 'status' &&
      FILTER_STATUSES.has(url.searchParams.get('status') ?? '')
    ) {
      return `${url.pathname}?status=${encodeURIComponent(url.searchParams.get('status')!)}`
    }

    return url.pathname
  } catch {
    return '/dashboard'
  }
}

const COMPANY_STATUSES = new Set(['pending', 'verified', 'rejected', 'suspended'])
const DOCUMENT_REVIEW_STATUSES = new Set(['clean', 'quarantined', 'rejected'])
const MILESTONE_REVIEW_DECISIONS = new Set(['verified', 'rejected'])

export function isCompanyStatus(value: unknown): value is 'pending' | 'verified' | 'rejected' | 'suspended' {
  return typeof value === 'string' && COMPANY_STATUSES.has(value)
}

export function isDocumentReviewStatus(value: unknown): value is 'clean' | 'quarantined' | 'rejected' {
  return typeof value === 'string' && DOCUMENT_REVIEW_STATUSES.has(value)
}

export function isMilestoneReviewDecision(value: unknown): value is 'verified' | 'rejected' {
  return typeof value === 'string' && MILESTONE_REVIEW_DECISIONS.has(value)
}
