import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type { Profile } from '@/types'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (patch: { display_name: string }): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: patch.display_name.trim() })
        .eq('id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (profile) => {
      qc.setQueryData(['profile', user?.id], profile)
    },
  })
}
