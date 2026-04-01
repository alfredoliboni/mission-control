"use client";

import { useEffect } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/appStore";

export function AuthenticatedLayoutClient({
  children,
  isDemo,
}: {
  children: React.ReactNode;
  isDemo: boolean;
}) {
  const { setIsDemo } = useAppStore();

  useEffect(() => {
    setIsDemo(isDemo);
  }, [isDemo, setIsDemo]);

  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
