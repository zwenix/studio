#!/usr/bin/env node

/**
 * =========================================================================
 * Supabase client.ts Backward-Compatibility Patcher
 * =========================================================================
 * Fixes: "Attempted import error: 'createClient' is not exported from 
 * '@/lib/supabase/client'"
 * 
 * Run: node patch-client-export.js
 * =========================================================================
 */

import fs from 'fs';
import path from 'path';

const clientPath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'client.ts');

const clientCode = `import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Ensure backward compatibility for components expecting 'createClient'
export const createClient = () => getSupabaseClient();

// Keep default/supabase exports if used elsewhere
export const supabase = getSupabaseClient();
`;

console.log('🚀 Patching src/lib/supabase/client.ts...');

try {
  if (fs.existsSync(clientPath)) {
    fs.writeFileSync(clientPath, clientCode, 'utf8');
    console.log('✅ Successfully added exported createClient() to client.ts!');
  } else {
    // If directory doesn't exist, create it
    fs.mkdirSync(path.dirname(clientPath), { recursive: true });
    fs.writeFileSync(clientPath, clientCode, 'utf8');
    console.log('✅ Created new client.ts with backward-compatible exports!');
  }
} catch (err) {
  console.error('❌ Error updating file:', err.message);
}

console.log('\n✨ All done! Run your build or start your Next.js dev server.');
