import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamLayoutClient } from "./layout-client";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  if (isDemo) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify this user is actually a stakeholder
  const { data: links } = await supabase
    .from("stakeholder_links")
    .select("*")
    .eq("stakeholder_id", user.id);

  if (!links || links.length === 0) {
    redirect("/dashboard");
  }

  return <TeamLayoutClient>{children}</TeamLayoutClient>;
}
