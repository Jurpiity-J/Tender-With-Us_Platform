export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value)
}

/**
 * Lightweight format checks prevent obvious MIME/extension spoofing.
 * These checks do NOT replace quarantine, malware scanning or storage RLS.
 */
export function hasExpectedFileSignature(mimeType: string, bytes: Uint8Array): boolean {
  switch (mimeType) {
    case 'application/pdf':
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff])
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/webp':
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]) // RIFF...WEBP
    case 'text/plain':
      return !bytes.includes(0) // Reject obvious binary data disguised as text.
    default:
      return false
  }
}

export async function validateEvidenceUpload(file: File): Promise<void> {
  if (file.size <= 0) {
    throw new Error('The uploaded file is empty.')
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error('File is too large. Maximum size is 10MB.')
  }

  const extensions = MIME_EXTENSIONS[file.type]
  if (!extensions) {
    throw new Error('File type is not allowed. Upload PDF, PNG, JPG, WEBP, or TXT files only.')
  }

  const fileName = file.name.toLowerCase()
  if (!extensions.some((extension) => fileName.endsWith(extension))) {
    throw new Error('The file extension does not match its declared type.')
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!hasExpectedFileSignature(file.type, header)) {
    throw new Error('File contents do not match the allowed file type.')
  }
}
