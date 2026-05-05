'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function getField(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

export async function createTenderAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirectWithError('/dashboard/tenders/new', 'Could not load your profile.')
  }

  if (profile.role !== 'sponsor') {
    redirectWithError('/dashboard', 'Only sponsors can create tenders.')
  }

  if (!profile.company_id) {
    redirectWithError(
      '/dashboard/tenders/new',
      'Your account is not linked to a company.'
    )
  }

  const title = getField(formData, 'title')
  const description = getField(formData, 'description')
  const category = getField(formData, 'category')
  const region = getField(formData, 'region')
  const estimatedValue = Number(getField(formData, 'estimatedValue'))
  const submissionDeadline = getField(formData, 'submissionDeadline')
  const plannedStartDate = getField(formData, 'plannedStartDate')
  const plannedEndDate = getField(formData, 'plannedEndDate')

  if (!title || !description || !region || !submissionDeadline) {
    redirectWithError(
      '/dashboard/tenders/new',
      'Please fill in all required fields.'
    )
  }

  if (!Number.isFinite(estimatedValue) || estimatedValue <= 0) {
    redirectWithError(
      '/dashboard/tenders/new',
      'Estimated value must be greater than 0.'
    )
  }

  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .insert({
      sponsor_company_id: profile.company_id,
      created_by: user.id,
      title,
      description,
      category: category || null,
      region,
      currency: 'ZAR',
      estimated_value: estimatedValue,
      submission_deadline: submissionDeadline,
      planned_start_date: plannedStartDate || null,
      planned_end_date: plannedEndDate || null,
      status: 'draft',
    })
    .select('id, title')
    .single()

  if (tenderError || !tender) {
    redirectWithError(
      '/dashboard/tenders/new',
      tenderError?.message ?? 'Could not create tender.'
    )
  }

  await supabase.from('audit_log').insert({
    actor_profile_id: user.id,
    action: 'tender_created',
    table_name: 'tenders',
    record_id: tender.id,
    new_data: {
      title: tender.title,
      status: 'draft',
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tenders')
  redirect('/dashboard/tenders')
}

export async function publishTenderAction(tenderId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      company_id,
      companies!profiles_company_id_fkey (
        status
      )
    `)
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirectWithError('/dashboard/tenders', 'Could not load your profile.')
  }

  if (profile.role !== 'sponsor') {
    redirectWithError('/dashboard', 'Only sponsors can publish tenders.')
  }

  const company = Array.isArray(profile.companies)
    ? profile.companies[0]
    : profile.companies

  if (!company || company.status !== 'verified') {
    redirectWithError(
      '/dashboard/tenders',
      'Your company must be verified before publishing tenders.'
    )
  }

  const { data: existingTender, error: existingTenderError } = await supabase
    .from('tenders')
    .select('id, title, status, sponsor_company_id, created_by')
    .eq('id', tenderId)
    .single()

  if (existingTenderError || !existingTender) {
    redirectWithError('/dashboard/tenders', 'Tender not found.')
  }

  if (existingTender.status !== 'draft') {
    redirectWithError(
      '/dashboard/tenders',
      'Only draft tenders can be published.'
    )
  }

  if (
    existingTender.created_by !== user.id ||
    existingTender.sponsor_company_id !== profile.company_id
  ) {
    redirectWithError(
      '/dashboard/tenders',
      'You do not have permission to publish this tender.'
    )
  }

  const { data: updatedTender, error: updateError } = await supabase
    .from('tenders')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', tenderId)
    .eq('status', 'draft')
    .select('id, title')
    .single()

  if (updateError || !updatedTender) {
    redirectWithError(
      '/dashboard/tenders',
      updateError?.message ?? 'Could not publish tender.'
    )
  }

  await supabase.from('audit_log').insert({
    actor_profile_id: user.id,
    action: 'tender_published',
    table_name: 'tenders',
    record_id: updatedTender.id,
    old_data: {
      status: 'draft',
    },
    new_data: {
      status: 'published',
      title: updatedTender.title,
    },
  })

  await supabase.from('news_feed').insert({
    tender_id: updatedTender.id,
    title: 'New tender published',
    body: `${updatedTender.title} has been published for public bidding.`,
    event_type: 'tender_published',
  })

  revalidatePath('/')
  revalidatePath('/dashboard/tenders')
  redirect('/dashboard/tenders')
}

export async function submitBidAction(tenderId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      company_id,
      companies!profiles_company_id_fkey (
        status
      )
    `)
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirectWithError(`/tenders/${tenderId}`, 'Could not load your profile.')
  }

  if (profile.role !== 'bidder') {
    redirectWithError(`/tenders/${tenderId}`, 'Only bidders can submit bids.')
  }

  if (!profile.company_id) {
    redirectWithError(
      `/tenders/${tenderId}`,
      'Your account is not linked to a company.'
    )
  }

  const company = Array.isArray(profile.companies)
    ? profile.companies[0]
    : profile.companies

  if (!company || company.status !== 'verified') {
    redirectWithError(
      `/tenders/${tenderId}`,
      'Your company must be verified before submitting bids.'
    )
  }

  const amount = Number(getField(formData, 'amount'))
  const proposalSummary = getField(formData, 'proposalSummary')

  if (!Number.isFinite(amount) || amount <= 0) {
    redirectWithError(
      `/tenders/${tenderId}`,
      'Bid amount must be greater than 0.'
    )
  }

  if (!proposalSummary) {
    redirectWithError(
      `/tenders/${tenderId}`,
      'Proposal summary is required.'
    )
  }

  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .select('id, title, status, submission_deadline')
    .eq('id', tenderId)
    .single()

  if (tenderError || !tender) {
    redirectWithError('/tenders', 'Tender not found.')
  }

  if (tender.status !== 'published') {
    redirectWithError(
      `/tenders/${tenderId}`,
      'This tender is not open for bids.'
    )
  }

  if (new Date(tender.submission_deadline) <= new Date()) {
    redirectWithError(
      `/tenders/${tenderId}`,
      'The submission deadline has passed.'
    )
  }

  const { data: existingBid } = await supabase
  .from('bids')
  .select('id')
  .eq('tender_id', tenderId)
  .eq('bidder_company_id', profile.company_id)
  .maybeSingle()

if (existingBid) {
  redirectWithError(
    `/tenders/${tenderId}`,
    'Your company has already submitted a bid for this tender.'
  )
}

const { data: bid, error: bidError } = await supabase
  .from('bids')
  .insert({
    tender_id: tenderId,
    bidder_company_id: profile.company_id,
    submitted_by: user.id,
    amount,
    proposal_summary: proposalSummary,
    status: 'submitted',
  })
  .select('id')
  .single()

  if (bidError || !bid) {
    redirectWithError(
      `/tenders/${tenderId}`,
      bidError?.message ?? 'Could not submit bid.'
    )
  }

  await supabase.from('audit_log').insert({
    actor_profile_id: user.id,
    action: 'bid_submitted',
    table_name: 'bids',
    record_id: bid.id,
    new_data: {
      tender_id: tenderId,
      tender_title: tender.title,
      amount,
      status: 'submitted',
    },
  })

  revalidatePath(`/tenders/${tenderId}`)
  revalidatePath('/dashboard/bids')
  redirect('/dashboard/bids')
}
export async function updateBidAction(bidId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const amount = Number(getField(formData, 'amount'))
  const proposalSummary = getField(formData, 'proposalSummary')

  if (!Number.isFinite(amount) || amount <= 0) {
    redirectWithError(`/dashboard/bids/${bidId}/edit`, 'Bid amount must be greater than 0.')
  }

  if (!proposalSummary) {
    redirectWithError(`/dashboard/bids/${bidId}/edit`, 'Proposal summary is required.')
  }

  const { data: existingBid, error: existingBidError } = await supabase
    .from('bids')
    .select(`
      id,
      amount,
      proposal_summary,
      status,
      submitted_by,
      bidder_company_id,
      tenders!bids_tender_id_fkey (
        id,
        title,
        status,
        submission_deadline
      )
    `)
    .eq('id', bidId)
    .single()

  if (existingBidError || !existingBid) {
    redirectWithError('/dashboard/bids', 'Bid not found.')
  }

  const tender = Array.isArray(existingBid.tenders)
    ? existingBid.tenders[0]
    : existingBid.tenders

  if (!tender) {
    redirectWithError('/dashboard/bids', 'Linked tender not found.')
  }

  if (existingBid.submitted_by !== user.id) {
    redirectWithError('/dashboard/bids', 'You do not have permission to edit this bid.')
  }

  if (existingBid.status !== 'submitted') {
    redirectWithError('/dashboard/bids', 'Only submitted bids can be edited.')
  }

  if (tender.status !== 'published') {
    redirectWithError('/dashboard/bids', 'This tender is no longer open for bid edits.')
  }

  if (new Date(tender.submission_deadline) <= new Date()) {
    redirectWithError('/dashboard/bids', 'The submission deadline has passed.')
  }

  const { data: updatedBid, error: updateError } = await supabase
    .from('bids')
    .update({
      amount,
      proposal_summary: proposalSummary,
    })
    .eq('id', bidId)
    .select('id, amount, proposal_summary')
    .single()

  if (updateError || !updatedBid) {
    redirectWithError(
      `/dashboard/bids/${bidId}/edit`,
      updateError?.message ?? 'Could not update bid.'
    )
  }

  await supabase.from('audit_log').insert({
    actor_profile_id: user.id,
    action: 'bid_updated',
    table_name: 'bids',
    record_id: bidId,
    old_data: {
      amount: existingBid.amount,
      proposal_summary: existingBid.proposal_summary,
    },
    new_data: {
      amount,
      proposal_summary: proposalSummary,
      tender_id: tender.id,
      tender_title: tender.title,
    },
  })

  revalidatePath('/dashboard/bids')
  revalidatePath(`/dashboard/bids/${bidId}/edit`)
  revalidatePath(`/tenders/${tender.id}`)

  redirect('/dashboard/bids')
}
export async function awardTenderAction(tenderId: string, bidId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.rpc('award_tender', {
    p_tender_id: tenderId,
    p_bid_id: bidId,
  })

  if (error) {
    redirectWithError(`/dashboard/tenders/${tenderId}`, error.message)
  }

  revalidatePath('/')
  revalidatePath('/tenders')
  revalidatePath(`/tenders/${tenderId}`)
  revalidatePath('/dashboard/tenders')
  revalidatePath(`/dashboard/tenders/${tenderId}`)

  redirect(`/dashboard/tenders/${tenderId}`)
}
export async function createMilestoneAction(tenderId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const title = getField(formData, 'title')
  const description = getField(formData, 'description')
  const dueDate = getField(formData, 'dueDate')
  const amount = Number(getField(formData, 'amount'))

  if (!title || !dueDate) {
    redirectWithError(
      `/dashboard/tenders/${tenderId}/milestones/new`,
      'Milestone title and due date are required.'
    )
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    redirectWithError(
      `/dashboard/tenders/${tenderId}/milestones/new`,
      'Milestone amount must be greater than 0.'
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirectWithError('/dashboard', 'Could not load your profile.')
  }

  if (profile.role !== 'sponsor') {
    redirectWithError('/dashboard', 'Only sponsors can create milestones.')
  }

  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .select('id, title, status, sponsor_company_id, awarded_bid_id')
    .eq('id', tenderId)
    .single()

  if (tenderError || !tender) {
    redirectWithError('/dashboard/tenders', 'Tender not found.')
  }

  if (tender.sponsor_company_id !== profile.company_id) {
    redirectWithError('/dashboard/tenders', 'You do not own this tender.')
  }

  if (!['awarded', 'in_progress'].includes(tender.status)) {
    redirectWithError(
      `/dashboard/tenders/${tenderId}`,
      'Milestones can only be created after the tender has been awarded.'
    )
  }

  if (!tender.awarded_bid_id) {
    redirectWithError(
      `/dashboard/tenders/${tenderId}`,
      'This tender does not have an awarded bid yet.'
    )
  }

  const { data: existingMilestones } = await supabase
    .from('milestones')
    .select('sequence_number')
    .eq('tender_id', tenderId)
    .order('sequence_number', { ascending: false })
    .limit(1)

  const nextSequence =
    existingMilestones && existingMilestones.length > 0
      ? existingMilestones[0].sequence_number + 1
      : 1

  const { data: milestone, error: milestoneError } = await supabase
    .from('milestones')
    .insert({
      tender_id: tenderId,
      title,
      description: description || null,
      sequence_number: nextSequence,
      due_date: dueDate,
      amount,
      status: 'pending',
    })
    .select('id, title, amount, sequence_number')
    .single()

  if (milestoneError || !milestone) {
    redirectWithError(
      `/dashboard/tenders/${tenderId}/milestones/new`,
      milestoneError?.message ?? 'Could not create milestone.'
    )
  }

  await supabase.from('audit_log').insert({
    actor_profile_id: user.id,
    action: 'milestone_created',
    table_name: 'milestones',
    record_id: milestone.id,
    new_data: {
      tender_id: tenderId,
      tender_title: tender.title,
      milestone_title: milestone.title,
      sequence_number: milestone.sequence_number,
      amount: milestone.amount,
      status: 'pending',
    },
  })

  revalidatePath(`/dashboard/tenders/${tenderId}`)
  revalidatePath(`/dashboard/tenders/${tenderId}/milestones/new`)

  redirect(`/dashboard/tenders/${tenderId}`)
}
export async function submitMilestoneEvidenceAction(
  tenderId: string,
  milestoneId: string,
  formData: FormData
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const progressSummary = getField(formData, 'progressSummary')
  const evidenceUrl = getField(formData, 'evidenceUrl')
  const evidenceFile = formData.get('evidenceFile')

  if (progressSummary.length < 10) {
    redirectWithError(
      `/dashboard/projects/${tenderId}`,
      'Progress summary must be at least 10 characters.'
    )
  }

  const { error } = await supabase.rpc('submit_milestone_evidence', {
    p_milestone_id: milestoneId,
    p_progress_summary: progressSummary,
    p_evidence_url: evidenceUrl || null,
  })

  if (error) {
    redirectWithError(`/dashboard/projects/${tenderId}`, error.message)
  }

  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    try {
      await uploadFileToQuarantine({
        supabase,
        userId: user.id,
        file: evidenceFile,
        purpose: 'milestone_evidence',
        tenderId,
        milestoneId,
      })
    } catch (uploadError) {
      redirectWithError(
        `/dashboard/projects/${tenderId}`,
        uploadError instanceof Error
          ? uploadError.message
          : 'Milestone was submitted, but the evidence file could not be uploaded.'
      )
    }
  }

  await supabase.from('audit_log').insert({
    actor_profile_id: user.id,
    action: 'milestone_evidence_file_attached',
    table_name: 'documents',
    record_id: null,
    new_data: {
      tender_id: tenderId,
      milestone_id: milestoneId,
      has_file: evidenceFile instanceof File && evidenceFile.size > 0,
    },
  })

  revalidatePath('/')
  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${tenderId}`)
  revalidatePath(`/dashboard/tenders/${tenderId}`)
  revalidatePath('/dashboard/admin/documents')

  redirect(`/dashboard/projects/${tenderId}`)
}

export async function reviewMilestoneEvidenceAction(
  tenderId: string,
  milestoneId: string,
  decision: 'verified' | 'rejected',
  formData: FormData
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const note = getField(formData, 'note')

  if (decision === 'rejected' && !note) {
    redirectWithError(
      `/dashboard/tenders/${tenderId}`,
      'Please provide a rejection reason.'
    )
  }

  const { error } = await supabase.rpc('review_milestone_evidence', {
    p_milestone_id: milestoneId,
    p_decision: decision,
    p_note: note || null,
  })

  if (error) {
    redirectWithError(`/dashboard/tenders/${tenderId}`, error.message)
  }

  revalidatePath('/')
  revalidatePath('/dashboard/tenders')
  revalidatePath(`/dashboard/tenders/${tenderId}`)
  revalidatePath(`/dashboard/projects/${tenderId}`)

  redirect(`/dashboard/tenders/${tenderId}`)
}
export async function releaseMilestonePaymentAction(
  tenderId: string,
  transactionId: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.rpc('release_milestone_payment', {
    p_transaction_id: transactionId,
  })

  if (error) {
    redirectWithError(`/dashboard/tenders/${tenderId}`, error.message)
  }

  revalidatePath('/')
  revalidatePath('/tenders')
  revalidatePath(`/tenders/${tenderId}`)
  revalidatePath('/dashboard/tenders')
  revalidatePath(`/dashboard/tenders/${tenderId}`)
  revalidatePath(`/dashboard/projects/${tenderId}`)

  redirect(`/dashboard/tenders/${tenderId}`)
}

export async function runAccountabilityScanAction(returnPath: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirectWithError('/dashboard', 'Could not load your profile.')
  }

  const allowedRoles = ['admin', 'sponsor', 'auditor', 'procurement_officer']

  if (!allowedRoles.includes(profile.role)) {
    redirectWithError('/dashboard', 'You do not have permission to run accountability scans.')
  }

  const { error } = await supabase.rpc('scan_accountability_flags')

  const safeReturnPath =
    returnPath.startsWith('/') && !returnPath.startsWith('//')
      ? returnPath
      : '/dashboard'

  if (error) {
    redirectWithError(safeReturnPath, error.message)
  }

  revalidatePath('/')
  revalidatePath('/tenders')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tenders')

  redirect(`${safeReturnPath}?message=${encodeURIComponent('Accountability scan completed.')}`)
}

export async function adminUpdateCompanyStatusAction(
  companyId: string,
  status: 'pending' | 'verified' | 'rejected' | 'suspended',
  returnPath: string,
  formData: FormData
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const note = getField(formData, 'note')

  if ((status === 'rejected' || status === 'suspended') && !note) {
    redirectWithError(returnPath, 'Please provide a reason.')
  }

  const { error } = await supabase.rpc('admin_update_company_status', {
    p_company_id: companyId,
    p_status: status,
    p_note: note || null,
  })

  if (error) {
    redirectWithError(returnPath, error.message)
  }

  revalidatePath('/dashboard/admin/companies')
  revalidatePath('/dashboard')

  redirect(
    `${returnPath}?message=${encodeURIComponent(
      `Company status updated to ${status}.`
    )}`
  )
}

export async function checkTenderCompletionAction(tenderId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.rpc('complete_tender_if_ready', {
    p_tender_id: tenderId,
    p_actor_id: user.id,
  })

  if (error) {
    redirectWithError(`/dashboard/tenders/${tenderId}`, error.message)
  }

  revalidatePath('/')
  revalidatePath('/tenders')
  revalidatePath(`/tenders/${tenderId}`)
  revalidatePath('/dashboard/tenders')
  revalidatePath(`/dashboard/tenders/${tenderId}`)

  redirect(
    `/dashboard/tenders/${tenderId}?message=${encodeURIComponent(
      'Completion check finished.'
    )}`
  )
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

const allowedUploadTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
])

const blockedExtensions = [
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.ps1',
  '.sh',
  '.js',
  '.html',
  '.htm',
  '.svg',
  '.zip',
  '.rar',
  '.7z',
  '.docm',
  '.xlsm',
]

function cleanFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)
}

function isBlockedFileName(fileName: string) {
  const lower = fileName.toLowerCase()
  return blockedExtensions.some((extension) => lower.endsWith(extension))
}

async function uploadFileToQuarantine({
  supabase,
  userId,
  file,
  purpose,
  tenderId,
  milestoneId,
  bidId,
  companyId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  file: File
  purpose: 'company_verification' | 'bid_document' | 'milestone_evidence' | 'payment_proof' | 'completion_report'
  tenderId?: string | null
  milestoneId?: string | null
  bidId?: string | null
  companyId?: string | null
}) {
  if (file.size <= 0) {
    throw new Error('The uploaded file is empty.')
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error('File is too large. Maximum size is 10MB.')
  }

  if (!allowedUploadTypes.has(file.type)) {
    throw new Error('File type is not allowed. Upload PDF, PNG, JPG, WEBP, or TXT files only.')
  }

  if (isBlockedFileName(file.name)) {
    throw new Error('This file extension is blocked for security reasons.')
  }

  const safeName = cleanFileName(file.name)
  const storagePath = `quarantine/${userId}/${randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('tender-documents')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: documentError } = await supabase.from('documents').insert({
    uploaded_by: userId,
    tender_id: tenderId ?? null,
    milestone_id: milestoneId ?? null,
    bid_id: bidId ?? null,
    company_id: companyId ?? null,
    file_name: safeName,
    storage_path: storagePath,
    bucket_id: 'tender-documents',
    mime_type: file.type,
    file_size_bytes: file.size,
    purpose,
    scan_status: 'pending_scan',
    scan_note: 'Uploaded to quarantine. Awaiting scan/review.',
  })

  if (documentError) {
    throw new Error(documentError.message)
  }
}

export async function adminReviewDocumentAction(
  documentId: string,
  scanStatus: 'clean' | 'quarantined' | 'rejected',
  returnPath: string,
  formData: FormData
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const note = getField(formData, 'note')

  if ((scanStatus === 'quarantined' || scanStatus === 'rejected') && !note) {
    redirectWithError(returnPath, 'Please provide a reason.')
  }

  const { error } = await supabase.rpc('admin_review_document', {
    p_document_id: documentId,
    p_scan_status: scanStatus,
    p_note: note || null,
  })

  if (error) {
    redirectWithError(returnPath, error.message)
  }

  revalidatePath('/dashboard/admin/documents')
  revalidatePath('/')
  revalidatePath('/tenders')

  redirect(
    `${returnPath}?message=${encodeURIComponent(
      `Document marked as ${scanStatus}.`
    )}`
  )
}