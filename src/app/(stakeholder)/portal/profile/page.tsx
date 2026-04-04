"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProviderProfile, useSaveProfile } from "@/hooks/useProvider";
import { useAppStore } from "@/store/appStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, CheckCircle } from "lucide-react";

const ORG_TYPES = [
  { value: "clinic", label: "Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "nonprofit", label: "Non-Profit" },
  { value: "private_practice", label: "Private Practice" },
  { value: "university", label: "University" },
  { value: "school", label: "School" },
  { value: "employer", label: "Employer" },
];

const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
];

const WAITLIST_OPTIONS = [
  { value: "open", label: "Open — accepting new clients" },
  { value: "waitlist", label: "Waitlist — accepting with wait" },
  { value: "closed", label: "Closed — not accepting" },
];

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };

  return (
    <div>
      <label className="text-sm font-medium text-foreground block mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="ml-0.5 min-h-[24px] min-w-[24px] text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${tag}`}
            >
              x
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag} className="min-h-[44px]">
          Add
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { isDemo } = useAppStore();
  const { data: profile, isLoading } = useProviderProfile();
  const saveProfile = useSaveProfile();

  const [form, setForm] = useState({
    organization_name: "",
    type: "clinic" as string,
    services: [] as string[],
    specialties: [] as string[],
    ages_served: "",
    languages: [] as string[],
    funding_accepted: [] as string[],
    address: "",
    city: "",
    province: "ON",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
    waitlist_status: "open" as string,
    waitlist_estimate: "",
    bio: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        organization_name: profile.organization_name ?? "",
        type: profile.type ?? "clinic",
        services: profile.services ?? [],
        specialties: profile.specialties ?? [],
        ages_served: profile.ages_served ?? "",
        languages: profile.languages ?? [],
        funding_accepted: profile.funding_accepted ?? [],
        address: profile.address ?? "",
        city: profile.city ?? "",
        province: profile.province ?? "ON",
        postal_code: profile.postal_code ?? "",
        phone: profile.phone ?? "",
        email: profile.email ?? "",
        website: profile.website ?? "",
        waitlist_status: profile.waitlist_status ?? "open",
        waitlist_estimate: profile.waitlist_estimate ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) return;
    saveProfile.mutate(form, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    });
  };

  const set = (field: string, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user && !isDemo) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to access your profile.</p>
      </div>
    );
  }

  // Calculate completeness
  const fields = [
    form.organization_name,
    form.type,
    form.services.length > 0,
    form.ages_served,
    form.languages.length > 0,
    form.city,
    form.phone || form.email,
    form.bio,
  ];
  const completeness = Math.round(
    (fields.filter(Boolean).length / fields.length) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Provider Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your organization&apos;s public profile visible to families.
          </p>
        </div>
        <Badge
          variant="secondary"
          className={
            completeness === 100
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }
        >
          {completeness}% complete
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">
              Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="org_name"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Organization Name *
              </label>
              <Input
                id="org_name"
                value={form.organization_name}
                onChange={(e) => set("organization_name", e.target.value)}
                placeholder="e.g. Pathways Therapy Centre"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="org_type"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Organization Type *
                </label>
                <select
                  id="org_type"
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {ORG_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ages_served"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Ages Served
                </label>
                <Input
                  id="ages_served"
                  value={form.ages_served}
                  onChange={(e) => set("ages_served", e.target.value)}
                  placeholder="e.g. 2-18"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="bio"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                About / Bio
              </label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Tell families about your organization..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Services & Specialties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">
              Services & Specialties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagInput
              label="Services Offered"
              value={form.services}
              onChange={(v) => set("services", v)}
              placeholder="e.g. Occupational Therapy"
            />
            <TagInput
              label="Specialties"
              value={form.specialties}
              onChange={(v) => set("specialties", v)}
              placeholder="e.g. Autism Spectrum Disorder"
            />
            <TagInput
              label="Languages"
              value={form.languages}
              onChange={(v) => set("languages", v)}
              placeholder="e.g. English"
            />
            <TagInput
              label="Funding Accepted"
              value={form.funding_accepted}
              onChange={(v) => set("funding_accepted", v)}
              placeholder="e.g. Ontario Autism Program"
            />
          </CardContent>
        </Card>

        {/* Contact & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">
              Contact & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="address"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Address
              </label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="city"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  City
                </label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Toronto"
                />
              </div>
              <div>
                <label
                  htmlFor="province"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Province
                </label>
                <select
                  id="province"
                  value={form.province}
                  onChange={(e) => set("province", e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="postal_code"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Postal Code
                </label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                  placeholder="M5V 2H1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Phone
                </label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(416) 555-0199"
                />
              </div>
              <div>
                <label
                  htmlFor="contact_email"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Email
                </label>
                <Input
                  id="contact_email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="info@example.ca"
                />
              </div>
              <div>
                <label
                  htmlFor="website"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Website
                </label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://example.ca"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waitlist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="waitlist_status"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Waitlist Status
                </label>
                <select
                  id="waitlist_status"
                  value={form.waitlist_status}
                  onChange={(e) => set("waitlist_status", e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {WAITLIST_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="waitlist_estimate"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Estimated Wait Time
                </label>
                <Input
                  id="waitlist_estimate"
                  value={form.waitlist_estimate}
                  onChange={(e) => set("waitlist_estimate", e.target.value)}
                  placeholder="e.g. 4-6 weeks"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Profile
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveProfile.isError && (
            <span className="text-sm text-destructive">
              {saveProfile.error.message}
            </span>
          )}
          {isDemo && (
            <span className="text-xs text-muted-foreground">
              Editing disabled in demo mode
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
