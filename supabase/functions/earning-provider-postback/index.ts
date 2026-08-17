import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...jsonHeaders, allow: "POST" },
    });
  }

  const providerCode = request.headers.get("x-provider-code")?.trim();
  const webhookId = request.headers.get("webhook-id")?.trim();
  const webhookTimestampValue = request.headers.get("webhook-timestamp")?.trim();
  const webhookSignature = request.headers.get("webhook-signature")?.trim();
  const webhookTimestamp = Number(webhookTimestampValue);

  if (
    !providerCode || !webhookId || !webhookSignature ||
    !webhookTimestampValue || !Number.isSafeInteger(webhookTimestamp)
  ) {
    return new Response(JSON.stringify({ error: "missing_or_invalid_webhook_headers" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 20_480) {
    return new Response(JSON.stringify({ error: "payload_too_large" }), {
      status: 413,
      headers: jsonHeaders,
    });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 20_480) {
    return new Response(JSON.stringify({ error: "payload_too_large" }), {
      status: 413,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "service_configuration_error" }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  const result = await fetch(
    `${supabaseUrl}/rest/v1/rpc/ingest_earning_provider_gateway_postback`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_provider_code: providerCode,
        p_webhook_id: webhookId,
        p_webhook_timestamp: webhookTimestamp,
        p_webhook_signature: webhookSignature,
        p_raw_body: rawBody,
      }),
    },
  );

  return new Response(await result.text(), {
    status: result.status,
    headers: jsonHeaders,
  });
});
