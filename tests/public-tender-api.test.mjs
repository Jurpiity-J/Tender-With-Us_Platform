import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parsePublicTenderApiQuery,
  PUBLIC_TENDER_STATUSES,
} from '../src/lib/public-tenders.ts'

test('defaults to a small public result set', () => {
  assert.deepEqual(parsePublicTenderApiQuery(new URLSearchParams()).query, {
    limit: 5,
    search: '',
    status: null,
  })
})

test('enforces public statuses and a maximum result size', () => {
  assert.equal(PUBLIC_TENDER_STATUSES.includes('published'), true)
  assert.equal(PUBLIC_TENDER_STATUSES.includes('draft'), false)
  assert.equal(
    parsePublicTenderApiQuery(new URLSearchParams('limit=999&status=published')).query?.limit,
    20
  )
  assert.equal(
    parsePublicTenderApiQuery(new URLSearchParams('status=draft')).error,
    'status must be a public tender status.'
  )
})

test('rejects malformed limits and oversized search terms', () => {
  for (const rawLimit of ['0', '-1', '1.5', 'NaN', 'Infinity']) {
    assert.ok(parsePublicTenderApiQuery(new URLSearchParams(`limit=${rawLimit}`)).error)
  }
  assert.ok(parsePublicTenderApiQuery(new URLSearchParams(`q=${'x'.repeat(81)}`)).error)
})
