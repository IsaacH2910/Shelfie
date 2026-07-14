/**
 * Vercel serverless ISBN lookup.
 * ESM (.mjs) so it works with the package "type":"module" setting on Vercel.
 */

function normalizeIsbn(value) {
  return String(value ?? '')
    .replace(/[^0-9xX]/g, '')
    .toUpperCase()
}

function httpsCover(url) {
  if (!url) return null
  return String(url).replace(/^http:\/\//, 'https://')
}

function guessLanguage(text, hint) {
  const t = `${text ?? ''} ${hint ?? ''}`
  if (/繁體|繁体|台灣|台湾|臺/.test(t)) return 'zh-Hant'
  if (/简体|簡體|中国大陆|大陸/.test(t)) return 'zh-Hans'
  if (/[繁體臺灣澳門這說過們為來時國對]/.test(t)) return 'zh-Hant'
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh-Hans'
  if (/[\u3040-\u30ff]/.test(t)) return 'ja'
  if (/[\uac00-\ud7af]/.test(t)) return 'ko'
  return ''
}

/** Japanese in-store classification / price barcode — not an ISBN. */
function isJapaneseClassificationCode(isbn) {
  return (
    isbn.length === 13 &&
    isbn.startsWith('19') &&
    !isbn.startsWith('978') &&
    !isbn.startsWith('979')
  )
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ShelfieBookLookup/1.0; +https://github.com/IsaacH2910/Shelfie)',
        Accept: 'text/html,application/json',
      },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function lookupGoogle(isbn) {
  const key = (process.env.VITE_GOOGLE_BOOKS_API_KEY || '').trim()
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : ''
  const data = await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1${keyParam}`,
  )
  const info = data?.items?.[0]?.volumeInfo
  if (!info?.title) return null
  const title = info.subtitle ? `${info.title}: ${info.subtitle}` : info.title
  const language = info.language?.toLowerCase().startsWith('zh')
    ? guessLanguage(title) || 'zh-Hans'
    : info.language?.split('-')[0] || guessLanguage(title)
  return {
    title,
    author: (info.authors || []).join(', '),
    isbn,
    language,
    cover_url: httpsCover(
      info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail,
    ),
    source: 'google',
  }
}

async function lookupOpenLibrary(isbn) {
  const data = await fetchJson(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  )
  const entry = data?.[`ISBN:${isbn}`]
  if (!entry?.title) return null
  const langKey = entry.languages?.[0]?.key?.replace('/languages/', '') || ''
  let language = ''
  if (langKey.startsWith('chi') || langKey.startsWith('zho')) {
    language = guessLanguage(entry.title) || 'zh-Hans'
  } else if (langKey.startsWith('jpn')) {
    language = 'ja'
  } else if (langKey) {
    language = langKey.slice(0, 2)
  } else {
    language = guessLanguage(entry.title)
  }
  return {
    title: entry.title,
    author: (entry.authors || [])
      .map((a) => a.name)
      .filter(Boolean)
      .join(', '),
    isbn,
    language,
    cover_url: httpsCover(entry.cover?.large || entry.cover?.medium),
    source: 'openlibrary',
  }
}

/** Excellent coverage for Japanese ISBN-13 (9784…). */
async function lookupOpenBd(isbn) {
  const data = await fetchJson(`https://api.openbd.jp/v1/get?isbn=${isbn}`)
  const row = Array.isArray(data) ? data[0] : null
  if (!row?.summary?.title) return null
  const summary = row.summary
  return {
    title: summary.title,
    author: (summary.author || '').replace(/[／/]/g, ', ').trim(),
    isbn: summary.isbn || isbn,
    language: 'ja',
    cover_url: httpsCover(summary.cover),
    source: 'openbd',
  }
}

/** Strong Traditional Chinese / Taiwan coverage. */
async function lookupIsbnTw(isbn) {
  const html = await fetchText(`https://isbn.tw/${isbn}`)
  if (!html) return null
  if (/找不到|查無|not\s*found/i.test(html) && !/<h1[^>]*>[^<]*[\u4e00-\u9fff]/.test(html)) {
    return null
  }
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim()
  if (!title || /^isbn\b/i.test(title)) return null
  const field = (label) => {
    const re = new RegExp(
      `>${label}<\\/[^>]+>\\s*<[^>]+>\\s*(?:<a[^>]*>)?([^<]+)`,
      'i',
    )
    return html.match(re)?.[1]?.trim() || ''
  }
  const author = field('作者')
  const languageHint = field('語言')
  const language =
    /繁體|繁体/.test(languageHint)
      ? 'zh-Hant'
      : /简体|簡體/.test(languageHint)
        ? 'zh-Hans'
        : guessLanguage(`${title}${author}${languageHint}`) || 'zh-Hant'
  const cover =
    html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/<amp-img[^>]+src="([^"]+)"/i)?.[1] ||
    null
  return {
    title,
    author,
    isbn,
    language,
    cover_url: httpsCover(cover),
    source: 'isbn.tw',
  }
}

