"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Briefcase, MapPin, Mail, Check } from "lucide-react";

const ACCOMMODATION_OPTIONS = [
  "Quiet workspace",
  "Flexible schedule",
  "Job coaching",
  "Visual instructions",
  "Structured tasks",
  "Reduced social demands",
  "Sensory-friendly environment",
  "Buddy system",
];

const POSITION_TYPES = [
  "Co-op / internship",
  "Part-time",
  "Supported employment",
  "Full-time",
  "Volunteer",
];

export default function EmployerRegistrationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    address: "",
    city: "",
    postalCode: "",
    positionTypes: [] as string[],
    accommodations: [] as string[],
    description: "",
  });

  const toggleArray = (field: "positionTypes" | "accommodations", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/portal/employer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-status-success/10 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-status-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Registration Submitted!</h1>
        <p className="text-muted-foreground">
          Thank you for registering as an inclusive employer. Our team will review your profile
          and match you with candidates whose skills and needs align with your positions.
        </p>
        <Link href="/" className="text-primary hover:underline text-sm font-medium">
          Back to The Companion
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <span className="text-3xl">💼</span> Employer Registration
        </h1>
        <p className="text-muted-foreground">
          Register your organization to be matched with neurodiverse job seekers
          in the Ontario autism community.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Company Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Company Name *</label>
              <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Industry</label>
              <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g., Technology, Retail, Food Service"
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell us about your company and why you want to hire neurodiverse talent..."
              rows={3} className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Contact
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Email *</label>
              <input required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Phone</label>
              <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Location
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g., Toronto"
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Postal Code</label>
              <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="e.g., M5V 2H1"
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Position Types */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Position Types Offered
          </h2>
          <div className="flex flex-wrap gap-2">
            {POSITION_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => toggleArray("positionTypes", type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  form.positionTypes.includes(type)
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Accommodations */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            🧩 Accommodations Available
          </h2>
          <p className="text-xs text-muted-foreground">Select the accommodations your workplace can provide:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {ACCOMMODATION_OPTIONS.map((acc) => (
              <button key={acc} type="button" onClick={() => toggleArray("accommodations", acc)}
                className={`px-3 py-2 rounded-lg text-sm text-left border transition-all ${
                  form.accommodations.includes(acc)
                    ? "bg-status-success/8 border-status-success/30 text-status-success"
                    : "border-border text-muted-foreground hover:border-status-success/30"
                }`}>
                {form.accommodations.includes(acc) ? "✓ " : ""}{acc}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !form.companyName || !form.contactEmail}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? "Submitting..." : "Register as Employer"}
        </button>
      </form>
    </div>
  );
}
