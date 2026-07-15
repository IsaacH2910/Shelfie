/** Split OCR text into candidate title blocks (multi-book / busy covers). */
export function splitOcrCandidates(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3)

  if (lines.length === 0) return []

  const blocks: string[] = []
  let current: string[] = []

  const flush = () => {
    if (current.length === 0) return
    const joined = current.join('\n').trim()
    if (joined.length >= 3) blocks.push(joined)
    current = []
  }

  for (const line of lines) {
    // Blank-ish / separator-ish lines start a new candidate
    if (/^[-_=·•]{2,}$/.test(line) || line.length <= 1) {
      flush()
      continue
    }
    current.push(line)
    // Keep blocks short — typical spine/cover titles
    if (current.length >= 4) flush()
  }
  flush()

  // Also offer the full text as one option
  const full = lines.join('\n')
  const unique = new Map<string, string>()
  for (const block of [full, ...blocks]) {
    const key = block.toLowerCase().replace(/\s+/g, ' ')
    if (!unique.has(key)) unique.set(key, block)
  }
  return [...unique.values()].slice(0, 6)
}
