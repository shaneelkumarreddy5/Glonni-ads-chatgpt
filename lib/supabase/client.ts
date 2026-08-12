import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  browserClient ??= createBrowserClient(url, publishableKey);
  return browserClient;
}
