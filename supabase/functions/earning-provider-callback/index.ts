const providerPattern = /^[a-z0-9][a-z0-9_-]{1,49}$/;
const eventPattern = /^[A-Za-z0-9._:-]{1,200}$/;
const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const MAX_BODY_BYTES = 64 * 1024;

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, "cache-control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond(503, { error: "service_unavailable" });

  const url = new URL(request.url);
  const providerCode = (url.searchParams.get("provider") ?? "").trim().toLowerCase();
  const eventId = (request.headers.get("x-glonni-event-id") ?? "").trim();
  const timestampText = (request.headers.get("x-glonni-timestamp") ?? "").trim();
  const signature = (request.headers.get("x-glonni-signature") ?? "").trim();
  const timestamp = Number(timestampText);

  if (
    !providerPattern.test(providerCode) || !eventPattern.test(eventId) ||
    !Number.isSafeInteger(timestamp) || timestamp <= 0 ||
    signature.length < 20 || signature.length > 512
  ) {
    return respond(400, { error: "invalid_callback_headers" });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return respond(413, { error: "payload_too_large" });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return respond(413, { error: "payload_too_large" });
  }
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond(400, { error: "invalid_json" });
    }
  } catch {
    return respond(400, { error: "invalid_json" });
  }

  const rpcResponse = await fetch(
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
        p_webhook_id: eventId,
        p_webhook_timestamp: timestamp,
        p_webhook_signature: signature,
        p_raw_body: rawBody,
      }),
    },
  );

  if (!rpcResponse.ok) {
    const detail = await rpcResponse.text();
    if (detail.includes("provider_adapter_not_found")) return respond(404, { error: "provider_not_found" });
    if (detail.includes("provider_gateway_disabled")) return respond(403, { error: "provider_disabled" });
    if (detail.includes("signature") || detail.includes("timestamp")) {
      return respond(401, { error: "callback_verification_failed" });
    }
    if (detail.includes("duplicate") || detail.includes("already")) {
      return respond(200, { accepted: true, duplicate: true });
    }
    return respond(422, { error: "callback_rejected" });
  }

  return respond(202, { accepted: true, result: await rpcResponse.json() });
});
