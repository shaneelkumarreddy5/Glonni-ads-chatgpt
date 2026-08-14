-- Glonni Ads Backend Step 7: secure referral attribution and rewards.
-- Referral codes are public identifiers, never authentication secrets. Attribution,
-- qualification, budgets and reward issuance are server-controlled and auditable.

create type public.referral_program_status as enum ('draft','active','paused','ended','cancelled');
create type public.referral_status as enum ('attributed','qualified','rewarded','rejected','reversed');
create type public.referral_budget_bucket as enum ('available','spent');
create type public.referral_budget_reason as enum ('funded','rewards_issued','rewards_reversed');

create table public.referral_programs (
  id bigint generated always as identity primary key,
  program_id uuid not null default gen_random_uuid() unique,
  code text not null unique check (code ~ '^[A-Z0-9_]{3,40}$'),
  title text not null check (char_length(trim(title)) between 3 and 120),
  status public.referral_program_status not null default 'draft',
  referrer_reward_paise bigint not null check (referrer_reward_paise > 0),
  referred_reward_paise bigint not null default 0 check (referred_reward_paise >= 0),
  total_budget_paise bigint not null check (total_budget_paise > 0),
  per_referrer_daily_cap integer not null default 10 check (per_referrer_daily_cap between 1 and 1000),
  per_referrer_lifetime_cap integer not null default 100 check (per_referrer_lifetime_cap between 1 and 100000),
  qualification_event text not null check (char_length(trim(qualification_event)) between 3 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  terms_version text not null check (char_length(trim(terms_version)) between 1 and 50),
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  check (ends_at > starts_at),
  check (total_budget_paise >= referrer_reward_paise + referred_reward_paise),
  check (per_referrer_daily_cap <= per_referrer_lifetime_cap)
);

create unique index referral_program_one_active_idx
  on public.referral_programs ((status)) where status='active';
create index referral_program_window_idx on public.referral_programs(status,starts_at,ends_at);
create index referral_program_created_by_idx on public.referral_programs(created_by);
create index referral_program_updated_by_idx on public.referral_programs(updated_by);

create table public.user_referral_codes (
  id bigint generated always as identity primary key,
  referral_code_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict unique,
  code text not null unique check (code ~ '^[A-Z0-9]{10}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  check ((active and retired_at is null) or (not active and retired_at is not null))
);
create index user_referral_codes_active_code_idx on public.user_referral_codes(code) where active;

create table public.referrals (
  id bigint generated always as identity primary key,
  referral_id uuid not null default gen_random_uuid() unique,
  program_id bigint not null references public.referral_programs(id),
  referrer_id uuid not null references auth.users(id) on delete restrict,
  referred_user_id uuid not null references auth.users(id) on delete restrict unique,
  referral_code_id bigint not null references public.user_referral_codes(id),
  code_snapshot text not null,
  status public.referral_status not null default 'attributed',
  qualification_event_id text,
  referrer_reward_claim_id bigint references public.reward_claims(id),
  referred_reward_claim_id bigint references public.reward_claims(id),
  attributed_at timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  rejected_at timestamptz,
  reversed_at timestamptz,
  rejection_code text,
  request_id uuid not null unique,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  unique(program_id,qualification_event_id),
  check (referrer_id <> referred_user_id),
  check (code_snapshot ~ '^[A-Z0-9]{10}$')
);
create index referrals_referrer_timeline_idx on public.referrals(referrer_id,attributed_at desc);
create index referrals_referred_timeline_idx on public.referrals(referred_user_id,attributed_at desc);
create index referrals_program_status_idx on public.referrals(program_id,status,attributed_at);
create index referrals_referrer_reward_idx on public.referrals(referrer_reward_claim_id) where referrer_reward_claim_id is not null;
create index referrals_referred_reward_idx on public.referrals(referred_reward_claim_id) where referred_reward_claim_id is not null;

create table public.referral_status_history (
  id bigint generated always as identity primary key,
  transition_id uuid not null default gen_random_uuid() unique,
  referral_id bigint not null references public.referrals(id),
  referrer_id uuid not null references auth.users(id) on delete restrict,
  referred_user_id uuid not null references auth.users(id) on delete restrict,
  previous_status public.referral_status,
  new_status public.referral_status not null,
  reason_code text not null check (char_length(trim(reason_code)) between 3 and 80),
  request_id uuid not null unique,
  actor_type public.audit_actor_type not null,
  actor_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object')
);
create index referral_history_referral_idx on public.referral_status_history(referral_id,occurred_at);
create index referral_history_referrer_idx on public.referral_status_history(referrer_id,occurred_at desc);
create index referral_history_referred_idx on public.referral_status_history(referred_user_id,occurred_at desc);
create index referral_history_actor_idx on public.referral_status_history(actor_id) where actor_id is not null;

create table private.referral_budget_entries (
  id bigint generated always as identity primary key,
  program_id bigint not null references public.referral_programs(id),
  referral_id bigint references public.referrals(id),
  bucket public.referral_budget_bucket not null,
  amount_paise bigint not null check (amount_paise <> 0),
  reason public.referral_budget_reason not null,
  request_id uuid not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object')
);
create index referral_budget_program_bucket_idx on private.referral_budget_entries(program_id,bucket);
create index referral_budget_referral_idx on private.referral_budget_entries(referral_id) where referral_id is not null;
create unique index referral_budget_unique_leg_idx on private.referral_budget_entries(request_id,bucket,reason);

alter table public.referral_programs enable row level security;
alter table public.referral_programs force row level security;
alter table public.user_referral_codes enable row level security;
alter table public.user_referral_codes force row level security;
alter table public.referrals enable row level security;
alter table public.referrals force row level security;
alter table public.referral_status_history enable row level security;
alter table public.referral_status_history force row level security;
alter table private.referral_budget_entries enable row level security;
alter table private.referral_budget_entries force row level security;

revoke all on public.referral_programs,public.user_referral_codes,public.referrals,public.referral_status_history from public,anon,authenticated;
revoke all on private.referral_budget_entries from public,anon,authenticated;
grant select on public.referral_programs,public.user_referral_codes,public.referrals,public.referral_status_history to authenticated;

create policy referral_program_active_read on public.referral_programs for select to authenticated
using (status='active' and starts_at<=statement_timestamp() and ends_at>statement_timestamp());
create policy referral_codes_own_read on public.user_referral_codes for select to authenticated
using ((select auth.uid())=user_id);
create policy referrals_participant_read on public.referrals for select to authenticated
using ((select auth.uid())=referrer_id or (select auth.uid())=referred_user_id);
create policy referral_history_participant_read on public.referral_status_history for select to authenticated
using ((select auth.uid())=referrer_id or (select auth.uid())=referred_user_id);
create policy referral_budget_service_only on private.referral_budget_entries
for all to public using(false) with check(false);

create function private.reject_referral_history_mutation() returns trigger
language plpgsql set search_path='pg_catalog'
as $$ begin raise exception '% is append-only',tg_table_name; end $$;
create trigger referral_history_immutable before update or delete on public.referral_status_history
for each row execute function private.reject_referral_history_mutation();
create trigger referral_budget_immutable before update or delete on private.referral_budget_entries
for each row execute function private.reject_referral_history_mutation();

create function private.protect_referral_program_economics() returns trigger
language plpgsql set search_path='pg_catalog'
as $$
begin
  if old.published_at is not null and (
    new.code is distinct from old.code or
    new.referrer_reward_paise is distinct from old.referrer_reward_paise or
    new.referred_reward_paise is distinct from old.referred_reward_paise or
    new.total_budget_paise is distinct from old.total_budget_paise or
    new.per_referrer_daily_cap is distinct from old.per_referrer_daily_cap or
    new.per_referrer_lifetime_cap is distinct from old.per_referrer_lifetime_cap or
    new.qualification_event is distinct from old.qualification_event or
    new.starts_at is distinct from old.starts_at or
    new.ends_at is distinct from old.ends_at or
    new.terms_version is distinct from old.terms_version
  ) then raise exception 'published referral economics and rules are immutable'; end if;
  new.updated_at:=statement_timestamp();
  return new;
end $$;
create trigger protect_referral_program_economics before update on public.referral_programs
for each row execute function private.protect_referral_program_economics();

create function private.referral_budget_balance(p_program_id bigint,p_bucket public.referral_budget_bucket)
returns bigint language sql stable set search_path='pg_catalog'
as $$ select coalesce(sum(amount_paise),0)::bigint from private.referral_budget_entries where program_id=p_program_id and bucket=p_bucket $$;

create function private.create_referral_program(
  p_code text,p_title text,p_referrer_reward_paise bigint,p_referred_reward_paise bigint,
  p_total_budget_paise bigint,p_daily_cap integer,p_lifetime_cap integer,p_qualification_event text,
  p_starts_at timestamptz,p_ends_at timestamptz,p_terms_version text,p_actor_id uuid,p_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_program public.referral_programs%rowtype;
begin
  if p_request_id is null then raise exception 'request id required'; end if;
  if not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin') and revoked_at is null)
    then raise exception 'admin role required'; end if;
  insert into public.referral_programs(code,title,referrer_reward_paise,referred_reward_paise,total_budget_paise,
    per_referrer_daily_cap,per_referrer_lifetime_cap,qualification_event,starts_at,ends_at,terms_version,created_by,updated_by,metadata)
  values(upper(trim(p_code)),trim(p_title),p_referrer_reward_paise,p_referred_reward_paise,p_total_budget_paise,
    p_daily_cap,p_lifetime_cap,trim(p_qualification_event),p_starts_at,p_ends_at,trim(p_terms_version),p_actor_id,p_actor_id,coalesce(p_metadata,'{}'::jsonb))
  returning * into v_program;
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('admin',p_actor_id,'referral_program.created','referral_program',v_program.program_id::text,p_request_id,
    jsonb_build_object('code',v_program.code,'budget_paise',v_program.total_budget_paise));
  return v_program.program_id;
end $$;

create function private.activate_referral_program(p_program_id uuid,p_actor_id uuid,p_request_id uuid)
returns void language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_program public.referral_programs%rowtype;
begin
  if not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin') and revoked_at is null)
    then raise exception 'admin role required'; end if;
  select * into v_program from public.referral_programs where program_id=p_program_id for update;
  if not found then raise exception 'program not found'; end if;
  if v_program.status<>'draft' then raise exception 'only draft programs can activate'; end if;
  if v_program.ends_at<=statement_timestamp() then raise exception 'program has ended'; end if;
  update public.referral_programs set status='active',published_at=statement_timestamp(),updated_by=p_actor_id where id=v_program.id;
  insert into private.referral_budget_entries(program_id,bucket,amount_paise,reason,request_id)
  values(v_program.id,'available',v_program.total_budget_paise,'funded',p_request_id);
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('admin',p_actor_id,'referral_program.activated','referral_program',v_program.program_id::text,p_request_id,
    jsonb_build_object('status','active'));
end $$;

create function private.get_or_create_referral_code_for_user(p_user_id uuid,p_request_id uuid)
returns text language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_code text; v_try integer:=0;
begin
  if p_user_id is null or p_user_id<>(select auth.uid()) then raise exception 'authenticated user required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id and status='active' and onboarding_completed_at is not null)
    then raise exception 'active onboarded account required'; end if;
  select code into v_code from public.user_referral_codes where user_id=p_user_id and active;
  if found then return v_code; end if;
  loop
    v_try:=v_try+1;
    v_code:=upper(substr(encode(extensions.digest(convert_to(p_user_id::text||gen_random_uuid()::text,'UTF8'),'sha256'),'hex'),1,10));
    begin
      insert into public.user_referral_codes(user_id,code) values(p_user_id,v_code);
      exit;
    exception when unique_violation then
      if v_try>=5 then raise; end if;
    end;
  end loop;
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('user',p_user_id,'referral_code.created','referral_code',v_code,p_request_id,jsonb_build_object('code',v_code));
  return v_code;
end $$;

create function public.get_or_create_referral_code(p_request_id uuid)
returns text language sql security invoker set search_path='pg_catalog'
as $$ select private.get_or_create_referral_code_for_user((select auth.uid()),p_request_id) $$;

create function private.claim_referral_code_for_user(p_user_id uuid,p_code text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_code public.user_referral_codes%rowtype; v_program public.referral_programs%rowtype; v_ref public.referrals%rowtype;
begin
  if p_user_id is null or p_user_id<>(select auth.uid()) then raise exception 'authenticated user required'; end if;
  if p_request_id is null then raise exception 'request id required'; end if;
  if exists(select 1 from public.referrals where request_id=p_request_id) then
    select * into v_ref from public.referrals where request_id=p_request_id;
    return v_ref.referral_id;
  end if;
  if exists(select 1 from public.referrals where referred_user_id=p_user_id) then raise exception 'referral already attributed'; end if;
  select * into v_code from public.user_referral_codes where code=upper(trim(p_code)) and active;
  if not found then raise exception 'invalid referral code'; end if;
  if v_code.user_id=p_user_id then raise exception 'self referral is not allowed'; end if;
  select * into v_program from public.referral_programs
    where status='active' and starts_at<=statement_timestamp() and ends_at>statement_timestamp()
    order by published_at desc limit 1 for share;
  if not found then raise exception 'no active referral program'; end if;
  insert into public.referrals(program_id,referrer_id,referred_user_id,referral_code_id,code_snapshot,request_id)
  values(v_program.id,v_code.user_id,p_user_id,v_code.id,v_code.code,p_request_id) returning * into v_ref;
  insert into public.referral_status_history(referral_id,referrer_id,referred_user_id,previous_status,new_status,reason_code,request_id,actor_type,actor_id)
  values(v_ref.id,v_ref.referrer_id,v_ref.referred_user_id,null,'attributed','CODE_CLAIMED',p_request_id,'user',p_user_id);
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('user',p_user_id,'referral.attributed','referral',v_ref.referral_id::text,p_request_id,
    jsonb_build_object('program_id',v_program.program_id,'referrer_id',v_ref.referrer_id));
  return v_ref.referral_id;
end $$;

create function public.claim_referral_code(p_code text,p_request_id uuid)
returns uuid language sql security invoker set search_path='pg_catalog'
as $$ select private.claim_referral_code_for_user((select auth.uid()),p_code,p_request_id) $$;

create function private.qualify_referral(
  p_referred_user_id uuid,p_qualification_event_id text,p_request_id uuid,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_ref public.referrals%rowtype; v_program public.referral_programs%rowtype;
  v_referrer_claim uuid; v_referred_claim uuid; v_total bigint; v_reward_request uuid;
begin
  if p_request_id is null then raise exception 'request id required'; end if;
  if p_qualification_event_id is null or char_length(trim(p_qualification_event_id)) not between 1 and 200
    then raise exception 'qualification event id required'; end if;
  select * into v_ref from public.referrals where referred_user_id=p_referred_user_id for update;
  if not found then raise exception 'referral not found'; end if;
  if v_ref.status='rewarded' then return v_ref.referral_id; end if;
  if v_ref.status<>'attributed' then raise exception 'referral cannot qualify in status %',v_ref.status; end if;
  select * into v_program from public.referral_programs where id=v_ref.program_id for update;
  if v_program.status<>'active' or v_program.starts_at>statement_timestamp() or v_program.ends_at<=statement_timestamp()
    then raise exception 'referral program is not active'; end if;
  if not exists(select 1 from public.profiles where id=v_ref.referred_user_id and status='active' and onboarding_completed_at is not null)
    then raise exception 'referred account is not eligible'; end if;
  if not exists(select 1 from public.profiles where id=v_ref.referrer_id and status='active' and onboarding_completed_at is not null)
    then raise exception 'referrer account is not eligible'; end if;
  if (select count(*) from public.referrals where referrer_id=v_ref.referrer_id and program_id=v_program.id and status='rewarded')
      >=v_program.per_referrer_lifetime_cap then raise exception 'referrer lifetime cap reached'; end if;
  if (select count(*) from public.referrals where referrer_id=v_ref.referrer_id and program_id=v_program.id and status='rewarded'
      and rewarded_at>=date_trunc('day',statement_timestamp()))>=v_program.per_referrer_daily_cap
    then raise exception 'referrer daily cap reached'; end if;
  v_total:=v_program.referrer_reward_paise+v_program.referred_reward_paise;
  if private.referral_budget_balance(v_program.id,'available')<v_total then raise exception 'referral budget exhausted'; end if;

  update public.referrals set status='qualified',qualification_event_id=trim(p_qualification_event_id),
    qualified_at=statement_timestamp(),updated_at=statement_timestamp(),metadata=metadata||coalesce(p_metadata,'{}'::jsonb)
    where id=v_ref.id;
  insert into public.referral_status_history(referral_id,referrer_id,referred_user_id,previous_status,new_status,reason_code,request_id,actor_type,metadata)
  values(v_ref.id,v_ref.referrer_id,v_ref.referred_user_id,'attributed','qualified','QUALIFICATION_VERIFIED',p_request_id,'system',coalesce(p_metadata,'{}'::jsonb));

  v_reward_request:=gen_random_uuid();
  v_referrer_claim:=private.create_reward_claim(v_ref.referrer_id,'referral','glonni_referral',
    v_ref.referral_id::text||':referrer','Referral reward',v_program.referrer_reward_paise,'pending',
    statement_timestamp(),v_reward_request,jsonb_build_object('referral_id',v_ref.referral_id,'role','referrer'));
  perform private.transition_reward_claim(v_referrer_claim,'available','Referral qualification verified',gen_random_uuid(),'system',null,
    jsonb_build_object('referral_id',v_ref.referral_id));
  if v_program.referred_reward_paise>0 then
    v_referred_claim:=private.create_reward_claim(v_ref.referred_user_id,'referral','glonni_referral',
      v_ref.referral_id::text||':referred','Welcome referral reward',v_program.referred_reward_paise,'pending',
      statement_timestamp(),gen_random_uuid(),jsonb_build_object('referral_id',v_ref.referral_id,'role','referred'));
    perform private.transition_reward_claim(v_referred_claim,'available','Referral qualification verified',gen_random_uuid(),'system',null,
      jsonb_build_object('referral_id',v_ref.referral_id));
  end if;
  update public.referrals set status='rewarded',referrer_reward_claim_id=(select id from public.reward_claims where reward_id=v_referrer_claim),
    referred_reward_claim_id=(select id from public.reward_claims where reward_id=v_referred_claim),
    rewarded_at=statement_timestamp(),updated_at=statement_timestamp() where id=v_ref.id;
  insert into public.referral_status_history(referral_id,referrer_id,referred_user_id,previous_status,new_status,reason_code,request_id,actor_type)
  values(v_ref.id,v_ref.referrer_id,v_ref.referred_user_id,'qualified','rewarded','REWARDS_ISSUED',gen_random_uuid(),'system');
  insert into private.referral_budget_entries(program_id,referral_id,bucket,amount_paise,reason,request_id)
  values(v_program.id,v_ref.id,'available',-v_total,'rewards_issued',p_request_id),
        (v_program.id,v_ref.id,'spent',v_total,'rewards_issued',p_request_id);
  insert into public.audit_events(actor_type,action,resource_type,resource_id,request_id,new_data)
  values('system','referral.rewarded','referral',v_ref.referral_id::text,p_request_id,
    jsonb_build_object('referrer_reward_paise',v_program.referrer_reward_paise,'referred_reward_paise',v_program.referred_reward_paise));
  return v_ref.referral_id;
end $$;

revoke all on function private.reject_referral_history_mutation(),private.protect_referral_program_economics(),
  private.referral_budget_balance(bigint,public.referral_budget_bucket) from public,anon,authenticated;
revoke all on function private.create_referral_program(text,text,bigint,bigint,bigint,integer,integer,text,timestamptz,timestamptz,text,uuid,uuid,jsonb),
  private.activate_referral_program(uuid,uuid,uuid),private.get_or_create_referral_code_for_user(uuid,uuid),
  private.claim_referral_code_for_user(uuid,text,uuid),private.qualify_referral(uuid,text,uuid,jsonb)
from public,anon,authenticated;
revoke all on function public.get_or_create_referral_code(uuid),public.claim_referral_code(text,uuid) from public,anon;
grant execute on function private.get_or_create_referral_code_for_user(uuid,uuid),
  private.claim_referral_code_for_user(uuid,text,uuid) to authenticated;
grant execute on function public.get_or_create_referral_code(uuid),public.claim_referral_code(text,uuid) to authenticated;
grant execute on function private.create_referral_program(text,text,bigint,bigint,bigint,integer,integer,text,timestamptz,timestamptz,text,uuid,uuid,jsonb),
  private.activate_referral_program(uuid,uuid,uuid),private.qualify_referral(uuid,text,uuid,jsonb) to service_role;

comment on function public.get_or_create_referral_code(uuid) is 'Returns the authenticated user''s stable referral code; no user ID is accepted.';
comment on function public.claim_referral_code(text,uuid) is 'Attributes the authenticated user once. Self-referrals and reassignment are rejected.';
