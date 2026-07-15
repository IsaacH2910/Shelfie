import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Bookmark, Highlighter, Lightbulb, Quote, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAnnotations,
  useCreateAnnotation,
  useDeleteAnnotation,
} from '@/hooks/useAnnotations'
import type { AnnotationKind } from '@/types'

const KINDS: {
  value: AnnotationKind | 'all'
  label: string
  icon?: typeof Quote
}[] = [
  { value: 'all', label: 'All' },
  { value: 'quote', label: 'Quote', icon: Quote },
  { value: 'highlight', label: 'Highlight', icon: Highlighter },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { value: 'thought', label: 'Thought', icon: Lightbulb },
]

const KIND_LABEL: Record<AnnotationKind, string> = {
  quote: 'Quote',
  highlight: 'Highlight',
  bookmark: 'Bookmark',
  thought: 'Thought',
}

export function BookAnnotations({ bookId }: { bookId: string }) {
  const { data: annotations = [], isLoading } = useAnnotations(bookId)
  const create = useCreateAnnotation(bookId)
  const remove = useDeleteAnnotation(bookId)

  const [filter, setFilter] = useState<AnnotationKind | 'all'>('all')
  const [kind, setKind] = useState<AnnotationKind>('quote')
  const [content, setContent] = useState('')
  const [page, setPage] = useState('')

  const filtered = useMemo(() => {
    if (filter === 'all') return annotations
    return annotations.filter((a) => a.kind === filter)
  }, [annotations, filter])

  const submit = () => {
    const text = content.trim()
    if (!text) {
      toast.error('Add some text first')
      return
    }
    const pageNum = page.trim() ? Number(page) : null
    if (pageNum != null && (!Number.isFinite(pageNum) || pageNum < 0)) {
      toast.error('Page must be a non-negative number')
      return
    }
    create.mutate(
      { kind, content: text, page: pageNum },
      {
        onSuccess: () => {
          setContent('')
          setPage('')
          toast.success('Annotation added')
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as AnnotationKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ['quote', 'highlight', 'bookmark', 'thought'] as AnnotationKind[]
                ).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="annotation-page">Page (optional)</Label>
            <Input
              id="annotation-page"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 42"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="annotation-content">Note</Label>
          <Textarea
            id="annotation-content"
            placeholder="Quote, highlight, or thought…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
        </div>
        <Button
          type="button"
          onClick={submit}
          disabled={create.isPending || !content.trim()}
        >
          Add
        </Button>
      </div>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as AnnotationKind | 'all')}
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
          {KINDS.map((k) => (
            <TabsTrigger key={k.value} value={k.value} className="text-xs">
              {k.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No annotations yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/40 px-3 py-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{KIND_LABEL[a.kind as AnnotationKind]}</Badge>
                  {a.page != null ? (
                    <span className="text-xs text-muted-foreground">
                      p. {a.page}
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm">{a.content}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Delete annotation"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(a.id, {
                    onSuccess: () => toast.success('Deleted'),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
