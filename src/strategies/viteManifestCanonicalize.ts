type ViteManifestChunk = {
  file?: unknown
  css?: unknown
  imports?: unknown
}

export function canonicalizeViteManifest(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid manifest: expected object')

  const record = raw as Record<string, ViteManifestChunk>
  const keys = Object.keys(record).sort()
  const out: Record<string, any> = {}

  for (const key of keys) {
    const chunk = record[key]
    if (!chunk || typeof chunk !== 'object') continue

    const file = typeof chunk.file === 'string' ? chunk.file : undefined
    const css = normalizeStringArray(chunk.css)
    const imports = normalizeStringArray(chunk.imports)

    const o: Record<string, any> = {}
    if (file) o.file = file
    if (css.length) o.css = css
    if (imports.length) o.imports = imports
    out[key] = o
  }

  return JSON.stringify(out)
}

function normalizeStringArray(v: unknown) {
  if (!Array.isArray(v)) return []
  const list = v.filter((x) => typeof x === 'string') as string[]
  return [...new Set(list)].sort()
}

