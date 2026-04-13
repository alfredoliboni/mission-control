"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Mail, Check, BookOpen, GraduationCap } from "lucide-react";

const PROGRAM_OPTIONS = [
  "Computer Science",
  "Engineering",
  "Mathematics",
  "Arts & Humanities",
  "Sciences",
  "Business",
  "Health Sciences",
  "Social Work",
];

const ACCOMMODATION_OPTIONS = [
  "Quiet testing rooms",
  "Extended exam time",
  "Note-taking services",
  "Learning strategist",
  "Flexible scheduling",
  "Single residence room",
  "Sensory-friendly spaces",
  "Assistive technology",
  "Peer mentoring",
  "Reduced course load option",
];

export default function UniversityRegistrationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    institutionName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    department: "",
    programs: [] as string[],
    otherPrograms: "",
    accommodations: [] as string[],
    otherAccommodations: "",
    accessibilityOfficeContact: "",
    applicationAccommodations: "",
    transitionSupport: "",
    description: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const toggleArray = (field: "programs" | "accommodations", value: string) => {
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
    setError(null);

    // Merge custom text into arrays
    const allPrograms = [
      ...form.programs,
      ...form.otherPrograms.split(",").map(s => s.trim()).filter(Boolean),
    ];
    const allAccommodations = [
      ...form.accommodations,
      ...form.otherAccommodations.split(",").map(s => s.trim()).filter(Boolean),
    ];

    try {
      const res = await fetch("/api/portal/university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          programs: allPrograms,
          accommodations: allAccommodations,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
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
          Thank you for registering your institution. Our team will review your profile
          and match you with neurodiverse students seeking accommodations and support.
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
          <span className="text-3xl">🎓</span> University Registration
        </h1>
        <p className="text-muted-foreground">
          Register your institution to be matched with neurodiverse students
          seeking accommodations and support programs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Institution Info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Institution Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Institution Name *</label>
              <input required value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Department / Faculty</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g., Faculty of Arts & Science"
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell us about your institution and its commitment to supporting neurodiverse students..."
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
              <label className="text-sm font-medium text-foreground block mb-1">Contact Email *</label>
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
                placeholder="e.g., M5S 1A1"
                className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Programs Offered */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Programs Offered
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROGRAM_OPTIONS.map((program) => (
              <button key={program} type="button" onClick={() => toggleArray("programs", program)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  form.programs.includes(program)
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}>
                {program}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Other Programs (comma separated)</label>
            <input value={form.otherPrograms} onChange={(e) => setForm({ ...form, otherPrograms: e.target.value })}
              placeholder="e.g., Music Therapy, Kinesiology, Special Education"
              className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Accommodations */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            🧩 Accommodations Available
          </h2>
          <p className="text-xs text-muted-foreground">Select the accommodations your institution can provide:</p>
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
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Other Accommodations (comma separated)</label>
            <input value={form.otherAccommodations} onChange={(e) => setForm({ ...form, otherAccommodations: e.target.value })}
              placeholder="e.g., Service animal policy, Exam scribing, Audio recording"
              className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Accessibility & Support */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Accessibility & Support
          </h2>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Accessibility Office Contact Info</label>
            <input value={form.accessibilityOfficeContact} onChange={(e) => setForm({ ...form, accessibilityOfficeContact: e.target.value })}
              placeholder="e.g., accessibility@university.ca, 416-555-0100"
              className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Application Accommodations</label>
            <input value={form.applicationAccommodations} onChange={(e) => setForm({ ...form, applicationAccommodations: e.target.value })}
              placeholder="Describe accommodations available during the application process"
              className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Transition Support Programs</label>
            <textarea value={form.transitionSupport} onChange={(e) => setForm({ ...form, transitionSupport: e.target.value })}
              placeholder="Describe transition support programs for neurodiverse students (e.g., orientation programs, first-year mentoring, summer bridge programs...)"
              rows={3} className="w-full rounded-lg border border-border bg-warm-50 px-3 py-2 text-sm" />
          </div>
        </div>

        {error && (
          <p className="text-sm text-status-blocked bg-status-blocked/8 p-3 rounded-lg">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || !form.institutionName || !form.contactEmail}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? "Submitting..." : "Register as University"}
        </button>
      </form>
    </div>
  );
}
