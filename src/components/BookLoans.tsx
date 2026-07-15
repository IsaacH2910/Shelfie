import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { HandHelping, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  useBookLoans,
  useCreateLoan,
  useReturnLoan,
} from '@/hooks/useLoans'

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export function BookLoans({ bookId }: { bookId: string }) {
  const { data: loans = [], isLoading } = useBookLoans(bookId)
  const create = useCreateLoan(bookId)
  const returnLoan = useReturnLoan(bookId)

  const [borrower, setBorrower] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')

  const openLoans = useMemo(
    () => loans.filter((l) => !l.returned_at),
    [loans],
  )
  const history = useMemo(
    () => loans.filter((l) => !!l.returned_at),
    [loans],
  )

  const submit = () => {
    const name = borrower.trim()
    if (!name) {
      toast.error('Enter a borrower name')
      return
    }
    create.mutate(
      {
        borrower_name: name,
        due_at: dueAt || null,
        notes,
      },
      {
        onSuccess: () => {
          setBorrower('')
          setDueAt('')
          setNotes('')
          toast.success('Loan recorded')
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <div className="space-y-4">
      {openLoans.length > 0 ? (
        <div className="space-y-2">
          {openLoans.map((loan) => (
            <Card key={loan.id} className="border-amber-500/40 bg-amber-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <HandHelping className="h-4 w-4 text-amber-600" />
                      Out with {loan.borrower_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Loaned {formatDate(loan.loaned_at)}
                      {loan.due_at ? ` · Due ${formatDate(loan.due_at)}` : ''}
                    </CardDescription>
                  </div>
                  <Badge variant="warning">Open</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loan.notes ? (
                  <p className="text-sm text-muted-foreground">{loan.notes}</p>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={returnLoan.isPending}
                  onClick={() =>
                    returnLoan.mutate(loan.id, {
                      onSuccess: () => toast.success('Marked returned'),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                  Return
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">Lend this book</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="loan-borrower">Borrower</Label>
            <Input
              id="loan-borrower"
              value={borrower}
              onChange={(e) => setBorrower(e.target.value)}
              placeholder="Friend’s name"
              disabled={openLoans.length > 0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loan-due">Due date</Label>
            <Input
              id="loan-due"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={openLoans.length > 0}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loan-notes">Notes</Label>
          <Textarea
            id="loan-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            disabled={openLoans.length > 0}
          />
        </div>
        <Button
          type="button"
          onClick={submit}
          disabled={
            create.isPending || !borrower.trim() || openLoans.length > 0
          }
        >
          Record loan
        </Button>
        {openLoans.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Return the open loan before lending again.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">History</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No past loans.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {history.map((loan) => (
              <li key={loan.id} className="px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{loan.borrower_name}</span>
                  <Badge variant="muted">Returned</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(loan.loaned_at)} → {formatDate(loan.returned_at)}
                  {loan.due_at ? ` · Was due ${formatDate(loan.due_at)}` : ''}
                </p>
                {loan.notes ? (
                  <p className="mt-1 text-muted-foreground">{loan.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
