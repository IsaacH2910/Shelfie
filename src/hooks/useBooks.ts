import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import { useServerQueryResult } from '@/hooks/useServerQueryResult'
import { normalizeCategories } from '@/lib/categories'
import { normalizeCollections } from '@/lib/collections'
import { normalizeOwnership } from '@/lib/ownership'
import {
  normalizeRating,
  normalizeReadingStatus,
  readingTimestampsForStatus,
} from '@/lib/reading'
import { assertNoConflict } from '@/lib/conflicts'
import type { Book, BookDraft, BookInsert, BookUpdate, Profile } from '@/types'

export type BookWithCreator = Book & {
  creator?: Pick<Profile, 'display_name' | 'avatar_url'> | null
}

function booksKey(userId: string | undefined) {
  return ['books', userId] as const
}

export function getBooksQueryKey(userId: string | undefined) {
  return booksKey(userId)
}

function draftToRow(draft: BookDraft, userId: string): BookInsert {
  const householdId = draft.scope === 'household' ? draft.household_id : null
  const reading_status = normalizeReadingStatus(draft.reading_status)
  const timestamps = readingTimestampsForStatus(reading_status, {
    reading_started_at: draft.reading_started_at,
    reading_finished_at: draft.reading_finished_at,
  })
  let current_page = draft.current_page
  let page_count = draft.page_count
  if (page_count != null && page_count <= 0) page_count = null
  if (current_page != null && current_page < 0) current_page = null
  if (
    current_page != null &&
    page_count != null &&
    current_page > page_count
  ) {
    current_page = page_count
  }

  return {
    created_by: userId,
    household_id: householdId,
    title: draft.title.trim(),
    author: draft.author.trim() || null,
    isbn: draft.isbn.trim() || null,
    language: draft.language || null,
    shelf_location: draft.shelf_location.trim() || null,
    categories: normalizeCategories(draft.categories),
    collections: normalizeCollections(draft.collections),
    notes: draft.notes.trim() || null,
    review: draft.review.trim() || null,
    cover_url: draft.cover_url,
    source: draft.source,
    reading_status,
    rating: normalizeRating(draft.rating),
    page_count,
    current_page,
    reading_started_at: timestamps.reading_started_at,
    reading_finished_at: timestamps.reading_finished_at,
    ownership: normalizeOwnership(draft.ownership),
    is_favorite: !!draft.is_favorite,
    series: draft.series.trim() || null,
    publisher: draft.publisher.trim() || null,
    published_year: draft.published_year,
  }
}

function normalizeBook(book: BookWithCreator): BookWithCreator {
  return {
    ...book,
    rating: normalizeRating(book.rating as number | string | null),
    reading_status: normalizeReadingStatus(book.reading_status),
    ownership: normalizeOwnership(book.ownership),
    collections: book.collections ?? [],
    is_favorite: !!book.is_favorite,
  }
}

export function useBooks() {
  const { user } = useAuth()
  const result = useQuery({
    queryKey: booksKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<BookWithCreator[]> => {
      const { data, error } = await supabase
        .from('books')
        .select('*, creator:profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as unknown as BookWithCreator[]).map(normalizeBook)
    },
  })
  const wrapped = useServerQueryResult(result)
  return { ...wrapped, data: wrapped.displayData }
}

export function useCreateBook() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (draft: BookDraft): Promise<Book> => {
      const { data, error } = await supabase
        .from('books')
        .insert(draftToRow(draft, user!.id))
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (created) => {
      qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
        prev
          ? [normalizeBook(created as BookWithCreator), ...prev]
          : [normalizeBook(created as BookWithCreator)],
      )
      qc.invalidateQueries({ queryKey: booksKey(user?.id) })
    },
  })
}

export function useUpdateBook() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (params: {
      id: string
      draft: BookDraft
      /** Client's last-known updated_at for conflict detection. */
      expectedUpdatedAt?: string | null
    }): Promise<Book> => {
      if (params.expectedUpdatedAt) {
        const { data: server, error: fetchError } = await supabase
          .from('books')
          .select('id, title, updated_at')
          .eq('id', params.id)
          .maybeSingle()
        if (fetchError) throw fetchError
        assertNoConflict(params.expectedUpdatedAt, server)
      }

      const { data, error } = await supabase
        .from('books')
        .update(draftToRow(params.draft, user!.id))
        .eq('id', params.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (updated) => {
      qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
        (prev ?? []).map((b) =>
          b.id === updated.id
            ? normalizeBook({ ...b, ...updated })
            : b,
        ),
      )
    },
  })
}

export function usePatchBooks() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (params: {
      ids: string[]
      patch: BookUpdate
    }): Promise<void> => {
      const { error } = await supabase
        .from('books')
        .update(params.patch)
        .in('id', params.ids)
      if (error) throw error
    },
    onSuccess: (_void, params) => {
      qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
        (prev ?? []).map((b) =>
          params.ids.includes(b.id)
            ? normalizeBook({ ...b, ...params.patch } as BookWithCreator)
            : b,
        ),
      )
      qc.invalidateQueries({ queryKey: booksKey(user?.id) })
    },
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('books').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: booksKey(user?.id) })
      const previous = qc.getQueryData<BookWithCreator[]>(booksKey(user?.id))
      const removed = previous?.find((b) => b.id === id) ?? null
      qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
        (prev ?? []).filter((b) => b.id !== id),
      )
      return { previous, removed }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(booksKey(user?.id), context.previous)
      }
    },
  })
}

export function useDeleteBooks() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('books').delete().in('id', ids)
      if (error) throw error
      return ids
    },
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: booksKey(user?.id) })
      const previous = qc.getQueryData<BookWithCreator[]>(booksKey(user?.id))
      const removed = (previous ?? []).filter((b) => ids.includes(b.id))
      qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
        (prev ?? []).filter((b) => !ids.includes(b.id)),
      )
      return { previous, removed }
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        qc.setQueryData(booksKey(user?.id), context.previous)
      }
    },
  })
}

export function useRestoreBooks() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (books: BookWithCreator[]) => {
      if (books.length === 0) return
      const rows = books.map((book) => {
        const { creator: _creator, ...row } = book
        return row
      })
      const { error } = await supabase.from('books').insert(rows)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: booksKey(user?.id) })
    },
  })
}

export function useTouchBookOpened() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('books')
        .update({ last_opened_at: now })
        .eq('id', id)
      if (error) throw error
      return { id, last_opened_at: now }
    },
    onSuccess: ({ id, last_opened_at }) => {
      qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
        (prev ?? []).map((b) =>
          b.id === id ? { ...b, last_opened_at } : b,
        ),
      )
    },
  })
}
