import { NextResponse } from "next/server";
import { simulateAgentRun } from "../../../../../../lib/agents/runtime/simulator";
import type { RuntimeRequest } from "../../../../../../lib/agents/runtime/types";
import { createSupabaseServerClient } from "../../../../../../lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const [{ data: auth }, { data: assurance }] = await Promise.all([supabase.auth.getUser(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (assurance?.currentLevel !== "aal2") return NextResponse.json({ error: "A verified admin session is required." }, { status: 403 });
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("is_active", true).is("revoked_at", null).in("role", ["owner", "analyst"]).maybeSingle();
  if (!role) return NextResponse.json({ error: "Agent runtime access is not permitted." }, { status: 403 });
  try {
    const body = await request.json() as RuntimeRequest;
    return NextResponse.json(simulateAgentRun(body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Simulation could not be created." }, { status: 400 });
  }
}
