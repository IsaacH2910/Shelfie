import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, TriangleAlert, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/Spinner'
import { useAcceptInvite } from '@/hooks/useHouseholds'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const acceptInvite = useAcceptInvite()
  const [status, setStatus] = useState<'joining' | 'done' | 'error'>('joining')
  const [message, setMessage] = useState('')
  const ranRef = useRef(false)

  useEffect(() => {
    if (!code || ranRef.current) return
    ranRef.current = true
    acceptInvite
      .mutateAsync(code)
      .then(() => setStatus('done'))
      .catch((err: unknown) => {
        setStatus('error')
        setMessage(
          err instanceof Error ? err.message : 'This invite is not valid.',
        )
      })
  }, [code, acceptInvite])

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      {status === 'joining' ? (
        <>
          <Spinner className="h-7 w-7 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Joining household…
          </p>
        </>
      ) : status === 'done' ? (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold">You’re in!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You can now see and add books in this shared collection.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline">
              <Link to="/household">
                <Users className="h-4 w-4" />
                View household
              </Link>
            </Button>
            <Button onClick={() => navigate('/')}>Go to library</Button>
          </div>
        </>
      ) : (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <TriangleAlert className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold">Couldn’t join</h1>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          <Button className="mt-6" onClick={() => navigate('/household')}>
            Back to household
          </Button>
        </>
      )}
    </div>
  )
}