async function lookupIsbnSearch(isbn) {
  const html = await fetchText(`https://isbnsearch.org/isbn/${isbn}`)
  if (!html) return null
  if (/could not find any information|sorry,/i.test(html)) return null
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim()
  if (!title || /^isbn\b/i.test(title)) return null
  const field = (label) =>
    html.match(new RegExp(`<strong>${label}:</strong>\\s*([^<]+)`, 'i'))?.[1]
      ?.trim() || ''
  const author = field('Author')
  return {
    title,
    author,
    isbn,
    language: guessLanguage(`${title}${author}`),
    cover_url: null,
    source: 'isbnsearch',
  }
}

async function lookupIsbnServer(rawIsbn) {
  const isbn = normalizeIsbn(rawIsbn)
  if (isbn.length < 10) return null

  if (isJapaneseClassificationCode(isbn)) {
    return {
      error: 'japanese_classification_code',
      message:
        'That barcode is a Japanese price/classification code, not an ISBN. Scan the ISBN barcode (it starts with 978).',
    }
  }

  // Prefer region-specific sources for Asian ISBNs, then global.
  const preferred = []
  if (isbn.startsWith('9784') || isbn.startsWith('9794')) {
    preferred.push(lookupOpenBd(isbn))
  }
  // Taiwan / HK / mainland publisher prefixes commonly miss on Google/OL.
  if (
    isbn.startsWith('978626') ||
    isbn.startsWith('978957') ||
    isbn.startsWith('978986') ||
    isbn.startsWith('978988') ||
    isbn.startsWith('9787') ||
    isbn.startsWith('978957')
  ) {
    preferred.push(lookupIsbnTw(isbn))
  }

  const [regionalResults, google, openlib] = await Promise.all([
    Promise.all(preferred),
    lookupGoogle(isbn),
    lookupOpenLibrary(isbn),
  ])

  for (const result of regionalResults) {
    if (result?.title) return result
  }
  if (google?.title) return google
  if (openlib?.title) return openlib

  // Always try Asian sources as fallback for any ISBN.
  const [openbd, isbnTw, isbnSearch] = await Promise.all([
    lookupOpenBd(isbn),
    lookupIsbnTw(isbn),
    lookupIsbnSearch(isbn),
  ])
  return openbd || isbnTw || isbnSearch || null
}

export { lookupIsbnServer, isJapaneseClassificationCode }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const isbn = String(req.query?.isbn ?? '')
  if (!isbn) {
    res.status(400).json({ error: 'Missing isbn' })
    return
  }

  try {
    const result = await lookupIsbnServer(isbn)
    if (!result) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (result.error === 'japanese_classification_code') {
      res.status(422).json(result)
      return
    }
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Lookup failed',
    })
  }
}
