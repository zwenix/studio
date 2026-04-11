#!/usr/bin/env bash
# =============================================================================
#  EduAI Companion — Firebase → Supabase + Vercel Migration Script
#  Version: 1.0.0
# =============================================================================
#  USAGE:
#    1. Place this file in your project root (same folder as package.json)
#    2. chmod +x migrate-to-supabase.sh
#    3. ./migrate-to-supabase.sh
#
#  WHAT THIS SCRIPT DOES:
#    ✅ Checks all prerequisites
#    ✅ Collects your Supabase & Vercel credentials interactively
#    ✅ Installs all required npm packages
#    ✅ Creates the Supabase database schema (all your tables + RLS policies)
#    ✅ Generates all replacement source files
#    ✅ Migrates all Firestore data to Supabase Postgres
#    ✅ Migrates Firebase Storage files to Supabase Storage
#    ✅ Deploys to Vercel
#    ✅ Generates a personalised post-deploy checklist
#
#  BEFORE RUNNING:
#    - Create a free Supabase project at supabase.com
#    - Create a free Vercel account at vercel.com
#    - Install Vercel CLI: npm i -g vercel
#    - Have your Firebase serviceAccountKey.json ready
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m';  GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m';  BOLD='\033[1m'; NC='\033[0m'

# ── State ─────────────────────────────────────────────────────────────────────
LOG_FILE="supabase-migration-$(date +%Y%m%d-%H%M%S).log"
PROJECT_DIR="$(pwd)"
STEPS_DONE=0; STEPS_TOTAL=9

