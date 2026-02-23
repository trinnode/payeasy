'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  MapPin,
  Bed,
  Bath,
  Home,
  PawPrint,
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink,
} from 'lucide-react'
import type { Listing } from '@/lib/types/database'

interface ComparisonViewProps {
  /** Listings to compare (2-4) */
  listings: Listing[]
  /** Callback when a listing is removed */
  onRemove: (listingId: string) => void
  /** Whether to highlight the best values */
  highlightBest?: boolean
}

interface ComparisonRowProps {
  label: string
  icon?: React.ReactNode
  values: (string | number | boolean | undefined | null)[]
  type?: 'text' | 'number' | 'boolean' | 'price'
  highlightBest?: boolean
  bestIsLowest?: boolean // For price, lower is better
}

/**
 * Get the highlight class for a value based on comparison
 */
function getHighlightClass(
  value: number | undefined,
  values: (number | undefined)[],
  bestIsLowest: boolean
): string {
  if (value === undefined) return ''
  
  const validValues = values.filter((v): v is number => v !== undefined)
  if (validValues.length < 2) return ''
  
  const best = bestIsLowest ? Math.min(...validValues) : Math.max(...validValues)
  const worst = bestIsLowest ? Math.max(...validValues) : Math.min(...validValues)
  
  if (value === best) return 'bg-green-50 text-green-700 font-semibold'
  if (value === worst && validValues.length > 2) return 'bg-red-50 text-red-600'
  return ''
}

/**
 * Row component for displaying a single comparison attribute
 */
function ComparisonRow({
  label,
  icon,
  values,
  type = 'text',
  highlightBest = true,
  bestIsLowest = false,
}: ComparisonRowProps) {
  const formattedValues = useMemo(() => {
    return values.map((value, index) => {
      if (value === undefined || value === null) {
        return { display: '—', highlight: '' }
      }

      let display: string
      let highlight = ''

      switch (type) {
        case 'price':
          display = `${value} XLM`
          if (highlightBest) {
            const numericValues = values.map((v) =>
              typeof v === 'number' ? v : undefined
            )
            highlight = getHighlightClass(value as number, numericValues, true)
          }
          break
        case 'number':
          display = String(value)
          if (highlightBest) {
            const numericValues = values.map((v) =>
              typeof v === 'number' ? v : undefined
            )
            highlight = getHighlightClass(value as number, numericValues, bestIsLowest)
          }
          break
        case 'boolean':
          display = value ? 'Yes' : 'No'
          if (highlightBest && value === true) {
            highlight = 'bg-green-50 text-green-700'
          }
          break
        default:
          display = String(value)
      }

      return { display, highlight }
    })
  }, [values, type, highlightBest, bestIsLowest])

  return (
    <div className="grid grid-cols-[140px_1fr] border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2 py-3 px-4 bg-gray-50 text-sm font-medium text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}
      >
        {formattedValues.map((item, index) => (
          <div
            key={index}
            className={`py-3 px-4 text-sm text-center border-l border-gray-100 first:border-l-0 ${item.highlight}`}
          >
            {item.display}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Price difference indicator
 */
function PriceDifference({ listings }: { listings: Listing[] }) {
  const prices = listings.map((l) => l.rent_xlm)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const diff = maxPrice - minPrice

  if (diff === 0) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-sm">
        <Minus size={16} />
        <span>Same price</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Price range:</span>
      <span className="font-semibold text-green-600">{minPrice} XLM</span>
      <span className="text-gray-400">—</span>
      <span className="font-semibold text-red-500">{maxPrice} XLM</span>
      <span className="text-gray-400">
        (Δ {diff} XLM)
      </span>
    </div>
  )
}

/**
 * Side-by-side listing comparison view
 */
export default function ComparisonView({
  listings,
  onRemove,
  highlightBest = true,
}: ComparisonViewProps) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-16">
        <GitCompareArrowsIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No listings to compare</h3>
        <p className="text-gray-500 mb-6">
          Add listings to your comparison from the browse page.
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          Browse Listings
          <ExternalLink size={16} />
        </Link>
      </div>
    )
  }

  if (listings.length === 1) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Add more listings to compare
        </h3>
        <p className="text-gray-500 mb-6">
          Select at least 2 listings to see a side-by-side comparison.
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          Browse Listings
          <ExternalLink size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Price difference summary */}
      <div className="flex items-center justify-between bg-violet-50 rounded-lg px-4 py-3">
        <PriceDifference listings={listings} />
        <span className="text-sm text-violet-600">
          Comparing {listings.length} listings
        </span>
      </div>

      {/* Listing headers with images */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${listings.length}, 1fr)` }}
      >
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group"
          >
            {/* Remove button */}
            <button
              onClick={() => onRemove(listing.id)}
              className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-full shadow-sm
                         hover:bg-red-50 hover:text-red-600 transition-colors"
              aria-label="Remove from comparison"
            >
              <X size={16} />
            </button>

            {/* Image */}
            <div className="relative h-40 bg-gray-100">
              <Image
                src={(listing as typeof listing & { images?: string[] }).images?.[0] ?? '/images/airbnb1.jpg'}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 25vw"
              />
            </div>

            {/* Title & address */}
            <div className="p-4">
              <Link
                href={`/listings/${listing.id}`}
                className="font-semibold text-gray-900 hover:text-violet-600 transition-colors line-clamp-1"
              >
                {listing.title}
              </Link>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin size={14} />
                <span className="line-clamp-1">{listing.address}</span>
              </div>
              <div className="mt-2 text-xl font-bold text-violet-600">
                {listing.rent_xlm} XLM
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="font-semibold text-gray-800">Property Details</h3>
        </div>

        <ComparisonRow
          label="Price"
          icon={<span className="text-lg">💰</span>}
          values={listings.map((l) => l.rent_xlm)}
          type="price"
          highlightBest={highlightBest}
        />

        <ComparisonRow
          label="Bedrooms"
          icon={<Bed size={16} />}
          values={listings.map((l) => l.bedrooms)}
          type="number"
          highlightBest={highlightBest}
        />

        <ComparisonRow
          label="Bathrooms"
          icon={<Bath size={16} />}
          values={listings.map((l) => l.bathrooms)}
          type="number"
          highlightBest={highlightBest}
        />

        <ComparisonRow
          label="Furnished"
          icon={<Home size={16} />}
          values={listings.map((l) => l.furnished)}
          type="boolean"
          highlightBest={highlightBest}
        />

        <ComparisonRow
          label="Pet Friendly"
          icon={<PawPrint size={16} />}
          values={listings.map((l) => l.pet_friendly)}
          type="boolean"
          highlightBest={highlightBest}
        />

        <ComparisonRow
          label="Address"
          icon={<MapPin size={16} />}
          values={listings.map((l) => l.address)}
          type="text"
          highlightBest={false}
        />
      </div>

      {/* View listing buttons */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${listings.length}, 1fr)` }}
      >
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700
                       rounded-lg hover:bg-violet-50 hover:text-violet-600 transition-colors font-medium"
          >
            View Details
            <ExternalLink size={16} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function GitCompareArrowsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="6" r="3" />
      <path d="M5 9v6" />
      <circle cx="5" cy="18" r="3" />
      <path d="M12 3v18" />
      <circle cx="19" cy="6" r="3" />
      <path d="M19 9v6" />
      <circle cx="19" cy="18" r="3" />
    </svg>
  )
}
