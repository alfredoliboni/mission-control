import { redirect } from "next/navigation";

export default async function DemoPage() {
  // In Next.js 16, cookies can't be set in pages — use a route handler instead
  redirect("/api/demo");
}
