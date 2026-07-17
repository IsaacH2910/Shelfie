import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type { Profile } from '@/types'
import type { Json } from '@/lib/database.types'

export type ProfilePatch = {
  display_name?: string
  onboarding_completed?: boolean
  yearly_reading_goal?: number | null
  collection_labels?: string[]
  shelf_capacities?: Json
  category_labels?: string[]
  shelf_locations?: string[]
  smart_collections?: Json
}

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
    mutationFn: async (patch: ProfilePatch): Promise<Profile> => {
      const payload: ProfilePatch = { ...patch }
      if (payload.display_name !== undefined) {
        payload.display_name = payload.display_name.trim()
      }
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
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
