import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasExpectedFileSignature,
  validateEvidenceUpload,
} from '../src/lib/security/file-validation.ts'

test('accepts a PDF with matching MIME, name and bytes', async () => {
  const file = new File(['%PDF-1.7\nexample'], 'proposal.pdf', { type: 'application/pdf' })
  await assert.doesNotReject(() => validateEvidenceUpload(file))
})

test('rejects a forged extension or forged contents', async () => {
  const mismatchedExtension = new File(['%PDF-1.7\nexample'], 'proposal.php', {
    type: 'application/pdf',
  })
  await assert.rejects(() => validateEvidenceUpload(mismatchedExtension), /extension/)

  const fakePDF = new File(['<script>alert(1)</script>'], 'proposal.pdf', {
    type: 'application/pdf',
  })
  await assert.rejects(() => validateEvidenceUpload(fakePDF), /contents/)
})

test('rejects disguised binary text and disallowed MIME types', async () => {
  assert.equal(hasExpectedFileSignature('text/plain', new Uint8Array([0x41, 0x00])), false)
  const script = new File(['hello'], 'proposal.js', { type: 'application/javascript' })
  await assert.rejects(() => validateEvidenceUpload(script), /File type/)
})

test('rejects empty and oversized files', async () => {
  await assert.rejects(
    () => validateEvidenceUpload(new File([], 'empty.txt', { type: 'text/plain' })),
    /empty/
  )
  const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {
    type: 'application/pdf',
  })
  await assert.rejects(() => validateEvidenceUpload(oversized), /10MB/)
})
