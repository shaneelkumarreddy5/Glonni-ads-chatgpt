-- The invoker-rights public wrapper needs schema USAGE to resolve its single private helper.
-- This does not expose the private schema through PostgREST and grants no table access.
grant usage on schema private to authenticated;
