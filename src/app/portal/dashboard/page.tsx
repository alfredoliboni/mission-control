"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
  Save,
  LogOut,
  Eye,
  Users,
  Clock,
  Building2,
  Phone,
  Globe,
  Mail,
  MapPin,
  BadgeCheck,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

interface ProviderProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: string | null;
  services: string[];
  specialties: string[];
  description: string | null;
  website: string | null;
  waitlist_estimate: string | null;
  location_address: string | null;
  location_city: string | null;
  location_postal: string | null;
  accepts_funding: string[];
  is_verified: boolean;
  created_at: string;
  review_count: number | null;
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  status: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getTypeLabel(type: string | null): string {
  if (!type) return "Organization";
  const map: Record<string, string> = {
    clinic: "Clinic",
    private_practice: "Private Practice",
    hospital: "Hospital",
    community_center: "Community Center",
    university: "University",
  };
  return map[type] || type;
}

function getFundingLabel(code: string): string {
  const map: Record<string, string> = {
    oap: "OAP",
    private: "Private",
    insurance: "Insurance",
    odsp: "ODSP",
  };
  return map[code] || code;
}

const WAIT_TIME_OPTIONS = [
  "Under 1 month",
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "12+ months",
] as const;

// ── Stat Card ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground">{value}</p>
        {sublabel && (
          <p className="text-[11px] text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

// ── Profile Card ─────────────────────────────────────────────────────────

function ProfileCard({
  provider,
  onEdit,
}: {
  provider: ProviderProfile;
  onEdit: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header gradient */}
      <div className="h-20 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent relative">
        <div className="absolute -bottom-6 left-5">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-xl font-bold text-white shadow-md">
            {provider.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="px-5 pt-8 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                {provider.name}
              </h2>
              {provider.is_verified && (
                <BadgeCheck className="h-4.5 w-4.5 text-primary" />
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {getTypeLabel(provider.type)}
              {provider.location_city
                ? ` \u00B7 ${provider.location_city}`
                : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>

        {/* Info grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {provider.email && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{provider.email}</span>
            </div>
          )}
          {provider.phone && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{provider.phone}</span>
            </div>
          )}
          {provider.website && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-primary transition-colors"
              >
                {provider.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {provider.location_address && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {provider.location_address}
                {provider.location_postal
                  ? `, ${provider.location_postal}`
                  : ""}
              </span>
            </div>
          )}
        </div>

        {/* Services */}
        {provider.services.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Services
            </p>
            <div className="flex flex-wrap gap-1.5">
              {provider.services.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-md bg-primary/8 text-primary text-[11px] font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Specialties */}
        {provider.specialties.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Specialties
            </p>
            <div className="flex flex-wrap gap-1.5">
              {provider.specialties.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Funding + Waitlist row */}
        <div className="mt-4 flex flex-wrap gap-4">
          {provider.waitlist_estimate && (
            <div className="flex items-center gap-1.5 text-[12px]">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Waitlist:</span>
              <span className="font-semibold text-foreground">
                {provider.waitlist_estimate}
              </span>
            </div>
          )}
          {provider.accepts_funding.length > 0 && (
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="text-muted-foreground">Funding:</span>
              <span className="font-semibold text-foreground">
                {provider.accepts_funding.map(getFundingLabel).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {provider.description && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {provider.description}
            </p>
          </div>
        )}

        {/* Member since */}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Registered {formatDate(provider.created_at)}
            {provider.is_verified && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary font-semibold">
                <BadgeCheck className="h-3 w-3" /> Verified Provider
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ───────────────────────────────────────────────────

function EditProfileForm({
  provider,
  onSave,
  onCancel,
}: {
  provider: ProviderProfile;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState(provider.phone || "");
  const [website, setWebsite] = useState(
    provider.website?.replace(/^https?:\/\//, "") || ""
  );
  const [waitlistEstimate, setWaitlistEstimate] = useState(
    provider.waitlist_estimate || ""
  );
  const [services, setServices] = useState(provider.services.join(", "));
  const [description, setDescription] = useState(provider.description || "");
  const [locationAddress, setLocationAddress] = useState(
    provider.location_address || ""
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    try {
      await onSave({
        phone: phone.trim() || null,
        website: website.trim()
          ? website.trim().startsWith("http")
            ? website.trim()
            : `https://${website.trim()}`
          : null,
        waitlist_estimate: waitlistEstimate || null,
        services: services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        description: description.trim() || null,
        location_address: locationAddress.trim() || null,
      });
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-foreground">
          Edit Profile
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Phone
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
              placeholder="(519) 555-0123"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Website
            </label>
            <Input
              value={website}
              onChange={(e) => setWebsite((e.target as HTMLInputElement).value)}
              placeholder="www.yourpractice.ca"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Waitlist Estimate
            </label>
            <select
              value={waitlistEstimate}
              onChange={(e) => setWaitlistEstimate(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-warm-50 px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select wait time...</option>
              {WAIT_TIME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Address
            </label>
            <Input
              value={locationAddress}
              onChange={(e) =>
                setLocationAddress((e.target as HTMLInputElement).value)
              }
              placeholder="123 Main Street, London, ON"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Services (comma-separated)
          </label>
          <Input
            value={services}
            onChange={(e) => setServices((e.target as HTMLInputElement).value)}
            placeholder="OT, SLP, ABA/IBI"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell families about your organization..."
            rows={4}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-[12px] min-h-[20px]">
            {status === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            )}
            {status === "saved" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-700">Saved successfully</span>
              </>
            )}
            {status === "error" && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-600">{errorMsg}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={status === "saving"} className="gap-1.5">
              {status === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Programs Section ─────────────────────────────────────────────────────

function ProgramsSection({ programs }: { programs: Program[] }) {
  if (programs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[15px] font-semibold text-foreground">
            Programs
          </h3>
        </div>
        <p className="text-[13px] text-muted-foreground">
          No programs linked to your profile yet. Programs will appear here once
          families&apos; Navigator agents discover and match your services.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[15px] font-semibold text-foreground">
            Programs
          </h3>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {programs.length} program{programs.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {programs.map((program) => (
          <div key={program.id} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {program.name}
                </p>
                {program.description && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
                    {program.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {program.type && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    {program.type}
                  </span>
                )}
                {program.status && (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      program.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {program.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── My Families Section ──────────────────────────────────────────────────

interface LinkedFamily {
  id: string;
  family_id: string;
  child_name: string | null;
  role: string;
  status: string;
}

function MyFamiliesSection({ families }: { families: LinkedFamily[] }) {
  if (families.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          My Families
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Families who have invited you to their care team
        </p>
      </div>
      <div className="divide-y divide-border">
        {families.map((f) => {
          const isAccepted = f.status === "accepted" || !f.status;
          return (
            <div key={f.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(f.child_name || "?")[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate">
                    {f.child_name || "Child"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Role: {f.role} &middot;{" "}
                    <span className={isAccepted ? "text-[#16a34a]" : "text-[#f59e0b]"}>
                      {isAccepted ? "Accepted" : "Pending"}
                    </span>
                  </p>
                </div>
              </div>
              {isAccepted && (
                <Link
                  href="/team"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Open Portal
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function ProviderDashboardPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [families, setFamilies] = useState<LinkedFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Check auth and fetch profile
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Extract display name
      const meta = user.user_metadata;
      setUserName(
        meta?.organization_name || meta?.full_name || user.email || "Provider"
      );

      // Fetch profile
      try {
        const res = await fetch("/api/portal/profile");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          setError("no_profile");
          setIsLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch profile");

        const data = await res.json();
        setProvider(data.provider);
        setPrograms(data.programs ?? []);

        // Fetch linked families from team profile API
        try {
          const teamRes = await fetch("/api/team/profile");
          if (teamRes.ok) {
            const teamData = await teamRes.json();
            if (teamData.families) {
              setFamilies(teamData.families.map((f: { familyId: string; childName: string; familyName: string; age: string; diagnosis: string }) => ({
                id: f.familyId,
                family_id: f.familyId,
                child_name: f.childName,
                role: "provider",
                status: "accepted",
              })));
            }
          }
        } catch { /* not a stakeholder, skip */ }
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("load_error");
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [router]);

  const handleSave = useCallback(
    async (updates: Record<string, unknown>) => {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      setProvider(data.provider);
      setTimeout(() => setIsEditing(false), 1200);
    },
    []
  );

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // ── Loading state ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  // ── No profile found ──────────────────────────────────────────────

  if (error === "no_profile") {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4" aria-hidden="true">
          🏥
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          No Provider Profile Found
        </h2>
        <p className="text-[13px] text-muted-foreground max-w-md mx-auto mb-6">
          It looks like you haven&apos;t registered as a provider yet. Register
          your organization to access your dashboard.
        </p>
        <Button onClick={() => router.push("/portal/register")}>
          Register as Provider
        </Button>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────

  if (error || !provider) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4" aria-hidden="true">
          ⚠
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-[13px] text-muted-foreground max-w-md mx-auto mb-6">
          We couldn&apos;t load your provider dashboard. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Welcome back, {userName}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage your provider profile and track how families find your
            services.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Link
            href="/team"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-primary hover:text-primary/80 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            Care Team Portal
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats row — MVP placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Profile Views"
          value={String(provider.review_count ?? 0)}
          sublabel="From family searches"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Families Connected"
          value={String(families.filter(f => f.status === "accepted").length)}
          sublabel={families.length > 0 ? "Via care team invites" : "No families yet"}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Current Waitlist"
          value={provider.waitlist_estimate || "Not set"}
          sublabel={provider.waitlist_estimate ? "Visible to families" : "Set in profile"}
        />
      </div>

      {/* My Families */}
      <MyFamiliesSection families={families} />

      {/* Profile — view or edit */}
      {isEditing ? (
        <EditProfileForm
          provider={provider}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ProfileCard provider={provider} onEdit={() => setIsEditing(true)} />
      )}

      {/* Programs */}
      <ProgramsSection programs={programs} />
    </div>
  );
}