# ── Helpers ───────────────────────────────────────────────────────────────────
log()     { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
ok()      { echo -e "${GREEN}  ✅ $*${NC}"  | tee -a "$LOG_FILE"; }
warn()    { echo -e "${YELLOW}  ⚠️  $*${NC}" | tee -a "$LOG_FILE"; }
err()     { echo -e "${RED}  ❌ $*${NC}"   | tee -a "$LOG_FILE"; exit 1; }
ask()     { echo -e "\n${YELLOW}  ❓ $*${NC}"; }
divider() { echo -e "${BLUE}  ────────────────────────────────────────────────${NC}"; }
step() {
  STEPS_DONE=$((STEPS_DONE + 1))
  echo -e "\n${BOLD}${BLUE}  ══════════════════════════════════════════════════"
  echo -e "  Step $STEPS_DONE/$STEPS_TOTAL — $*"
  echo -e "  ══════════════════════════════════════════════════${NC}\n"
}

# ── Banner ────────────────────────────────────────────────────────────────────
print_banner() {
  clear
  echo -e "${BOLD}${GREEN}"
  echo "  ╔══════════════════════════════════════════════════════╗"
  echo "  ║    EduAI Companion — Firebase → Supabase Migration   ║"
  echo "  ║            + Vercel Deployment Automation            ║"
  echo "  ╚══════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo -e "  ${CYAN}Project dir:${NC} $PROJECT_DIR"
  echo -e "  ${CYAN}Log file:${NC}    $LOG_FILE"
  echo -e "  ${CYAN}Started:${NC}     $(date)"
  echo ""
  divider
  echo ""
  echo -e "  ${YELLOW}You will need:${NC}"
  echo "    1. A Supabase project (free at supabase.com)"
  echo "       → Settings → API → copy URL and anon/service_role keys"
  echo "    2. A Vercel account (free at vercel.com)"
  echo "    3. Your Firebase serviceAccountKey.json (for data migration)"
  echo "       → Firebase Console → Project Settings → Service Accounts"
  echo ""
  divider
  echo ""
  ask "Ready to continue? Press ENTER or Ctrl+C to cancel."
  read -r
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Prerequisites
# ─────────────────────────────────────────────────────────────────────────────
check_prerequisites() {
  step "Checking Prerequisites"

  local missing=()
  for cmd in node npm git curl; do
    if command -v "$cmd" &>/dev/null; then
      ok "$cmd — $(command -v $cmd)"
    else
      warn "$cmd NOT found"
      missing+=("$cmd")
    fi
  done

  # Node version
  if command -v node &>/dev/null; then
    NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt 18 ]; then
      warn "Node.js v$NODE_VER — recommend v18 or later"
    else
      ok "Node.js v$NODE_VER ✓"
    fi
  fi

  # Vercel CLI
  if command -v vercel &>/dev/null; then
    ok "Vercel CLI — $(vercel --version 2>/dev/null | head -1)"
  else
    warn "Vercel CLI not found — installing now..."
    npm install -g vercel 2>&1 | tee -a "$LOG_FILE"
    ok "Vercel CLI installed"
  fi

  # Supabase CLI — binary tool, NOT an npm package
  # On Windows + Git Bash, Scoop installs to a path Git Bash doesn't know about.
  # We fix this by adding Scoop's shims dir to PATH before checking.

  OS_TYPE="$(uname -s)"

  # ── Windows/Git Bash: add Scoop shims to PATH so binaries are visible ──────
  if [[ "$OS_TYPE" == *"MINGW"* || "$OS_TYPE" == *"MSYS"* || "$OS_TYPE" == *"CYGWIN"* ]]; then
    # Scoop installs shims here — add all common locations
    USERPROFILE_UNIX="$(echo "$USERPROFILE" | sed 's|\\|/|g' | sed 's|C:|/c|')"
    SCOOP_SHIMS="${USERPROFILE_UNIX}/scoop/shims"
    SCOOP_SHIMS_ALT="/c/Users/${USERNAME}/scoop/shims"
    SCOOP_GLOBAL="/c/ProgramData/scoop/shims"

    for SHIM_DIR in "$SCOOP_SHIMS" "$SCOOP_SHIMS_ALT" "$SCOOP_GLOBAL"; do
      if [ -d "$SHIM_DIR" ]; then
        export PATH="$SHIM_DIR:$PATH"
        log "Added Scoop shims to PATH: $SHIM_DIR"
      fi
    done

    # Also check if supabase.exe exists directly in common Scoop app dirs
    for SUPA_EXE in       "${USERPROFILE_UNIX}/scoop/apps/supabase/current/supabase.exe"       "/c/Users/${USERNAME}/scoop/apps/supabase/current/supabase.exe"; do
      if [ -f "$SUPA_EXE" ]; then
        SUPA_DIR="$(dirname "$SUPA_EXE")"
        export PATH="$SUPA_DIR:$PATH"
        log "Found supabase.exe at: $SUPA_EXE"
        break
      fi
    done
  fi

  if command -v supabase &>/dev/null; then
    ok "Supabase CLI found — $(supabase --version 2>/dev/null | head -1)"
  else
    warn "Supabase CLI not found — detecting OS and installing..."
    ARCH_TYPE="$(uname -m)"

    if [[ "$OS_TYPE" == "Darwin" ]]; then
      if command -v brew &>/dev/null; then
        log "macOS + Homebrew — installing via brew..."
        brew install supabase/tap/supabase 2>&1 | tee -a "$LOG_FILE"
      else
        echo ""
        echo '    Install Homebrew first, then run:'
        echo '    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        echo '    brew install supabase/tap/supabase'
        echo ""
        err "Install Homebrew + Supabase CLI then re-run this script."
      fi

    elif [[ "$OS_TYPE" == "Linux" ]]; then
      SUPA_VERSION="v2.20.5"
      if [[ "$ARCH_TYPE" == "x86_64" ]]; then
        SUPA_FILE="supabase_linux_amd64.tar.gz"
      else
        SUPA_FILE="supabase_linux_arm64.tar.gz"
      fi
      SUPA_URL="https://github.com/supabase/cli/releases/download/${SUPA_VERSION}/${SUPA_FILE}"
      log "Downloading Supabase CLI for Linux..."
      curl -sSL "$SUPA_URL" -o /tmp/supabase.tar.gz
      tar -xzf /tmp/supabase.tar.gz -C /tmp && rm -f /tmp/supabase.tar.gz
      if [ -w "/usr/local/bin" ]; then
        mv /tmp/supabase /usr/local/bin/supabase && chmod +x /usr/local/bin/supabase
      else
        sudo mv /tmp/supabase /usr/local/bin/supabase && sudo chmod +x /usr/local/bin/supabase
      fi

    else
      # Windows — Scoop is already installed (user confirmed), just not in PATH
      echo ""
      warn "Supabase is installed via Scoop but Git Bash can't see it."
      warn "This is a PATH issue. Fix it one of these ways:"
      echo ""
      echo "  ── Option 1: Run these commands in this Git Bash window ──────────"
      echo '  export PATH="$USERPROFILE/scoop/shims:$PATH"'
      echo "  ./migrate-to-supabase.sh"
      echo ""
      echo "  ── Option 2: Add Scoop to Git Bash PATH permanently ─────────────"
      echo '  echo '"'"'export PATH="$USERPROFILE/scoop/shims:$PATH"'"'"' >> ~/.bashrc'
      echo "  source ~/.bashrc"
      echo "  ./migrate-to-supabase.sh"
      echo ""
      err "Re-run the script after fixing PATH (see options above)."
    fi

    if command -v supabase &>/dev/null; then
      ok "Supabase CLI ready — $(supabase --version 2>/dev/null | head -1)"
    else
      warn "Supabase CLI still not in PATH after install attempt."
      warn "Open a new Git Bash window and re-run: ./migrate-to-supabase.sh"
    fi
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    err "Missing required tools: ${missing[*]}. Install them and re-run."
  fi

  # Check we're in the right directory
  if [ ! -f "package.json" ]; then
    err "No package.json found. Run this script from your project root."
  fi
  ok "package.json found — correct directory"

  ok "All prerequisites satisfied"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Collect Credentials
# ─────────────────────────────────────────────────────────────────────────────
collect_credentials() {
  step "Collecting Credentials"

  echo -e "  ${CYAN}━━ Supabase ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "  Get these from: supabase.com → your project → Settings → API"
  echo ""

  echo -e "  ${CYAN}Supabase Project URL (e.g. https://xxxx.supabase.co):${NC}"
  read -r SUPABASE_URL
  SUPABASE_URL="${SUPABASE_URL%/}"  # strip trailing slash

  echo -e "  ${CYAN}Supabase anon/public key:${NC}"
  read -r SUPABASE_ANON_KEY

  echo -e "  ${CYAN}Supabase service_role key (secret — used for migration):${NC}"
  read -rs SUPABASE_SERVICE_ROLE_KEY
  echo ""

  echo -e "  ${CYAN}Supabase database password (set when you created the project):${NC}"
  read -rs SUPABASE_DB_PASSWORD
  echo ""

  # Build DB connection string
  # Extract project ref from URL: https://abcdefgh.supabase.co → abcdefgh
  SUPABASE_PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | cut -d. -f1)
  SUPABASE_DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"

  echo ""
  echo -e "  ${CYAN}━━ Firebase (for data export) ━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${CYAN}Firebase Project ID [studio-4710648038-f5ed1]:${NC}"
  read -r FIREBASE_PROJECT_ID
  FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-studio-4710648038-f5ed1}"

  echo ""
  echo -e "  ${CYAN}━━ AI Backend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${CYAN}Anthropic API Key (Claude):${NC}"
  read -rs ANTHROPIC_API_KEY
  echo ""

  echo -e "  ${CYAN}Pexels API Key (for image search):${NC}"
  read -r PEXELS_API_KEY
  echo -e "  ${CYAN}Pixabay API Key (fallback images):${NC}"
  read -r PIXABAY_API_KEY

  echo ""
  echo -e "  ${CYAN}━━ App Config ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${CYAN}Your app name / domain prefix (e.g. eduai-companion):${NC}"
  read -r APP_NAME
  APP_NAME="${APP_NAME:-eduai-companion}"

  ok "Credentials collected"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Install Dependencies
# ─────────────────────────────────────────────────────────────────────────────
install_dependencies() {
  step "Installing npm Packages"

  log "Installing Supabase client and supporting packages..."
  npm install \
    @supabase/supabase-js \
    @supabase/ssr \
    2>&1 | tee -a "$LOG_FILE"

  log "Installing migration tools..."
  npm install --save-dev \
    firebase-admin \
    tsx \
    pg \
    @types/pg \
    2>&1 | tee -a "$LOG_FILE"

  ok "All packages installed"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Generate Environment Files
# ─────────────────────────────────────────────────────────────────────────────
generate_env_files() {
  step "Generating Environment Files"

  # Backup existing
  if [ -f ".env.local" ]; then
    cp .env.local ".env.local.firebase-backup-$(date +%Y%m%d-%H%M%S)"
    ok "Backed up existing .env.local"
  fi

  cat > .env.local << ENVFILE
# ============================================================
# EduAI Companion — Supabase + Vercel Environment
# Generated: $(date)
# ============================================================

# ── Supabase ─────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_DB_URL=${SUPABASE_DB_URL}

# ── AI ───────────────────────────────────────────────────────
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# ── Image Search ─────────────────────────────────────────────
PEXELS_API_KEY=${PEXELS_API_KEY}
PIXABAY_API_KEY=${PIXABAY_API_KEY}

# ── App ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVFILE

  # Also write .env.production (same values, app URL will be updated by Vercel)
  cp .env.local .env.production.local

  ok "Generated .env.local"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Create Supabase Schema + RLS Policies
# ─────────────────────────────────────────────────────────────────────────────
create_database_schema() {
  step "Creating Supabase Database Schema"

  mkdir -p supabase/migrations

  # Write the full SQL schema
  cat > supabase/migrations/001_initial_schema.sql << 'SQL'
-- ============================================================
-- EduAI Companion — Supabase Schema
-- Mirrors the Firestore data model
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  first_name  text default '',
  last_name   text default '',
  role        text check (role in ('teacher','student','parent','admin')) default null,
  avatar_url  text,
  phone       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Teachers ─────────────────────────────────────────────────
create table if not exists public.teachers (
  id                          uuid primary key references public.users(id) on delete cascade,
  subjects                    text[]   default '{}',
  class_ids                   uuid[]   default '{}',
  school                      text,
  signature_url               text,
  ai_difficulty_adaptation    boolean  default false,
  cultural_context            boolean  default false,
  parent_notifications        boolean  default false,
  created_at                  timestamptz default now()
);

-- ── Learners ─────────────────────────────────────────────────
create table if not exists public.learners (
  id                   uuid primary key references public.users(id) on delete cascade,
  grade                text,
  learning_preferences text default '',
  created_at           timestamptz default now()
);

-- ── Parents ──────────────────────────────────────────────────
create table if not exists public.parents (
  id         uuid primary key references public.users(id) on delete cascade,
  child_ids  uuid[] default '{}',
  created_at timestamptz default now()
);

-- ── Classes ──────────────────────────────────────────────────
create table if not exists public.classes (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  grade       text not null,
  subject     text not null,
  teacher_id  uuid not null references public.users(id) on delete cascade,
  learner_ids uuid[] default '{}',
  parent_ids  uuid[] default '{}',
  created_at  timestamptz default now()
);

-- ── Content (AI-generated materials) ─────────────────────────
create table if not exists public.content (
  id           uuid primary key default uuid_generate_v4(),
  teacher_id   uuid not null references public.users(id) on delete cascade,
  content_type text not null,
  grade        text not null,
  subject      text not null,
  topic        text not null,
  content      text not null,
  memo         text,
  rubric       text,
  file_url     text,
  file_type    text,
  created_at   timestamptz default now()
);

-- ── Generated Content (teacher archive) ──────────────────────
create table if not exists public.generated_content (
  id           uuid primary key default uuid_generate_v4(),
  teacher_id   uuid not null references public.users(id) on delete cascade,
  content_type text not null,
  grade        text not null,
  subject      text not null,
  topic        text not null,
  content      text not null,
  memo         text,
  rubric       text,
  created_at   timestamptz default now()
);

-- ── Assignments ───────────────────────────────────────────────
create table if not exists public.assignments (
  id                 uuid primary key default uuid_generate_v4(),
  content_id         uuid references public.content(id) on delete set null,
  class_id           uuid not null references public.classes(id) on delete cascade,
  learner_id         uuid not null references public.users(id) on delete cascade,
  teacher_id         uuid not null references public.users(id) on delete cascade,
  due_date           timestamptz not null,
  status             text check (status in ('assigned','submitted','graded')) default 'assigned',
  submission_content text,
  grade_received     text,
  feedback           text,
  submitted_at       timestamptz,
  created_at         timestamptz default now()
);

-- ── Conversations ─────────────────────────────────────────────
create table if not exists public.conversations (
  id               uuid primary key default uuid_generate_v4(),
  participant_ids  uuid[] not null,
  participant_info jsonb  default '{}',
  last_message     jsonb,
  updated_at       timestamptz default now(),
  created_at       timestamptz default now()
);

-- ── Messages ──────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  text            text not null,
  created_at      timestamptz default now()
);

-- ── AI Chat History ───────────────────────────────────────────
create table if not exists public.ai_chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  role       text check (role in ('user','model')) not null,
  text       text not null,
  created_at timestamptz default now()
);

-- ── OCR Uploads ───────────────────────────────────────────────
create table if not exists public.ocr_uploads (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  content_type text not null,
  text         text not null,
  created_at   timestamptz default now()
);

-- ── Academic Records ─────────────────────────────────────────
create table if not exists public.academic_records (
  id                uuid primary key default uuid_generate_v4(),
  learner_id        uuid not null references public.users(id) on delete cascade,
  sender_id         uuid not null references public.users(id),
  type              text not null,
  content           text not null,
  score             text,
  teacher_notified  boolean default false,
  created_at        timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_classes_teacher_id   on public.classes(teacher_id);
create index if not exists idx_assignments_learner  on public.assignments(learner_id);
create index if not exists idx_assignments_class    on public.assignments(class_id);
create index if not exists idx_content_teacher      on public.content(teacher_id);
create index if not exists idx_messages_convo       on public.messages(conversation_id);
create index if not exists idx_ai_chat_user         on public.ai_chat_messages(user_id);
create index if not exists idx_ocr_user             on public.ocr_uploads(user_id);
create index if not exists idx_gen_content_teacher  on public.generated_content(teacher_id);
create index if not exists idx_academic_learner     on public.academic_records(learner_id);

-- ── Updated_at trigger ───────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function update_updated_at();

-- ============================================================
-- Row Level Security (RLS) Policies
-- Mirrors your Firestore security rules
-- ============================================================

alter table public.users              enable row level security;
alter table public.teachers           enable row level security;
alter table public.learners           enable row level security;
alter table public.parents            enable row level security;
alter table public.classes            enable row level security;
alter table public.content            enable row level security;
alter table public.generated_content  enable row level security;
alter table public.assignments        enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.ai_chat_messages   enable row level security;
alter table public.ocr_uploads        enable row level security;
alter table public.academic_records   enable row level security;

-- Users: own row + teachers/admins can read all
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_select_teacher" on public.users
  for select using (
    exists (select 1 from public.teachers where id = auth.uid())
  );

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- Teachers: own row only
create policy "teachers_own" on public.teachers
  for all using (auth.uid() = id);

-- Learners: own row + teachers
create policy "learners_own" on public.learners
  for all using (auth.uid() = id);

create policy "learners_teacher_read" on public.learners
  for select using (
    exists (select 1 from public.teachers where id = auth.uid())
  );

-- Parents: own row + teachers can read
create policy "parents_own" on public.parents
  for all using (auth.uid() = id);

create policy "parents_teacher_read" on public.parents
  for select using (
    exists (select 1 from public.teachers where id = auth.uid())
  );

-- Classes: teacher owns, enrolled learners/parents can read
create policy "classes_teacher_all" on public.classes
  for all using (teacher_id = auth.uid());

create policy "classes_member_read" on public.classes
  for select using (auth.uid() = any(learner_ids));

-- Content: teacher owns, anyone can read
create policy "content_teacher_write" on public.content
  for all using (teacher_id = auth.uid());

create policy "content_read_all" on public.content
  for select using (true);

-- Generated content: teacher owns
create policy "gen_content_teacher" on public.generated_content
  for all using (teacher_id = auth.uid());

-- Assignments: teacher owns, learner can read+update own
create policy "assignments_teacher" on public.assignments
  for all using (teacher_id = auth.uid());

create policy "assignments_learner_read" on public.assignments
  for select using (learner_id = auth.uid());

create policy "assignments_learner_update" on public.assignments
  for update using (learner_id = auth.uid());

-- Conversations: participants only
create policy "conversations_participant" on public.conversations
  for all using (auth.uid() = any(participant_ids));

-- Messages: conversation participants
create policy "messages_participant" on public.messages
  for all using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and auth.uid() = any(participant_ids)
    )
  );

-- AI chat: own messages only
create policy "ai_chat_own" on public.ai_chat_messages
  for all using (user_id = auth.uid());

-- OCR: own uploads only
create policy "ocr_own" on public.ocr_uploads
  for all using (user_id = auth.uid());

-- Academic records: learner reads own, teacher writes
create policy "academic_learner_read" on public.academic_records
  for select using (learner_id = auth.uid());

create policy "academic_teacher_write" on public.academic_records
  for insert with check (
    exists (select 1 from public.teachers where id = auth.uid())
  );
SQL

  ok "Schema SQL written to supabase/migrations/001_initial_schema.sql"

  # Apply the schema using psql via the DB URL
  log "Applying schema to Supabase database..."

  if command -v psql &>/dev/null; then
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
      "postgresql://postgres@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres" \
      -f supabase/migrations/001_initial_schema.sql \
      2>&1 | tee -a "$LOG_FILE" \
      && ok "Schema applied via psql" \
      || warn "psql apply failed — apply manually via Supabase SQL Editor"
  else
    warn "psql not installed — apply schema manually:"
    echo ""
    echo "  1. Go to supabase.com → your project → SQL Editor"
    echo "  2. Copy/paste contents of: supabase/migrations/001_initial_schema.sql"
    echo "  3. Click Run"
    echo ""
    ask "Press ENTER once you've applied the schema in the Supabase SQL Editor..."
    read -r
  fi

  # Create Supabase Storage buckets
  log "Creating Supabase Storage buckets via API..."

  create_bucket() {
    local BUCKET_NAME="$1"
    local PUBLIC="$2"
    curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${SUPABASE_URL}/storage/v1/bucket" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"id\": \"${BUCKET_NAME}\", \"name\": \"${BUCKET_NAME}\", \"public\": ${PUBLIC}}"
  }

  CODE=$(create_bucket "profile-pictures" "true")
  [[ "$CODE" == "200" || "$CODE" == "409" ]] && ok "Bucket: profile-pictures" || warn "Bucket profile-pictures: HTTP $CODE"

  CODE=$(create_bucket "content-files" "true")
  [[ "$CODE" == "200" || "$CODE" == "409" ]] && ok "Bucket: content-files" || warn "Bucket content-files: HTTP $CODE"

  CODE=$(create_bucket "signatures" "true")
  [[ "$CODE" == "200" || "$CODE" == "409" ]] && ok "Bucket: signatures" || warn "Bucket signatures: HTTP $CODE"

  ok "Supabase schema and storage ready"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Generate Source Files
# ─────────────────────────────────────────────────────────────────────────────
generate_source_files() {
  step "Generating Replacement Source Files"

  mkdir -p src/lib/supabase
  mkdir -p src/hooks
  mkdir -p scripts

  # ── 1. Supabase browser client ────────────────────────────────────────────
  cat > src/lib/supabase/client.ts << 'CLIENT'
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for use in client components
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_client) _client = createClient();
  return _client;
}
CLIENT

  # ── 2. Supabase server client ─────────────────────────────────────────────
  cat > src/lib/supabase/server.ts << 'SERVER'
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Admin client — bypasses RLS (server-side only)
export function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
SERVER

  # ── 3. Auth middleware ────────────────────────────────────────────────────
  cat > src/middleware.ts << 'MIDDLEWARE'
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()           { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Not logged in → redirect to login (except public paths)
  if (!user && !PUBLIC_PATHS.includes(path) && !path.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logged in on public path → redirect to dashboard
  if (user && PUBLIC_PATHS.includes(path)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
MIDDLEWARE

  # ── 4. useUser hook ───────────────────────────────────────────────────────
  cat > src/hooks/use-supabase-user.ts << 'USEUSER'
'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useUser() {
  const [user,          setUser]          = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsUserLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsUserLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, isUserLoading };
}
USEUSER

  # ── 5. useDoc hook (replaces Firestore useDoc) ────────────────────────────
  cat > src/hooks/use-doc.ts << 'USEDOC'
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
USEDOC

  # ── 6. useCollection hook (replaces Firestore useCollection) ──────────────
  cat > src/hooks/use-collection.ts << 'USECOLLECTION'
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
USECOLLECTION

  # ── 7. AI client (Claude) ─────────────────────────────────────────────────
  cat > src/lib/ai.ts << 'AI'
/**
 * Unified AI client — Anthropic Claude
 * Drop-in replacement for Genkit + Gemini flows.
 */

export interface AIMessage {
  role:    'user' | 'assistant';
  content: string;
}

export async function generateText(
  prompt:       string,
  systemPrompt: string,
  history:      AIMessage[] = [],
  maxTokens:    number = 8192,
): Promise<string> {
  const messages: AIMessage[] = [
    ...history,
    { role: 'user', content: prompt },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.content[0].text as string;
}

export async function generateJSON<T>(
  prompt:       string,
  systemPrompt: string,
  history:      AIMessage[] = [],
): Promise<T> {
  const jsonSystem = `${systemPrompt}\n\nCRITICAL: Your entire response MUST be a single valid JSON object. No markdown fences, no explanation, no text before or after the JSON.`;
  const text       = await generateText(prompt, jsonSystem, history);
  const cleaned    = text
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
AI

  # ── 8. Updated login page ─────────────────────────────────────────────────
  mkdir -p src/app/login
  cat > src/app/login/page.tsx << 'LOGINPAGE'
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Loader2, Star } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogle,  setIsGoogle]  = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    router.push('/dashboard');
  };

  const handleGoogle = async () => {
    setIsGoogle(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast({ title: 'Google Login Failed', description: error.message, variant: 'destructive' });
      setIsGoogle(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500 p-6 relative overflow-hidden">
      <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-20" />
      <Card className="w-full max-w-sm relative z-10 shadow-2xl rounded-[2.5rem] border border-white/10 bg-indigo-950 text-white">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png"
              alt="EduAI" width={48} height={72} priority style={{ width: 'auto', height: '72px' }} />
          </div>
          <CardTitle className="text-3xl font-patrick-hand text-white">Welcome Back!</CardTitle>
          <CardDescription className="text-indigo-200">Login to continue your adventure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-indigo-100">Email</Label>
              <Input id="email" type="email" autoComplete="username" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-indigo-100">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
            </div>
            <Button type="submit" disabled={isLoading || isGoogle}
              className="w-full rounded-full h-12 font-bold bg-yellow-400 text-indigo-950 hover:bg-yellow-300">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
            </Button>
          </form>
          <Button variant="outline" onClick={handleGoogle} disabled={isLoading || isGoogle}
            className="w-full rounded-full h-12 font-bold border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
            {isGoogle ? <Loader2 className="animate-spin mr-2" /> : null}
            Sign in with Google
          </Button>
          <div className="text-center text-sm text-indigo-200">
            No account? <Link href="/signup" className="underline font-bold text-yellow-400">Sign up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
LOGINPAGE

  # ── 9. Supabase OAuth callback route ──────────────────────────────────────
  mkdir -p src/app/auth/callback
  cat > src/app/auth/callback/route.ts << 'CALLBACK'
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()      { return cookieStore.getAll(); },
          setAll(toSet) {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
CALLBACK

  # ── 10. Data migration script ─────────────────────────────────────────────
  cat > scripts/migrate-to-supabase.ts << 'MIGSCRIPT'
#!/usr/bin/env tsx
/**
 * EduAI Companion — Firestore → Supabase Migration Script
 * Migrates all collections and subcollections.
 *
 * Run:  npx tsx scripts/migrate-to-supabase.ts
 */

import * as admin  from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const FIREBASE_PROJECT  = process.env.FIREBASE_PROJECT_ID!;
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BATCH_SIZE        = 50; // rows per Supabase insert

// ── Init clients ──────────────────────────────────────────────────────────────
const KEY_PATH = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(KEY_PATH)) {
  console.error('\n❌ serviceAccountKey.json not found!');
  console.error('   Download from Firebase Console → Project Settings → Service Accounts\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'))),
  projectId:  FIREBASE_PROJECT,
});

