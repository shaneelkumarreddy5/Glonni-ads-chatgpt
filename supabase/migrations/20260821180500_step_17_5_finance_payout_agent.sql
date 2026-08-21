-- Step 17.5 Finance & Payout Agent
-- Orchestration/evidence only. No function in this migration can move money.

create table if not exists public.finance_agent_cases (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null unique,
  case_type text not null check (case_type in ('reward_reconciliation','withdrawal_review','payout_exception','settlement_exception')),
  status text not null default 'open' check (status in ('open','review','awaiting_approval','resolved','closed')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  subject_user_id uuid references auth.users(id) on delete set null,
  provider_reference text,
  withdrawal_reference text,
  evidence jsonb not null default '{}'::jsonb,
  recommendation jsonb not null default '{}'::jsonb,
  assigned_specialist text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_agent_approvals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.finance_agent_cases(id) on delete cascade,
  action_type text not null,
  requested_by uuid references auth.users(id) on delete set null,
  decision text not null default 'pending' check (decision in ('pending','approved','rejected','cancelled')),
  decision_reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_agent_activity (
  id bigint generated always as identity primary key,
  case_id uuid references public.finance_agent_cases(id) on delete set null,
  event_type text not null,
  actor_type text not null check (actor_type in ('system','agent','human')),
  actor_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists finance_agent_cases_user_idx on public.finance_agent_cases(subject_user_id);
create index if not exists finance_agent_cases_status_idx on public.finance_agent_cases(status, severity, created_at desc);
create index if not exists finance_agent_cases_provider_idx on public.finance_agent_cases(provider_reference) where provider_reference is not null;
create index if not exists finance_agent_approvals_case_idx on public.finance_agent_approvals(case_id);
create index if not exists finance_agent_activity_case_idx on public.finance_agent_activity(case_id, created_at desc);

alter table public.finance_agent_cases enable row level security;
alter table public.finance_agent_cases force row level security;
alter table public.finance_agent_approvals enable row level security;
alter table public.finance_agent_approvals force row level security;
alter table public.finance_agent_activity enable row level security;
alter table public.finance_agent_activity force row level security;

-- No permissive client policies are created intentionally. Access is through
-- authenticated, privileged server/admin boundaries already used by the app.
-- finance_agent_activity is append-only by application contract; destructive
-- finance history operations must not be exposed to agent tooling.

comment on table public.finance_agent_cases is 'Step 17.5 finance-agent investigation and reconciliation cases; never a source of authority for moving money.';
comment on table public.finance_agent_approvals is 'Human finance approval records. Agent recommendations do not constitute approval.';
comment on table public.finance_agent_activity is 'Append-only audit evidence for Step 17.5 finance operations.';
