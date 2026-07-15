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
  collectCollections,
  normalizeCollections,
  removeCollectionFromList,
  renameCollectionInList,
} from '@/lib/collections'
import {
  collectShelves,
  mergeLabels as mergeShelfLabels,
  normalizeShelf,
  normalizeShelves,
  parseShelfCapacities,
  type ShelfCapacityMap,
} from '@/lib/shelves'
import type { Json } from '@/lib/database.types'
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
  const managedCollections = useMemo(
    () => normalizeCollections(profile?.collection_labels ?? []),
    [profile?.collection_labels],
  )
  const shelfCapacities = useMemo(
    () => parseShelfCapacities(profile?.shelf_capacities),
    [profile?.shelf_capacities],
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
  const collectionOptions = useMemo(() => {
    const fromBooks = collectCollections(books ?? [])
    return normalizeCollections([...managedCollections, ...fromBooks]).sort(
      (a, b) => a.localeCompare(b),
    )
  }, [managedCollections, books])

  const saveTaxonomy = useMutation({
    mutationFn: async (patch: {
      category_labels?: string[]
      shelf_locations?: string[]
      collection_labels?: string[]
      shelf_capacities?: ShelfCapacityMap
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
          ...(patch.collection_labels !== undefined
            ? {
                collection_labels: normalizeCollections(
                  patch.collection_labels,
                ),
              }
            : {}),
          ...(patch.shelf_capacities !== undefined
            ? { shelf_capacities: patch.shelf_capacities as Json }
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

  const addCollection = async (raw: string) => {
    const label = normalizeCategory(raw)
    if (!label) return
    if (
      managedCollections.some((c) => c.toLowerCase() === label.toLowerCase())
    ) {
      toast.info('That collection already exists')
      return
    }
    await saveTaxonomy.mutateAsync({
      collection_labels: [...managedCollections, label],
    })
    toast.success(`Added “${label}”`)
  }

  const renameCategory = async (from: string, toRaw: string) => {
    const to = normalizeCategory(toRaw)
    if (!to || to.toLowerCase() === from.toLowerCase()) return
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
    const nextLabels = managedShelves.map((s) =>
      s.toLowerCase() === from.toLowerCase() ? to : s,
    )
    const { error: booksError } = await supabase
      .from('books')
      .update({ shelf_location: to })
      .eq('created_by', user!.id)
      .ilike('shelf_location', from)
    if (booksError) throw booksError
    const nextCaps = { ...shelfCapacities }
    if (nextCaps[from] != null) {
      nextCaps[to] = nextCaps[from]
      delete nextCaps[from]
    }
    await saveTaxonomy.mutateAsync({
      shelf_locations: nextLabels,
      shelf_capacities: nextCaps,
    })
    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) =>
        (b.shelf_location ?? '').toLowerCase() === from.toLowerCase()
          ? { ...b, shelf_location: to }
          : b,
      ),
    )
    toast.success(`Renamed to “${to}”`)
  }

  const renameCollection = async (from: string, toRaw: string) => {
    const to = normalizeCategory(toRaw)
    if (!to || to.toLowerCase() === from.toLowerCase()) return
    const nextLabels = managedCollections.map((c) =>
      c.toLowerCase() === from.toLowerCase() ? to : c,
    )
    const affected = (books ?? []).filter((b) =>
      (b.collections ?? []).some((c) => c.toLowerCase() === from.toLowerCase()),
    )
    for (const book of affected) {
      const { error } = await supabase
        .from('books')
        .update({
          collections: renameCollectionInList(book.collections, from, to),
        })
        .eq('id', book.id)
      if (error) throw error
    }
    await saveTaxonomy.mutateAsync({ collection_labels: nextLabels })
    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) => ({
        ...b,
        collections: renameCollectionInList(b.collections, from, to),
      })),
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
    const nextCaps = { ...shelfCapacities }
    delete nextCaps[label]
    await saveTaxonomy.mutateAsync({
      shelf_locations: nextLabels,
      shelf_capacities: nextCaps,
    })
    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) =>
        (b.shelf_location ?? '').toLowerCase() === label.toLowerCase()
          ? { ...b, shelf_location: null }
          : b,
      ),
    )
    toast.success(`Removed “${label}”`)
  }

  const removeCollection = async (label: string) => {
    const nextLabels = managedCollections.filter(
      (c) => c.toLowerCase() !== label.toLowerCase(),
    )
    const affected = (books ?? []).filter((b) =>
      (b.collections ?? []).some((c) => c.toLowerCase() === label.toLowerCase()),
    )
    for (const book of affected) {
      const { error } = await supabase
        .from('books')
        .update({
          collections: removeCollectionFromList(book.collections, label),
        })
        .eq('id', book.id)
      if (error) throw error
    }
    await saveTaxonomy.mutateAsync({ collection_labels: nextLabels })
    qc.setQueryData<BookWithCreator[]>(booksKey(user?.id), (prev) =>
      (prev ?? []).map((b) => ({
        ...b,
        collections: removeCollectionFromList(b.collections, label),
      })),
    )
    toast.success(`Removed “${label}”`)
  }

  const setShelfCapacity = async (shelf: string, capacity: number | null) => {
    const next = { ...shelfCapacities }
    if (capacity == null || capacity <= 0) delete next[shelf]
    else next[shelf] = capacity
    await saveTaxonomy.mutateAsync({ shelf_capacities: next })
    toast.success('Shelf capacity updated')
  }

  const importFromBooks = async () => {
    await saveTaxonomy.mutateAsync({
      category_labels: mergeCategoryLabels(
        managedCategories,
        collectCategories(books ?? []),
      ),
      shelf_locations: mergeShelfLabels(
        managedShelves,
        collectShelves(books ?? []),
      ),
      collection_labels: normalizeCollections([
        ...managedCollections,
        ...collectCollections(books ?? []),
      ]),
    })
    toast.success('Imported labels from your books')
  }

  return {
    managedCategories,
    managedShelves,
    managedCollections,
    shelfCapacities,
    categoryOptions,
    shelfOptions,
    collectionOptions,
    isSaving: saveTaxonomy.isPending,
    addCategory,
    addShelf,
    addCollection,
    renameCategory,
    renameShelf,
    renameCollection,
    removeCategory,
    removeShelf,
    removeCollection,
    setShelfCapacity,
    importFromBooks,
  }
}
