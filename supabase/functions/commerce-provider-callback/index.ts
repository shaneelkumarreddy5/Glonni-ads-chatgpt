const providerPattern = /^[a-z0-9][a-z0-9_-]{1,49}$/;
const eventPattern = /^[A-Za-z0-9._:-]{1,200}$/;
const MAX_BODY_BYTES = 48 * 1024;

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { error: "method_not_allowed" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond(503, { error: "service_unavailable" });

  const providerCode = (request.headers.get("x-commerce-provider") ?? "").trim().toLowerCase();
  const domain = (request.headers.get("x-commerce-domain") ?? "").trim().toLowerCase();
  const webhookId = (request.headers.get("webhook-id") ?? "").trim();
  const timestampText = (request.headers.get("webhook-timestamp") ?? "").trim();
  const signature = (request.headers.get("webhook-signature") ?? "").trim();
  const timestamp = Number(timestampText);
  if (!providerPattern.test(providerCode) || !["affiliate", "payout"].includes(domain) ||
      !eventPattern.test(webhookId) || !Number.isSafeInteger(timestamp) || timestamp <= 0 ||
      signature.length < 20 || signature.length > 512) return respond(400, { error: "invalid_callback_headers" });
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) return respond(413, { error: "payload_too_large" });
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return respond(413, { error: "payload_too_large" });
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return respond(400, { error: "invalid_json" });
  } catch { return respond(400, { error: "invalid_json" }); }

  const rpc = domain === "affiliate" ? "ingest_affiliate_callback" : "ingest_payout_callback";
  const result = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpc}`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ p_provider_code: providerCode, p_webhook_id: webhookId,
      p_webhook_timestamp: timestamp, p_webhook_signature: signature, p_raw_body: rawBody }),
  });
  if (!result.ok) {
    const detail = await result.text();
    if (detail.includes("unknown_provider")) return respond(404, { error: "provider_not_found" });
    if (detail.includes("provider_not_active")) return respond(403, { error: "provider_disabled" });
    if (detail.includes("signature") || detail.includes("timestamp")) return respond(401, { error: "callback_verification_failed" });
    return respond(422, { error: "callback_rejected" });
  }
  return respond(202, { accepted: true, result: await result.json() });
});
