"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";

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
  status: "active" | "pending" | "revoked";
  lastAccess: string;
  permissions: string[];
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

const DEMO_PARTNERS: Partner[] = [
  {
    id: "1",
    name: "Ms. Rodriguez",
    role: "Teacher",
    organization: "St. Mary's Catholic School",
    email: "rodriguez@ldcsb.ca",
    status: "active",
    lastAccess: "2026-03-28",
    permissions: ["View profile", "View IEP", "Message"],
  },
  {
    id: "2",
    name: "Jessica Park",
    role: "Speech-Language Pathologist",
    organization: "TVCC",
    email: "jpark@tvcc.on.ca",
    status: "active",
    lastAccess: "2026-03-25",
    permissions: ["View profile", "View medical", "Message", "Add notes"],
  },
  {
    id: "3",
    name: "Dr. Patel",
    role: "Developmental Pediatrician",
    organization: "TVCC",
    email: "dpatel@tvcc.on.ca",
    status: "active",
    lastAccess: "2026-03-15",
    permissions: ["View profile", "View medical", "Edit medical", "Message"],
  },
  {
    id: "4",
    name: "Dr. Sarah Chen",
    role: "Pediatrician",
    organization: "London Health Sciences Centre",
    email: "schen@lhsc.on.ca",
    status: "pending",
    lastAccess: "—",
    permissions: ["View profile", "View medical"],
  },
];

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
    <div className="flex items-center gap-3 py-2">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      {isEditing ? (
        <Input
          value={value}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          className="h-8 text-sm flex-1"
        />
      ) : (
        <span className="text-sm text-foreground">{value}</span>
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
  const statusColors = {
    active: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    revoked: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground">{partner.name}</h4>
            <Badge variant="secondary" className={`text-[10px] ${statusColors[partner.status]}`}>
              {partner.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {partner.role} · {partner.organization}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{partner.email}</p>
          {partner.lastAccess !== "—" && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Last access: {partner.lastAccess}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {partner.permissions.map((perm) => (
              <Badge key={perm} variant="outline" className="text-[10px] font-normal">
                {perm}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {partner.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 px-2"
              onClick={onRevoke}
            >
              <EyeOff className="size-3.5 mr-1" />
              <span className="text-xs">Revoke</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5 mr-1" />
            <span className="text-xs">Remove</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [parent, setParent] = useState(DEMO_PARENT);
  const [partners, setPartners] = useState(DEMO_PARTNERS);
  const [privacy, setPrivacy] = useState(DEMO_PRIVACY);
  const [editingParent, setEditingParent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const updateParent = (key: keyof ParentInfo, value: string) => {
    setParent((p) => ({ ...p, [key]: value }));
  };

  const revokePartner = (id: string) => {
    setPartners((ps) =>
      ps.map((p) => (p.id === id ? { ...p, status: "revoked" as const } : p))
    );
  };

  const removePartner = (id: string) => {
    setPartners((ps) => ps.filter((p) => p.id !== id));
  };

  const activePartners = partners.filter((p) => p.status === "active");
  const pendingPartners = partners.filter((p) => p.status === "pending");
  const revokedPartners = partners.filter((p) => p.status === "revoked");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, care team access, and privacy preferences.
        </p>
      </div>

      {/* ── Parent/Guardian Info ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              Parent / Guardian
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
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
        </CardContent>
      </Card>

      {/* ── Journey Partners (Care Team) ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Care Team Access
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {activePartners.length} active · {pendingPartners.length} pending
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Providers must create their own account to be invited. You control what they can see and can revoke access anytime.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite */}
          <div className="flex gap-2">
            <Input
              placeholder="Provider's email address..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail((e.target as HTMLInputElement).value)}
              className="h-9 text-sm"
            />
            <Button
              size="sm"
              className="h-9 shrink-0"
              onClick={() => {
                if (inviteEmail) {
                  setPartners((ps) => [
                    ...ps,
                    {
                      id: Date.now().toString(),
                      name: inviteEmail.split("@")[0],
                      role: "Provider",
                      organization: "—",
                      email: inviteEmail,
                      status: "pending",
                      lastAccess: "—",
                      permissions: ["View profile"],
                    },
                  ]);
                  setInviteEmail("");
                }
              }}
            >
              <UserPlus className="size-3.5 mr-1" />
              Invite
            </Button>
          </div>

          {/* Active */}
          {activePartners.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</h4>
              {activePartners.map((p) => (
                <PartnerRow key={p.id} partner={p} onRevoke={() => revokePartner(p.id)} onRemove={() => removePartner(p.id)} />
              ))}
            </div>
          )}

          {/* Pending */}
          {pendingPartners.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Invitation</h4>
              {pendingPartners.map((p) => (
                <PartnerRow key={p.id} partner={p} onRevoke={() => revokePartner(p.id)} onRemove={() => removePartner(p.id)} />
              ))}
            </div>
          )}

          {/* Revoked */}
          {revokedPartners.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revoked</h4>
              {revokedPartners.map((p) => (
                <PartnerRow key={p.id} partner={p} onRevoke={() => revokePartner(p.id)} onRemove={() => removePartner(p.id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Privacy & Data ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            Privacy & Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Share records with providers</p>
                <p className="text-xs text-muted-foreground">Active care team members can view shared records</p>
              </div>
              <Switch
                checked={privacy.shareWithProviders}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, shareWithProviders: v }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Share with school</p>
                <p className="text-xs text-muted-foreground">IEP and relevant records visible to school staff</p>
              </div>
              <Switch
                checked={privacy.shareWithSchool}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, shareWithSchool: v }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Anonymized research</p>
                <p className="text-xs text-muted-foreground">Contribute anonymized data to autism research (no identifying info)</p>
              </div>
              <Switch
                checked={privacy.anonymizedResearch}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, anonymizedResearch: v }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Email notifications</p>
                <p className="text-xs text-muted-foreground">Alerts, reminders, and updates via email</p>
              </div>
              <Switch
                checked={privacy.emailNotifications}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, emailNotifications: v }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">SMS notifications</p>
                <p className="text-xs text-muted-foreground">Time-sensitive alerts via text message</p>
              </div>
              <Switch
                checked={privacy.smsNotifications}
                onCheckedChange={(v) => setPrivacy((p) => ({ ...p, smsNotifications: v }))}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
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
              <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                <AlertTriangle className="size-3.5 mr-1.5" />
                Delete All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── About ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Heart className="size-4 text-muted-foreground" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground font-medium">1.0.0-beta</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Navigator Agent</span>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">Connected</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Privacy Policy</span>
              <a href="#" className="text-primary hover:underline text-xs inline-flex items-center gap-0.5">
                View <ExternalLink className="size-3" />
              </a>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Terms of Service</span>
              <a href="#" className="text-primary hover:underline text-xs inline-flex items-center gap-0.5">
                View <ExternalLink className="size-3" />
              </a>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Support</span>
              <a href="mailto:support@thecompanion.ca" className="text-primary hover:underline text-xs">
                support@thecompanion.ca
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
