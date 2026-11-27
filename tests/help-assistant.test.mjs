import assert from 'node:assert/strict'
import test from 'node:test'
import { answerHelpQuestion } from '../src/lib/help/assistant.ts'

test('open tender questions use the public API and not a privileged action', () => {
  const response = answerHelpQuestion('Can you show available tenders?')
  assert.equal(response.loadPublicTenders, true)
  assert.equal(response.link.href, '/tenders')
})

test('the assistant explains role boundaries', () => {
  assert.match(answerHelpQuestion('How does company verification work?').message, /administrator/i)
  assert.match(answerHelpQuestion('Who runs the accountability scanner?').message, /administrators/i)
  assert.match(answerHelpQuestion('Can I release a payment?').message, /sponsor/i)
})

test('unknown requests safely link to the guide', () => {
  const reply = answerHelpQuestion('What is the meaning of life?')
  assert.equal(reply.link.href, '/help')
  assert.equal(reply.loadPublicTenders, undefined)
})
