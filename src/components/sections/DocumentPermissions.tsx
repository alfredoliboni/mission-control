"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAppStore } from "@/store/appStore";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";

interface Stakeholder {
  stakeholder_id: string;
  role: string;
  name: string | null;
  organization: string | null;
}

interface DocumentPermissionsProps {
  documentId: string;
  familyId: string;
  demoSharedCount?: number;
}

const DEMO_STAKEHOLDERS: Stakeholder[] = [
  { stakeholder_id: "demo-1", role: "provider", name: "Pathways OT", organization: "Pathways" },
  { stakeholder_id: "demo-2", role: "therapist", name: "Jessica Park", organization: "SLP Services" },
  { stakeholder_id: "demo-3", role: "school", name: "St. Mary's", organization: "St. Mary's School" },
];

export function DocumentPermissions({
  documentId,
  familyId,
  demoSharedCount = 0,
}: DocumentPermissionsProps) {
  const { user, role } = useAuth();
  const { isDemo } = useAppStore();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const isParent = role === "parent" || isDemo;

  useEffect(() => {
    if (isDemo) {
      setStakeholders(DEMO_STAKEHOLDERS);
      const map: Record<string, boolean> = {};
      DEMO_STAKEHOLDERS.forEach((s, i) => {
        map[s.stakeholder_id] = i < demoSharedCount;
      });
      setPermissions(map);
      setLoading(false);
      return;
    }

    async function load() {
      const supabase = createClient();
      const [{ data: links }, { data: perms }] = await Promise.all([
        supabase
          .from("stakeholder_links")
          .select("stakeholder_id, role, name, organization")
          .eq("family_id", familyId)
          .neq("role", "parent"),
        supabase
          .from("document_permissions")
          .select("stakeholder_id, can_view")
          .eq("document_id", documentId),
      ]);

      const list = links ?? [];
      const map: Record<string, boolean> = {};
      for (const s of list) {
        const p = perms?.find((x) => x.stakeholder_id === s.stakeholder_id);
        map[s.stakeholder_id] = p?.can_view ?? false;
      }

      setStakeholders(list);
      setPermissions(map);
      setLoading(false);
    }

    if (documentId && familyId) load();
  }, [documentId, familyId, isDemo, demoSharedCount]);

  const toggle = useCallback(
    async (stakeholderId: string, canView: boolean) => {
      if (isDemo) {
        setPermissions((prev) => ({ ...prev, [stakeholderId]: canView }));
        return;
      }

      if (!user) return;
      const supabase = createClient();
      const { error } = await supabase.from("document_permissions").upsert(
        {
          document_id: documentId,
          stakeholder_id: stakeholderId,
          can_view: canView,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        },
        { onConflict: "document_id,stakeholder_id" }
      );

      if (!error) {
        setPermissions((prev) => ({ ...prev, [stakeholderId]: canView }));
      }
    },
    [user, documentId, isDemo]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-warm-400 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading permissions…
      </div>
    );
  }

  if (stakeholders.length === 0) {
    return (
      <div className="text-xs text-warm-400 py-2 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />
        No stakeholders linked yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Users className="h-3.5 w-3.5" />
        Who can see this document
      </div>
      <div className="space-y-1">
        {stakeholders.map((s) => (
          <div
            key={s.stakeholder_id}
            className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {s.name || s.role}
              </p>
              {s.organization && (
                <p className="text-xs text-warm-400 truncate">{s.organization}</p>
              )}
            </div>
            <Switch
              checked={permissions[s.stakeholder_id] ?? false}
              onCheckedChange={(checked) => toggle(s.stakeholder_id, checked)}
              disabled={!isParent}
              aria-label={`${permissions[s.stakeholder_id] ? "Revoke" : "Grant"} access for ${s.name || s.role}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Deterministic demo shared count from a document title */
export function getDemoSharedCount(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % (DEMO_STAKEHOLDERS.length + 1);
}

export const DEMO_STAKEHOLDER_TOTAL = DEMO_STAKEHOLDERS.length;

/** Compact badge showing shared count */
export function PermissionBadge({
  shared,
  total,
}: {
  shared: number;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <Badge variant="outline" className="text-[10px] font-normal gap-1">
      <Users className="h-2.5 w-2.5" />
      Shared with {shared} of {total}
    </Badge>
  );
}