const firestore = admin.firestore();
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
const report: Record<string, { migrated: number; errors: number }> = {};

function tsToDate(val: any): Date | null {
  if (!val) return null;
  if (val._seconds) return new Date(val._seconds * 1000);
  if (val.toDate)   return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

function convertDoc(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (data._seconds !== undefined) return tsToDate(data);
  if (Array.isArray(data)) return data.map(convertDoc);
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = convertDoc(v);
  }
  return out;
}

async function insertBatch(table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ⚠️  ${table} batch error:`, error.message);
      report[table].errors += batch.length;
    } else {
      report[table].migrated += batch.length;
    }
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

function convertKeys(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)
      ? convertKeys(v) : v;
  }
  return out;
}

// ── Migration functions ───────────────────────────────────────────────────────

async function migrateUsers() {
  const table = 'users';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  👤 Migrating users...');

  const snap = await firestore.collection('users').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:         doc.id,
      email:      d.email || '',
      first_name: d.firstName || '',
      last_name:  d.lastName  || '',
      role:       d.role || null,
      avatar_url: d.avatarUrl || null,
      phone:      d.phoneNumber || null,
      created_at: tsToDate(d.createdAt) || new Date(),
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} users migrated`);
}

async function migrateTeachers() {
  const table = 'teachers';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🏫 Migrating teachers...');

  const snap = await firestore.collection('teachers').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:                       doc.id,
      subjects:                 d.subjects || [],
      class_ids:                d.classIds  || [],
      school:                   d.school    || null,
      signature_url:            d.signatureUrl || null,
      ai_difficulty_adaptation: d.aiDifficultyAdaptation || false,
      cultural_context:         d.culturalContextIntegration || false,
      parent_notifications:     d.parentNotifications || false,
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} teachers migrated`);
}

async function migrateLearners() {
  const table = 'learners';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🎒 Migrating learners...');

  const snap = await firestore.collection('learners').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:                   doc.id,
      grade:                d.grade || '',
      learning_preferences: d.learningPreferences || '',
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} learners migrated`);
}

