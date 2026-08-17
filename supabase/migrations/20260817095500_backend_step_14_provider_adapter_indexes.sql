-- Step 14 advisor follow-up: cover administrator foreign keys used by audits.
create index earning_provider_adapters_created_by_idx
  on private.earning_provider_adapters(created_by);
create index earning_provider_adapters_updated_by_idx
  on private.earning_provider_adapters(updated_by);
