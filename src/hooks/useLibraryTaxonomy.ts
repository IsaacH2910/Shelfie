import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import { useBooks, type BookWithCreator } from '@/hooks/useBooks'
import {
  collectCategories,
  mergeLabels as mergeCategoryLabels,
  normalizeCategories,
  normalizeCategory,
  removeCategoryFromList,
  renameCategoryInList,
} from '@/lib/categories'
import {
  collectShelves,
  mergeLabels as mergeShelfLabels,
  normalizeShelf,
  normalizeShelves,
} from '@/lib/shelves'
import type { Profile } from '@/types'

function booksKey(userId: string | undefined) {
  return ['books', userId] as const
}

function profileKey(userId: string | undefined) {
  return ['profile', userId] as const
}

export function useLibraryTaxonomy() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const { data: books } = useBooks()
  const qc = useQueryClient()

  const managedCategories = useMemo(
    () => normalizeCategories(profile?.category_labels ?? []),
    [profile?.category_labels],
  )
  const managedShelves = useMemo(
    () => normalizeShelves(profile?.shelf_locations ?? []),
    [profile?.shelf_locations],
  )

  const categoryOptions = useMemo(
    () =>
      mergeCategoryLabels(managedCategories, collectCategories(books ?? [])),
    [managedCategories, books],
  )

  const shelfOptions = useMemo(
    () => mergeShelfLabels(managedShelves, collectShelves(books ?? [])),
    [managedShelves, books],
  )

  const saveTaxonomy = useMutation({
    mutationFn: async (patch: {
      category_labels?: string[]
      shelf_locations?: string[]
    }): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...(patch.category_labels !== undefined
            ? { category_labels: normalizeCategories(patch.category_labels) }
            : {}),
          ...(patch.shelf_locations !== undefined
            ? { shelf_locations: normalizeShelves(patch.shelf_locations) }
            : {}),
        })
        .eq('id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (next) => {
      qc.setQueryData(profileKey(user?.id), next)
    },
  })

  const addCategory = async (raw: string) => {
    const label = normalizeCategory(raw)
    if (!label) return
    if (managedCategories.some((c) => c.toLowerCase() === label.toLowerCase())) {
      toast.info('That category already exists')
      return
    }
    await saveTaxonomy.mutateAsync({
      category_labels: [...managedCategories, label],
    })
    toast.success(`Added “${label}”`)
  }

  const addShelf = async (raw: string) => {
    const label = normalizeShelf(raw)
    if (!label) return
    if (managedShelves.some((s) => s.toLowerCase() === label.toLowerCase())) {
      toast.info('That shelf already exists')
      return
    }
    await saveTaxonomy.mutateAsync({
      shelf_locations: [...managedShelves, label],
    })
    toast.success(`Added “${label}”`)
  }

  const renameCategory = async (from: string, toRaw: string) => {
    const to = normalizeCategory(toRaw)
    if (!to || to.toLowerCase() === from.toLowerCase()) return
    if (
      managedCategories.some(
        (c) =>
          c.toLowerCase() === to.toLowerCase() &&
          c.toLowerCase() !== from.toLowerCase(),
      )
    ) {
      toast.error('Another category already uses that name')
      return
    }

    const nextLabels = managedCategories.map((c) =>
      c.toLowerCase() === from.toLowerCase() ? to : c,
    )

    const affected = (books ?? []).filter((b) =>
      (b.categories ?? []).some((c) => c.toLowerCase() === from.toLowerCase()),
    )

    for (const book of affected) {
      const { error } = await supabase
        .from('books')
        .update({
          categories: renameCategoryInList(book.categories, from, to),
        })
        .eq('id', book.id)
      if (error) throw error
    }

    await saveTaxonomy.mutateAsync({ category_labels: nextLabels })

    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) => ({
        ...b,
        categories: renameCategoryInList(b.categories, from, to),
      })),
    )
    toast.success(`Renamed to “${to}”`)
  }

  const renameShelf = async (from: string, toRaw: string) => {
    const to = normalizeShelf(toRaw)
    if (!to || to.toLowerCase() === from.toLowerCase()) return
    if (
      managedShelves.some(
        (s) =>
          s.toLowerCase() === to.toLowerCase() &&
          s.toLowerCase() !== from.toLowerCase(),
      )
    ) {
      toast.error('Another shelf already uses that name')
      return
    }

    const nextLabels = managedShelves.map((s) =>
      s.toLowerCase() === from.toLowerCase() ? to : s,
    )

    const { error: booksError } = await supabase
      .from('books')
      .update({ shelf_location: to })
      .eq('created_by', user!.id)
      .ilike('shelf_location', from)
    if (booksError) throw booksError

    // Also update shared books the user can see that use this shelf name
    // (owned by others) — best-effort; RLS may block some.
    const shared = (books ?? []).filter(
      (b) =>
        b.created_by !== user!.id &&
        (b.shelf_location ?? '').toLowerCase() === from.toLowerCase(),
    )
    for (const book of shared) {
      await supabase
        .from('books')
        .update({ shelf_location: to })
        .eq('id', book.id)
    }

    await saveTaxonomy.mutateAsync({ shelf_locations: nextLabels })

    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) =>
        (b.shelf_location ?? '').toLowerCase() === from.toLowerCase()
          ? { ...b, shelf_location: to }
          : b,
      ),
    )
    toast.success(`Renamed to “${to}”`)
  }

  const removeCategory = async (label: string) => {
    const nextLabels = managedCategories.filter(
      (c) => c.toLowerCase() !== label.toLowerCase(),
    )
    const affected = (books ?? []).filter((b) =>
      (b.categories ?? []).some((c) => c.toLowerCase() === label.toLowerCase()),
    )

    for (const book of affected) {
      const { error } = await supabase
        .from('books')
        .update({
          categories: removeCategoryFromList(book.categories, label),
        })
        .eq('id', book.id)
      if (error) throw error
    }

    await saveTaxonomy.mutateAsync({ category_labels: nextLabels })

    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) => ({
        ...b,
        categories: removeCategoryFromList(b.categories, label),
      })),
    )
    toast.success(`Removed “${label}”`)
  }

  const removeShelf = async (label: string) => {
    const nextLabels = managedShelves.filter(
      (s) => s.toLowerCase() !== label.toLowerCase(),
    )

    const { error: booksError } = await supabase
      .from('books')
      .update({ shelf_location: null })
      .eq('created_by', user!.id)
      .ilike('shelf_location', label)
    if (booksError) throw booksError

    await saveTaxonomy.mutateAsync({ shelf_locations: nextLabels })

    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) =>
        (b.shelf_location ?? '').toLowerCase() === label.toLowerCase()
          ? { ...b, shelf_location: null }
          : b,
      ),
    )
    toast.success(`Removed “${label}”`)
  }

  /** Import labels found on books into the managed lists (one-time helper). */
  const importFromBooks = async () => {
    const nextCategories = mergeCategoryLabels(
      managedCategories,
      collectCategories(books ?? []),
    )
    const nextShelves = mergeShelfLabels(
      managedShelves,
      collectShelves(books ?? []),
    )
    await saveTaxonomy.mutateAsync({
      category_labels: nextCategories,
      shelf_locations: nextShelves,
    })
    toast.success('Imported labels from your books')
  }

  return {
    managedCategories,
    managedShelves,
    categoryOptions,
    shelfOptions,
    isSaving: saveTaxonomy.isPending,
    addCategory,
    addShelf,
    renameCategory,
    renameShelf,
    removeCategory,
    removeShelf,
    importFromBooks,
  }
}
