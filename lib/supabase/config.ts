const projectUrlFallback = "https://iyzzmyqkcvgsgaghsqlo.supabase.co";
const publishableKeyFallback = "sb_publishable_aX7jeMM78i0RrUS1aWaWpQ_c_vHP0S0";

export function getSupabasePublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? projectUrlFallback,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      publishableKeyFallback,
  };
}
