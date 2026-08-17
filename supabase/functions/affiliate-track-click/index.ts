const allowedOrigins = new Set([
  "https://glonni-ads-chatgpt.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const merchantPattern = /^[a-z0-9][a-z0-9_-]{1,79}$/;

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin && allowedOrigins.has(origin) ? origin : "https://glonni-ads-chatgpt.vercel.app",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
function respond(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(request), "cache-control": "private, no-store" } });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return respond(request, 405, { error: "method_not_allowed" });
  if (Number(request.headers.get("content-length") ?? "0") > 4096) return respond(request, 413, { error: "payload_too_large" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond(request, 503, { error: "service_configuration_error" });
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return respond(request, 401, { error: "authentication_required" });
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceRoleKey, authorization: `Bearer ${accessToken}` } });
  if (!userResponse.ok) return respond(request, 401, { error: "invalid_session" });
  const user = await userResponse.json() as { id?: unknown };
  if (typeof user.id !== "string") return respond(request, 401, { error: "invalid_session" });

  let body: { merchant_code?: unknown; request_id?: unknown; metadata?: unknown };
  try { body = await request.json(); } catch { return respond(request, 400, { error: "invalid_json" }); }
  if (typeof body.merchant_code !== "string" || !merchantPattern.test(body.merchant_code) ||
      typeof body.request_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.request_id)) {
    return respond(request, 400, { error: "invalid_request" });
  }
  const result = await fetch(`${supabaseUrl}/rest/v1/rpc/create_affiliate_click`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ p_user_id: user.id, p_merchant_code: body.merchant_code, p_request_id: body.request_id,
      p_metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {} }),
  });
  if (!result.ok) {
    const detail = await result.text();
    if (detail.includes("merchant_not_available")) return respond(request, 404, { error: "merchant_not_available" });
    if (detail.includes("active_user_required")) return respond(request, 403, { error: "active_user_required" });
    return respond(request, 422, { error: "click_attribution_rejected" });
  }
  return respond(request, 201, { data: await result.json() });
});
