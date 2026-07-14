/**
 * Worldwide ISBN metadata lookup (serverless).
 *
 * Pattern inspired by isbnlib / multi-source aggregators:
 * query every free provider in parallel for ANY ISBN, then pick the richest hit.
 * No publisher-prefix or country assumptions — books bought anywhere on Earth.
 *
 * Providers: Google Books, Open Library, openBD, isbn.tw, isbnsearch.org,
 * Internet Archive. Optional: VITE_GOOGLE_BOOKS_API_KEY for Google quota.
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

function decodeEntities(text) {
  return String(text ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
}

const KNOWN_LANGS = new Set([
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'sv',
  'no',
  'da',
  'fi',
  'pl',
  'ru',
  'uk',
  'cs',
  'el',
  'tr',
  'ar',
  'he',
  'hi',
  'ja',
  'ko',
  'zh',
  'zh-Hans',
  'zh-Hant',
  'th',
  'vi',
  'id',
  'hu',
  'ro',
])

function languageMatchesTitle(language, title) {
  if (!language || !title) return true
  const hasLatin = /[A-Za-z\u00C0-\u024F]/.test(title)
  const hasKana = /[ぁ-んァ-ン]/.test(title)
  const hasHangul = /[\uac00-\ud7af]/.test(title)
  const hasHan = /[\u4e00-\u9fff]/.test(title)
  if (language === 'ja' && !hasKana && !hasHan) return false
  if (language === 'ko' && !hasHangul) return false
  if (
    (language === 'zh-Hans' || language === 'zh-Hant' || language === 'zh') &&
    !hasHan
  ) {
    return false
  }
  if (
    ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'no', 'da'].includes(
      language,
    ) &&
    !hasLatin &&
    (hasHan || hasKana || hasHangul)
  ) {
    return false
  }
  return true
}

function sanitizeLanguage(code) {
  if (!code) return ''
  const raw = String(code).trim()
  if (KNOWN_LANGS.has(raw)) return raw
  const lower = raw.toLowerCase()
  if (lower.startsWith('zh-hant') || lower === 'zh-tw' || lower === 'zh-hk') {
    return 'zh-Hant'
  }
  if (lower.startsWith('zh')) return 'zh-Hans'
  const short = lower.split(/[-_]/)[0]
  return KNOWN_LANGS.has(short) ? short : ''
}

function guessLanguage(text, hint) {
  const t = `${text ?? ''} ${hint ?? ''}`
  if (/繁體|繁体|台灣|台湾|臺/.test(t)) return 'zh-Hant'
  if (/简体|簡體|中国大陆|大陸/.test(t)) return 'zh-Hans'
  // Kana → Japanese. Kanji-only is ambiguous (shared with Chinese).
  if (/[ぁ-んァ-ン]/.test(t)) return 'ja'
  if (/[繁體臺灣澳門這說過們為來時國對]/.test(t)) return 'zh-Hant'
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh-Hans'
  if (/[\uac00-\ud7af]/.test(t)) return 'ko'
  if (/[\u0400-\u04ff]/.test(t)) return 'ru'
  if (/[\u0600-\u06ff]/.test(t)) return 'ar'
  return ''
}

/**
 * Japanese retail "図書コード" / price barcode (often starts with 19…).
 * Not an ISBN anywhere in the world — detect the symbology, not the country of purchase.
 */
function isJapaneseClassificationCode(isbn) {
  return (
    isbn.length === 13 &&
    isbn.startsWith('19') &&
    !isbn.startsWith('978') &&
    !isbn.startsWith('979')
  )
}

function isJunkTitle(title) {
  if (!title) return true
  if (title.length < 2) return true
  return /please verify|just a moment|access denied|captcha|cloudflare|attention required|ummenschlich|are you a robot|verify you are human/i.test(
    title,
  )
}

function scoreResult(result) {
  if (!result?.title || isJunkTitle(result.title)) return -1
  let score = 0
  score += Math.min(result.title.length, 80)
  if (result.author) score += 40 + Math.min(result.author.length, 40)
  if (result.cover_url) score += 25
  if (result.language) score += 10
  // Prefer providers that set language from catalog data, not heuristics.
  if (result.source === 'openbd' || result.source === 'isbn.tw') score += 15
  if (result.source === 'google') score += 20
  if (result.source === 'openlibrary') score += 8
  return score
}

