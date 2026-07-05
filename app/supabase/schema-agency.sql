-- ─── Agencies (top-level reseller accounts) ──────────────────────────────────
create table if not exists agencies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  owner_id      uuid not null,              -- references auth.users
  logo_url      text,
  custom_domain text unique,
  brand_color   text default '#000000',
  credits       int not null default 0,
  plan          text not null default 'trial' check (plan in ('trial','starter','pro','enterprise')),
  stripe_customer_id text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists agencies_owner_idx on agencies(owner_id);

-- ─── Agency ↔ Workspace link ──────────────────────────────────────────────────
-- Workspaces already exist; add agency_id FK
alter table workspaces
  add column if not exists agency_id uuid references agencies(id) on delete cascade;

create index if not exists workspaces_agency_idx on workspaces(agency_id);

-- ─── Agency members (staff who can manage workspaces) ────────────────────────
create table if not exists agency_members (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies(id) on delete cascade,
  user_id    uuid not null,                 -- references auth.users
  role       text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique(agency_id, user_id)
);

-- ─── Credit ledger (append-only audit trail) ──────────────────────────────────
create table if not exists credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  delta       int not null,                 -- positive = purchase/grant, negative = spend
  reason      text not null,               -- 'purchase', 'ai_reply', 'campaign_send', 'admin_grant'
  ref_id      text,                        -- stripe payment intent id or message id
  balance     int not null,                -- running balance after this entry
  created_at  timestamptz not null default now()
);

create index if not exists ledger_agency_idx on credit_ledger(agency_id, created_at desc);

-- ─── Stripe webhook events (idempotency) ──────────────────────────────────────
create table if not exists stripe_events (
  id          text primary key,            -- stripe event id
  type        text not null,
  processed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table agencies enable row level security;
alter table agency_members enable row level security;
alter table credit_ledger enable row level security;
alter table stripe_events enable row level security;
