-- PostgreSQL resolves a mixed CASE expression as text inside PL/pgSQL. Cast it explicitly
-- so verified and rejected webhook events are assigned to the enum column safely.
do $block$
declare
  v_definition text;
  v_hardened text;
begin
  select pg_get_functiondef('public.ingest_earning_provider_postback(text,text,bigint,text,text)'::regprocedure)
    into v_definition;
  v_hardened := replace(
    v_definition,
    $old$case when v_sig_ok then 'verified' else 'rejected' end,$old$,
    $new$(case when v_sig_ok then 'verified' else 'rejected' end)::public.provider_event_processing_status,$new$
  );
  if v_hardened = v_definition then
    raise exception 'postback processing status expression was not found';
  end if;
  execute v_hardened;
end
$block$;
