-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Workspaces ───────────────────────────────────────────────────────────────
create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  created_at  timestamptz not null default now()
);

-- ─── Workspace AI Configuration ───────────────────────────────────────────────
create table if not exists workspace_ai_configs (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references workspaces(id) on delete cascade,
  system_prompt      text,
  knowledge_summary  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique(workspace_id)
);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
create table if not exists contacts (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references workspaces(id) on delete cascade,
  external_id        text not null,
  channel            text not null check (channel in ('whatsapp','instagram','line','webchat','sms','email')),
  name               text,
  phone              text,
  instagram_handle   text,
  lifecycle_stage    text not null default 'inquiry'
                       check (lifecycle_stage in ('inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique(workspace_id, external_id, channel)
);

create index if not exists contacts_workspace_id_idx on contacts(workspace_id);
create index if not exists contacts_lifecycle_idx on contacts(workspace_id, lifecycle_stage);

-- ─── Messages ─────────────────────────────────────────────────────────────────
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  contact_id    uuid not null references contacts(id) on delete cascade,
  channel       text not null,
  direction     text not null check (direction in ('inbound','outbound')),
  content       text not null,
  ai_generated  boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists messages_contact_id_idx on messages(contact_id);
create index if not exists messages_workspace_created_idx on messages(workspace_id, created_at desc);

-- ─── Campaigns ────────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  status        text not null default 'draft' check (status in ('draft','active','paused','completed')),
  trigger_stage text check (trigger_stage in ('inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip')),
  flow          jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists campaigns_workspace_id_idx on campaigns(workspace_id);

-- ─── Campaign Enrollments ─────────────────────────────────────────────────────
create table if not exists campaign_enrollments (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  contact_id   uuid not null references contacts(id) on delete cascade,
  step_index   int not null default 0,
  status       text not null default 'active' check (status in ('active','completed','exited')),
  enrolled_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  next_run_at  timestamptz,
  unique(campaign_id, contact_id)
);

create index if not exists enrollments_next_run_idx on campaign_enrollments(next_run_at) where status = 'active';

-- ─── Row Level Security ────────────────────────────────────────────────────────
alter table workspaces enable row level security;
alter table workspace_ai_configs enable row level security;
alter table contacts enable row level security;
alter table messages enable row level security;
alter table campaigns enable row level security;
alter table campaign_enrollments enable row level security;

-- Service role bypasses RLS — all app queries use service role key.
-- Add per-user policies here when adding auth.
