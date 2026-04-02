"use client";

import { useEffect, useState } from "react";

function isDemo(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("companion-demo=true");
}

export function useApiStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const demo = isDemo();

  useEffect(() => {
    if (demo) return;

    let mounted = true;

    async function checkApi() {
      try {
        const res = await fetch("/api/companion/api/files", { method: "HEAD" });
        if (mounted) {
          if (res.ok) {
            setIsOffline(false);
            setLastUpdated(new Date().toLocaleTimeString());
          } else {
            setIsOffline(true);
          }
        }
      } catch {
        if (mounted) {
          setIsOffline(true);
        }
      }
    }

    checkApi();
    const interval = setInterval(checkApi, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [demo]);

  return { isOffline: demo ? false : isOffline, lastUpdated };
}
