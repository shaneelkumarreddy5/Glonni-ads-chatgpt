-- Webhook timestamps have one-second precision while secret activation timestamps include
-- fractional seconds. Allow the containing second when selecting a rotation key.
do $block$
declare
  v_definition text;
  v_hardened text;
begin
  select pg_get_functiondef('public.ingest_earning_provider_postback(text,text,bigint,text,text)'::regprocedure)
    into v_definition;
  v_hardened := replace(
    v_definition,
    $old$valid_from<=to_timestamp(p_webhook_timestamp)$old$,
    $new$valid_from<=to_timestamp(p_webhook_timestamp)+interval '1 second'$new$
  );
  if v_hardened = v_definition then
    raise exception 'postback secret timestamp expression was not found';
  end if;
  execute v_hardened;
end
$block$;
