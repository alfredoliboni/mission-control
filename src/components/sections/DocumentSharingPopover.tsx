"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Popover } from "@base-ui/react/popover";
import { Switch } from "@/components/ui/switch";
import { Lock, LockOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useParsedJourneyPartners } from "@/hooks/useWorkspace";

// ── Types ──────────────────────────────────────────────────────────────
interface StakeholderPermission {
  stakeholder_id: string;
  stakeholder_name: string;
  role: string;
  can_view: boolean;
}

// ── Role emoji map ─────────────────────────────────────────────────────
const ROLE_EMOJI: Record<string, string> = {
  doctor: "\uD83D\uDC68\u200D\u2695\uFE0F",
  therapist: "\uD83E\uDDD1\u200D\u2695\uFE0F",
  school: "\uD83C\uDFEB",
  specialist: "\uD83E\uDE7A",
  employer: "\uD83D\uDCBC",
};

function getEmoji(role: string): string {
  return ROLE_EMOJI[role.toLowerCase()] ?? "\uD83D\uDC64";
}

// ── Component ──────────────────────────────────────────────────────────
interface DocumentSharingPopoverProps {
  docId: string;
  docTitle: string;
}

export function DocumentSharingPopover({ docId, docTitle }: DocumentSharingPopoverProps) {
  const [permissions, setPermissions] = useState<StakeholderPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Read team members from workspace journey-partners.md
  const { data: journeyPartners } = useParsedJourneyPartners();
  const teamMembers = useMemo(
    () => journeyPartners?.activeTeam ?? [],
    [journeyPartners]
  );

  // Fetch existing permissions from Supabase when popover opens,
  // then merge with workspace team members for the display list
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/permissions?document_id=${encodeURIComponent(docId)}`);
      if (res.ok) {
        const data = await res.json();
        const supabasePerms: StakeholderPermission[] = data.permissions ?? [];

        if (teamMembers.length > 0) {
          // Build permissions list from workspace team members,
          // merging can_view status from Supabase document_permissions
          const supabaseByName = new Map(
            supabasePerms.map((p) => [p.stakeholder_name.toLowerCase(), p])
          );

          const merged: StakeholderPermission[] = teamMembers.map((member) => {
            const existing = supabaseByName.get(member.name.toLowerCase());
            return {
              stakeholder_id: existing?.stakeholder_id ?? member.name,
              stakeholder_name: member.name,
              role: member.role || existing?.role || "",
              can_view: existing?.can_view ?? false,
            };
          });

          // Also include any Supabase permissions for members not in workspace
          for (const perm of supabasePerms) {
            const inWorkspace = teamMembers.some(
              (m) => m.name.toLowerCase() === perm.stakeholder_name.toLowerCase()
            );
            if (!inWorkspace) {
              merged.push(perm);
            }
          }

          setPermissions(merged);
        } else {
          // Fallback: use Supabase permissions directly
          setPermissions(supabasePerms);
        }
      } else {
        console.error("Failed to fetch permissions:", res.status);
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    } finally {
      setLoading(false);
    }
  }, [docId, teamMembers]);

  // Reload permissions when popover opens or docId changes
  useEffect(() => {
    if (open) {
      fetchPermissions();
    }
  }, [open, fetchPermissions]);

  const hasAnySharing = permissions.some((p) => p.can_view);

  const handleToggle = useCallback(
    async (stakeholder: StakeholderPermission, checked: boolean) => {
      // Optimistic update
      setPermissions((prev) =>
        prev.map((p) =>
          p.stakeholder_id === stakeholder.stakeholder_id
            ? { ...p, can_view: checked }
            : p
        )
      );
      setToggling(stakeholder.stakeholder_id);

      const shortTitle =
        docTitle.length > 30 ? docTitle.slice(0, 30) + "\u2026" : docTitle;

      try {
        const res = await fetch("/api/documents/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: docId,
            stakeholder_id: stakeholder.stakeholder_id,
            can_view: checked,
          }),
        });

        if (!res.ok) {
          // Revert optimistic update
          setPermissions((prev) =>
            prev.map((p) =>
              p.stakeholder_id === stakeholder.stakeholder_id
                ? { ...p, can_view: !checked }
                : p
            )
          );
          toast("Failed to update sharing permission", { duration: 2500 });
          return;
        }

        toast(
          checked
            ? `${stakeholder.stakeholder_name} can now view "${shortTitle}"`
            : `${stakeholder.stakeholder_name} can no longer view "${shortTitle}"`,
          { duration: 2500 }
        );
      } catch {
        // Revert optimistic update
        setPermissions((prev) =>
          prev.map((p) =>
            p.stakeholder_id === stakeholder.stakeholder_id
              ? { ...p, can_view: !checked }
              : p
          )
        );
        toast("Failed to update sharing permission", { duration: 2500 });
      } finally {
        setToggling(null);
      }
    },
    [docId, docTitle]
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

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-[12px] text-muted-foreground">
                  Loading care team...
                </span>
              </div>
            ) : permissions.length === 0 ? (
              <p className="py-3 text-[12px] text-muted-foreground text-center">
                No care team members yet. Invite someone in Settings.
              </p>
            ) : (
              <div className="space-y-2.5">
                {permissions.map((perm) => (
                  <label
                    key={perm.stakeholder_id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-primary/4 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-[13px] text-foreground">
                      <span>{getEmoji(perm.role)}</span>
                      <span className="font-medium">{perm.stakeholder_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        — can view
                      </span>
                    </span>
                    <Switch
                      checked={perm.can_view}
                      onCheckedChange={(checked) => handleToggle(perm, checked)}
                      disabled={toggling === perm.stakeholder_id}
                    />
                  </label>
                ))}
              </div>
            )}

            <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
              Controls who on your care team can access this document.
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
