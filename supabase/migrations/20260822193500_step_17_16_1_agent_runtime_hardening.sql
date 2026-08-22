-- Step 17.16.1 hardening: cover foreign keys and avoid overlapping SELECT policies.
create index agent_runtime_providers_created_by_idx on public.agent_runtime_providers(created_by);
create index agent_runtime_controls_updated_by_idx on public.agent_runtime_controls(updated_by);
create index agent_runtime_runs_requested_by_idx on public.agent_runtime_runs(requested_by);

drop policy runtime_providers_owner_write on public.agent_runtime_providers;
create policy runtime_providers_owner_insert on public.agent_runtime_providers for insert to authenticated
with check(not live_enabled and created_by=(select auth.uid()) and (select private.is_agent_runtime_admin(true)));
create policy runtime_providers_owner_update on public.agent_runtime_providers for update to authenticated
using((select private.is_agent_runtime_admin(true)))
with check(not live_enabled and created_by=(select auth.uid()) and (select private.is_agent_runtime_admin(true)));

drop policy runtime_controls_owner_write on public.agent_runtime_controls;
create policy runtime_controls_owner_insert on public.agent_runtime_controls for insert to authenticated
with check(mode='simulation' and not live_execution_enabled and updated_by=(select auth.uid()) and (select private.is_agent_runtime_admin(true)));
create policy runtime_controls_owner_update on public.agent_runtime_controls for update to authenticated
using((select private.is_agent_runtime_admin(true)))
with check(mode='simulation' and not live_execution_enabled and updated_by=(select auth.uid()) and (select private.is_agent_runtime_admin(true)));
