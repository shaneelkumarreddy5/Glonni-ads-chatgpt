-- Step 17.5 Finance & Payout Agent hardening
-- Cover user/admin actor foreign keys flagged by Supabase advisors.

create index if not exists finance_agent_activity_actor_idx
  on public.finance_agent_activity(actor_id)
  where actor_id is not null;

create index if not exists finance_agent_approvals_requested_by_idx
  on public.finance_agent_approvals(requested_by)
  where requested_by is not null;

create index if not exists finance_agent_approvals_decided_by_idx
  on public.finance_agent_approvals(decided_by)
  where decided_by is not null;
