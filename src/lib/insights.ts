import { getLanguage } from '@/lib/languages'
import { normalizeIsbn, normalizeText } from '@/lib/duplicates'
import type { Book } from '@/types'

/** Heuristic 2–4 sentence insight about a book in the context of the library. */
export function buildBookInsight(book: Book, library: Book[]): string {
  const sentences: string[] = []
  const others = library.filter((b) => b.id !== book.id)
  const titleKey = normalizeText(book.title)
  const isbnKey = normalizeIsbn(book.isbn)

  const editions = others.filter((b) => {
    if (isbnKey && normalizeIsbn(b.isbn) === isbnKey) return true
    return titleKey && normalizeText(b.title) === titleKey
  })

  if (editions.length > 0) {
    const langs = editions
      .map((e) => getLanguage(e.language)?.name ?? e.language)
      .filter(Boolean)
    const unique = [...new Set(langs)]
    if (unique.length > 0) {
      sentences.push(
        `You also have ${editions.length === 1 ? 'another edition' : `${editions.length} other editions`} — ${unique.join(', ')}.`,
      )
    } else {
      sentences.push(
        `You also have ${editions.length === 1 ? 'another copy' : `${editions.length} other copies`} of this title.`,
      )
    }
  }

  if (book.series) {
    const seriesMates = others.filter(
      (b) =>
        b.series &&
        b.series.trim().toLowerCase() === book.series!.trim().toLowerCase(),
    )
    if (seriesMates.length > 0) {
      const unread = seriesMates.filter(
        (b) => b.reading_status === 'unread' || b.reading_status === 'paused',
      ).length
      sentences.push(
        `Part of ${book.series}: ${seriesMates.length + 1} volumes in your library${unread > 0 ? `, ${unread} still unread` : ''}.`,
      )
    } else {
      sentences.push(`Logged in the series “${book.series}”.`)
    }
  }

  const cats = (book.categories ?? []).map((c) => c.toLowerCase())
  if (cats.length > 0) {
    const similar = others.filter((b) =>
      (b.categories ?? []).some((c) => cats.includes(c.toLowerCase())),
    )
    const finishedSimilar = similar.filter(
      (b) => b.reading_status === 'finished' && (b.rating ?? 0) >= 4,
    ).length
    if (finishedSimilar >= 2) {
      sentences.push(
        `You rated ${finishedSimilar} other ${cats[0]} books highly — this fits that lane.`,
      )
    } else if (similar.length >= 3) {
      sentences.push(
        `${similar.length} other books share categories like ${(book.categories ?? []).slice(0, 2).join(', ')}.`,
      )
    }
  }

  if (book.author) {
    const byAuthor = others.filter(
      (b) =>
        b.author &&
        normalizeText(b.author) === normalizeText(book.author),
    )
    if (byAuthor.length > 0) {
      sentences.push(
        `${byAuthor.length} more by ${book.author} in your shelves.`,
      )
    }
  }

  if (book.page_count && book.page_count >= 500) {
    sentences.push(
      `A longer read at ${book.page_count} pages — plan a few sittings.`,
    )
  } else if (book.page_count && book.page_count <= 200) {
    sentences.push(`A quicker read at ${book.page_count} pages.`)
  }

  if (sentences.length === 0) {
    const lang = getLanguage(book.language)?.name
    if (lang) {
      sentences.push(
        `${lang} edition${book.publisher ? ` from ${book.publisher}` : ''}.`,
      )
    } else if (book.publisher) {
      sentences.push(`Published by ${book.publisher}.`)
    } else {
      sentences.push('No strong library links yet — keep cataloging to unlock insights.')
    }
  }

  return sentences.slice(0, 4).join(' ')
}
