-- Explicit deny policies document that private operational tables are service-only.
create policy earning_providers_service_only on private.earning_providers
  for all to public using (false) with check (false);
create policy earning_provider_secrets_service_only on private.earning_provider_secrets
  for all to public using (false) with check (false);
create policy campaign_budget_service_only on private.campaign_budget_entries
  for all to public using (false) with check (false);
create policy provider_postbacks_service_only on private.provider_postback_events
  for all to public using (false) with check (false);

-- Cover every foreign key used by lifecycle joins and deletion checks.
create index earning_providers_created_by_idx on private.earning_providers(created_by);
create index earning_providers_updated_by_idx on private.earning_providers(updated_by);
create index earning_provider_secrets_created_by_idx on private.earning_provider_secrets(created_by);
create index earning_campaigns_published_by_idx on public.earning_campaigns(published_by) where published_by is not null;
create index earning_campaigns_created_by_idx on public.earning_campaigns(created_by);
create index earning_campaigns_updated_by_idx on public.earning_campaigns(updated_by);
create index earning_attempts_reward_user_idx on public.earning_task_attempts(reward_claim_id,user_id) where reward_claim_id is not null;
create index earning_task_history_attempt_user_idx on public.earning_task_status_history(attempt_id,user_id);
create index provider_events_campaign_idx on private.provider_postback_events(campaign_id) where campaign_id is not null;

-- Keep the exposed RPC invoker-rights. Its only action is calling a private, fixed-user
-- SECURITY DEFINER gate that derives the user from auth.uid() and accepts no user id.
create function private.start_earning_task_for_current_user(
  p_campaign_id uuid,p_request_id uuid,p_country_code text,p_platform text,p_context jsonb default '{}'::jsonb
) returns uuid language sql security definer set search_path='pg_catalog'
as $$
  select private.start_earning_task_core((select auth.uid()),p_campaign_id,p_request_id,p_country_code,p_platform,p_context)
$$;

create or replace function public.start_earning_task(
  p_campaign_id uuid,p_request_id uuid,p_country_code text,p_platform text,p_context jsonb default '{}'::jsonb
) returns uuid language sql security invoker set search_path='pg_catalog'
as $$
  select private.start_earning_task_for_current_user(p_campaign_id,p_request_id,p_country_code,p_platform,p_context)
$$;

revoke all on function private.start_earning_task_for_current_user(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function private.start_earning_task_for_current_user(uuid,uuid,text,text,jsonb) to authenticated;
revoke all on function public.start_earning_task(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.start_earning_task(uuid,uuid,text,text,jsonb) to authenticated;
