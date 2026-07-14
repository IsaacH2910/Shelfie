export type ServerLookupResult = {
  title: string
  author: string
  isbn: string
  language: string
  cover_url: string | null
  source: 'google' | 'openlibrary' | 'isbnsearch'
}

function normalizeIsbn(value: string): string {
  return value.replace(/[^0-9xX]/g, '').toUpperCase()
}

function httpsCover(url?: string | null): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

function guessChineseScript(text: string): 'zh-Hans' | 'zh-Hant' | '' {
  if (/[繁體臺灣澳門這說過們為來時國對]/.test(text)) return 'zh-Hant'
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh-Hans'
  return ''
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function lookupGoogle(isbn: string): Promise<ServerLookupResult | null> {
  const key = process.env.VITE_GOOGLE_BOOKS_API_KEY?.trim()
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : ''
  const data = await fetchJson<{
    items?: {
      volumeInfo?: {
        title?: string
        subtitle?: string
        authors?: string[]
        language?: string
        imageLinks?: { thumbnail?: string; smallThumbnail?: string }
      }
    }[]
  }>(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1${keyParam}`,
  )
  const info = data?.items?.[0]?.volumeInfo
  if (!info?.title) return null
  const title = info.subtitle ? `${info.title}: ${info.subtitle}` : info.title
  const language = info.language?.toLowerCase().startsWith('zh')
    ? guessChineseScript(title) || 'zh-Hans'
    : info.language?.split('-')[0] || ''
  return {
    title,
    author: (info.authors ?? []).join(', '),
    isbn,
    language,
    cover_url: httpsCover(
      info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail,
    ),
    source: 'google',
  }
}

async function lookupOpenLibrary(
  isbn: string,
): Promise<ServerLookupResult | null> {
  const data = await fetchJson<
    Record<
      string,
      {
        title?: string
        authors?: { name?: string }[]
        cover?: { medium?: string; large?: string }
        languages?: { key?: string }[]
      }
    >
  >(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  )
  const entry = data?.[`ISBN:${isbn}`]
  if (!entry?.title) return null
  const langKey = entry.languages?.[0]?.key?.replace('/languages/', '') ?? ''
  const language =
    langKey.startsWith('chi') || langKey.startsWith('zho')
      ? guessChineseScript(entry.title) || 'zh-Hans'
      : langKey.slice(0, 2)
  return {
    title: entry.title,
    author: (entry.authors ?? []).map((a) => a.name).filter(Boolean).join(', '),
    isbn,
    language,
    cover_url: httpsCover(entry.cover?.large ?? entry.cover?.medium),
    source: 'openlibrary',
  }
}

/** Strong Chinese / non-English ISBN coverage where Google/OL are empty. */
async function lookupIsbnSearch(
  isbn: string,
): Promise<ServerLookupResult | null> {
  try {
    const res = await fetch(`https://isbnsearch.org/isbn/${isbn}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ShelfieBookLookup/1.0; +https://github.com/IsaacH2910/Shelfie)',
        Accept: 'text/html',
      },
    })
    if (!res.ok) return null
    const html = await res.text()
    const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim()
    if (!title) return null
    if (/isbn\s*not\s*found|no\s*results/i.test(title)) return null
    const field = (label: string) =>
      html
        .match(new RegExp(`<strong>${label}:</strong>\\s*([^<]+)`, 'i'))?.[1]
        ?.trim() ?? ''
    const author = field('Author')
    const language = guessChineseScript(`${title}${author}`) || ''
    return {
      title,
      author,
      isbn,
      language,
      cover_url: null,
      source: 'isbnsearch',
    }
  } catch {
    return null
  }
}

export async function lookupIsbnServer(
  rawIsbn: string,
): Promise<ServerLookupResult | null> {
  const isbn = normalizeIsbn(rawIsbn)
  if (isbn.length < 10) return null

  const [google, openlib] = await Promise.all([
    lookupGoogle(isbn),
    lookupOpenLibrary(isbn),
  ])
  if (google) return google
  if (openlib) return openlib
  return lookupIsbnSearch(isbn)
}
