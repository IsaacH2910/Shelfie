import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type { Loan } from '@/types'

function bookLoansKey(bookId: string | undefined) {
  return ['loans', bookId] as const
}

function allLoansKey(userId: string | undefined) {
  return ['loans-all', userId] as const
}

export function useBookLoans(bookId: string | undefined) {
  return useQuery({
    queryKey: bookLoansKey(bookId),
    enabled: !!bookId,
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('book_id', bookId!)
        .order('loaned_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useOpenLoans() {
  const { user } = useAuth()
  return useQuery({
    queryKey: allLoansKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .is('returned_at', null)
        .order('due_at', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateLoan(bookId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      borrower_name: string
      loaned_at?: string
      due_at?: string | null
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('loans')
        .insert({
          book_id: bookId,
          created_by: user!.id,
          borrower_name: input.borrower_name.trim(),
          loaned_at: input.loaned_at || new Date().toISOString().slice(0, 10),
          due_at: input.due_at || null,
          notes: input.notes?.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (created) => {
      qc.setQueryData<Loan[]>(bookLoansKey(bookId), (prev) =>
        prev ? [created, ...prev] : [created],
      )
      qc.invalidateQueries({ queryKey: allLoansKey(user?.id) })
    },
  })
}

export function useReturnLoan(bookId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (loanId: string) => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('loans')
        .update({ returned_at: today })
        .eq('id', loanId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (updated) => {
      qc.setQueryData<Loan[]>(bookLoansKey(bookId), (prev) =>
        (prev ?? []).map((l) => (l.id === updated.id ? updated : l)),
      )
      qc.invalidateQueries({ queryKey: allLoansKey(user?.id) })
    },
  })
}
