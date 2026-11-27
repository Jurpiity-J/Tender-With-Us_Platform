import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Help Centre | Tender With Us',
  description: 'Simple guides for browsing, bidding, sponsoring and administering tenders.',
}

const guides = [
  {
    id: 'visitor',
    label: 'Public visitors',
    title: 'Find and follow public tenders',
    description: 'You can explore public information without registering.',
    steps: [
      'Open Public tenders to view opportunities and track their status.',
      'Search by project, region, company or category. Use filters to narrow the results.',
      'Open a tender to review public milestones, progress and accountability flags.',
    ],
    link: '/tenders',
    linkLabel: 'Browse public tenders',
  },
  {
    id: 'bidder',
    label: 'Bidders',
    title: 'Apply for a tender',
    description: 'Bid on eligible opportunities through your verified company.',
    steps: [
      'Register as a bidder and provide your company details.',
      'Wait for an administrator to verify your company before submitting bids.',
      'Open a published tender before its deadline, complete the bid form and submit.',
      'Track your submission under My bids. If your bid wins, use My projects to submit milestone evidence.',
    ],
    link: '/dashboard/bids',
    linkLabel: 'Go to My bids',
  },
  {
    id: 'sponsor',
    label: 'Sponsors',
    title: 'Create and manage a tender',
    description: 'Sponsors can manage only their own company’s tenders.',
    steps: [
      'Register as a sponsor and wait for administrator company verification.',
      'Open My tenders, create a draft, review it and publish when ready.',
      'Review submitted bids. Once the deadline has passed, award an eligible bid.',
      'Create milestones, review evidence submitted by the winning bidder, then release verified milestone payments.',
    ],
    link: '/dashboard/tenders',
    linkLabel: 'Go to My tenders',
  },
  {
    id: 'administrator',
    label: 'Administrators',
    title: 'Keep the platform accountable',
    description: 'Platform-wide checks are reserved for administrators.',
    steps: [
      'Review pending company registrations and approve or reject them with a reason.',
      'Review uploaded documents and their security scan or quarantine status.',
      'Use the administrator-only accountability scanner to check platform-wide risk signals.',
      'Investigate flags and audit records using approved administrator access.',
    ],
    link: '/dashboard',
    linkLabel: 'Go to dashboard',
  },
] as const

const faqs = [
  {
    question: 'Why can’t I submit a bid?',
    answer: 'Your account must be a bidder linked to a verified company. The tender must be published and its submission deadline must not have passed. Only one bid per company is allowed for each tender.',
  },
  {
    question: 'Can a sponsor approve their own company?',
    answer: 'No. Company verification is handled by platform administrators. A sponsor cannot approve or reject another company.',
  },
  {
    question: 'When can a sponsor award a tender?',
    answer: 'After the submission deadline has passed, a verified sponsor may award an eligible bid on a tender belonging to their own company.',
  },
  {
    question: 'What do the milestone payment statuses mean?',
    answer: 'Pending means a payment record has not been released. Verified means the sponsor accepted the milestone evidence. Paid indicates the platform recorded the payment as released; it is not independent confirmation of a bank transfer.',
  },
  {
    question: 'Why can’t I open my uploaded document?',
    answer: 'Uploaded files are placed in quarantine for security checks. Only documents that have been cleared should become available for public reading.',
  },
  {
    question: 'Who can run the accountability scanner?',
    answer: 'Only platform administrators. Sponsors can manage their own tenders, bids and verified milestone releases, but they cannot run platform-wide scans.',
  },
  {
    question: 'Is this a live government tender service?',
    answer: 'No. Tender-With-Us is a demonstration platform with test data. Do not use it to submit real tenders, bank details, passwords or identity documents.',
  },
]

export default function HelpCentre() {
  return (
    <main className="min-h-screen px-5 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-medium text-slate-600 underline">
          Back to home
        </Link>

        <section className="mt-5 rounded-3xl bg-slate-950 px-6 py-10 text-white shadow-lg sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
            Tender With Us · Help Centre
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
            Find your way around the platform
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Clear instructions for finding opportunities, placing bids, managing
            tenders and keeping records accountable. Choose your role to get started.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {guides.map((guide) => (
              <a
                key={guide.id}
                href={`#${guide.id}`}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                {guide.label}
              </a>
            ))}
          </div>
        </section>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Demo platform:</strong> All tenders and payments are for learning and
          testing. Never enter real banking information, ID documents or passwords
          into the chatbot.
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Guides by role">
          {guides.map((guide) => (
            <article
              key={guide.id}
              id={guide.id}
              className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                {guide.label}
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">{guide.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{guide.description}</p>
              <ol className="mt-6 space-y-4">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-900">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-6 text-slate-700">{step}</span>
                  </li>
                ))}
              </ol>
              <Link
                href={guide.link}
                className="mt-7 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {guide.linkLabel} →
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Common questions
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-slate-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="cursor-pointer pr-4 font-semibold text-slate-900 marker:text-amber-700">
                  {faq.question}
                </summary>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">Public tender API</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Developers can read public tender data as JSON. The endpoint allows GET
            requests only, returns a maximum of 20 tenders per request and never
            includes private bids, documents or profile information.
          </p>
          <code className="mt-4 block overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-white">
            GET /api/public/tenders?status=published&amp;limit=5
          </code>
          <a
            href="/api/public/tenders?status=published&limit=5"
            className="mt-4 inline-block text-sm font-semibold text-slate-900 underline"
          >
            View sample JSON response
          </a>
        </section>
      </div>
    </main>
  )
}
