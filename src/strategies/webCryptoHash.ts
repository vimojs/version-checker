export async function sha256Base64Url(input: string) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('WebCrypto is not available')

  const data = new TextEncoder().encode(input)
  const digest = await subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  return toBase64Url(bytes)
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

