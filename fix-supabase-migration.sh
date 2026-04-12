#!/usr/bin/env bash
set -euo pipefail

echo "Applying Supabase migration fixes..."

node <<'NODE'
const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  hook: "src/hooks/use-supabase-user.ts",
  provider: "src/components/supabase-provider.tsx",
  client: "src/lib/supabase/client.ts",
  server: "src/lib/supabase/server.ts",
};

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

function read(p) {
  return fs.readFileSync(path.join(root, p), "utf8");
}

function writeWithBackup(p, content) {
  const full = path.join(root, p);
  const prev = fs.readFileSync(full, "utf8");
  if (prev === content) return false;
  fs.writeFileSync(full + ".bak", prev, "utf8");
  fs.writeFileSync(full, content, "utf8");
  return true;
}

function updateNamedImportFromModule(src, modulePath, updater) {
  // Handles: import { a, b } from 'module'
  return src.replace(
    new RegExp(
      `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]\\s*;?`,
      "g"
    ),
    (full, namesRaw) => {
      const names = namesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = updater(names);
      if (!updated || updated.length === 0) return "";
      return `import { ${updated.join(", ")} } from '${modulePath}';`;
    }
  );
}

const changed = [];

/* 1) src/hooks/use-supabase-user.ts */
if (exists(files.hook)) {
  let s = read(files.hook);

  // createClient -> getSupabaseClient in import
  s = updateNamedImportFromModule(s, "@/lib/supabase/client", (names) =>
    names.map((n) => (n === "createClient" ? "getSupabaseClient" : n))
  );

  // createClient() -> getSupabaseClient()
  s = s.replace(/\bcreateClient\(\)/g, "getSupabaseClient()");

  if (writeWithBackup(files.hook, s)) changed.push(files.hook);
}

/* 2) src/components/supabase-provider.tsx */
if (exists(files.provider)) {
  let s = read(files.provider);

  // Remove createClient from named imports from '@/lib/supabase/client'
  s = updateNamedImportFromModule(s, "@/lib/supabase/client", (names) =>
    names.filter((n) => n !== "createClient")
  );

  if (writeWithBackup(files.provider, s)) changed.push(files.provider);
}

/* 3) src/lib/supabase/client.ts */
if (exists(files.client)) {
  let s = read(files.client);

  // Alias SDK createClient import to avoid name collision
  s = s.replace(
    /import\s*\{\s*createClient\s*,/g,
    "import { createClient as createSupabaseClient,"
  );

  // Update internal SDK client construction call(s)
  s = s.replace(/\bcreateClient\(/g, "createSupabaseClient(");

  // Add backward-compatible createClient() export if missing
  const hasCompatExport =
    /export\s+(const|function)\s+createClient\b/.test(s);

  if (!hasCompatExport) {
    if (/export\s+default\s+supabase\s*;?/.test(s)) {
      s = s.replace(
        /export\s+default\s+supabase\s*;?/,
        `export function createClient() {\n  return getSupabaseClient();\n}\n\nexport default supabase;`
      );
    } else {
      s += `\n\nexport function createClient() {\n  return getSupabaseClient();\n}\n`;
    }
  }

  if (writeWithBackup(files.client, s)) changed.push(files.client);
}

/* 4) src/lib/supabase/server.ts */
if (exists(files.server)) {
  let s = read(files.server);

  // Alias imported createServerClient from @supabase/ssr
  s = s.replace(
    /import\s*\{\s*createServerClient\s*,/g,
    "import { createServerClient as createSupabaseServerClient,"
  );

  // Replace constructor calls to aliased name
  s = s.replace(/\bcreateServerClient\(/g, "createSupabaseServerClient(");

  // If helper is exported as createServerClient, rename to createClient
  if (!/export\s+(const|function)\s+createClient\b/.test(s)) {
    s = s.replace(
      /export\s+(const|function)\s+createServerClient\b/g,
      (m) => m.replace("createServerClient", "createClient")
    );
  }

  if (writeWithBackup(files.server, s)) changed.push(files.server);
}

if (changed.length === 0) {
  console.log("No changes were necessary.");
} else {
  console.log("Updated files:");
  for (const f of changed) console.log(" - " + f);
  console.log("\nBackups saved as *.bak next to each changed file.");
}
NODE

echo
echo "Done. Next steps:"
echo "1) npm run dev"
echo "2) If clean, remove backups: find src -name '*.bak' -delete"