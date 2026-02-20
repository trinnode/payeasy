import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time (SSG), these might be missing if not set in CI/CD or if .env.local isn't loaded.
    // We provide fallbacks to prevent build failures, but runtime will fail if these are still missing.
    if (typeof window === 'undefined') {
       console.warn('Supabase environment variables missing during build. Using placeholders.')
       return createBrowserClient('https://placeholder.supabase.co', 'placeholder')
    }
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
