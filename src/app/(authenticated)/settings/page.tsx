"use client";

import { useState } from "react";
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
  Download,
  Eye,
  EyeOff,
  Lock,
  ExternalLink,
  Check,
  Pencil,
  X,
  AlertTriangle,
  Heart,
  Loader2,
} from "lucide-react";
import { useFamily } from "@/hooks/useActiveAgent";
import { useAppStore } from "@/store/appStore";

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
  status: "active" | "pending" | "accepted" | "declined" | "revoked";
  lastAccess: string;
  permissions: string[];
  childName?: string;
  childAgentId?: string;
}

interface PrivacySettings {
  shareWithProviders: boolean;
  shareWithSchool: boolean;
  anonymizedResearch: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// ── Demo data ────────────────────────────────────────────────────────────

const DEMO_PARENT: ParentInfo = {
  name: "Maria Santos",
  email: "maria.santos@email.com",
  phone: "(519) 555-0189",
  address: "234 Oxford Street",
  city: "London",
  postalCode: "N6A 1T4",
  province: "Ontario",
  preferredLanguage: "Portuguese",
  preferredContact: "Email",
};

const DEMO_PRIVACY: PrivacySettings = {
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
}: {
  partner: Partner;
  onRevoke: () => void;
  onRemove: () => void;
}) {
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
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${statusColors[partner.status]}`}>
              {partner.status}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {partner.role} · {partner.organization}
            {partner.childName && (
              <span className="text-primary font-medium"> — for {partner.childName}</span>
            )}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{partner.email}</p>
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
        </div>
        <div className="flex gap-1 shrink-0">
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
  const [parent, setParent] = useState(DEMO_PARENT);
  const [privacy, setPrivacy] = useState(DEMO_PRIVACY);
  const [editingParent, setEditingParent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("Provider");
  const [inviteOrg, setInviteOrg] = useState("");

  // Multi-child support: default to the currently active child
  const isMultiChild = family.children.length > 1;
  const safeChildIndex = activeChildIndex >= 0 && activeChildIndex < family.children.length
    ? activeChildIndex
    : 0;
  const [selectedChildIndex, setSelectedChildIndex] = useState(safeChildIndex);

  // ── Care Team: fetch from API ──
  const {
    data: partners = [],
    isLoading: loadingPartners,
  } = useQuery({
    queryKey: ["care-team"],
    queryFn: fetchCareTeam,
    staleTime: 30_000,
    retry: 1,
  });

  // ── Invite mutation ──
  const inviteMutation = useMutation({
    mutationFn: inviteCareTeamMember,
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: ["care-team"] });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("Provider");
      setInviteOrg("");
      setSelectedChildIndex(safeChildIndex);
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

  const activePartners = partners.filter((p) => p.status === "active" || p.status === "accepted");
  const pendingPartners = partners.filter((p) => p.status === "pending");
  const declinedPartners = partners.filter((p) => p.status === "declined");
  const revokedPartners = partners.filter((p) => p.status === "revoked");

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
                onClick={() => setEditingParent(false)}
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
                  const selectedChild = family.children[selectedChildIndex];
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
            {/* Child selector — only shown for multi-child families */}
            {isMultiChild && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[12px] font-medium text-muted-foreground shrink-0">
                  For which child?
                </span>
                <div className="flex gap-2">
                  {family.children.map((child, index) => (
                    <button
                      key={child.agentId}
                      type="button"
                      onClick={() => setSelectedChildIndex(index)}
                      className={`
                        text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors
                        ${
                          selectedChildIndex === index
                            ? "border-primary bg-primary/8 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }
                      `}
                    >
                      {child.childName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loading state */}
          {loadingPartners && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-4 mr-2 animate-spin" />
              <span className="text-[13px]">Loading care team...</span>
            </div>
          )}

          {/* Active */}
          {activePartners.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active</p>
              {activePartners.map((p) => (
                <PartnerRow key={p.id} partner={p} onRevoke={() => removeMutation.mutate(p.id)} onRemove={() => removeMutation.mutate(p.id)} />
              ))}
            </div>
          )}

          {/* Pending */}
          {pendingPartners.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pending Invitation</p>
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
          {!loadingPartners && partners.length === 0 && (
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
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, shareWithProviders: v }))}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Share with school</p>
                <p className="text-[12px] text-muted-foreground">IEP and relevant records visible to school staff</p>
              </div>
              <Switch
                checked={privacy.shareWithSchool}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, shareWithSchool: v }))}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Anonymized research</p>
                <p className="text-[12px] text-muted-foreground">Contribute anonymized data to autism research (no identifying info)</p>
              </div>
              <Switch
                checked={privacy.anonymizedResearch}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, anonymizedResearch: v }))}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Email notifications</p>
                <p className="text-[12px] text-muted-foreground">Alerts, reminders, and updates via email</p>
              </div>
              <Switch
                checked={privacy.emailNotifications}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, emailNotifications: v }))}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">SMS notifications</p>
                <p className="text-[12px] text-muted-foreground">Time-sensitive alerts via text message</p>
              </div>
              <Switch
                checked={privacy.smsNotifications}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, smsNotifications: v }))}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-3">
            <h4 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <Lock className="size-3.5" />
              Data Management
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8">
                <Download className="size-3.5 mr-1.5" />
                Export All Data
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <Eye className="size-3.5 mr-1.5" />
                View Access Log
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-status-blocked hover:text-status-blocked hover:bg-status-blocked/8 border-status-blocked/30">
                <AlertTriangle className="size-3.5 mr-1.5" />
                Delete All Data
              </Button>
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
