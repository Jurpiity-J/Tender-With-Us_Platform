import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isCompanyStatus,
  isDocumentReviewStatus,
  isMilestoneReviewDecision,
  safeDashboardReturnPath,
} from '../src/lib/security/validators.ts'

test('accepts application dashboard destinations and the admin status filter', () => {
  assert.equal(safeDashboardReturnPath('/dashboard'), '/dashboard')
  assert.equal(safeDashboardReturnPath('/dashboard/tenders/123-abc'), '/dashboard/tenders/123-abc')
  assert.equal(
    safeDashboardReturnPath('/dashboard/admin/companies?status=pending'),
    '/dashboard/admin/companies?status=pending'
  )
})

test('rejects open redirects and malformed paths', () => {
  for (const value of [
    '//evil.example', 'https://evil.example', '/\\evil.example',
    '/%2f%2fevil.example', '/dashboard/../../outside',
    '/dashboard\nHeader: value', null, undefined, {},
  ]) {
    assert.equal(safeDashboardReturnPath(value), '/dashboard')
  }
})

test('strips unknown query parameters and hash fragments', () => {
  assert.equal(safeDashboardReturnPath('/dashboard?next=https://evil.example'), '/dashboard')
  assert.equal(safeDashboardReturnPath('/dashboard/admin/documents?status=clean&admin=true'), '/dashboard/admin/documents')
  assert.equal(safeDashboardReturnPath('/dashboard#fragment'), '/dashboard')
})

test('enforces allowed runtime values for privileged mutations', () => {
  assert.equal(isCompanyStatus('verified'), true)
  assert.equal(isCompanyStatus('admin'), false)
  assert.equal(isDocumentReviewStatus('quarantined'), true)
  assert.equal(isDocumentReviewStatus('pending_scan'), false)
  assert.equal(isMilestoneReviewDecision('verified'), true)
  assert.equal(isMilestoneReviewDecision('released'), false)
})
