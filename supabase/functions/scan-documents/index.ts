import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type DocumentRow = {
  id: string
  file_name: string
  storage_path: string
  bucket_id: string | null
  mime_type: string | null
  scan_status: 'pending_scan' | 'clean' | 'quarantined' | 'rejected'
  scan_external_id: string | null
  scan_attempts: number
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY')!
const SCANNER_INTERNAL_TOKEN = Deno.env.get('SCANNER_INTERNAL_TOKEN')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? ''

  if (!header.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return header.slice('bearer '.length).trim()
}

async function markDocument({
  documentId,
  scanStatus,
  scanProvider,
  scanExternalId,
  scanResult,
  scanNote,
  lastScanError,
}: {
  documentId: string
  scanStatus: 'pending_scan' | 'clean' | 'quarantined' | 'rejected'
  scanProvider: string
  scanExternalId: string | null
  scanResult: Record<string, unknown>
  scanNote: string
  lastScanError?: string | null
}) {
  const { error } = await supabase.rpc('record_document_scan_result', {
    p_document_id: documentId,
    p_scan_status: scanStatus,
    p_scan_provider: scanProvider,
    p_scan_external_id: scanExternalId,
    p_scan_result: scanResult,
    p_scan_note: scanNote,
    p_last_scan_error: lastScanError ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function submitToVirusTotal(document: DocumentRow) {
  const bucket = document.bucket_id ?? 'tender-documents'

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(document.storage_path)

  if (downloadError || !fileBlob) {
    throw new Error(downloadError?.message ?? 'Could not download file from quarantine.')
  }

  const formData = new FormData()

  const file = new File([fileBlob], document.file_name, {
    type: document.mime_type ?? 'application/octet-stream',
  })

  formData.append('file', file)

  const response = await fetch('https://www.virustotal.com/api/v3/files', {
    method: 'POST',
    headers: {
      'x-apikey': VIRUSTOTAL_API_KEY,
    },
    body: formData,
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(
      result?.error?.message ?? `VirusTotal upload failed with status ${response.status}.`
    )
  }

  const analysisId = result?.data?.id

  if (!analysisId) {
    throw new Error('VirusTotal did not return an analysis id.')
  }

  await supabase
    .from('documents')
    .update({
      scan_provider: 'virustotal',
      scan_external_id: analysisId,
      scan_attempts: document.scan_attempts + 1,
      scan_note: 'Submitted to VirusTotal. Waiting for analysis result.',
      last_scan_error: null,
    })
    .eq('id', document.id)

  return {
    document_id: document.id,
    action: 'submitted',
    analysis_id: analysisId,
  }
}

async function pollVirusTotal(document: DocumentRow) {
  const response = await fetch(
    `https://www.virustotal.com/api/v3/analyses/${document.scan_external_id}`,
    {
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(
      result?.error?.message ?? `VirusTotal analysis lookup failed with status ${response.status}.`
    )
  }

  const attributes = result?.data?.attributes
  const status = attributes?.status
  const stats = attributes?.stats ?? {}

  if (status !== 'completed') {
    await supabase
      .from('documents')
      .update({
        scan_attempts: document.scan_attempts + 1,
        scan_note: 'VirusTotal analysis is still pending.',
        last_scan_error: null,
      })
      .eq('id', document.id)

    return {
      document_id: document.id,
      action: 'waiting',
      analysis_id: document.scan_external_id,
      status,
    }
  }

  const malicious = Number(stats.malicious ?? 0)
  const suspicious = Number(stats.suspicious ?? 0)
  const confirmedTimeout = Number(stats['confirmed-timeout'] ?? 0)

  const shouldQuarantine = malicious > 0 || suspicious > 0

  if (shouldQuarantine) {
    await markDocument({
      documentId: document.id,
      scanStatus: 'quarantined',
      scanProvider: 'virustotal',
      scanExternalId: document.scan_external_id,
      scanResult: result,
      scanNote: `Automatic scan found ${malicious} malicious and ${suspicious} suspicious detection(s). File remains quarantined.`,
      lastScanError: null,
    })

    return {
      document_id: document.id,
      action: 'quarantined',
      malicious,
      suspicious,
    }
  }

  await markDocument({
    documentId: document.id,
    scanStatus: 'clean',
    scanProvider: 'virustotal',
    scanExternalId: document.scan_external_id,
    scanResult: result,
    scanNote: `Automatic scan completed. No malicious or suspicious detections. Confirmed timeouts: ${confirmedTimeout}.`,
    lastScanError: null,
  })

  return {
    document_id: document.id,
    action: 'clean',
    malicious,
    suspicious,
    confirmedTimeout,
  }
}

async function processDocument(document: DocumentRow) {
  try {
    if (!document.scan_external_id) {
      return await submitToVirusTotal(document)
    }

    return await pollVirusTotal(document)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scan error.'

    await supabase
      .from('documents')
      .update({
        scan_attempts: document.scan_attempts + 1,
        last_scan_error: message,
        scan_note: `Automatic scan error: ${message}`,
      })
      .eq('id', document.id)

    return {
      document_id: document.id,
      action: 'error',
      error: message,
    }
  }
}

serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const token = getBearerToken(request)

  if (!SCANNER_INTERNAL_TOKEN || token !== SCANNER_INTERNAL_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const body = await request.json().catch(() => ({}))

  const limit = Math.min(Number(body.limit ?? 3), 10)

  const { data: documents, error } = await supabase
    .from('documents')
    .select(`
      id,
      file_name,
      storage_path,
      bucket_id,
      mime_type,
      scan_status,
      scan_external_id,
      scan_attempts
    `)
    .eq('scan_status', 'pending_scan')
    .lt('scan_attempts', 10)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const results = []

  for (const document of documents as DocumentRow[]) {
    const result = await processDocument(document)
    results.push(result)
  }

  return jsonResponse({
    success: true,
    processed: results.length,
    results,
  })
})