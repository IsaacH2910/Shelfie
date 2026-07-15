import { useEffect } from 'react'
import { toast } from 'sonner'
import { useOpenLoans } from '@/hooks/useLoans'
import { useBooks } from '@/hooks/useBooks'

const SEEN_KEY = 'shelfie-loan-reminders-seen'

/** Soft in-app reminders for overdue / due-soon loans. */
export function LoanReminders() {
  const { data: loans } = useOpenLoans()
  const { data: books } = useBooks()

  useEffect(() => {
    if (!loans?.length) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const seen = new Set(
      (localStorage.getItem(SEEN_KEY) ?? '').split(',').filter(Boolean),
    )
    const nextSeen = new Set(seen)

    for (const loan of loans) {
      if (!loan.due_at || seen.has(loan.id)) continue
      const due = new Date(loan.due_at + 'T00:00:00')
      const days = Math.round(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (days > 2) continue
      const book = (books ?? []).find((b) => b.id === loan.book_id)
      const title = book?.title ?? 'A book'
      if (days < 0) {
        toast.warning(
          `“${title}” is ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue with ${loan.borrower_name}`,
        )
      } else if (days === 0) {
        toast.message(`“${title}” is due back today from ${loan.borrower_name}`)
      } else {
        toast.message(
          `“${title}” is due in ${days} day${days === 1 ? '' : 's'} from ${loan.borrower_name}`,
        )
      }
      nextSeen.add(loan.id)
    }

    localStorage.setItem(SEEN_KEY, [...nextSeen].join(','))
  }, [loans, books])

  return null
}
