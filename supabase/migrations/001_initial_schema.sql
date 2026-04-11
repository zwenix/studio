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
