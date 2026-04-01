import { cookies } from "next/headers";
import { AuthenticatedLayoutClient } from "./layout-client";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  return (
    <AuthenticatedLayoutClient isDemo={isDemo}>
      {children}
    </AuthenticatedLayoutClient>
  );
}
