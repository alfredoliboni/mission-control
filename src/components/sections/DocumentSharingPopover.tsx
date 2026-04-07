"use client";

import { useState, useEffect, useCallback } from "react";
import { Popover } from "@base-ui/react/popover";
import { Switch } from "@/components/ui/switch";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";

// ── Sharing roles ───────────────────────────────────────────────────────
const SHARING_ROLES = [
  { key: "doctor", emoji: "\uD83D\uDC68\u200D\u2695\uFE0F", label: "Doctor", name: "Dr. Park" },
  { key: "school", emoji: "\uD83C\uDFEB", label: "School", name: "School" },
  { key: "therapist", emoji: "\uD83E\uDDD1\u200D\u2695\uFE0F", label: "Therapist", name: "Therapist" },
] as const;

type RoleKey = (typeof SHARING_ROLES)[number]["key"];
type SharingState = Record<RoleKey, boolean>;

const DEFAULT_SHARING: SharingState = {
  doctor: false,
  school: false,
  therapist: false,
};

// ── localStorage helpers ────────────────────────────────────────────────
const STORAGE_PREFIX = "doc_sharing_";

function loadSharing(docId: string): SharingState {
  if (typeof window === "undefined") return DEFAULT_SHARING;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${docId}`);
    if (raw) return { ...DEFAULT_SHARING, ...JSON.parse(raw) };
  } catch {
    // ignore corrupt data
  }
  return DEFAULT_SHARING;
}

function saveSharing(docId: string, state: SharingState) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${docId}`, JSON.stringify(state));
  } catch {
    // storage full — fail silently
  }
}

// ── Component ───────────────────────────────────────────────────────────
interface DocumentSharingPopoverProps {
  docId: string;
  docTitle: string;
}

export function DocumentSharingPopover({ docId, docTitle }: DocumentSharingPopoverProps) {
  const [sharing, setSharing] = useState<SharingState>(DEFAULT_SHARING);
  const [open, setOpen] = useState(false);

  // Load from localStorage on mount / when docId changes
  useEffect(() => {
    setSharing(loadSharing(docId));
  }, [docId]);

  const hasAnySharing = sharing.doctor || sharing.school || sharing.therapist;

  const handleToggle = useCallback(
    (roleKey: RoleKey, checked: boolean) => {
      const role = SHARING_ROLES.find((r) => r.key === roleKey)!;
      const next = { ...sharing, [roleKey]: checked };
      setSharing(next);
      saveSharing(docId, next);

      const shortTitle =
        docTitle.length > 30 ? docTitle.slice(0, 30) + "\u2026" : docTitle;

      toast(
        checked
          ? `${role.name} can now view "${shortTitle}"`
          : `${role.name} can no longer view "${shortTitle}"`,
        { duration: 2500 }
      );
    },
    [sharing, docId, docTitle]
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="p-1.5 rounded-md hover:bg-primary/8 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Share ${docTitle}`}
      >
        {hasAnySharing ? (
          <LockOpen className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={4}>
          <Popover.Popup
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="z-50 w-64 origin-(--transform-origin) rounded-xl border border-border bg-card p-3 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <Popover.Title className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Share with care team
            </Popover.Title>

            <div className="space-y-2.5">
              {SHARING_ROLES.map((role) => (
                <label
                  key={role.key}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-primary/4 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[13px] text-foreground">
                    <span>{role.emoji}</span>
                    <span className="font-medium">{role.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      — can view
                    </span>
                  </span>
                  <Switch
                    checked={sharing[role.key]}
                    onCheckedChange={(checked) => handleToggle(role.key, checked)}
                  />
                </label>
              ))}
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
              Controls who on your care team can access this document.
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
