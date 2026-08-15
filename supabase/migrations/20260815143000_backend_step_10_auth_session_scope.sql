-- Step 10 least-privilege Auth correlation.
-- The security ingestion function needs only stable IDs to prove that a JWT
-- session belongs to the supplied user. No Auth profile, network or token
-- columns are exposed to the application service role.

grant select (id) on auth.users to service_role;
grant select (id, user_id) on auth.sessions to service_role;
