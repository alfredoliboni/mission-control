import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthenticatedLayoutClient } from "./layout-client";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if this user is a stakeholder — redirect to Care Team Portal
  const { data: stakeholderLinks } = await supabase
    .from("stakeholder_links")
    .select("id")
    .eq("stakeholder_id", user.id)
    .limit(1);

  if (stakeholderLinks && stakeholderLinks.length > 0) {
    redirect("/team");
  }

  return (
    <AuthenticatedLayoutClient>
      {children}
    </AuthenticatedLayoutClient>
  );
}
