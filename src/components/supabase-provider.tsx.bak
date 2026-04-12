'use client'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-supabase-user'

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()

  if (loading) return <div>Loading...</div>

  return <>{children}</>
}
