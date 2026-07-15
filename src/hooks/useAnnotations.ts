import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type { AnnotationKind, BookAnnotation } from '@/types'

function key(bookId: string | undefined) {
  return ['annotations', bookId] as const
}

export function useAnnotations(bookId: string | undefined) {
  return useQuery({
    queryKey: key(bookId),
    enabled: !!bookId,
    queryFn: async (): Promise<BookAnnotation[]> => {
      const { data, error } = await supabase
        .from('book_annotations')
        .select('*')
        .eq('book_id', bookId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateAnnotation(bookId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      kind: AnnotationKind
      content: string
      page?: number | null
    }) => {
      const { data, error } = await supabase
        .from('book_annotations')
        .insert({
          book_id: bookId,
          created_by: user!.id,
          kind: input.kind,
          content: input.content.trim(),
          page: input.page ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (created) => {
      qc.setQueryData<BookAnnotation[]>(key(bookId), (prev) =>
        prev ? [created, ...prev] : [created],
      )
    },
  })
}

export function useDeleteAnnotation(bookId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('book_annotations')
        .delete()
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<BookAnnotation[]>(key(bookId), (prev) =>
        (prev ?? []).filter((a) => a.id !== id),
      )
    },
  })
}
