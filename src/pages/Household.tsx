import { useState } from 'react'
import { toast } from 'sonner'
import {
  Copy,
  LogOut,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar } from '@/components/ProfileMenu'
import { EmptyState } from '@/components/EmptyState'
import { FullScreenLoader } from '@/components/Spinner'
import { useAuth } from '@/context/AuthProvider'
import {
  useCreateHousehold,
  useCreateInvite,
  useDeleteInvite,
  useAcceptInvite,
  useHouseholdInvites,
  useHouseholdMembers,
  useHouseholds,
  useLeaveHousehold,
  useRemoveMember,
} from '@/hooks/useHouseholds'
import type { HouseholdWithRole } from '@/types'

function inviteLink(code: string) {
  return `${window.location.origin}/join/${code}`
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Could not copy to clipboard')
  }
}

function InviteDialog({ household }: { household: HouseholdWithRole }) {
  const { data: invites } = useHouseholdInvites(household.id)
  const createInvite = useCreateInvite()
  const deleteInvite = useDeleteInvite()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {household.name}</DialogTitle>
          <DialogDescription>
            Share a link or code. Anyone who joins can see and add books in this
            shared collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(invites ?? []).map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-2 rounded-lg border border-border p-2"
            >
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm">
                {invite.code}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copy(inviteLink(invite.code), 'Invite link')}
                aria-label="Copy link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteInvite.mutate(invite)}
                aria-label="Revoke invite"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            className="w-full"
            disabled={createInvite.isPending}
            onClick={() =>
              createInvite.mutate(household.id, {
                onSuccess: (invite) =>
                  copy(inviteLink(invite.code), 'Invite link'),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            <Plus className="h-4 w-4" />
            Create invite link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HouseholdCard({ household }: { household: HouseholdWithRole }) {
  const { user } = useAuth()
  const { data: members } = useHouseholdMembers(household.id)
  const leave = useLeaveHousehold()
  const removeMember = useRemoveMember()
  const isOwner = household.role === 'owner'

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {household.name}
          </CardTitle>
          <CardDescription>
            {members?.length ?? 0}{' '}
            {(members?.length ?? 0) === 1 ? 'member' : 'members'} ·{' '}
            {isOwner ? 'You are the owner' : 'Member'}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <InviteDialog household={household} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {(members ?? []).map((member) => {
            const name = member.profiles?.display_name || 'Reader'
            return (
              <li key={member.user_id} className="flex items-center gap-3">
                <Avatar
                  name={name}
                  url={member.profiles?.avatar_url}
                  className="h-8 w-8 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {name}
                    {member.user_id === user?.id ? ' (you)' : ''}
                  </p>
                </div>
                {member.role === 'owner' ? (
                  <Badge variant="muted">owner</Badge>
                ) : isOwner && member.user_id !== user?.id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove member"
                    onClick={() =>
                      removeMember.mutate({
                        householdId: household.id,
                        userId: member.user_id,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() =>
            leave.mutate(household.id, {
              onSuccess: () => toast.success(`Left ${household.name}`),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          <LogOut className="h-4 w-4" />
          Leave household
        </Button>
      </CardContent>
    </Card>
  )
}

function CreateHouseholdCard() {
  const [name, setName] = useState('')
  const createHousehold = useCreateHousehold()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create a household</CardTitle>
        <CardDescription>
          Start a shared collection for your family or home.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            createHousehold.mutate(name, {
              onSuccess: () => {
                toast.success('Household created')
                setName('')
              },
              onError: (err) => toast.error(err.message),
            })
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Smith Family"
          />
          <Button type="submit" disabled={createHousehold.isPending}>
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function JoinHouseholdCard() {
  const [code, setCode] = useState('')
  const acceptInvite = useAcceptInvite()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Join a household</CardTitle>
        <CardDescription>Enter an invite code you were sent.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!code.trim()) return
            acceptInvite.mutate(code, {
              onSuccess: () => {
                toast.success('Joined household')
                setCode('')
              },
              onError: (err) => toast.error(err.message),
            })
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            className="uppercase"
          />
          <Button type="submit" disabled={acceptInvite.isPending}>
            Join
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function HouseholdPage() {
  const { data: households, isLoading } = useHouseholds()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Household</h1>
        <p className="text-sm text-muted-foreground">
          Share a collection so nobody buys the same book twice.
        </p>
      </header>

      {isLoading ? (
        <FullScreenLoader />
      ) : (households?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No shared collections yet"
          description="Create a household to share books with family, or join one with an invite code."
        />
      ) : (
        <div className="space-y-4">
          {households!.map((household) => (
            <HouseholdCard key={household.id} household={household} />
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <CreateHouseholdCard />
        <JoinHouseholdCard />
      </div>
    </div>
  )
}
