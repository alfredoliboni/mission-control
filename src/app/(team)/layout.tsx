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

  // Determine invite status — use worst-case status across all links
  // "pending" or "declined" blocks full access
  const statuses = links.map((l) => l.status || "accepted"); // null = accepted (backward compat)
  const hasPending = statuses.includes("pending");
  const allDeclined = statuses.length > 0 && statuses.every((s) => s === "declined");
  const childNames = links.map((l) => l.child_name).filter(Boolean);

  const inviteStatus = allDeclined ? "declined" : hasPending ? "pending" : "accepted";

  return (
    <TeamLayoutClient inviteStatus={inviteStatus} childNames={childNames}>
      {children}
    </TeamLayoutClient>
  );
}
