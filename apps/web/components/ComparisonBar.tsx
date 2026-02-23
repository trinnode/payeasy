'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, GitCompareArrows, Trash2 } from 'lucide-react'
import { useComparisonContext } from './ComparisonProvider'

/**
 * Floating comparison bar that appears at the bottom of the screen
 * when listings are added to comparison.
 */
export default function ComparisonBar() {
  const {
    listings,
    comparisonIds,
    removeFromComparison,
    clearComparison,
    getComparisonCount,
    maxItems,
    isLoading,
  } = useComparisonContext()

  const count = getComparisonCount()

  // Don't render if no items or still loading
  if (isLoading || count === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 pointer-events-auto transform animate-slide-up">
          <div className="flex items-center justify-between p-4">
            {/* Left: Comparison items preview */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-violet-600">
                <GitCompareArrows size={24} />
                <span className="font-semibold">
                  {count} of {maxItems}
                </span>
              </div>

              {/* Listing thumbnails */}
              <div className="flex items-center gap-2">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="relative group"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border-2 border-white shadow-sm">
                      <Image
                        src={(listing as typeof listing & { images?: string[] }).images?.[0] ?? '/images/airbnb1.jpg'}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    {/* Remove button on hover */}
                    <button
                      onClick={() => removeFromComparison(listing.id)}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full
                                 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      aria-label={`Remove ${listing.title} from comparison`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: maxItems - count }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50
                               flex items-center justify-center text-gray-400"
                  >
                    <span className="text-xs">+</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Clear all button */}
              <button
                onClick={clearComparison}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500
                           hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Clear comparison"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Clear</span>
              </button>

              {/* Compare button */}
              <Link
                href="/compare"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${count >= 2
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                  }`}
                aria-disabled={count < 2}
              >
                <GitCompareArrows size={18} />
                <span>Compare{count >= 2 ? ` (${count})` : ''}</span>
              </Link>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100 rounded-b-xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-300"
              style={{ width: `${(count / maxItems) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
