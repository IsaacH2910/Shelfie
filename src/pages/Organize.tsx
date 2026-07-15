import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, MapPin, Tag } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TaxonomyManager } from '@/components/TaxonomyManager'
import { useLibraryTaxonomy } from '@/hooks/useLibraryTaxonomy'
import { collectCategories } from '@/lib/categories'
import { DEFAULT_COLLECTIONS } from '@/lib/collections'
import { collectShelves, SHELF_SEP } from '@/lib/shelves'
import { useBooks } from '@/hooks/useBooks'

function QuickStart({
  label,
  suggestions,
  onPick,
  disabled,
}: {
  label: string
  suggestions: string[]
  onPick: (label: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onPick(item)}
            className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
          >
            + {item}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function OrganizePage() {
  const { data: books } = useBooks()
  const taxonomy = useLibraryTaxonomy()

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const orphanCategories = collectCategories(books ?? []).filter(
    (c) =>
      !taxonomy.managedCategories.some(
        (m) => m.toLowerCase() === c.toLowerCase(),
      ),
  )
  const orphanShelves = collectShelves(books ?? []).filter(
    (s) =>
      !taxonomy.managedShelves.some((m) => m.toLowerCase() === s.toLowerCase()),
  )
  const canImport = orphanCategories.length > 0 || orphanShelves.length > 0

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organize</h1>
        <p className="text-sm text-muted-foreground">
          Categories, shelf locations, and collections — kept out of Settings so
          you can manage them in one place.
        </p>
      </div>

      <Card id="shelves">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Shelf locations
          </CardTitle>
          <CardDescription>
            Name the places books live in your home. When you add a book, you’ll
            pick one from a list — no typing every time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxonomy.managedShelves.length === 0 ? (
            <QuickStart
              label="Try these"
              suggestions={['Living room', 'Bedroom', 'Office', 'Kids room']}
              onPick={(label) => void taxonomy.addShelf(label)}
              disabled={taxonomy.isSaving}
            />
          ) : null}
          <TaxonomyManager
            labels={taxonomy.managedShelves}
            emptyHint={`Use “${SHELF_SEP.trim()}” for hierarchy, e.g. Living room${SHELF_SEP}Shelf A.`}
            addPlaceholder={`e.g. Living room${SHELF_SEP}Shelf A`}
            onAdd={taxonomy.addShelf}
            onRename={taxonomy.renameShelf}
            onRemove={taxonomy.removeShelf}
            busy={taxonomy.isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Set capacities and browse a shelf map on{' '}
            <Link
              to="/shelves"
              className="font-medium text-primary hover:underline"
            >
              Shelves
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card id="collections">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Collections
          </CardTitle>
          <CardDescription>
            Group books beyond categories — Favorites, School, Signed Copies…
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxonomy.managedCollections.length === 0 ? (
            <QuickStart
              label="Try these"
              suggestions={[...DEFAULT_COLLECTIONS].slice(0, 6)}
              onPick={(label) => void taxonomy.addCollection(label)}
              disabled={taxonomy.isSaving}
            />
          ) : null}
          <TaxonomyManager
            labels={taxonomy.managedCollections}
            emptyHint="Create collections you reuse often."
            addPlaceholder="e.g. Signed Copies"
            onAdd={taxonomy.addCollection}
            onRename={taxonomy.renameCollection}
            onRemove={taxonomy.removeCollection}
            busy={taxonomy.isSaving}
          />
        </CardContent>
      </Card>

      <Card id="categories">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Categories
          </CardTitle>
          <CardDescription>
            Labels you reuse across books — Fiction, Kids, To read, School…
            Tap them on the add-book form; filter by them in your library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxonomy.managedCategories.length === 0 ? (
            <QuickStart
              label="Try these"
              suggestions={[
                'Fiction',
                'Non-fiction',
                'Kids',
                'To read',
                'Reference',
              ]}
              onPick={(label) => void taxonomy.addCategory(label)}
              disabled={taxonomy.isSaving}
            />
          ) : null}
          <TaxonomyManager
            labels={taxonomy.managedCategories}
            emptyHint="Add a few categories you actually use. Keep the list short."
            addPlaceholder="e.g. Fiction"
            onAdd={taxonomy.addCategory}
            onRename={taxonomy.renameCategory}
            onRemove={taxonomy.removeCategory}
            busy={taxonomy.isSaving}
          />
          {canImport ? (
            <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
              Found {orphanCategories.length + orphanShelves.length} label
              {orphanCategories.length + orphanShelves.length === 1
                ? ''
                : 's'}{' '}
              already on books that aren’t in your lists yet.{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                disabled={taxonomy.isSaving}
                onClick={() => void taxonomy.importFromBooks()}
              >
                Import them
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
