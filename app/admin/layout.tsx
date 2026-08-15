import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminAccess = {
  authorized: boolean;
  roles: string[];
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) redirect("/admin-access?reason=signin");

  const { data, error } = await supabase.rpc("get_my_admin_access");
  const access = data as AdminAccess | null;
  if (error || !access?.authorized) redirect("/admin-access?reason=forbidden");

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== "aal2") {
    redirect("/admin-access?reason=mfa");
  }

  return children;
}
