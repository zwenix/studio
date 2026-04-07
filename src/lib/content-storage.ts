/**
 * Content Storage Utility
 *
 * Solves the Firestore 1 MB per-document limit by transparently routing
 * large HTML content to Firebase Storage (5 TB per object — effectively unlimited).
 *
 * Strategy:
 *  • Content < INLINE_THRESHOLD  → stored directly in the Firestore field (fast, no extra read)
 *  • Content ≥ INLINE_THRESHOLD  → uploaded to Firebase Storage as a .html file;
 *                                   Firestore stores the download URL in `contentStorageUrl`
 *                                   and an empty string in `content`.
 *
 * On read, callers check `contentStorageUrl`. If set, they fetch the HTML from that URL.
 * This guarantees 100 % content integrity — nothing is ever truncated.
 */

import {
  ref,
  uploadString,
  getDownloadURL,
  type FirebaseStorage,
} from 'firebase/storage';

/** Maximum bytes stored inline in a Firestore field. 700 KB leaves ample room for
 *  other fields (memo, rubric, metadata) within the 1 MB document limit. */
const INLINE_THRESHOLD_BYTES = 700 * 1024; // 700 KB

/** Result returned by saveContentSafely */
export interface SaveResult {
  /** HTML to store in the Firestore `content` field.
   *  Empty string when the HTML was routed to Firebase Storage. */
  inlineContent: string;
  /** Firebase Storage download URL, or undefined when content fit inline. */
  contentStorageUrl: string | undefined;
  /** True when the content was routed to Firebase Storage. */
  usedStorage: boolean;
  /** Actual content byte size (informational). */
  byteSize: number;
}

/**
 * Decide whether to save HTML content inline in Firestore or upload it to
 * Firebase Storage, then return the results for the caller to persist.
 *
 * @param html         The full HTML string to save.
 * @param storage      Firebase Storage instance (from useStorage() or getStorage()).
 * @param storagePath  Firebase Storage path, e.g. `generated-content/{uid}/{timestamp}.html`.
 */
export async function saveContentSafely(
  html: string,
  storage: FirebaseStorage,
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

  // Content is too large for Firestore — upload to Firebase Storage.
  const fileRef = ref(storage, storagePath);
  await uploadString(fileRef, html, 'raw', { contentType: 'text/html; charset=utf-8' });
  const downloadUrl = await getDownloadURL(fileRef);

  return {
    inlineContent: '',       // Firestore content field stays empty
    contentStorageUrl: downloadUrl,
    usedStorage: true,
    byteSize,
  };
}

/**
 * Given a Firestore document that may have either inline HTML or a Storage URL,
 * return the full HTML string. Call this whenever you need to render or export content.
 *
 * - If `contentStorageUrl` is present → fetches from Firebase Storage (network request).
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
    console.error('[resolveContent] Failed to fetch from Firebase Storage:', err);
    // Return whatever is inline as a graceful degradation
    return inlineContent || '<p style="color:red;">Content temporarily unavailable. Please try again.</p>';
  }
}
