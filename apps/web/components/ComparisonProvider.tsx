'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { useComparison, type UseComparisonReturn } from '@/lib/hooks/useComparison'
import type { Listing } from '@/lib/types/database'

type ComparisonContextValue = UseComparisonReturn

const ComparisonContext = createContext<ComparisonContextValue | null>(null)

/**
 * Hook to access the comparison context.
 * Must be used within a ComparisonProvider.
 */
export function useComparisonContext(): ComparisonContextValue {
  const ctx = useContext(ComparisonContext)
  if (!ctx) {
    throw new Error('useComparisonContext must be used within a ComparisonProvider')
  }
  return ctx
}

interface ComparisonProviderProps {
  children: React.ReactNode
  /** Optional initial listings to populate (e.g., from URL params) */
  initialListings?: Listing[]
}

/**
 * Provider component for managing listing comparison state globally.
 * Wrap this around your app or page layout to enable comparison features.
 */
export default function ComparisonProvider({
  children,
}: ComparisonProviderProps) {
  const comparison = useComparison()

  const value = useMemo(
    () => comparison,
    [comparison]
  )

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  )
}
