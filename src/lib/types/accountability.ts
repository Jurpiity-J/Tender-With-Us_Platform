/** Expected public PostgreSQL RPC projections (not database-generated types). */
export type CurrencyAmount = number | string | null

export type PublicFlag = {
  id: string
  severity: string
  flag_type: string | null
  reason: string
  created_at: string
}

export type ReputationSummary = {
  score: number | string
  awarded_tenders: number
  active_flags: number
  rejected_milestones: number
  overdue_milestones: number
  work_progress_percentage?: number | string | null
  payment_progress_percentage?: number | string | null
}

export type PublicCompanyTender = {
  id: string
  title: string
  status: string
  region: string | null
  winning_amount: CurrencyAmount
  planned_start_date: string | null
  planned_end_date: string | null
  work_progress_percentage: number | string | null
  payment_progress_percentage: number | string | null
}

export type PublicCompanyAccountability = {
  company: {
    name: string
    status: string
    registration_number: string | null
  }
  reputation: ReputationSummary
  active_flags: PublicFlag[]
  awarded_tenders: PublicCompanyTender[]
}

export type PublicTenderSearchResult = {
  id: string
  title: string
  description: string
  status: string
  category: string | null
  region: string | null
  sponsor_company_name: string | null
  awarded_company_name: string | null
  estimated_value: CurrencyAmount
  awarded_amount: CurrencyAmount
  planned_start_date: string | null
  planned_end_date: string | null
  work_progress_percentage: number | string | null
  payment_progress_percentage: number | string | null
  active_flags_count: number | null
  highest_flag_severity: string | null
}

export type PublicMilestone = {
  id: string
  title: string
  sequence_number: number
  status: string
  description: string | null
  amount: CurrencyAmount
  due_date: string
  progress_summary: string | null
  evidence_url: string | null
  verification_note: string | null
}

export type PublicTenderAccountability = {
  tender: {
    id: string
    title: string
    description: string
    category: string | null
    region: string
    status: string
    estimated_value: CurrencyAmount
    planned_start_date: string | null
    planned_end_date: string | null
    submission_deadline: string
  }
  sponsor: { name: string } | null
  awarded_bid: {
    company_id: string
    company_name: string
    amount: CurrencyAmount
  } | null
  winning_company_reputation: ReputationSummary | null
  milestones: PublicMilestone[]
  progress: {
    work_progress_percentage: number | string | null
    payment_progress_percentage: number | string | null
    total_milestones?: number
  } | null
  flags: PublicFlag[]
}
