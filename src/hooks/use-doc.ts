'use client';

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface UseDocResult<T> {
  data:      T | null;
  isLoading: boolean;
  error:     Error | null;
}

/**
 * Real-time document subscription — drop-in replacement for Firestore useDoc.
 * Uses Supabase Realtime under the hood.
 */
export function useDoc<T = any>(
  table:  string | null,
  id:     string | null,
): UseDocResult<T> {
  const [data,      setData]      = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!!(table && id));
  const [error,     setError]     = useState<Error | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!table || !id) {
      setData(null); setIsLoading(false); return;
    }

    const supabase = getSupabaseClient();
    setIsLoading(true);

    // Initial fetch
    supabase.from(table).select('*').eq('id', id).single()
      .then(({ data: row, error: err }) => {
        if (err) setError(new Error(err.message));
        else setData(row as T);
        setIsLoading(false);
      });

    // Real-time subscription
    channelRef.current = supabase
      .channel(`${table}:${id}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table,
        filter: `id=eq.${id}`,
      }, payload => {
        if (payload.eventType === 'DELETE') setData(null);
        else setData(payload.new as T);
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [table, id]);

  return { data, isLoading, error };
}