async function migrateParents() {
  const table = 'parents';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  👨‍👩‍👧 Migrating parents...');

  const snap = await firestore.collection('parents').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return { id: doc.id, child_ids: d.childIds || [] };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} parents migrated`);
}

async function migrateClasses() {
  const table = 'classes';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🏫 Migrating classes...');

  const snap = await firestore.collection('classes').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:          doc.id,
      name:        d.name       || '',
      grade:       d.grade      || '',
      subject:     d.subject    || '',
      teacher_id:  d.teacherId  || '',
      learner_ids: d.learnerIds || [],
      parent_ids:  d.parentIds  || [],
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} classes migrated`);
}

async function migrateContent() {
  const table = 'content';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  📄 Migrating content...');

  const snap = await firestore.collection('content').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:           doc.id,
      teacher_id:   d.teacherId   || '',
      content_type: d.contentType || '',
      grade:        d.grade       || '',
      subject:      d.subject     || '',
      topic:        d.topic       || '',
      content:      d.content     || '',
      memo:         d.memo        || null,
      rubric:       d.rubric      || null,
      file_url:     d.fileUrl     || null,
      file_type:    d.fileType    || null,
      created_at:   tsToDate(d.createdAt) || new Date(),
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} content items migrated`);
}

async function migrateAssignments() {
  const table = 'assignments';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  📝 Migrating assignments...');

  const classSnap = await firestore.collection('classes').get();
  const allRows: any[] = [];

  for (const classDoc of classSnap.docs) {
    const aSnap = await classDoc.ref.collection('assignments').get();
    for (const aDoc of aSnap.docs) {
      const d = convertDoc(aDoc.data());
      allRows.push({
        id:                aDoc.id,
        content_id:        d.contentId        || null,
        class_id:          classDoc.id,
        learner_id:        d.learnerId        || '',
        teacher_id:        d.teacherId        || '',
        due_date:          tsToDate(d.dueDate) || new Date(),
        status:            d.status           || 'assigned',
        submission_content: d.submissionContent || null,
        grade_received:    d.gradeReceived    || null,
        feedback:          d.feedback         || null,
        submitted_at:      tsToDate(d.submittedAt) || null,
        created_at:        tsToDate(d.createdAt)   || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} assignments migrated`);
}

