import type { SupabaseClient } from "@supabase/supabase-js";

const installationKey = "glonni-device-installation-id";

function installationId() {
  const existing = window.localStorage.getItem(installationKey);
  if (existing) return existing;
  const created = window.crypto.randomUUID();
  window.localStorage.setItem(installationKey, created);
  return created;
}

export async function recordDeviceSecurityObservation(
  supabase: SupabaseClient,
  userId: string,
) {
  const requestKey = `glonni-security-observation-request:${userId}`;
  let requestId = window.sessionStorage.getItem(requestKey);
  if (!requestId) {
    requestId = window.crypto.randomUUID();
    window.sessionStorage.setItem(requestKey, requestId);
  }

  const { error } = await supabase.functions.invoke("record-device-security", {
    body: {
      installationId: installationId(),
      requestId,
      platform: "web",
    },
  });

  return !error;
}
