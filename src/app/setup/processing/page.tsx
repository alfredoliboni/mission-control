"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface StatusData {
  status: "processing" | "ready";
  workspaceCreated?: boolean;
  filesCreated?: boolean;
  fileCount?: number;
  transcribed?: boolean;
  profileReady?: boolean;
  childName?: string;
  agentId?: string;
}

function ProcessingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const agentId = params.get("agent") || "";
  const childName = params.get("child") || "your child";
  const [elapsed, setElapsed] = useState(0);
  const [data, setData] = useState<StatusData | null>(null);

  const fetchStatus = useCallback(async () => {
    setElapsed((e) => e + 5);
    try {
      const res = await fetch(`/api/onboarding/status?agent=${encodeURIComponent(agentId)}`);
      if (res.ok) {
        const result: StatusData = await res.json();
        setData(result);
        if (result.status === "ready") {
          setTimeout(() => router.push("/profile?refresh=1"), 1500);
        }
      }
    } catch {
      // ignore network errors — keep polling
    }
  }, [agentId, router]);

  // Poll for status every 5 seconds
  useEffect(() => {
    if (!agentId || data?.status === "ready") return;

    // Initial fetch immediately
    fetchStatus();

    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [agentId, data?.status, fetchStatus]);

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-5xl">🧭</p>
        <h1 className="text-2xl font-semibold font-heading text-foreground">
          Setting up {childName}&apos;s Navigator
        </h1>
        <p className="text-sm text-warm-400">
          {data?.status === "ready"
            ? "All set! Redirecting..."
            : "This usually takes 1–2 minutes"}
        </p>

        {/* Spinner */}
        {data?.status !== "ready" && (
          <div className="flex justify-center">
            <div
              className="h-8 w-8 rounded-full animate-spin"
              style={{
                border: "3px solid #c96442",
                borderTopColor: "transparent",
              }}
            />
          </div>
        )}

        {/* Progress steps */}
        <div className="text-left bg-white rounded-xl p-6 shadow-sm border border-border space-y-3">
          <Step done={data?.workspaceCreated}>Workspace created</Step>
          <Step done={data?.filesCreated}>
            Files initialized ({data?.fileCount || 0} files)
          </Step>
          <Step done={data?.transcribed}>Audio transcribed</Step>
          <Step done={data?.profileReady} loading={!!data && !data.profileReady}>
            Navigator analyzing your information
          </Step>
        </div>

        {/* Timeout message */}
        {elapsed > 300 && data?.status !== "ready" && (
          <p className="text-xs text-warm-300 mt-4">
            Taking longer than expected. You can close this page and check back later.
          </p>
        )}

        {/* Ready message */}
        {data?.status === "ready" && (
          <p className="text-sm text-green-600 font-medium">
            ✓ Ready! Redirecting to {childName}&apos;s profile...
          </p>
        )}
      </div>
    </div>
  );
}

function Step({
  done,
  loading,
  children,
}: {
  done?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {done ? (
        <span className="text-green-500 text-base">✓</span>
      ) : loading ? (
        <div
          className="h-4 w-4 rounded-full animate-spin flex-shrink-0"
          style={{
            border: "2px solid #c96442",
            borderTopColor: "transparent",
          }}
        />
      ) : (
        <span className="text-warm-200 text-base">○</span>
      )}
      <span
        className={
          done ? "text-foreground" : loading ? "text-foreground" : "text-warm-300"
        }
      >
        {children}
      </span>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
          <div
            className="h-8 w-8 rounded-full animate-spin"
            style={{ border: "3px solid #c96442", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
