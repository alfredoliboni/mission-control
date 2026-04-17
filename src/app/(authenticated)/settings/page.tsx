"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Users,
  Trash2,
  UserPlus,
  EyeOff,
  ExternalLink,
  Check,
  Pencil,
  X,
  Heart,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useFamily } from "@/hooks/useActiveAgent";
import { useAppStore } from "@/store/appStore";
import { useTeamMembers } from "@/hooks/useTeamMembers";

// ── Types ────────────────────────────────────────────────────────────────

interface ParentInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  preferredLanguage: string;
  preferredContact: string;
}

interface Partner {
  id: string;
  name: string;
  role: string;
  organization: string;
  email: string;
  phone: string;
  website: string;
  status: "active" | "pending" | "accepted" | "declined" | "revoked";
  lastAccess: string;
  permissions: string[];
  childName?: string;
  childAgentId?: string;
  stakeholderUserId?: string;
}

interface PrivacySettings {
  shareWithProviders: boolean;
  shareWithSchool: boolean;
  anonymizedResearch: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// ── Defaults (overridden by auth data) ──────────────────────────────────

const EMPTY_PARENT: ParentInfo = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  province: "Ontario",
  preferredLanguage: "",
  preferredContact: "Email",
};

const DEFAULT_PRIVACY: PrivacySettings = {
  shareWithProviders: true,
  shareWithSchool: true,
  anonymizedResearch: false,
  emailNotifications: true,
  smsNotifications: false,
};

// ── Components ───────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  isEditing,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="text-[13px] font-medium text-muted-foreground w-32 shrink-0">{label}</span>
      {isEditing ? (
        <Input
          value={value}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          className="h-8 text-[13px] flex-1"
        />
      ) : (
        <span className="text-[13px] text-foreground">{value}</span>
      )}
    </div>
  );
}

