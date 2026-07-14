import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Barcode, MapPin, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LanguageSelect } from '@/components/LanguageSelect'
import { CategoryInput } from '@/components/CategoryInput'
import { CoverImage } from '@/components/CoverImage'
import { CoverUpload } from '@/components/CoverUpload'
import { DuplicateWarning } from '@/components/DuplicateWarning'
import { Spinner } from '@/components/Spinner'
import { collectCategories } from '@/lib/categories'
import {
  findDuplicates,
  isLookupIsbn,
  normalizeIsbn,
  toLookupIsbn,
} from '@/lib/duplicates'
import { lookupByIsbn } from '@/lib/bookLookup'
import type { Book, BookDraft, HouseholdWithRole } from '@/types'

export function BookForm({
  value,
  onChange,
  households,
  existingBooks,
  currentBookId,
  submitting,
  submitLabel = 'Save book',
  onSubmit,
  onCancel,
  onCoverFile,
}: {
  value: BookDraft
  onChange: (draft: BookDraft) => void
  households: HouseholdWithRole[]
  existingBooks: Book[]
  currentBookId?: string
  submitting?: boolean
  submitLabel?: string
  onSubmit: () => void
  onCancel?: () => void
  onCoverFile?: (file: File, previewUrl: string) => void
}) {
  const patch = (next: Partial<BookDraft>) => onChange({ ...value, ...next })

  // Keep the latest props available to the debounced auto-lookup effect.
  const latest = useRef({ value, onChange })
  latest.current = { value, onChange }

  const [lookingUp, setLookingUp] = useState(false)
  const lastLookedUp = useRef('')
  const isbnDigits = normalizeIsbn(value.isbn)
  const isbnComplete = isLookupIsbn(isbnDigits)

  // Auto look-up: when a full ISBN is typed or scanned, fill any blank fields
  // automatically (non-destructive — never overwrites what you've entered).
  useEffect(() => {
    if (!isbnComplete) return
    if (isbnDigits === lastLookedUp.current) return
    let cancelled = false
    const handle = setTimeout(async () => {
      lastLookedUp.current = isbnDigits
      setLookingUp(true)
      try {
        const result = await lookupByIsbn(isbnDigits)
        if (cancelled) return
        if (!result) {
          toast.info('No online match for that ISBN — enter details manually')
          return
        }
        const v = latest.current.value
        const next: BookDraft = {
          ...v,
          title: v.title || result.title,
          author: v.author || result.author,
          language: v.language || result.language,
          cover_url: v.cover_url ?? result.cover_url,
          isbn: result.isbn || toLookupIsbn(v.isbn) || v.isbn,
        }
        if (
          next.title !== v.title ||
          next.author !== v.author ||
          next.language !== v.language ||
          next.cover_url !== v.cover_url ||
          next.isbn !== v.isbn
        ) {
          latest.current.onChange(next)
          toast.success('Found it — details filled in')
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error
              ? err.message
              : 'Lookup failed — check your connection',
          )
        }
      } finally {
        if (!cancelled) setLookingUp(false)
      }
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [isbnDigits, isbnComplete])

  // Manual refresh overwrites the details from the ISBN.
  const refetchFromIsbn = async () => {
    if (!isbnComplete) return
    setLookingUp(true)
    try {
      const result = await lookupByIsbn(isbnDigits)
      if (!result) {
        toast.info('No online match for that ISBN')
        return
      }
      const v = latest.current.value
      onChange({
        ...v,
        title: result.title || v.title,
        author: result.author || v.author,
        language: result.language || v.language,
        cover_url: result.cover_url ?? v.cover_url,
        isbn: result.isbn || toLookupIsbn(v.isbn) || v.isbn,
      })
      toast.success('Details updated from ISBN')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Lookup failed — check your connection',
      )
    } finally {
      setLookingUp(false)
    }
  }

  const duplicates = useMemo(
    () =>
      findDuplicates(
        {
          id: currentBookId,
          title: value.title,
          author: value.author,
          isbn: value.isbn,
          scope: value.scope,
          household_id: value.household_id,
        },
        existingBooks,
      ),
    [value, existingBooks, currentBookId],
  )

  const isShared = value.scope === 'household'
  const shareHouseholdId = value.household_id ?? households[0]?.id ?? null
  const toggleShare = (checked: boolean) => {
    if (checked && shareHouseholdId) {
      patch({ scope: 'household', household_id: shareHouseholdId })
    } else {
      patch({ scope: 'private', household_id: null })
    }
  }

  const canSubmit = value.title.trim().length > 0 && !submitting
  const categorySuggestions = useMemo(
    () => collectCategories(existingBooks),
    [existingBooks],
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) onSubmit()
      }}
      className="space-y-5"
    >
      <div className="flex gap-4">
        {onCoverFile ? (
          <div className="w-24 shrink-0">
            <CoverUpload
              url={value.cover_url}
              title={value.title || '?'}
              disabled={submitting}
              onFile={onCoverFile}
            />
          </div>
        ) : (
          <div className="w-24 shrink-0">
            <CoverImage url={value.cover_url} title={value.title || '?'} />
          </div>
        )}
        <div className="flex-1 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={value.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Book title"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={value.author}
              onChange={(e) => patch({ author: e.target.value })}
              placeholder="Author name"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="isbn" className="flex items-center gap-1.5">
          <Barcode className="h-4 w-4 text-muted-foreground" />
          ISBN
          <span className="font-normal text-muted-foreground">
            · the book’s ID
          </span>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="isbn"
              value={value.isbn}
              onChange={(e) => patch({ isbn: e.target.value })}
              placeholder="Scan or type the ISBN"
              inputMode="numeric"
              autoComplete="off"
            />
            {lookingUp ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </span>
            ) : null}
          </div>
          {isbnComplete ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={refetchFromIsbn}
              disabled={lookingUp}
              title="Refresh details from ISBN"
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Enter or scan the ISBN and we’ll fill in the title, author, language
          and cover automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="language">Language</Label>
          <LanguageSelect
            id="language"
            value={value.language}
            onChange={(language) => patch({ language })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shelf">Shelf location</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="shelf"
              className="pl-9"
              value={value.shelf_location}
              onChange={(e) => patch({ shelf_location: e.target.value })}
              placeholder="e.g. Living room · Shelf A3"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <CategoryInput
        value={value.categories}
        onChange={(categories) => patch({ categories })}
        suggestions={categorySuggestions}
        disabled={submitting}
      />

      {households.length > 0 ? (
        <div className="rounded-xl border border-border p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <Label htmlFor="share" className="cursor-pointer">
                  Share with your household
                </Label>
                <p className="text-xs text-muted-foreground">
                  It stays in your collection — your household can see it too.
                </p>
              </div>
            </div>
            <Switch
              id="share"
              checked={isShared}
              onCheckedChange={toggleShare}
            />
          </div>
          {isShared && households.length > 1 ? (
            <div className="mt-3">
              <Select
                value={value.household_id ?? undefined}
                onValueChange={(id) => patch({ household_id: id })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a household" />
                </SelectTrigger>
                <SelectContent>
                  {households.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Link
            to="/household"
            className="font-medium text-primary hover:underline"
          >
            Create a household
          </Link>{' '}
          to share books with family.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={value.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Edition, condition, who it belongs to…"
          rows={3}
        />
      </div>

      <DuplicateWarning matches={duplicates} />

      <div className="flex gap-3 pt-1">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" className="flex-1" disabled={!canSubmit}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
