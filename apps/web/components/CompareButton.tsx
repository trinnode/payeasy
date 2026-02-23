'use client'

import React from 'react'
import { GitCompareArrows, Check, Plus } from 'lucide-react'
import { useComparisonContext } from './ComparisonProvider'
import type { Listing } from '@/lib/types/database'

interface CompareButtonProps {
  /** The listing to add/remove from comparison */
  listing: Listing
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show text label */
  showLabel?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Button to toggle a listing in the comparison list.
 * Shows visual feedback for:
 * - Not in comparison (can add)
 * - In comparison (can remove)
 * - Comparison full (disabled)
 */
export default function CompareButton({
  listing,
  size = 'md',
  showLabel = false,
  className = '',
}: CompareButtonProps) {
  const { isInComparison, toggleComparison, isComparisonFull, isLoading } = useComparisonContext()

  const inComparison = isInComparison(listing.id)
  const isFull = isComparisonFull()
  const isDisabled = isLoading || (!inComparison && isFull)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDisabled) {
      toggleComparison(listing)
    }
  }

  // Size variants
  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }

  const getButtonClasses = () => {
    const base = `
      inline-flex items-center gap-1.5 rounded-lg font-medium
      transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
      ${sizeClasses[size]}
    `

    if (isDisabled && !inComparison) {
      return `${base} bg-gray-100 text-gray-400 cursor-not-allowed`
    }

    if (inComparison) {
      return `${base} bg-violet-100 text-violet-700 hover:bg-violet-200 focus:ring-violet-500`
    }

    return `${base} bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-600 focus:ring-violet-500`
  }

  const getLabel = () => {
    if (inComparison) return 'In comparison'
    if (isFull) return 'Comparison full'
    return 'Compare'
  }

  const getIcon = () => {
    const iconSize = iconSizes[size]
    
    if (inComparison) {
      return <Check size={iconSize} className="text-violet-600" />
    }
    
    if (isFull) {
      return <GitCompareArrows size={iconSize} className="text-gray-400" />
    }
    
    return <Plus size={iconSize} />
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${getButtonClasses()} ${className}`}
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
      {showLabel && (
        <span className="text-sm whitespace-nowrap">{getLabel()}</span>
      )}
    </button>
  )
}

/**
 * Compact icon-only compare button for card overlays
 */
export function CompareButtonIcon({
  listing,
  size = 20,
  className = '',
}: {
  listing: Listing
  size?: number
  className?: string
}) {
  const { isInComparison, toggleComparison, isComparisonFull, isLoading } = useComparisonContext()

  const inComparison = isInComparison(listing.id)
  const isFull = isComparisonFull()
  const isDisabled = isLoading || (!inComparison && isFull)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDisabled) {
      toggleComparison(listing)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        p-1.5 rounded-full transition-colors
        ${inComparison
          ? 'bg-violet-500 text-white'
          : isDisabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white/90 text-gray-600 hover:bg-violet-100 hover:text-violet-600'
        }
        ${className}
      `}
      aria-label={inComparison ? 'Remove from comparison' : 'Add to comparison'}
      title={inComparison ? 'Remove from comparison' : isFull ? 'Comparison full (max 4)' : 'Add to comparison'}
    >
      {inComparison ? (
        <Check size={size} />
      ) : (
        <GitCompareArrows size={size} />
      )}
    </button>
  )
}