function PartnerRow({
  partner,
  onRevoke,
  onRemove,
  onInvite,
  onEdit,
}: {
  partner: Partner;
  onRevoke: () => void;
  onRemove: () => void;
  onInvite?: (partner: Partner) => void;
  onEdit?: (updates: { role: string; organization: string; phone: string; email: string; website: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState(partner.role);
  const [editOrg, setEditOrg] = useState(partner.organization);
  const [editPhone, setEditPhone] = useState(partner.phone);
  const [editEmail, setEditEmail] = useState(partner.email);
  const [editWebsite, setEditWebsite] = useState(partner.website);

  const isUninvited = !partner.email && partner.status === "active";

  const statusColors: Record<Partner["status"], string> = {
    active: "bg-status-success/8 text-status-success",
    accepted: "bg-status-success/8 text-status-success",
    pending: "bg-status-caution/8 text-status-caution",
    declined: "bg-status-blocked/8 text-status-blocked",
    revoked: "bg-status-blocked/8 text-status-blocked",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[13px] font-semibold text-foreground">{partner.name}</h4>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                isUninvited
                  ? "bg-amber-100 text-amber-700"
                  : statusColors[partner.status]
              }`}
            >
              {isUninvited ? "NOT INVITED" : partner.status.toUpperCase()}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {partner.role} · {partner.organization}
            {partner.childName && (
              <span className="text-primary font-medium"> — for {partner.childName}</span>
            )}
          </p>
          {(partner.phone || partner.email) && (
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {partner.phone && <span>{partner.phone}</span>}
              {partner.phone && partner.email && <span> · </span>}
              {partner.email && <span>{partner.email}</span>}
            </p>
          )}
          {partner.lastAccess !== "—" && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Last access: {partner.lastAccess}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {partner.permissions.map((perm) => (
              <span
                key={perm}
                className="text-[10px] font-medium text-muted-foreground border border-border px-1.5 py-0.5 rounded"
              >
                {perm}
              </span>
            ))}
          </div>
          {editing && (
            <div className="space-y-2 mt-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Input value={editRole} onChange={(e) => setEditRole((e.target as HTMLInputElement).value)} placeholder="Role" className="h-7 text-xs flex-1" />
                <Input value={editOrg} onChange={(e) => setEditOrg((e.target as HTMLInputElement).value)} placeholder="Organization" className="h-7 text-xs flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <Input value={editPhone} onChange={(e) => setEditPhone((e.target as HTMLInputElement).value)} placeholder="Phone" className="h-7 text-xs flex-1" />
                <Input value={editEmail} onChange={(e) => setEditEmail((e.target as HTMLInputElement).value)} placeholder="Email" className="h-7 text-xs flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <Input value={editWebsite} onChange={(e) => setEditWebsite((e.target as HTMLInputElement).value)} placeholder="Website (optional)" className="h-7 text-xs flex-1" />
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" className="h-7 text-xs" onClick={() => { onEdit?.({ role: editRole, organization: editOrg, phone: editPhone, email: editEmail, website: editWebsite }); setEditing(false); }}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {/* Edit button — shown for active members */}
          {partner.status === "active" && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5 mr-1" />
              <span className="text-[11px]">Edit</span>
            </Button>
          )}
          {/* Invite button — shown for members added by agent (no email, not invited yet) */}
          {isUninvited && onInvite && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/8 h-8 px-2"
              onClick={() => onInvite(partner)}
            >
              <Mail className="size-3.5 mr-1" />
              <span className="text-[11px]">Invite</span>
            </Button>
          )}
          {partner.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-status-caution hover:text-status-caution hover:bg-status-caution/8 h-8 px-2"
              onClick={onRevoke}
            >
              <EyeOff className="size-3.5 mr-1" />
              <span className="text-[11px]">Revoke</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-status-blocked hover:text-status-blocked hover:bg-status-blocked/8 h-8 px-2"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5 mr-1" />
            <span className="text-[11px]">Remove</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

// ── API helpers ─────────────────────────────────────────────────────────

async function fetchCareTeam(): Promise<Partner[]> {
  const res = await fetch("/api/care-team");
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Failed to fetch care team");
  }
  const data = await res.json();
  // Map stakeholder_links rows to Partner shape
  return (data.stakeholders ?? []).map((s: Record<string, unknown>) => {
    // Map DB status to display status — null/undefined = "active" for backward compat
    const dbStatus = s.status as string | null | undefined;
    let displayStatus: Partner["status"] = "active";
    if (dbStatus === "pending") displayStatus = "pending";
    else if (dbStatus === "accepted") displayStatus = "accepted";
    else if (dbStatus === "declined") displayStatus = "declined";
    else if (dbStatus === "revoked") displayStatus = "revoked";

    return {
      id: s.id as string,
      name: (s.name as string) || "Unknown",
      role: (s.role as string) || "Provider",
      organization: (s.organization as string) || "—",
      email: (s.email as string) || "",
      phone: (s.phone as string) || "",
      website: (s.website as string) || "",
      status: displayStatus,
      lastAccess: (s.last_access as string) || "—",
      permissions: (s.permissions as string[]) || ["View profile"],
      childName: (s.child_name as string) || undefined,
      childAgentId: (s.child_agent_id as string) || undefined,
    };
  });
}

async function inviteCareTeamMember(body: {
  email: string;
  name: string;
  role: string;
  organization?: string;
  child_name?: string;
  child_agent_id?: string;
}): Promise<void> {
  const res = await fetch("/api/care-team/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to invite team member");
  }
}

async function removeCareTeamMember(id: string): Promise<void> {
  const res = await fetch(`/api/care-team/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to remove team member");
  }
}

// ── Main page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const family = useFamily();
  const activeChildIndex = useAppStore((s) => s.activeChildIndex);
  const [parent, setParent] = useState(EMPTY_PARENT);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [parentLoaded, setParentLoaded] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("Provider");
  const [inviteOrg, setInviteOrg] = useState("");
  const [invitingMember, setInvitingMember] = useState<Partner | null>(null);
  const [inviteEmailInput, setInviteEmailInput] = useState("");

  // Multi-child support: default to the currently active child
  const isMultiChild = family.children.length > 1;
  const safeChildIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
    : 0;
  // Child is controlled by TopBar selector (activeChildIndex from Zustand)

  // ── Load parent info from Supabase auth ──
  useEffect(() => {
    if (parentLoaded) return;
    fetch("/api/auth/user")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.user) return;
        const u = data.user;
        const meta = u.user_metadata || {};
        setParent({
          name: meta.full_name || u.email?.split("@")[0] || "",
          email: u.email || "",
          phone: meta.phone || "",
          address: meta.address || "",
          city: meta.city || "",
          postalCode: meta.postal_code || "",
          province: "Ontario",
          preferredLanguage: meta.preferred_language || "",
          preferredContact: meta.preferred_contact || "Email",
        });
        if (meta.privacy) {
          setPrivacy(meta.privacy);
        }
        setParentLoaded(true);
      })
      .catch(() => {});
  }, [parentLoaded]);

  // ── Care Team: active/former from family_team_members (DB hook) ──
  const { data: teamData, isLoading: loadingTeam } = useTeamMembers();

  // ── Pending/declined/revoked: still from stakeholder_links via /api/care-team ──
  const {
    data: invitePartners = [],
    isLoading: loadingInvites,
  } = useQuery({
    queryKey: ["care-team"],
    queryFn: fetchCareTeam,
    staleTime: 30_000,
    retry: 1,
  });

  const loadingPartners = loadingTeam || loadingInvites;

  // ── Invite mutation ──
  const inviteMutation = useMutation({
    mutationFn: inviteCareTeamMember,
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: ["care-team"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("Provider");
      setInviteOrg("");
      // Reset inline invite form
      setInvitingMember(null);
      setInviteEmailInput("");
      // Child selection is handled by TopBar
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send invitation");
    },
  });

  // ── Remove mutation ──
  const removeMutation = useMutation({
    mutationFn: removeCareTeamMember,
    onSuccess: () => {
      toast.success("Team member removed");
      queryClient.invalidateQueries({ queryKey: ["care-team"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove team member");
    },
  });

  const updateParent = (key: keyof ParentInfo, value: string) => {
    setParent((p) => ({ ...p, [key]: value }));
  };

  const updatePrivacy = (key: keyof PrivacySettings, value: boolean) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    fetch("/api/settings/parent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacy: updated }),
    }).catch(() => toast.error("Failed to save privacy settings"));
  };

  // Map TeamMember (DB hook) → Partner display shape
  const mapTeamMember = (m: import("@/lib/supabase/queries/team-members").TeamMember): Partner => ({
    id: m.id,
    name: m.name,
    role: m.role,
    organization: m.organization ?? "—",
    email: m.email ?? "",
    phone: m.phone ?? "",
    website: m.website ?? "",
    status: "active" as Partner["status"],
    lastAccess: "—",
    permissions: Object.keys(m.permissions).length > 0 ? Object.keys(m.permissions) : ["View profile"],
    childName: m.childName ?? undefined,
    childAgentId: undefined,
  });

  // Active team from Supabase — filtered by the TopBar's active child via useTeamMembers() hook
  const activePartners = (teamData?.active ?? []).map(mapTeamMember);
  // Pending/declined/revoked come from stakeholder_links (invite flow)
  // Filter out names already in activePartners to avoid duplicates (agent adds + invite creates both)
  const activeNames = new Set(activePartners.map((p) => p.name.toLowerCase()));
  const pendingPartners = invitePartners.filter((p) => p.status === "pending" && !activeNames.has(p.name.toLowerCase()));
  const declinedPartners = invitePartners.filter((p) => p.status === "declined" && !activeNames.has(p.name.toLowerCase()));
  const revokedPartners = invitePartners.filter((p) => p.status === "revoked");

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground flex items-center gap-2">
          ⚙️ Settings
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage your account, care team access, and privacy preferences.
        </p>
      </div>

      {/* ── Parent/Guardian Info ── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            Parent / Guardian
          </h2>
          {editingParent ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setEditingParent(false)}
              >
                <X className="size-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/settings/parent", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: parent.name,
                        phone: parent.phone,
                        address: parent.address,
                        city: parent.city,
                        postalCode: parent.postalCode,
                        province: parent.province,
                        language: parent.preferredLanguage,
                        preferredContact: parent.preferredContact,
                      }),
                    });
                    if (res.ok) {
                      toast.success("Settings saved");
                    }
                  } catch {
                    toast.error("Failed to save settings");
                  }
                  setEditingParent(false);
                }}
              >
                <Check className="size-3.5 mr-1" />
                Save
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setEditingParent(true)}
            >
              <Pencil className="size-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <div className="px-5 py-2 divide-y divide-border">
          <InfoRow icon={User} label="Full Name" value={parent.name} isEditing={editingParent} onChange={(v) => updateParent("name", v)} />
          <InfoRow icon={Mail} label="Email" value={parent.email} isEditing={editingParent} onChange={(v) => updateParent("email", v)} />
          <InfoRow icon={Phone} label="Phone" value={parent.phone} isEditing={editingParent} onChange={(v) => updateParent("phone", v)} />
          <InfoRow icon={MapPin} label="Address" value={parent.address} isEditing={editingParent} onChange={(v) => updateParent("address", v)} />
          <InfoRow icon={MapPin} label="City" value={parent.city} isEditing={editingParent} onChange={(v) => updateParent("city", v)} />
          <InfoRow icon={MapPin} label="Postal Code" value={parent.postalCode} isEditing={editingParent} onChange={(v) => updateParent("postalCode", v)} />
          <InfoRow icon={MapPin} label="Province" value={parent.province} isEditing={editingParent} onChange={(v) => updateParent("province", v)} />
          <InfoRow icon={Heart} label="Language" value={parent.preferredLanguage} isEditing={editingParent} onChange={(v) => updateParent("preferredLanguage", v)} />
          <InfoRow icon={Mail} label="Preferred Contact" value={parent.preferredContact} isEditing={editingParent} onChange={(v) => updateParent("preferredContact", v)} />
        </div>
      </div>

      {/* ── Family / Children ── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <Heart className="size-4 text-muted-foreground" />
            Family
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          {family.children.map((child, index) => (
            <div
              key={child.agentId}
              className="flex items-center gap-3 py-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                {child.childName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{child.childName}</p>
                <p className="text-[11px] text-muted-foreground">{child.agentId}</p>
              </div>
              {index === activeChildIndex && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-success/8 text-status-success">
                  Active
                </span>
              )}
            </div>
          ))}
          <div className="pt-2">
            <Link
              href="/onboarding?mode=add-child"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add another child
            </Link>
          </div>
        </div>
      </div>

      {/* ── Journey Partners (Care Team) ── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Care Team Access
            </h2>
            <Badge variant="secondary" className="text-[11px]">
              {activePartners.length} active · {pendingPartners.length} pending{declinedPartners.length > 0 ? ` · ${declinedPartners.length} declined` : ""}
            </Badge>
          </div>
          <p className="text-[12px] text-muted-foreground mt-1">
            Providers must create their own account to be invited. You control what they can see and can revoke access anytime.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Invite */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Provider's email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail((e.target as HTMLInputElement).value)}
                className="h-9 text-[13px] flex-1"
              />
              <Input
                placeholder="Name..."
                value={inviteName}
                onChange={(e) => setInviteName((e.target as HTMLInputElement).value)}
                className="h-9 text-[13px] flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Role (e.g. Therapist)..."
                value={inviteRole}
                onChange={(e) => setInviteRole((e.target as HTMLInputElement).value)}
                className="h-9 text-[13px] flex-1"
              />
              <Input
                placeholder="Organization (optional)..."
                value={inviteOrg}
                onChange={(e) => setInviteOrg((e.target as HTMLInputElement).value)}
                className="h-9 text-[13px] flex-1"
              />
              <Button
                size="sm"
                className="h-9 shrink-0"
                disabled={!inviteEmail || !inviteName || !inviteRole || inviteMutation.isPending}
                onClick={() => {
                  const selectedChild = family.children[activeChildIndex];
                  inviteMutation.mutate({
                    email: inviteEmail,
                    name: inviteName,
                    role: inviteRole,
                    organization: inviteOrg || undefined,
                    ...(isMultiChild && selectedChild
                      ? {
                          child_name: selectedChild.childName,
                          child_agent_id: selectedChild.agentId,
                        }
                      : {}),
                  });
                }}
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5 mr-1" />
                )}
                Invite
              </Button>
            </div>
            {/* Child is controlled by the TopBar selector — no separate filter needed */}
          </div>

          {/* Loading state */}
          {loadingPartners && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-4 mr-2 animate-spin" />
              <span className="text-[13px]">Loading care team...</span>
            </div>
          )}

          {/* Active Team (from workspace) */}
          {activePartners.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active Team</p>
              {activePartners.map((p) => (
                <div key={p.id}>
                  <PartnerRow
                    partner={p}
                    onRevoke={() => removeMutation.mutate(p.id)}
                    onRemove={() => removeMutation.mutate(p.id)}
                    onInvite={(member) => { setInvitingMember(member); setInviteEmailInput(""); }}
                    onEdit={(updates) => {
                      fetch("/api/team-members", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ memberId: p.id, role: updates.role, organization: updates.organization, phone: updates.phone, email: updates.email, website: updates.website }),
                      })
                        .then((r) => {
                          if (r.ok) {
                            toast.success("Member updated");
                            queryClient.invalidateQueries({ queryKey: ["team-members"] });
                          } else {
                            toast.error("Failed to update member");
                          }
                        })
                        .catch(() => toast.error("Failed to update member"));
                    }}
                  />
                  {invitingMember?.id === p.id && (
                    <div className="mt-2 flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                      <Input
                        placeholder="Enter email address..."
                        value={inviteEmailInput}
                        onChange={(e) => setInviteEmailInput((e.target as HTMLInputElement).value)}
                        className="flex-1 h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && inviteEmailInput.trim() && !inviteMutation.isPending) {
                            inviteMutation.mutate({
                              email: inviteEmailInput,
                              name: invitingMember.name,
                              role: invitingMember.role,
                              organization: invitingMember.organization || undefined,
                            });
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 shrink-0"
                        disabled={!inviteEmailInput.trim() || inviteMutation.isPending}
                        onClick={() => {
                          inviteMutation.mutate({
                            email: inviteEmailInput,
                            name: invitingMember.name,
                            role: invitingMember.role,
                            organization: invitingMember.organization || undefined,
                          });
                        }}
                      >
                        {inviteMutation.isPending ? (
                          <Loader2 className="size-3.5 mr-1 animate-spin" />
                        ) : (
                          <Mail className="size-3.5 mr-1" />
                        )}
                        Send Invite
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0"
                        onClick={() => { setInvitingMember(null); setInviteEmailInput(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending Invites (from Supabase) */}
          {pendingPartners.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pending Invites</p>
              {pendingPartners.map((p) => (
                <PartnerRow key={p.id} partner={p} onRevoke={() => removeMutation.mutate(p.id)} onRemove={() => removeMutation.mutate(p.id)} />
              ))}
            </div>
          )}

          {/* Declined */}
          {declinedPartners.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Declined</p>
              {declinedPartners.map((p) => (
                <PartnerRow key={p.id} partner={p} onRevoke={() => removeMutation.mutate(p.id)} onRemove={() => removeMutation.mutate(p.id)} />
              ))}
            </div>
          )}

          {/* Revoked */}
          {revokedPartners.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Revoked</p>
              {revokedPartners.map((p) => (
                <PartnerRow key={p.id} partner={p} onRevoke={() => removeMutation.mutate(p.id)} onRemove={() => removeMutation.mutate(p.id)} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loadingPartners && activePartners.length === 0 && pendingPartners.length === 0 && invitePartners.length === 0 && (
            <div className="text-center py-8">
              <Users className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">No care team members yet. Invite providers above.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Privacy & Data ── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            Privacy & Data
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-0 divide-y divide-border">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Share records with providers</p>
                <p className="text-[12px] text-muted-foreground">Active care team members can view shared records</p>
              </div>
              <Switch
                checked={privacy.shareWithProviders}
                onCheckedChange={(v) => updatePrivacy("shareWithProviders", v)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Share with school</p>
                <p className="text-[12px] text-muted-foreground">IEP and relevant records visible to school staff</p>
              </div>
              <Switch
                checked={privacy.shareWithSchool}
                onCheckedChange={(v) => updatePrivacy("shareWithSchool", v)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Anonymized research</p>
                <p className="text-[12px] text-muted-foreground">Contribute anonymized data to autism research (no identifying info)</p>
              </div>
              <Switch
                checked={privacy.anonymizedResearch}
                onCheckedChange={(v) => updatePrivacy("anonymizedResearch", v)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Email notifications</p>
                <p className="text-[12px] text-muted-foreground">Alerts, reminders, and updates via email</p>
              </div>
              <Switch
                checked={privacy.emailNotifications}
                onCheckedChange={(v) => updatePrivacy("emailNotifications", v)}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">SMS notifications</p>
                <p className="text-[12px] text-muted-foreground">Time-sensitive alerts via text message</p>
              </div>
              <Switch
                checked={privacy.smsNotifications}
                onCheckedChange={(v) => updatePrivacy("smsNotifications", v)}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── About ── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <Heart className="size-4 text-muted-foreground" />
            About
          </h2>
        </div>
        <div className="px-5 py-4 space-y-0 divide-y divide-border">
          <div className="flex justify-between py-2.5">
            <span className="text-[13px] text-muted-foreground">Version</span>
            <span className="text-[13px] text-foreground font-medium">1.0.0-beta</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-[13px] text-muted-foreground">Navigator Agent</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-success/8 text-status-success">
              Connected
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-[13px] text-muted-foreground">Privacy Policy</span>
            <a href="#" className="text-primary hover:underline text-[12px] inline-flex items-center gap-0.5">
              View <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-[13px] text-muted-foreground">Terms of Service</span>
            <a href="#" className="text-primary hover:underline text-[12px] inline-flex items-center gap-0.5">
              View <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-[13px] text-muted-foreground">Support</span>
            <a href="mailto:support@thecompanion.ca" className="text-primary hover:underline text-[12px]">
              support@thecompanion.ca
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
