'use client';

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface UseCollectionResult<T> {
  data:      T[] | null;
  isLoading: boolean;
  error:     Error | null;
}

/**
 * Real-time collection subscription — drop-in replacement for Firestore useCollection.
 *
 * @param table   - Supabase table name (e.g. 'classes')
 * @param filters - Object of column:value pairs to filter by (e.g. { teacher_id: userId })
 * @param enabled - Set to false to skip the query (replaces nullable query pattern)
 */
export function useCollection<T = any>(
  table:    string | null,
  filters:  Record<string, any> = {},
  enabled:  boolean = true,
): UseCollectionResult<T> {
  const [data,      setData]      = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(!!(table && enabled));
  const [error,     setError]     = useState<Error | null>(null);
  const channelRef  = useRef<any>(null);
  const filterKey   = JSON.stringify(filters);

  useEffect(() => {
    if (!table || !enabled) {
      setData(null); setIsLoading(false); return;
    }

    const supabase = getSupabaseClient();
    setIsLoading(true);

    const fetchData = async () => {
      let query = supabase.from(table).select('*');
      for (const [col, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null) {
          query = query.eq(col, val);
        }
      }
      const { data: rows, error: err } = await query;
      if (err) setError(new Error(err.message));
      else setData(rows as T[]);
      setIsLoading(false);
    };

    fetchData();

    // Real-time subscription
    channelRef.current = supabase
      .channel(`${table}:collection:${filterKey}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table,
      }, () => {
        // Re-fetch on any change to this table
        fetchData();
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [table, filterKey, enabled]);

  return { data, isLoading, error };
}
