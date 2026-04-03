import { cookies } from "next/headers";
import { StakeholderLayoutClient } from "./layout-client";

export default async function StakeholderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  return (
    <StakeholderLayoutClient isDemo={isDemo}>
      {children}
    </StakeholderLayoutClient>
  );
}
