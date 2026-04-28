import type { VersionCheckerOptions } from '../types'
import { canonicalizeViteManifest } from './viteManifestCanonicalize'
import { sha256Base64Url } from './webCryptoHash'

export type ViteFingerprintResult = {
  manifestUrl: string
  fingerprint: string
}

export async function fetchViteFingerprint(
  options: Pick<VersionCheckerOptions, 'manifestUrl' | 'headers' | 'fetcher'>
): Promise<ViteFingerprintResult> {
  const manifestUrl = resolveManifestUrl(options.manifestUrl)
  const url = withCacheBusting(manifestUrl)
  const fetcher = options.fetcher ?? fetch

  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...(options.headers ?? {})
  }

  const res = await fetcher(url, { headers })
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status} ${res.statusText}`)
  const raw = (await res.json()) as unknown
  const canonicalJson = canonicalizeViteManifest(raw)
  const fingerprint = await sha256Base64Url(canonicalJson)
  return { manifestUrl, fingerprint }
}

function resolveManifestUrl(manifestUrl: string | (() => string) | undefined) {
  if (!manifestUrl) return '/manifest.json'
  return typeof manifestUrl === 'function' ? manifestUrl() : manifestUrl
}

function withCacheBusting(url: string) {
  const t = Date.now()
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}__vimo_vc_t=${t}`
}
