import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedOrigins = new Set([
  "https://glonni-ads-chatgpt.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin && allowedOrigins.has(origin)
      ? origin
      : "https://glonni-ads-chatgpt.vercel.app",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function response(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...corsHeaders(request) },
  });
}

function verifiedSessionId(accessToken: string) {
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadPart.length / 4) * 4, "=")),
    ) as { session_id?: unknown };
    return typeof payload.session_id === "string" && uuidPattern.test(payload.session_id)
      ? payload.session_id
      : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return response(request, 405, { error: "method_not_allowed" });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 2048) {
    return response(request, 413, { error: "payload_too_large" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return response(request, 503, { error: "service_configuration_error" });
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return response(request, 401, { error: "authentication_required" });

  const userResult = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${accessToken}` },
  });
  if (!userResult.ok) return response(request, 401, { error: "invalid_session" });
  const user = await userResult.json() as { id?: unknown };
  if (typeof user.id !== "string" || !uuidPattern.test(user.id)) {
    return response(request, 401, { error: "invalid_session" });
  }

  let body: { installationId?: unknown; requestId?: unknown; platform?: unknown };
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2048) {
      return response(request, 413, { error: "payload_too_large" });
    }
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return response(request, 400, { error: "invalid_json" });
    }
    body = parsed as typeof body;
  } catch {
    return response(request, 400, { error: "invalid_json" });
  }

  const platform = typeof body.platform === "string" ? body.platform : "web";
  if (
    typeof body.installationId !== "string" || !uuidPattern.test(body.installationId) ||
    typeof body.requestId !== "string" || !uuidPattern.test(body.requestId) ||
    !["web", "android", "ios", "unknown"].includes(platform)
  ) {
    return response(request, 400, { error: "invalid_request" });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const networkValue = forwardedFor?.at(-1)?.slice(0, 64) ?? null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;

  const result = await fetch(
    `${supabaseUrl}/rest/v1/rpc/record_authenticated_device_observation`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_user_id: user.id,
        p_auth_session_id: verifiedSessionId(accessToken),
        p_installation_id: body.installationId,
        p_platform: platform,
        p_network_value: networkValue,
        p_user_agent: userAgent,
        p_request_id: body.requestId,
      }),
    },
  );

  if (!result.ok) {
    const detail = await result.text();
    const rateLimited = detail.includes("rate limit exceeded");
    return response(request, rateLimited ? 429 : 500, {
      error: rateLimited ? "rate_limited" : "observation_failed",
    });
  }

  return response(request, 202, { recorded: true });
});
