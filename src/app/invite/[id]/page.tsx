"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

type InviteStatus = "loading" | "pending" | "accepted" | "declined" | "not_found" | "error";

interface InviteData {
  id: string;
  role: string;
  stakeholderName: string;
  familyName: string;
  childName: string;
  status: string;
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [pageStatus, setPageStatus] = useState<InviteStatus>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${id}`);
        if (!res.ok) {
          setPageStatus("not_found");
          return;
        }
        const data: InviteData = await res.json();
        setInvite(data);

        if (data.status === "accepted") {
          setPageStatus("accepted");
        } else if (data.status === "declined") {
          setPageStatus("declined");
        } else {
          setPageStatus("pending");
        }
      } catch {
        setPageStatus("error");
      }
    }

    fetchInvite();
  }, [id]);

  async function handleResponse(action: "accepted" | "declined") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invite/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });

      if (!res.ok) {
        throw new Error("Failed to update invitation");
      }

      if (action === "accepted") {
        setPageStatus("accepted");
        // Brief delay so they can see the confirmation, then redirect to login
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setPageStatus("declined");
      }
    } catch {
      setPageStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <span className="text-4xl" aria-hidden="true">&#x1F9ED;</span>
          <h1 className="text-[18px] font-bold text-foreground mt-2 font-heading">
            The Companion
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mt-0.5">
            Care Team Invitation
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Loading */}
          {pageStatus === "loading" && (
            <div className="px-8 py-12 text-center">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-[13px]">Loading invitation...</span>
              </div>
            </div>
          )}

          {/* Not Found */}
          {pageStatus === "not_found" && (
            <div className="px-8 py-12 text-center">
              <div className="text-3xl mb-3">&#x1F50D;</div>
              <h2 className="text-[16px] font-semibold text-foreground mb-2">
                Invitation Not Found
              </h2>
              <p className="text-[13px] text-muted-foreground">
                This invitation link may be invalid or has expired. Please contact the family for a new invitation.
              </p>
            </div>
          )}

          {/* Error */}
          {pageStatus === "error" && (
            <div className="px-8 py-12 text-center">
              <div className="text-3xl mb-3">&#x26A0;&#xFE0F;</div>
              <h2 className="text-[16px] font-semibold text-foreground mb-2">
                Something Went Wrong
              </h2>
              <p className="text-[13px] text-muted-foreground">
                We could not process your request. Please try again or contact support.
              </p>
            </div>
          )}

          {/* Pending — Accept/Decline */}
          {pageStatus === "pending" && invite && (
            <>
              <div className="px-8 pt-8 pb-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/8 mb-4">
                    <span className="text-2xl">&#x1F91D;</span>
                  </div>
                  <h2 className="text-[16px] font-semibold text-foreground mb-2">
                    You&rsquo;re Invited
                  </h2>
                  <p className="text-[14px] text-foreground leading-relaxed">
                    <span className="font-semibold">{invite.familyName}</span> has invited you to join{" "}
                    <span className="font-semibold">{invite.childName}</span>&rsquo;s care team as a{" "}
                    <span className="font-semibold text-primary">{invite.role}</span>.
                  </p>
                </div>

                {/* What you get */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    As a care team member, you can:
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: "\uD83D\uDCC4", text: "Upload and view documents" },
                      { icon: "\uD83D\uDCAC", text: "Communicate with the family" },
                      { icon: "\uD83D\uDC64", text: "Access the child\u2019s profile" },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-2.5">
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="text-[13px] text-foreground">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-8 pb-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleResponse("declined")}
                  disabled={submitting}
                  className="
                    flex-1 h-11 rounded-xl border border-border text-[13px] font-semibold
                    text-muted-foreground hover:text-foreground hover:bg-muted/40
                    transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => handleResponse("accepted")}
                  disabled={submitting}
                  className="
                    flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold
                    hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-sm
                  "
                >
                  {submitting ? "Processing..." : "Accept Invitation"}
                </button>
              </div>
            </>
          )}

          {/* Accepted */}
          {pageStatus === "accepted" && (
            <div className="px-8 py-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#22c55e]/10 mb-4">
                <span className="text-2xl">&#x2705;</span>
              </div>
              <h2 className="text-[16px] font-semibold text-foreground mb-2">
                Invitation Accepted
              </h2>
              <p className="text-[13px] text-muted-foreground mb-4">
                Welcome to the care team! Redirecting you to sign in...
              </p>
              <div className="inline-flex items-center gap-2 text-primary">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-[12px] font-medium">Redirecting to login...</span>
              </div>
            </div>
          )}

          {/* Declined */}
          {pageStatus === "declined" && (
            <div className="px-8 py-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-4">
                <span className="text-2xl">&#x1F44B;</span>
              </div>
              <h2 className="text-[16px] font-semibold text-foreground mb-2">
                Invitation Declined
              </h2>
              <p className="text-[13px] text-muted-foreground">
                You have declined this invitation. If you change your mind, please ask the family to send a new invitation.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          The Companion &mdash; Navigating Ontario&rsquo;s autism services together
        </p>
      </div>
    </div>
  );
}
