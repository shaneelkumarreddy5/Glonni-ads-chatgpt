const allowedOrigins = new Set([
  "https://glonni-ads-chatgpt.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
type TokenClaims = { aal?: unknown; session_id?: unknown };

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
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...corsHeaders(request), "cache-control": "private, no-store" } });
}

function decodeClaims(accessToken: string): TokenClaims | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="))) as TokenClaims;
  } catch { return null; }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return respond(request, 405, { error: "method_not_allowed" });
  if (Number(request.headers.get("content-length") ?? "0") > 2048) return respond(request, 413, { error: "payload_too_large" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond(request, 503, { error: "service_configuration_error" });
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return respond(request, 401, { error: "authentication_required" });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceRoleKey, authorization: `Bearer ${accessToken}` } });
  if (!userResponse.ok) return respond(request, 401, { error: "invalid_session" });
  const user = await userResponse.json() as { id?: unknown };
  const claims = decodeClaims(accessToken);
  if (typeof user.id !== "string") return respond(request, 401, { error: "invalid_session" });
  if (claims?.aal !== "aal2" || typeof claims.session_id !== "string") return respond(request, 403, { error: "mfa_required" });

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return respond(request, 400, { error: "invalid_request" });
  } catch { return respond(request, 400, { error: "invalid_json" }); }

  const result = await fetch(`${supabaseUrl}/rest/v1/rpc/list_admin_commerce_integrations`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ p_actor_id: user.id }),
  });
  if (!result.ok) {
    const detail = await result.text();
    return respond(request, detail.includes("active_admin_required") ? 403 : 500, {
      error: detail.includes("active_admin_required") ? "admin_permission_required" : "commerce_integrations_unavailable",
    });
  }
  return respond(request, 200, { data: await result.json() });
});