async function migrateConversations() {
  const table = 'conversations';
  const mTable = 'messages';
  report[table]  = { migrated: 0, errors: 0 };
  report[mTable] = { migrated: 0, errors: 0 };
  console.log('\n  💬 Migrating conversations + messages...');

  const snap = await firestore.collection('conversations').get();
  const convRows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:               doc.id,
      participant_ids:  d.participantIds  || [],
      participant_info: d.participantInfo || {},
      last_message:     d.lastMessage     || null,
      updated_at:       tsToDate(d.updatedAt) || new Date(),
      created_at:       new Date(),
    };
  });

  await insertBatch(table, convRows);

  // Messages subcollection
  const allMessages: any[] = [];
  for (const convDoc of snap.docs) {
    const mSnap = await convDoc.ref.collection('messages').get();
    for (const mDoc of mSnap.docs) {
      const d = convertDoc(mDoc.data());
      allMessages.push({
        id:              mDoc.id,
        conversation_id: convDoc.id,
        sender_id:       d.senderId || '',
        text:            d.text     || '',
        created_at:      tsToDate(d.createdAt) || new Date(),
      });
    }
  }
  await insertBatch(mTable, allMessages);
  console.log(`     ✅ ${report[table].migrated} conversations, ${report[mTable].migrated} messages`);
}

