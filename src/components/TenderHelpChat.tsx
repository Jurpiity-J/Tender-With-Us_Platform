'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { BookOpen, MessageCircle, Send, X } from 'lucide-react'
import { answerHelpQuestion, HELP_SUGGESTIONS } from '@/lib/help/assistant'

type PublicTender = {
  id: string
  title: string
  status: string
  region: string | null
  submission_deadline: string
}

type ChatMessage = {
  id: number
  author: 'visitor' | 'guide'
  text: string
  link?: { label: string; href: string }
  tenders?: PublicTender[]
}

const initialMessages: ChatMessage[] = [
  {
    id: 0,
    author: 'guide',
    text: 'Hello! I’m your Tender Guide. Ask about bids, company verification, milestones or payments. I can also find published tender opportunities. No AI service or personal data is needed.',
    link: { label: 'Read the full Help Centre', href: '/help' },
  },
]

export default function TenderHelpChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [loading, setLoading] = useState(false)
  const nextId = useRef(1)
  const feedEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      feedEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isOpen, messages])

  function appendGuideMessage(message: Omit<ChatMessage, 'id' | 'author'>) {
    const id = nextId.current++
    setMessages((items) => [...items.slice(-24), { ...message, id, author: 'guide' }])
  }

  async function ask(rawQuestion: string) {
    const text = rawQuestion.trim()
    if (!text || loading) return

    // The chat is kept only in the current browser component state. No message
    // text is sent to the API: only a fixed public-tender query is sent.
    setQuestion('')
    setMessages((items) => [
      ...items.slice(-24),
      { id: nextId.current++, author: 'visitor', text },
    ])

    const reply = answerHelpQuestion(text)
    if (!reply.loadPublicTenders) {
      appendGuideMessage({ text: reply.message, link: reply.link })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/public/tenders?status=published&limit=5', {
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Public tender lookup failed')

      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('tenders' in data)) {
        throw new Error('Unexpected tender response')
      }

      const rows = (data as { tenders: unknown }).tenders
      if (!Array.isArray(rows)) throw new Error('Unexpected tender list')

      const tenders = rows.filter(
        (row): row is PublicTender =>
          typeof row === 'object' &&
          row !== null &&
          typeof row.id === 'string' &&
          typeof row.title === 'string' &&
          row.status === 'published'
      ).slice(0, 5)

      appendGuideMessage({
        text: tenders.length
          ? reply.message
          : 'There are no published opportunities in the public register right now. Check back later.',
        link: reply.link,
        tenders,
      })
    } catch {
      appendGuideMessage({
        text: 'I couldn’t retrieve live tender information right now. You can still check the public tender register directly.',
        link: { label: 'Browse public tenders', href: '/tenders' },
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(question)
  }

  return (
    <div className="fixed bottom-5 right-4 z-[60] flex flex-col items-end gap-3 sm:right-6">
      {isOpen && (
        <section
          id="tender-help-panel"
          aria-label="Tender Guide chat"
          className="flex h-[min(72vh,560px)] w-[min(calc(100vw-2rem),390px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
            <div>
              <p className="font-bold">Tender Guide</p>
              <p className="text-xs text-slate-300">Free guided help · no AI key required</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-white hover:bg-white/15"
              aria-label="Close help chat"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </header>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.author === 'visitor' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.author === 'visitor'
                      ? 'rounded-br-sm bg-slate-900 text-white'
                      : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <p>{message.text}</p>
                  {message.tenders && message.tenders.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {message.tenders.map((tender) => (
                        <li key={tender.id}>
                          <Link
                            href={`/tenders/${tender.id}`}
                            className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-950 hover:bg-amber-50"
                            onClick={() => setIsOpen(false)}
                          >
                            {tender.title}
                            <span className="block text-xs font-normal text-slate-500">
                              {tender.region || 'Region not listed'}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {message.link && (
                    <Link
                      href={message.link.href}
                      className="mt-3 inline-block font-semibold text-amber-700 underline"
                      onClick={() => setIsOpen(false)}
                    >
                      {message.link.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-slate-500" role="status">
                Checking published tenders…
              </p>
            )}
            <div ref={feedEnd} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {HELP_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label htmlFor="tender-help-question" className="sr-only">
                Ask the Tender Guide a question
              </label>
              <input
                id="tender-help-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={200}
                placeholder="Ask a question…"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send question"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </form>
            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 underline"
            >
              <BookOpen size={13} aria-hidden="true" /> Full Help Centre
            </Link>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Demo help only. Never share passwords or sensitive documents.
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="tender-help-panel"
        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg ring-2 ring-white hover:bg-slate-800"
      >
        {isOpen ? <X size={19} aria-hidden="true" /> : <MessageCircle size={19} aria-hidden="true" />}
        {isOpen ? 'Close chat' : 'Need help?'}
      </button>
    </div>
  )
}
