'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Listing } from '@/lib/types/database'

const STORAGE_KEY = 'payeasy_comparison_ids'
const MAX_COMPARISON_ITEMS = 4

export interface ComparisonState {
  /** IDs of listings currently in comparison */
  comparisonIds: string[]
  /** Full listing objects (populated when page loads) */
  listings: Listing[]
  /** Whether the comparison data is loading */
  isLoading: boolean
  /** Maximum number of items allowed */
  maxItems: number
}

export interface ComparisonActions {
  /** Add a listing to comparison */
  addToComparison: (listing: Listing) => void
  /** Remove a listing from comparison by ID */
  removeFromComparison: (listingId: string) => void
  /** Check if a listing is in comparison */
  isInComparison: (listingId: string) => boolean
  /** Toggle a listing in comparison */
  toggleComparison: (listing: Listing) => void
  /** Clear all listings from comparison */
  clearComparison: () => void
  /** Check if comparison is full */
  isComparisonFull: () => boolean
  /** Get comparison count */
  getComparisonCount: () => number
  /** Generate shareable URL */
  getShareUrl: () => string
}

export type UseComparisonReturn = ComparisonState & ComparisonActions

/**
 * Load comparison IDs from localStorage
 */
function loadFromStorage(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

/**
 * Save comparison IDs to localStorage
 */
function saveToStorage(ids: string[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Storage might be full or disabled
  }
}

/**
 * Hook for managing listing comparison state with localStorage persistence.
 * Use within ComparisonProvider for global state management.
 */
export function useComparison(): UseComparisonReturn {
  const [comparisonIds, setComparisonIds] = useState<string[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    setComparisonIds(stored)
    setIsLoading(false)
  }, [])

  // Sync to localStorage when IDs change
  useEffect(() => {
    if (!isLoading) {
      saveToStorage(comparisonIds)
    }
  }, [comparisonIds, isLoading])

  // Keep listings in sync with IDs
  useEffect(() => {
    setListings((prev) => prev.filter((l) => comparisonIds.includes(l.id)))
  }, [comparisonIds])

  const isInComparison = useCallback(
    (listingId: string): boolean => comparisonIds.includes(listingId),
    [comparisonIds]
  )

  const isComparisonFull = useCallback(
    (): boolean => comparisonIds.length >= MAX_COMPARISON_ITEMS,
    [comparisonIds]
  )

  const getComparisonCount = useCallback(
    (): number => comparisonIds.length,
    [comparisonIds]
  )

  const addToComparison = useCallback(
    (listing: Listing): void => {
      if (comparisonIds.length >= MAX_COMPARISON_ITEMS) return
      if (comparisonIds.includes(listing.id)) return

      setComparisonIds((prev) => [...prev, listing.id])
      setListings((prev) => [...prev, listing])
    },
    [comparisonIds]
  )

  const removeFromComparison = useCallback((listingId: string): void => {
    setComparisonIds((prev) => prev.filter((id) => id !== listingId))
    setListings((prev) => prev.filter((l) => l.id !== listingId))
  }, [])

  const toggleComparison = useCallback(
    (listing: Listing): void => {
      if (comparisonIds.includes(listing.id)) {
        removeFromComparison(listing.id)
      } else {
        addToComparison(listing)
      }
    },
    [comparisonIds, addToComparison, removeFromComparison]
  )

  const clearComparison = useCallback((): void => {
    setComparisonIds([])
    setListings([])
  }, [])

  const getShareUrl = useCallback((): string => {
    if (typeof window === 'undefined') return ''
    
    const baseUrl = window.location.origin
    const params = new URLSearchParams()
    comparisonIds.forEach((id) => params.append('ids', id))
    
    return `${baseUrl}/compare?${params.toString()}`
  }, [comparisonIds])

  return {
    // State
    comparisonIds,
    listings,
    isLoading,
    maxItems: MAX_COMPARISON_ITEMS,
    // Actions
    addToComparison,
    removeFromComparison,
    isInComparison,
    toggleComparison,
    clearComparison,
    isComparisonFull,
    getComparisonCount,
    getShareUrl,
  }
}

/**
 * Load listings by IDs from the API (for comparison page)
 */
export async function fetchListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return []

  try {
    const params = new URLSearchParams()
    ids.forEach((id) => params.append('ids', id))
    
    const response = await fetch(`/api/listings/compare?${params.toString()}`)
    
    if (!response.ok) {
      console.error('Failed to fetch comparison listings')
      return []
    }

    const json = await response.json()
    return json.data ?? json.listings ?? []
  } catch (error) {
    console.error('Error fetching comparison listings:', error)
    return []
  }
}