function pickBest(results) {
  let best = null
  let bestScore = -1
  for (const result of results) {
    if (!result?.title || isJunkTitle(result.title)) continue
    const score = scoreResult(result)
    if (score > bestScore) {
      best = result
      bestScore = score
    }
  }
  return best
}

/** Merge fields from several hits so we keep the best cover/language/author. */
function mergeResults(results) {
  const usable = results.filter((r) => r?.title && !isJunkTitle(r.title))
  if (usable.length === 0) return null
  const primary = pickBest(usable)
  if (!primary) return null

  // Prefer catalog languages from trusted providers. Do not borrow noisy
  // Open Library language tags onto a Google/isbn.tw title.
  const trustedLang =
    usable.find(
      (r) =>
        r.source === 'openbd' &&
        r.language &&
        languageMatchesTitle(r.language, primary.title),
    )?.language ||
    usable.find(
      (r) =>
        r.source === 'isbn.tw' &&
        r.language &&
        languageMatchesTitle(r.language, primary.title),
    )?.language ||
    usable.find(
      (r) =>
        r.source === 'google' &&
        r.language &&
        languageMatchesTitle(r.language, primary.title),
    )?.language ||
    ''
  let language = sanitizeLanguage(
    trustedLang || primary.language || guessLanguage(primary.title),
  )
  if (!languageMatchesTitle(language, primary.title)) language = ''


  return {
    title: decodeEntities(primary.title),
    author: decodeEntities(
      primary.author || usable.find((r) => r.author)?.author || '',
    ),
    isbn: primary.isbn,
    language,
    cover_url:
      primary.cover_url ||
      usable.find((r) => r.cover_url)?.cover_url ||
      null,
    source: primary.source,
  }
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
  const rawLang = (info.language || '').toLowerCase()
  const language = rawLang.startsWith('zh')
    ? guessLanguage(title) || 'zh-Hans'
    : rawLang.split('-')[0] || guessLanguage(title)
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

/**
 * Google Books HTML page — works worldwide even when the JSON API is rate-limited.
 * Same data Google uses for "About this book".
 */
async function lookupGoogleHtml(isbn) {
  const html = await fetchText(
    `https://books.google.com/books?vid=ISBN${isbn}&jscmd=Data`,
  )
  if (!html) return null
  if (/not\s*found|doesn.?t match|no information/i.test(html) && !/<meta name="title"/i.test(html)) {
    return null
  }
  const title = decodeEntities(
    html.match(/<meta\s+name="title"\s+content="([^"]*)"/i)?.[1]?.trim() ||
      html.match(/property="og:title"\s+content="([^"]*)"/i)?.[1]?.trim() ||
      '',
  )
  if (!title || isJunkTitle(title)) return null

  let author = ''
  const titleTag = html.match(/<title>([^<]+)<\/title>/i)?.[1] || ''
  // "Title - Author - Google Books/圖書"
  const parts = titleTag.split(/\s+-\s+/)
  if (parts.length >= 2 && parts[0].includes(title.slice(0, Math.min(4, title.length)))) {
    const maybeAuthor = parts[1]?.trim() || ''
    if (maybeAuthor && !/google/i.test(maybeAuthor)) author = maybeAuthor
  }

  const bookId =
    html.match(/[?&]id=([A-Za-z0-9_-]{8,})/)?.[1] ||
    html.match(/books\/about\/[^"]+\?[^"]*id=([A-Za-z0-9_-]+)/)?.[1] ||
    null

  return {
    title,
    author,
    isbn,
    language: guessLanguage(`${title}${author}`),
    cover_url: bookId
      ? `https://books.google.com/books/content?id=${bookId}&printsec=frontcover&img=1&zoom=1`
      : null,
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
  // Open Library language tags are often noisy; only keep clear ISO-ish codes.
  let language = sanitizeLanguage(langKey.slice(0, 3) === 'chi' || langKey.startsWith('zho')
    ? guessLanguage(entry.title) || 'zh-Hans'
    : langKey.startsWith('jpn')
      ? 'ja'
      : langKey.startsWith('kor')
        ? 'ko'
        : langKey.slice(0, 2))
  if (!language) language = guessLanguage(entry.title)
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

async function lookupOpenLibrarySearch(isbn) {
  const data = await fetchJson(
    `https://openlibrary.org/search.json?isbn=${encodeURIComponent(
      isbn,
    )}&limit=1&fields=title,author_name,cover_i,language,isbn`,
  )
  const doc = data?.docs?.[0]
  if (!doc?.title) return null
  const lang = doc.language?.[0] || ''
  return {
    title: doc.title,
    author: (doc.author_name || []).join(', '),
    isbn,
    language: lang.startsWith('zh')
      ? guessLanguage(doc.title) || 'zh-Hans'
      : lang.slice(0, 2) || guessLanguage(doc.title),
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    source: 'openlibrary',
  }
}

/** openBD — strong JP coverage; returns null for ISBNs it does not know. */
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

/** isbn.tw — strong TW/ZH coverage; safe to call for any ISBN. */
async function lookupIsbnTw(isbn) {
  const html = await fetchText(`https://isbn.tw/${isbn}`)
  if (!html) return null
  if (
    /找不到|查無|not\s*found/i.test(html) &&
    !/<h1[^>]*>[^<]*[\u4e00-\u9fff]/.test(html)
  ) {
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
  const language = /繁體|繁体/.test(languageHint)
    ? 'zh-Hant'
    : /简体|簡體/.test(languageHint)
      ? 'zh-Hans'
      : guessLanguage(`${title}${author}${languageHint}`) || ''
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
  if (/please verify|just a moment|cf-browser-verification|challenge-platform/i.test(html)) {
    return null
  }
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim()
  if (!title || /^isbn\b/i.test(title) || isJunkTitle(title)) return null
  const field = (label) =>
    html
      .match(new RegExp(`<strong>${label}:</strong>\\s*([^<]+)`, 'i'))?.[1]
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

async function lookupInternetArchive(isbn) {
  const data = await fetchJson(
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      `isbn:${isbn}`,
    )}&fl[]=identifier,title,creator,language&output=json&rows=1`,
  )
  const doc = data?.response?.docs?.[0]
  if (!doc?.title) return null
  const lang = Array.isArray(doc.language) ? doc.language[0] : doc.language
  return {
    title: doc.title,
    author: Array.isArray(doc.creator)
      ? doc.creator.join(', ')
      : doc.creator || '',
    isbn,
    language: (lang || '').toString().slice(0, 2) || guessLanguage(doc.title),
    cover_url: doc.identifier
      ? `https://archive.org/services/img/${doc.identifier}`
      : null,
    source: 'archive',
  }
}

/** Wikipedia Citoid — works for many widely catalogued ISBNs. */
async function lookupWikipedia(isbn) {
  const data = await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/data/citation/mediawiki/${isbn}`,
  )
  const entry = Array.isArray(data) ? data[0] : data
  if (!entry || entry.error || !entry.title) return null
  const author = Array.isArray(entry.author)
    ? entry.author
        .map((a) =>
          typeof a === 'string'
            ? a
            : [a.firstName, a.lastName].filter(Boolean).join(' '),
        )
        .filter(Boolean)
        .join(', ')
    : entry.author || ''
  return {
    title: entry.title,
    author,
    isbn,
    language: guessLanguage(entry.title) || 'en',
    cover_url: null,
    source: 'wikipedia',
  }
}

async function lookupIsbnServer(rawIsbn) {
  const isbn = normalizeIsbn(rawIsbn)
  if (isbn.length < 10) return null

  if (isJapaneseClassificationCode(isbn)) {
    return {
      error: 'japanese_classification_code',
      message:
        'That barcode is a Japanese price/classification code, not an ISBN. Scan the ISBN barcode (it starts with 978 or 979).',
    }
  }

  // Fan-out to every free worldwide source — no regional short-circuit.
  const results = await Promise.all([
    lookupGoogle(isbn),
    lookupGoogleHtml(isbn),
    lookupOpenLibrary(isbn),
    lookupOpenLibrarySearch(isbn),
    lookupOpenBd(isbn),
    lookupIsbnTw(isbn),
    lookupIsbnSearch(isbn),
    lookupInternetArchive(isbn),
    lookupWikipedia(isbn),
  ])

  return mergeResults(results)
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
