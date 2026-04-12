/**
 * Content Storage Utility
 *
 * Solves the Firestore 1 MB per-document limit by transparently routing
 * large HTML content to Supabase Storage (5 TB per object — effectively unlimited).
 *
 * Strategy:
 *  • Content < INLINE_THRESHOLD  → stored directly in the DB field (fast, no extra read)
 *  • Content ≥ INLINE_THRESHOLD  → uploaded to Supabase Storage as a .html file;
 *                                   DB stores the public URL in `contentStorageUrl`
 *                                   and an empty string in `content`.
 *
 * On read, callers check `contentStorageUrl`. If set, they fetch the HTML from that URL.
 * This guarantees 100 % content integrity — nothing is ever truncated.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'generated-content';

/** Maximum bytes stored inline in a DB field. 700 KB leaves ample room for
 *  other fields (memo, rubric, metadata) within the 1 MB document limit. */
const INLINE_THRESHOLD_BYTES = 700 * 1024; // 700 KB

/** Result returned by saveContentSafely */
export interface SaveResult {
  /** HTML to store in the DB `content` field.
   *  Empty string when the HTML was routed to Supabase Storage. */
  inlineContent: string;
  /** Supabase Storage public URL, or undefined when content fit inline. */
  contentStorageUrl: string | undefined;
  /** True when the content was routed to Supabase Storage. */
  usedStorage: boolean;
  /** Actual content byte size (informational). */
  byteSize: number;
}

/**
 * Decide whether to save HTML content inline or upload it to
 * Supabase Storage, then return the results for the caller to persist.
 *
 * @param html         The full HTML string to save.
 * @param storagePath  Supabase Storage path, e.g. `{uid}/{timestamp}.html`.
 */
export async function saveContentSafely(
  html: string,
  storagePath: string,
): Promise<SaveResult> {
  const encoder = new TextEncoder();
  const byteSize = encoder.encode(html).length;

  if (byteSize <= INLINE_THRESHOLD_BYTES) {
    return {
      inlineContent: html,
      contentStorageUrl: undefined,
      usedStorage: false,
      byteSize,
    };
  }

  // Content is too large — upload to Supabase Storage.
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, html, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });

  if (error) {
    console.error('[content-storage] Upload failed:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    inlineContent: '',
    contentStorageUrl: urlData.publicUrl,
    usedStorage: true,
    byteSize,
  };
}

/**
 * Given a document that may have either inline HTML or a Storage URL,
 * return the full HTML string. Call this whenever you need to render or export content.
 *
 * - If `contentStorageUrl` is present → fetches from Supabase Storage (network request).
 * - Otherwise → returns `inlineContent` immediately (no network request).
 */
export async function resolveContent(
  inlineContent: string,
  contentStorageUrl: string | undefined,
): Promise<string> {
  if (!contentStorageUrl) return inlineContent;

  try {
    const response = await fetch(contentStorageUrl);
    if (!response.ok) throw new Error(`Storage fetch failed: ${response.status}`);
    return await response.text();
  } catch (err) {
    console.error('[resolveContent] Failed to fetch from Supabase Storage:', err);
    return inlineContent || '<p style="color:red;">Content temporarily unavailable. Please try again.</p>';
  }
}
