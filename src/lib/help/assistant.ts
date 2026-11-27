// This assistant is deliberately rule-based: there is no AI provider, no chat
// history saved to the database, and no access to privileged Supabase actions.
export type HelpReply = {
  message: string
  link?: { label: string; href: string }
  loadPublicTenders?: boolean
}

export const HELP_SUGGESTIONS = [
  'Show open tenders',
  'How do I submit a bid?',
  'How does company verification work?',
  'How are milestone payments released?',
] as const

export function answerHelpQuestion(question: string): HelpReply {
  const text = question.toLowerCase().trim().replace(/\s+/g, ' ')

  if (!text) {
    return { message: 'Choose a suggested question or type what you need help with.' }
  }

  if (
    /\b(tender|tenders|opportunities)\b/.test(text) &&
    /\b(open|available|current|latest|find|show|list|search)\b/.test(text)
  ) {
    return {
      message: 'Here are the most recently published tender opportunities:',
      link: { label: 'Search all public tenders', href: '/tenders' },
      loadPublicTenders: true,
    }
  }

  if (/\b(create|post|publish|draft)\b/.test(text) && /\btender/.test(text)) {
    return {
      message: 'Sponsors can create draft tenders under My tenders and then publish them. A sponsor must belong to a verified company. Sponsors only manage tenders owned by their company.',
      link: { label: 'Sponsor guide', href: '/help#sponsor' },
    }
  }

  if (/\b(bid|bids|bidding|proposal|apply)\b/.test(text)) {
    return {
      message: 'To place a bid: register as a bidder, wait for administrator company verification, open a published tender before its closing date, then complete the bid form. You can track it in My bids. Each company may submit one bid per tender.',
      link: { label: 'Step-by-step bidder guide', href: '/help#bidder' },
    }
  }

  if (/\b(company|companies|verification|verify|verified|approval)\b/.test(text)) {
    return {
      message: 'New sponsor and bidder companies begin as pending. A platform administrator reviews and verifies companies; sponsors cannot verify their own companies. Check your dashboard after registration.',
      link: { label: 'Company verification guide', href: '/help#administrator' },
    }
  }

  if (/\b(payment|payments|paid|release|released|transaction)\b/.test(text)) {
    return {
      message: 'After a winning bidder submits milestone evidence, the sponsor reviews it. A verified milestone with a pending transaction can be marked released by that tender’s verified sponsor. This is a demo status, not proof of a real bank transfer.',
      link: { label: 'Sponsor payment guide', href: '/help#sponsor' },
    }
  }

  if (/\b(milestone|milestones|evidence|project|progress)\b/.test(text)) {
    return {
      message: 'The sponsor creates milestones after awarding a tender. The winning bidder submits progress evidence through My projects; the sponsor can then review it. Public visitors can follow milestone progress on the tender page.',
      link: { label: 'Milestone guidance', href: '/help#bidder' },
    }
  }

  if (/\b(document|documents|upload|file|scan|quarantine)\b/.test(text)) {
    return {
      message: 'Files are placed in quarantine for scanning and administrator review. Do not upload sensitive real-life documents to this demo. Public downloads are available only for cleared files.',
      link: { label: 'Document security FAQ', href: '/help' },
    }
  }

  if (/\b(admin|administrator|accountability|flag|flags|audit)\b/.test(text)) {
    return {
      message: 'Administrators handle company verification, document review and the platform-wide accountability scanner. Sponsors can manage their own tenders, but cannot run the global scanner.',
      link: { label: 'Administrator guide', href: '/help#administrator' },
    }
  }

  if (/\b(log\s?in|login|password|sign\s?in|register|account)\b/.test(text)) {
    return {
      message: 'Use Register to create an account or Log in to access your dashboard. Never share passwords, ID numbers or API keys in this chat. If your password does not work, use the normal account recovery process.',
      link: { label: 'Open login', href: '/login' },
    }
  }

  if (/\b(tender|tenders|opportunity|opportunities)\b/.test(text)) {
    return {
      message: 'The public tender register lets anyone browse published tenders, see their statuses and follow progress. Use its search and filters to find a project.',
      link: { label: 'Browse public tenders', href: '/tenders' },
    }
  }

  return {
    message: 'I can help with tenders, bidding, company verification, milestones, payments, documents and administrator responsibilities. Try one of those topics or open the Help Centre for full instructions.',
    link: { label: 'Open Help Centre', href: '/help' },
  }
}
