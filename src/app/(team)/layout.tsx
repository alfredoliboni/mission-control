import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamLayoutClient } from "./layout-client";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  if (isDemo) {
    redirect("/profile");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use admin client to bypass RLS
  const admin = createAdminClient();

  // Verify this user is actually a stakeholder
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("*")
    .eq("stakeholder_id", user.id);

  if (!links || links.length === 0) {
    redirect("/profile");
  }

  // Determine invite status — if ANY link is accepted, grant access
  const statuses = links.map((l) => l.status || "accepted"); // null = accepted (backward compat)
  const hasAccepted = statuses.includes("accepted");
  const allDeclined = statuses.length > 0 && statuses.every((s) => s === "declined");
  const childNames = links
    .filter((l) => (l.status || "accepted") === "accepted")
    .map((l) => l.child_name)
    .filter(Boolean);

  const inviteStatus = hasAccepted ? "accepted" : allDeclined ? "declined" : "pending";

  // Check if user is also a provider (for nav link)
  const isProvider = user.user_metadata?.role === "provider";

  return (
    <TeamLayoutClient inviteStatus={inviteStatus} childNames={childNames} isProvider={isProvider}>
      {children}
    </TeamLayoutClient>
  );
}
