import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import { useServerQueryResult } from '@/hooks/useServerQueryResult'
import { normalizeCategories } from '@/lib/categories'
import type { Book, BookDraft, BookInsert, Profile } from '@/types'

export type BookWithCreator = Book & {
  creator?: Pick<Profile, 'display_name' | 'avatar_url'> | null
}

function booksKey(userId: string | undefined) {
  return ['books', userId] as const
}

function draftToRow(draft: BookDraft, userId: string): BookInsert {
  const householdId = draft.scope === 'household' ? draft.household_id : null
  return {
    created_by: userId,
    household_id: householdId,
    title: draft.title.trim(),
    author: draft.author.trim() || null,
    isbn: draft.isbn.trim() || null,
    language: draft.language || null,
    shelf_location: draft.shelf_location.trim() || null,
    categories: normalizeCategories(draft.categories),
    notes: draft.notes.trim() || null,
    cover_url: draft.cover_url,
    source: draft.source,
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
      return (data ?? []) as unknown as BookWithCreator[]
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
        prev ? [created as BookWithCreator, ...prev] : [created as BookWithCreator],
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
    }): Promise<Book> => {
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
          b.id === updated.id ? { ...b, ...updated } : b,
        ),
      )
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
      qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
        (prev ?? []).filter((b) => b.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(booksKey(user?.id), context.previous)
      }
    },
  })
}
