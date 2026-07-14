import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import type {
  Household,
  HouseholdInvite,
  HouseholdWithRole,
  MemberRole,
  Profile,
} from '@/types'

export type MemberWithProfile = {
  user_id: string
  role: MemberRole
  joined_at: string
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export function useHouseholds() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['households', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<HouseholdWithRole[]> => {
      const { data, error } = await supabase
        .from('household_members')
        .select('role, households(*)')
        .eq('user_id', user!.id)
      if (error) throw error
      return (data ?? [])
        .map((row) => {
          const household = row.households as unknown as Household | null
          if (!household) return null
          return { ...household, role: row.role as MemberRole }
        })
        .filter((h): h is HouseholdWithRole => h !== null)
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

export function useHouseholdMembers(householdId?: string | null) {
  return useQuery({
    queryKey: ['household-members', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const { data, error } = await supabase
        .from('household_members')
        .select('user_id, role, joined_at, profiles(id, display_name, avatar_url)')
        .eq('household_id', householdId!)
      if (error) throw error
      return (data ?? []).map((row) => ({
        user_id: row.user_id,
        role: row.role as MemberRole,
        joined_at: row.joined_at,
        profiles: (row.profiles as unknown as MemberWithProfile['profiles']) ?? null,
      }))
    },
  })
}

export function useHouseholdInvites(householdId?: string | null) {
  return useQuery({
    queryKey: ['household-invites', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<HouseholdInvite[]> => {
      const { data, error } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', householdId!)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateHousehold() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (name: string): Promise<Household> => {
      const { data, error } = await supabase
        .from('households')
        .insert({ name: name.trim(), created_by: user!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['households'] }),
  })
}

export function useCreateInvite() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (householdId: string): Promise<HouseholdInvite> => {
      const { data, error } = await supabase
        .from('household_invites')
        .insert({
          household_id: householdId,
          code: generateInviteCode(),
          invited_by: user!.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, householdId) =>
      qc.invalidateQueries({ queryKey: ['household-invites', householdId] }),
  })
}

export function useDeleteInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invite: HouseholdInvite) => {
      const { error } = await supabase
        .from('household_invites')
        .delete()
        .eq('id', invite.id)
      if (error) throw error
    },
    onSuccess: (_data, invite) =>
      qc.invalidateQueries({
        queryKey: ['household-invites', invite.household_id],
      }),
  })
}

export function useAcceptInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc('accept_invite', {
        invite_code: code.trim().toUpperCase(),
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['households'] })
      qc.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

export function useLeaveHousehold() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (householdId: string) => {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['households'] })
      qc.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { householdId: string; userId: string }) => {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', params.householdId)
        .eq('user_id', params.userId)
      if (error) throw error
    },
    onSuccess: (_data, params) =>
      qc.invalidateQueries({
        queryKey: ['household-members', params.householdId],
      }),
  })
}
