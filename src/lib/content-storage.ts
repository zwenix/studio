import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
type UploadOptions = {
  cacheControl?: string;
  upsert?:       boolean;
  contentType?:  string;
};
type UploadInput = File | Blob | ArrayBuffer | string;
let supabaseInstance: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}
function createLazyProxy<T extends object>(getTarget: () => T): T {
  const handler: ProxyHandler<T> = {
    get(_target, prop, receiver) {
      const target = getTarget();
      const value  = Reflect.get(target as object, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
  };
  return new Proxy({} as T, handler);
}
function toBlob(file: UploadInput): Blob {
  if (typeof file === 'string') {
    return new Blob([file], { type: 'text/plain' });
  }
  if (file instanceof Blob) {
    return file;
  }
  return new Blob([file]);
}
// ─── Named exports (used by all pages via `import { supabase } from '@/lib/content-storage'`) ───
export const supabase = createLazyProxy(getSupabaseClient) as SupabaseClient;
export const storage  = createLazyProxy(() => getSupabaseClient().storage) as SupabaseClient['storage'];
export async function uploadContent(
  bucket:  string,
  path:    string,
  file:    UploadInput,
  options: UploadOptions = {}
): Promise<string> {
  const client = getSupabaseClient();
  const blob   = toBlob(file);
  const { error } = await client.storage.from(bucket).upload(path, blob, {
    cacheControl: options.cacheControl ?? '3600',
    upsert:       options.upsert       ?? true,
    contentType:  options.contentType  || blob.type || undefined,
  });
  if (error) {
    throw new Error('Failed to upload to Supabase Storage: ' + error.message);
  }
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
export async function saveContentSafely(
  bucket:  string,
  path:    string,
  file:    UploadInput,
  options: UploadOptions = {}
): Promise<string> {
  return uploadContent(bucket, path, file, options);
}
export function getContentUrl(bucket: string, path: string): string {
  const client = getSupabaseClient();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
export const getPublicUrl = getContentUrl;
export async function deleteContent(bucket: string, pathOrPaths: string | string[]): Promise<void> {
  const client = getSupabaseClient();
  const paths  = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths];
  const { error } = await client.storage.from(bucket).remove(paths);
  if (error) {
    throw new Error('Delete failed: ' + error.message);
  }
}
// ─── Default export (for `import supabase from '@/lib/content-storage'`) ────
export default supabase;
