"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const SERVICE_OPTIONS = [
  "OT",
  "SLP",
  "ABA/IBI",
  "Psychology",
  "Psychiatry",
  "Social Work",
  "Respite",
  "Social Skills",
] as const;

const FUNDING_OPTIONS = ["OAP", "Private", "Insurance", "ODSP"] as const;

const TYPE_OPTIONS = [
  { value: "clinic", label: "Clinic" },
  { value: "private_practice", label: "Private Practice" },
  { value: "hospital", label: "Hospital" },
  { value: "community_center", label: "Community Center" },
  { value: "university", label: "University" },
] as const;

const AGE_OPTIONS = [
  { value: "0-5", label: "0-5 years" },
  { value: "6-12", label: "6-12 years" },
  { value: "13-17", label: "13-17 years" },
  { value: "18+", label: "18+" },
  { value: "All ages", label: "All ages" },
] as const;

const WAIT_TIME_OPTIONS = [
  "Under 1 month",
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "12+ months",
] as const;

interface FormData {
  organizationName: string;
  contactEmail: string;
  password: string;
  phone: string;
  type: string;
  services: string[];
  specialties: string;
  agesServed: string;
  locationAddress: string;
  city: string;
  postalCode: string;
  fundingAccepted: string[];
  waitTimeEstimate: string;
  website: string;
  description: string;
}

export default function ProviderRegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    organizationName: "",
    contactEmail: "",
    password: "",
    phone: "",
    type: "",
    services: [],
    specialties: "",
    agesServed: "",
    locationAddress: "",
    city: "",
    postalCode: "",
    fundingAccepted: [],
    waitTimeEstimate: "",
    website: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleInputChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleCheckboxChange(field: "services" | "fundingAccepted", value: string) {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Registration failed. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border border-border">
        <CardContent className="py-12 text-center space-y-4">
          <div className="text-4xl" aria-hidden="true">
            ✓
          </div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Registration Submitted
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Thank you for registering! We&apos;ll review and verify your profile
            shortly. Verified providers receive a badge and priority placement
            when families search for services.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Provider Registration
        </h2>
        <p className="text-muted-foreground">
          Register your organization so families navigating Ontario&apos;s autism
          services can find you. Verified providers receive a badge and priority
          ranking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Details */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Basic information about your practice or clinic
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="organizationName"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Organization Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="organizationName"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                placeholder="e.g. Thames Valley Children Centre"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contactEmail"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Contact Email <span className="text-destructive">*</span>
                </label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  placeholder="info@yourpractice.ca"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Phone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(519) 555-0123"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Password <span className="text-destructive">*</span>
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                You&apos;ll use this to log in to your provider dashboard
              </p>
            </div>

            <div>
              <label
                htmlFor="type"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Organization Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="h-8 w-full rounded-lg border border-input bg-warm-50 px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select type...</option>
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                name="website"
                type="text"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="www.yourpractice.ca"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell families about your organization, approach, and what makes your practice unique..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Services & Specialties */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Services &amp; Specialties</CardTitle>
            <CardDescription>
              What services do you offer to families?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-foreground block mb-2">
                Services Offered
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SERVICE_OPTIONS.map((service) => (
                  <label
                    key={service}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      formData.services.includes(service)
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service)}
                      onChange={() => handleCheckboxChange("services", service)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        formData.services.includes(service)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      }`}
                    >
                      {formData.services.includes(service) && (
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {service}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="specialties"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Specialties
              </label>
              <Input
                id="specialties"
                name="specialties"
                value={formData.specialties}
                onChange={handleInputChange}
                placeholder="e.g. autism, ADHD, sensory processing, feeding therapy"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of your areas of expertise
              </p>
            </div>

            <div>
              <label
                htmlFor="agesServed"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Ages Served
              </label>
              <select
                id="agesServed"
                name="agesServed"
                value={formData.agesServed}
                onChange={handleInputChange}
                className="h-8 w-full rounded-lg border border-input bg-warm-50 px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select age range...</option>
                {AGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Location & Availability */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Location &amp; Availability</CardTitle>
            <CardDescription>
              Where are you located and how long is the wait?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="locationAddress"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Address
              </label>
              <Input
                id="locationAddress"
                name="locationAddress"
                value={formData.locationAddress}
                onChange={handleInputChange}
                placeholder="123 Main Street, London, ON"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="city"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  City <span className="text-destructive">*</span>
                </label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. London"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="postalCode"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Postal Code
                </label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="N6A 1B2"
                />
              </div>
              <div>
                <label
                  htmlFor="waitTimeEstimate"
                  className="text-sm font-medium text-foreground block mb-1.5"
                >
                  Wait Time Estimate
                </label>
                <select
                  id="waitTimeEstimate"
                  name="waitTimeEstimate"
                  value={formData.waitTimeEstimate}
                  onChange={handleInputChange}
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
            </div>
          </CardContent>
        </Card>

        {/* Funding */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Funding Accepted</CardTitle>
            <CardDescription>
              Which funding sources do you accept?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FUNDING_OPTIONS.map((funding) => (
                <label
                  key={funding}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    formData.fundingAccepted.includes(funding)
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.fundingAccepted.includes(funding)}
                    onChange={() =>
                      handleCheckboxChange("fundingAccepted", funding)
                    }
                    className="sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      formData.fundingAccepted.includes(funding)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {formData.fundingAccepted.includes(funding) && (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {funding}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
            size="lg"
          >
            {submitting ? "Submitting..." : "Submit Registration"}
          </Button>
        </div>
      </form>
    </div>
  );
}
