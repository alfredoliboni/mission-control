import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DemoPage() {
  const cookieStore = await cookies();
  cookieStore.set("companion-demo", "true", {
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: "lax",
  });
  redirect("/dashboard");
}