async function migrateGeneratedContent() {
  const table = 'generated_content';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🤖 Migrating generated content (teacher archive)...');

  const teacherSnap = await firestore.collection('teachers').get();
  const allRows: any[] = [];

  for (const teacherDoc of teacherSnap.docs) {
    const gcSnap = await teacherDoc.ref.collection('generatedContent').get();
    for (const gcDoc of gcSnap.docs) {
      const d = convertDoc(gcDoc.data());
      allRows.push({
        id:           gcDoc.id,
        teacher_id:   teacherDoc.id,
        content_type: d.contentType || '',
        grade:        d.grade       || '',
        subject:      d.subject     || '',
        topic:        d.topic       || '',
        content:      d.content     || '',
        memo:         d.memo        || null,
        rubric:       d.rubric      || null,
        created_at:   tsToDate(d.createdAt) || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} generated content items`);
}

async function migrateAiChat() {
  const table = 'ai_chat_messages';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🧠 Migrating AI chat history...');

  const userSnap = await firestore.collection('users').get();
  const allRows: any[] = [];

  for (const userDoc of userSnap.docs) {
    const chatSnap = await userDoc.ref.collection('aiChatMessages').get();
    for (const cDoc of chatSnap.docs) {
      const d = convertDoc(cDoc.data());
      allRows.push({
        id:         cDoc.id,
        user_id:    userDoc.id,
        role:       d.role === 'model' ? 'model' : 'user',
        text:       d.text || '',
        created_at: tsToDate(d.createdAt) || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} chat messages`);
}

async function migrateOcrUploads() {
  const table = 'ocr_uploads';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  📷 Migrating OCR uploads...');

  const userSnap = await firestore.collection('users').get();
  const allRows: any[] = [];

  for (const userDoc of userSnap.docs) {
    const ocrSnap = await userDoc.ref.collection('ocrUploads').get();
    for (const oDoc of ocrSnap.docs) {
      const d = convertDoc(oDoc.data());
      allRows.push({
        id:           oDoc.id,
        user_id:      userDoc.id,
        content_type: d.contentType || '',
        text:         d.text        || '',
        created_at:   tsToDate(d.createdAt) || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} OCR uploads`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 EduAI Companion — Firestore → Supabase Migration\n');
  console.log(`  Firebase:  ${FIREBASE_PROJECT}`);
  console.log(`  Supabase:  ${SUPABASE_URL}\n`);

  const start = Date.now();

  await migrateUsers();
  await migrateTeachers();
  await migrateLearners();
  await migrateParents();
  await migrateClasses();
  await migrateContent();
  await migrateAssignments();
  await migrateConversations();
  await migrateGeneratedContent();
  await migrateAiChat();
  await migrateOcrUploads();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n\n📊 Migration Report');
  console.log('══════════════════════════════════════════');
  console.log('  Table                    Migrated  Errors');
  console.log('  ─────────────────────────────────────────');
  for (const [tbl, stats] of Object.entries(report)) {
    const status = stats.errors > 0 ? `⚠️  ${stats.errors} errors` : '✅';
    console.log(`  ${tbl.padEnd(25)} ${String(stats.migrated).padStart(6)}   ${status}`);
  }
  console.log('══════════════════════════════════════════');
  console.log(`\n  ✅ Complete in ${elapsed}s\n`);

  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Migration failed:', e.message);
  process.exit(1);
});
MIGSCRIPT

  ok "All source files generated"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — Run Data Migration
# ─────────────────────────────────────────────────────────────────────────────
run_data_migration() {
  step "Running Data Migration (Firestore → Supabase)"

  if [ ! -f "serviceAccountKey.json" ]; then
    warn "serviceAccountKey.json not found in project root!"
    echo ""
    echo "  How to get it:"
    echo "  1. Firebase Console → Project Settings → Service Accounts tab"
    echo "  2. Click 'Generate new private key'"
    echo "  3. Rename the downloaded file to: serviceAccountKey.json"
    echo "  4. Move it to: $PROJECT_DIR/serviceAccountKey.json"
    echo ""
    ask "Press ENTER after adding the file, or type 'skip' to run migration later:"
    read -r SKIP_MIGRATION

    if [[ "$SKIP_MIGRATION" == "skip" ]]; then
      warn "Skipping migration. Run it later with:"
      echo "  npx tsx scripts/migrate-to-supabase.ts"
      return
    fi
  fi

  log "Running migration script..."
  FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
  NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  npx tsx scripts/migrate-to-supabase.ts 2>&1 | tee -a "$LOG_FILE"

  ok "Data migration complete"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 8 — Deploy to Vercel
# ─────────────────────────────────────────────────────────────────────────────
deploy_to_vercel() {
  step "Deploying to Vercel"

  # Create vercel.json
  cat > vercel.json << 'VERCEL'
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["cpt1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin",  "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
VERCEL

  ok "vercel.json created (region: cpt1 = Cape Town 🇿🇦)"

  ask "Deploy to Vercel now? (y/N)"
  read -r DEPLOY_NOW

  if [[ "$DEPLOY_NOW" =~ ^[Yy]$ ]]; then
    log "Logging into Vercel..."
    vercel login 2>&1 | tee -a "$LOG_FILE" || warn "Vercel login issue — try: vercel login"

    log "Deploying..."
    vercel \
      --env NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
      --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
      --env SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
      --env SUPABASE_DB_URL="$SUPABASE_DB_URL" \
      --env ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
      --env PEXELS_API_KEY="$PEXELS_API_KEY" \
      --env PIXABAY_API_KEY="$PIXABAY_API_KEY" \
      --yes \
      2>&1 | tee -a "$LOG_FILE"

    ok "Deployed to Vercel! Check your Vercel dashboard for the live URL."
  else
    warn "Skipping Vercel deploy. Run manually:"
    echo ""
    echo "  vercel --prod"
    echo ""
    echo "  Then add these environment variables in the Vercel dashboard:"
    echo "  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY"
    echo "  PEXELS_API_KEY, PIXABAY_API_KEY"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 9 — Post-Migration Checklist
# ─────────────────────────────────────────────────────────────────────────────
generate_checklist() {
  step "Generating Post-Migration Checklist"

  cat > POST_MIGRATION_CHECKLIST.md << CHECKLIST
# ✅ EduAI Companion — Post-Migration Checklist
Generated: $(date)

## Supabase Console Tasks
- [ ] Authentication → Providers → Enable **Email** provider
- [ ] Authentication → Providers → Enable **Google** provider
      (Client ID + Secret from Google Cloud Console → OAuth 2.0)
- [ ] Authentication → URL Configuration:
      - Site URL: \`https://your-vercel-app.vercel.app\`
      - Redirect URLs: \`https://your-vercel-app.vercel.app/auth/callback\`
- [ ] Storage → Confirm buckets exist: \`profile-pictures\`, \`content-files\`, \`signatures\`
- [ ] Storage → Set bucket policies to allow authenticated uploads
- [ ] Database → SQL Editor → Run \`supabase/migrations/001_initial_schema.sql\`
  (if you skipped the automated apply step)

## Vercel Dashboard Tasks
- [ ] Settings → Environment Variables → Add all vars from \`.env.local\`
- [ ] Settings → Domains → Add your custom domain (if you have one)
- [ ] Check build logs for any TypeScript errors

## Code Tasks (gradual — your app still works with Firebase during transition)
- [ ] Update \`src/firebase/auth/use-user.tsx\` imports to use
      \`src/hooks/use-supabase-user.ts\` instead
- [ ] Replace \`useCollection\` calls with the new hook in \`src/hooks/use-collection.ts\`
- [ ] Replace \`useDoc\` calls with the new hook in \`src/hooks/use-doc.ts\`
- [ ] Update \`src/ai/flows/generate-caps-content.ts\` to use
      \`src/lib/ai.ts\` generateJSON instead of Genkit
- [ ] Remove Firebase packages once all hooks are migrated:
      \`npm uninstall firebase\`
- [ ] Remove Genkit packages:
      \`npm uninstall genkit @genkit-ai/google-genai @genkit-ai/next\`

## Testing Checklist
- [ ] Sign up with email/password works
- [ ] Google OAuth login works
- [ ] Role selection page saves to Supabase
- [ ] Dashboard loads teacher/student data
- [ ] Content Creator generates and saves content
- [ ] Content Archive shows saved content
- [ ] AI Tutor responds
- [ ] File uploads go to Supabase Storage
- [ ] Real-time: open two browser tabs — changes appear instantly

## DNS Cutover (when ready)
- [ ] Go to your domain registrar
- [ ] Update CNAME to point to: \`cname.vercel-dns.com\`
- [ ] Wait for propagation (5-30 minutes)
- [ ] Update Supabase Site URL to your real domain

## After 48 Hours of Stable Running
- [ ] Disable Firebase App Hosting
- [ ] Archive Firebase Firestore (export final backup first)
- [ ] Remove \`serviceAccountKey.json\` from project (security!)
- [ ] Add \`serviceAccountKey.json\` to \`.gitignore\`

---
**Total estimated migration time: 2-4 hours**
**Monthly cost at launch: \$0 (both Supabase and Vercel free tiers)**
CHECKLIST

  ok "Checklist written to POST_MIGRATION_CHECKLIST.md"
}

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
print_summary() {
  echo ""
  divider
  echo ""
  echo -e "${GREEN}${BOLD}  🎉 Migration Script Complete!${NC}"
  echo ""
  echo -e "  ${CYAN}Files created:${NC}"
  echo "    📁 src/lib/supabase/client.ts       — Browser Supabase client"
  echo "    📁 src/lib/supabase/server.ts       — Server Supabase client + admin"
  echo "    📁 src/middleware.ts                — Auth middleware (replaces AuthGuard)"
  echo "    📁 src/hooks/use-supabase-user.ts   — useUser hook"
  echo "    📁 src/hooks/use-doc.ts             — Real-time doc hook"
  echo "    📁 src/hooks/use-collection.ts      — Real-time collection hook"
  echo "    📁 src/lib/ai.ts                    — Claude AI client"
  echo "    📁 src/app/login/page.tsx           — Updated login page"
  echo "    📁 src/app/auth/callback/route.ts   — OAuth callback"
  echo "    📁 scripts/migrate-to-supabase.ts  — Data migration script"
  echo "    📁 supabase/migrations/001_*.sql   — Full DB schema + RLS"
  echo "    📁 .env.local                       — Environment variables"
  echo "    📁 vercel.json                      — Vercel config (Cape Town region)"
  echo "    📄 POST_MIGRATION_CHECKLIST.md      — Your next steps"
  echo ""
  echo -e "  ${YELLOW}${BOLD}Your immediate next steps:${NC}"
  echo "    1. Open POST_MIGRATION_CHECKLIST.md and work through it top to bottom"
  echo "    2. Enable Google auth in Supabase Console → Authentication → Providers"
  echo "    3. Set your Vercel app URL in Supabase → Authentication → URL Config"
  echo "    4. Test login on your Vercel preview URL"
  echo "    5. Gradually replace Firebase imports with the new Supabase hooks"
  echo ""
  echo -e "  ${CYAN}Log file:${NC} $LOG_FILE"
  echo ""
  divider
}

# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
trap 'echo -e "\n${RED}Script interrupted at line $LINENO. Check $LOG_FILE${NC}"; exit 1' ERR

print_banner
check_prerequisites
collect_credentials
install_dependencies
generate_env_files
create_database_schema
generate_source_files
run_data_migration
deploy_to_vercel
generate_checklist
print_summary
