import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedOrigins = new Set([
  "https://glonni-ads-chatgpt.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

type TokenClaims = { aal?: unknown; session_id?: unknown };
type ListBody = {
  operation: "list";
  search?: unknown;
  severity?: unknown;
  status?: unknown;
  limit?: unknown;
  offset?: unknown;
};
type DecideBody = {
  operation: "decide";
  riskCaseId?: unknown;
  decision?: unknown;
  reason?: unknown;
  requestId?: unknown;
};

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
    headers: { ...jsonHeaders, ...corsHeaders(request), "cache-control": "private, no-store" },
  });
}

function decodeClaims(accessToken: string): TokenClaims | null {
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) return null;
    return JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadPart.length / 4) * 4, "=")),
    ) as TokenClaims;
  } catch {
    return null;
  }
}

function nullableFilter(value: unknown, allowed?: Set<string>) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (allowed && !allowed.has(normalized)) return undefined;
  return normalized;
}

function databaseErrorStatus(detail: string) {
  if (detail.includes("active_admin_required") || detail.includes("risk_decision_role_required")) return 403;
  if (detail.includes("risk_case_not_found")) return 404;
  if (detail.includes("risk_case_already_decided")) return 409;
  if (
    detail.includes("decision_reason_required") || detail.includes("invalid_risk_decision") ||
    detail.includes("invalid_severity_filter") || detail.includes("invalid_status_filter") ||
    detail.includes("search_too_long")
  ) return 400;
  return 500;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return response(request, 405, { error: "method_not_allowed" });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 4096) {
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

  // Verify the token with Supabase Auth before trusting any decoded claim.
  const userResult = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${accessToken}` },
  });
  if (!userResult.ok) return response(request, 401, { error: "invalid_session" });
  const user = await userResult.json() as { id?: unknown };
  if (typeof user.id !== "string" || !uuidPattern.test(user.id)) {
    return response(request, 401, { error: "invalid_session" });
  }

  const claims = decodeClaims(accessToken);
  if (claims?.aal !== "aal2" || typeof claims.session_id !== "string" || !uuidPattern.test(claims.session_id)) {
    return response(request, 403, { error: "mfa_required" });
  }

  let body: ListBody | DecideBody;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4096) {
      return response(request, 413, { error: "payload_too_large" });
    }
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return response(request, 400, { error: "invalid_json" });
    }
    body = parsed as ListBody | DecideBody;
  } catch {
    return response(request, 400, { error: "invalid_json" });
  }

  let rpcName: string;
  let rpcBody: Record<string, unknown>;
  if (body.operation === "list") {
    const search = nullableFilter(body.search);
    const severity = nullableFilter(body.severity, new Set(["low", "medium", "high", "critical"]));
    const status = nullableFilter(body.status, new Set(["open", "under_review", "resolved", "dismissed"]));
    const limit = body.limit === undefined ? 50 : Number(body.limit);
    const offset = body.offset === undefined ? 0 : Number(body.offset);
    if (
      search === undefined || severity === undefined || status === undefined ||
      (search !== null && search.length > 100) || !Number.isInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isInteger(offset) || offset < 0 || offset > 10_000
    ) {
      return response(request, 400, { error: "invalid_list_request" });
    }
    rpcName = "list_admin_risk_cases";
    rpcBody = {
      p_actor_id: user.id,
      p_search: search,
      p_severity: severity,
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    };
  } else if (body.operation === "decide") {
    if (
      typeof body.riskCaseId !== "string" || !uuidPattern.test(body.riskCaseId) ||
      typeof body.requestId !== "string" || !uuidPattern.test(body.requestId) ||
      typeof body.decision !== "string" || !["clear", "monitor", "restrict"].includes(body.decision) ||
      typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.trim().length > 500
    ) {
      return response(request, 400, { error: "invalid_decision_request" });
    }
    rpcName = "decide_admin_risk_case";
    rpcBody = {
      p_actor_id: user.id,
      p_risk_case_id: body.riskCaseId,
      p_decision: body.decision,
      p_reason: body.reason.trim(),
      p_request_id: body.requestId,
    };
  } else {
    return response(request, 400, { error: "invalid_operation" });
  }

  const result = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(rpcBody),
  });

  if (!result.ok) {
    const detail = await result.text();
    const errorStatus = databaseErrorStatus(detail);
    return response(request, errorStatus, {
      error: errorStatus === 404 ? "risk_case_not_found" :
        errorStatus === 409 ? "risk_case_already_decided" :
        errorStatus === 403 ? "admin_permission_required" :
        errorStatus === 400 ? "invalid_request" : "risk_review_failed",
    });
  }

  const data = await result.json();
  return response(request, 200, { data });
});
