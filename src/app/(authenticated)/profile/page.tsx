"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useParsedProfile, useParsedJourneyPartners } from "@/hooks/useWorkspace";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ParsedProfile,
  ProfilePersonal,
  ProfileMedical,
  ProfileBasicInfo,
  JourneyPartner,
  Medication,
  Supplement,
  Doctor,
} from "@/types/workspace";
import { extractNeeds } from "@/lib/needs";
import {
  Pencil,
  Check,
  X,
  Plus,
  AlertTriangle,
  Phone,
  Mail,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function initials(name: string): string {
  return name
    ? name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
}

// ── Editable Tag List (clean text in display, pills only in edit) ────────

function EditableTagList({
  items,
  onChange,
  isEditing,
  placeholder = "Add new...",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  isEditing: boolean;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState("");

  if (!isEditing) {
    return (
      <span className="text-[13px] text-muted-foreground leading-relaxed">
        {items.length > 0 ? items.join(", ") : <span className="italic">None listed</span>}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="rounded-full p-0.5 hover:bg-muted-foreground/10"
              aria-label={`Remove ${item}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem((e.target as HTMLInputElement).value)}
          placeholder={placeholder}
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) {
              e.preventDefault();
              onChange([...items, newItem.trim()]);
              setNewItem("");
            }
          }}
        />
        <Button
          variant="outline"
          size="xs"
          disabled={!newItem.trim()}
          onClick={() => {
            if (newItem.trim()) {
              onChange([...items, newItem.trim()]);
              setNewItem("");
            }
          }}
        >
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Section Header with Edit Button ──────────────────────────────────────

function SectionHeader({
  title,
  sectionKey,
  editingSection,
  onEdit,
  onSave,
  onCancel,
}: {
  title: string;
  sectionKey: string;
  editingSection: string | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isEditing = editingSection === sectionKey;
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <button onClick={onSave} className="p-1 rounded hover:bg-muted" aria-label="Save">
              <Check className="size-4 text-status-success" />
            </button>
            <button onClick={onCancel} className="p-1 rounded hover:bg-muted" aria-label="Cancel">
              <X className="size-4 text-status-blocked" />
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            disabled={editingSection !== null}
            className="p-1 rounded hover:bg-muted disabled:opacity-30"
            aria-label={`Edit ${title}`}
          >
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Label / Value pair ───────────────────────────────────────────────────

function LabelValue({
  label,
  value,
  isEditing,
  onChange,
  inputType = "text",
}: {
  label: string;
  value: string;
  isEditing?: boolean;
  onChange?: (v: string) => void;
  inputType?: string;
}) {
  return (
    <div className="py-1.5">
      <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      {isEditing && onChange ? (
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          className="h-7 text-sm mt-0.5"
        />
      ) : (
        <dd className="text-[13px] text-foreground mt-0.5">{value || "—"}</dd>
      )}
    </div>
  );
}

// ── Subsection label ─────────────────────────────────────────────────────

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1">
      {children}
    </h4>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Profile Page ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { data: profile, isLoading, refetch } = useParsedProfile();
  const { data: journeyPartners } = useParsedJourneyPartners();

  const [profileData, setProfileData] = useState<ParsedProfile | null>(null);
  const [snapshot, setSnapshot] = useState<ParsedProfile | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const agentId = useActiveAgent();

  // Seed local state from workspace whenever profile or active child changes
  const prevAgentRef = useRef(agentId);
  useEffect(() => {
    if (agentId !== prevAgentRef.current) {
      prevAgentRef.current = agentId;
      setProfileData(null);
      setSnapshot(null);
      setEditingSection(null);
    }
  }, [agentId]);

  if (profile && !profileData) {
    setProfileData(profile);
  }

  const startEditing = useCallback(
    (section: string) => {
      if (profileData) {
        setSnapshot(deepClone(profileData));
        setEditingSection(section);
      }
    },
    [profileData]
  );

  const cancelEditing = useCallback(() => {
    if (snapshot) setProfileData(snapshot);
    setSnapshot(null);
    setEditingSection(null);
  }, [snapshot]);

  const saveEditing = useCallback(async () => {
    if (!profileData || !agentId) return;
    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, profileData }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Profile saved");
      // Refetch from workspace to confirm save
      refetch();
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
    setSnapshot(null);
    setEditingSection(null);
  }, [profileData, agentId, refetch]);

  const updateBasicInfo = useCallback(
    (field: keyof ProfileBasicInfo, value: string) => {
      setProfileData((prev) =>
        prev ? { ...prev, basicInfo: { ...prev.basicInfo, [field]: value } } : prev
      );
    },
    []
  );

  const updatePersonal = useCallback(
    (field: keyof ProfilePersonal, value: ProfilePersonal[keyof ProfilePersonal]) => {
      setProfileData((prev) =>
        prev
          ? { ...prev, personalProfile: { ...prev.personalProfile, [field]: value } }
          : prev
      );
    },
    []
  );

  const updateMedical = useCallback(
    (field: keyof ProfileMedical, value: ProfileMedical[keyof ProfileMedical]) => {
      setProfileData((prev) =>
        prev ? { ...prev, medical: { ...prev.medical, [field]: value } } : prev
      );
    },
    []
  );

  const updatePartners = useCallback((partners: JourneyPartner[]) => {
    setProfileData((prev) => (prev ? { ...prev, journeyPartners: partners } : prev));
  }, []);

  const sectionProps = (key: string) => ({
    sectionKey: key,
    editingSection,
    onEdit: () => startEditing(key),
    onSave: saveEditing,
    onCancel: cancelEditing,
  });

  const data = profileData;

  const isProcessing = data && (
    !data.basicInfo.name ||
    data.basicInfo.name === "Child" ||
    data.basicInfo.diagnosis === "ASD (details in child-profile.md)"
  );

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [isProcessing, refetch]);

  // Build meta line for profile header
  const metaParts = [
    data?.basicInfo.age && `Age ${data.basicInfo.age}`,
    data?.basicInfo.diagnosis,
    data?.basicInfo.dateOfBirth && `Born ${data.basicInfo.dateOfBirth}`,
    data?.basicInfo.location,
  ].filter(Boolean);

  return (
    <WorkspaceSection title="Profile" icon="👤" isLoading={isLoading}>
      {data && (
        <div className="space-y-4">
          {/* ── Processing Banner ───────────────────────────────────── */}
          {isProcessing && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Your Navigator is processing your information
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  This may take a few minutes. The page will update automatically.
                </p>
              </div>
            </div>
          )}

          {/* ── Profile Header Card ─────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <SectionHeader title="Basic Information" {...sectionProps("basic")} />

            {/* Avatar + Name */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] text-lg font-bold text-white"
                style={{ background: "linear-gradient(135deg, #f0c27f, #fc5c7d)" }}
              >
                {initials(data.basicInfo.name)}
              </div>
              <div>
                {editingSection === "basic" ? (
                  <Input
                    value={data.basicInfo.name}
                    onChange={(e) => updateBasicInfo("name", (e.target as HTMLInputElement).value)}
                    className="text-[18px] font-bold h-9"
                  />
                ) : (
                  <h3 className="text-[18px] font-bold text-foreground">{data.basicInfo.name}</h3>
                )}
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  {metaParts.join(" · ")}
                </p>
              </div>
            </div>

            {/* Info grid */}
            <dl className="grid grid-cols-3 gap-x-6 gap-y-1">
              <LabelValue label="Date of Birth" value={data.basicInfo.dateOfBirth} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("dateOfBirth", v)} inputType="date" />
              <LabelValue label="Postal Code" value={data.basicInfo.postalCode} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("postalCode", v)} />
              <LabelValue label="Current Stage" value={data.basicInfo.currentStage ? data.basicInfo.currentStage.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("currentStage", v)} />
              <LabelValue label="Location" value={data.basicInfo.location} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("location", v)} />
              <LabelValue label="Family Language" value={data.basicInfo.familyLanguage} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("familyLanguage", v)} />
              <LabelValue label="Diagnosis" value={data.basicInfo.diagnosis} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("diagnosis", v)} />
            </dl>
          </div>

          {/* ── Priority Needs Card ──────────────────────────────────── */}
          {(() => {
            const needs = extractNeeds(data);
            if (needs.length === 0) return null;
            return (
              <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <h2 className="text-[15px] font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span aria-hidden="true">&#127919;</span> Priority Needs
                </h2>
                <div className="flex flex-wrap gap-2">
                  {needs.map((need) => (
                    <span
                      key={need.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-primary/8 text-primary border border-primary/15"
                      title={need.detail}
                    >
                      {need.label}
                      {need.detail && (
                        <span className="font-normal text-primary/70">
                          &middot; {need.detail}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Two-Column Grid ──────────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: Communication & Sensory */}
            <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <SectionHeader title="💬 Communication & Sensory" {...sectionProps("personal")} />

              {/* Communication */}
              <div className="mb-4">
                <SubLabel>🗣️ Communication</SubLabel>
                {editingSection === "personal" ? (
                  <div className="space-y-2">
                    <Textarea value={data.personalProfile.communication} onChange={(e) => updatePersonal("communication", e.target.value)} className="text-sm" rows={2} />
                    <EditableTagList items={data.personalProfile.communicationStyles} onChange={(items) => updatePersonal("communicationStyles", items)} isEditing placeholder="Add style..." />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{data.personalProfile.communication || "—"}</p>
                    {data.personalProfile.communicationStyles.length > 0 && (
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {data.personalProfile.communicationStyles.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Sensory */}
              <div className="mb-4">
                <SubLabel>🎧 Sensory</SubLabel>
                {editingSection === "personal" ? (
                  <div className="space-y-3">
                    <Textarea value={data.personalProfile.sensory} onChange={(e) => updatePersonal("sensory", e.target.value)} className="text-sm" rows={2} />
                    {(["seeks", "avoids", "calming"] as const).map((key) => (
                      <div key={key}>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{key}</p>
                        <EditableTagList items={data.personalProfile.sensoryProfile[key]} onChange={(items) => updatePersonal("sensoryProfile", { ...data.personalProfile.sensoryProfile, [key]: items })} isEditing placeholder={`Add ${key}...`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {data.personalProfile.sensory && (
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{data.personalProfile.sensory}</p>
                    )}
                    {(["seeks", "avoids", "calming"] as const).map((key) => {
                      const items = data.personalProfile.sensoryProfile[key];
                      if (items.length === 0) return null;
                      return (
                        <p key={key} className="text-[13px] text-muted-foreground leading-relaxed">
                          <span className="font-medium capitalize">{key}:</span> {items.join(", ")}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Personality */}
              <div className="mb-4">
                <SubLabel>🧠 Personality</SubLabel>
                <EditableTagList items={data.personalProfile.personalityTraits} onChange={(items) => updatePersonal("personalityTraits", items)} isEditing={editingSection === "personal"} placeholder="Add trait..." />
              </div>

              {/* Triggers */}
              <div>
                <SubLabel>⚡ Triggers</SubLabel>
                <EditableTagList items={data.personalProfile.triggers} onChange={(items) => updatePersonal("triggers", items)} isEditing={editingSection === "personal"} placeholder="Add trigger..." />
              </div>
            </div>

            {/* Right: Interests & Strengths */}
            <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <SectionHeader title="⭐ Interests & Strengths" {...sectionProps("interests")} />

              <div className="mb-4">
                <SubLabel>🚂 Interests</SubLabel>
                <EditableTagList items={data.personalProfile.interestsList} onChange={(items) => updatePersonal("interestsList", items)} isEditing={editingSection === "interests"} placeholder="Add interest..." />
              </div>

              <div className="mb-4">
                <SubLabel>💪 Strengths</SubLabel>
                <EditableTagList items={data.personalProfile.strengthsList} onChange={(items) => updatePersonal("strengthsList", items)} isEditing={editingSection === "interests"} placeholder="Add strength..." />
              </div>

              <div className="mb-4">
                <SubLabel>🎯 Challenges</SubLabel>
                <EditableTagList items={data.personalProfile.challengesList} onChange={(items) => updatePersonal("challengesList", items)} isEditing={editingSection === "interests"} placeholder="Add challenge..." />
              </div>

              {/* Extra Info */}
              <div>
                <SubLabel>📝 Extra Info</SubLabel>
                {editingSection === "interests" ? (
                  <Textarea
                    value={data.personalProfile.extraInfo || ""}
                    onChange={(e) => updatePersonal("extraInfo", e.target.value)}
                    className="text-sm"
                    rows={4}
                    placeholder="e.g. Daily routine, what works at home..."
                  />
                ) : (
                  <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
                    {data.personalProfile.extraInfo || <span className="italic">No extra information added yet.</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Medical Section ──────────────────────────────────────── */}

          {/* Unconfirmed Medications Warning */}
          {data.medical.unconfirmedMedications?.length > 0 && (
            <div className="rounded-xl border border-status-caution/30 bg-status-caution/8 p-4" role="alert">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="size-4 text-status-caution" />
                <span className="text-[13px] font-semibold text-status-caution">Unconfirmed Medications</span>
              </div>
              <ul className="space-y-1">
                {data.medical.unconfirmedMedications.map((med, i) => (
                  <li key={i} className="text-[13px] text-status-caution">{med}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Medications */}
          <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <SectionHeader title="💊 Medications" {...sectionProps("medications")} />
            {editingSection === "medications" ? (
              <div className="space-y-3">
                {data.medical.medications.map((med, i) => (
                  <MedicationEdit
                    key={i}
                    medication={med}
                    onChange={(updated) => {
                      const meds = [...data.medical.medications];
                      meds[i] = updated;
                      updateMedical("medications", meds);
                    }}
                    onRemove={() =>
                      updateMedical("medications", data.medical.medications.filter((_, idx) => idx !== i))
                    }
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => updateMedical("medications", [...data.medical.medications, { medication: "", dose: "", frequency: "", prescriber: "", startDate: "", status: "Active", notes: "" }])}>
                  <Plus className="size-3.5 mr-1" /> Add Medication
                </Button>
              </div>
            ) : data.medical.medications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium">Medication</th>
                      <th className="text-left py-2 pr-3 font-medium">Dose</th>
                      <th className="text-left py-2 pr-3 font-medium">Frequency</th>
                      <th className="text-left py-2 pr-3 font-medium">Status</th>
                      <th className="text-left py-2 font-medium">Prescriber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.medical.medications.map((med, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 text-[13px] text-foreground font-medium">{med.medication}</td>
                        <td className="py-2 pr-3 text-[13px] text-muted-foreground">{med.dose || "—"}</td>
                        <td className="py-2 pr-3 text-[13px] text-muted-foreground">{med.frequency || "—"}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-[13px] font-medium ${med.status?.toLowerCase().includes("active") ? "text-status-success" : "text-muted-foreground"}`}>
                            {med.status || "Unknown"}
                          </span>
                        </td>
                        <td className="py-2 text-[13px] text-muted-foreground">{med.prescriber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground italic">No medications listed</p>
            )}
          </div>

          {/* Supplements */}
          <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <SectionHeader title="🌿 Supplements" {...sectionProps("supplements")} />
            {editingSection === "supplements" ? (
              <div className="space-y-3">
                {data.medical.supplements.map((sup, i) => (
                  <SupplementEdit
                    key={i}
                    supplement={sup}
                    onChange={(updated) => {
                      const sups = [...data.medical.supplements];
                      sups[i] = updated;
                      updateMedical("supplements", sups);
                    }}
                    onRemove={() =>
                      updateMedical("supplements", data.medical.supplements.filter((_, idx) => idx !== i))
                    }
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => updateMedical("supplements", [...data.medical.supplements, { supplement: "", dose: "", frequency: "", notes: "" }])}>
                  <Plus className="size-3.5 mr-1" /> Add Supplement
                </Button>
              </div>
            ) : data.medical.supplements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium">Supplement</th>
                      <th className="text-left py-2 pr-3 font-medium">Dose</th>
                      <th className="text-left py-2 pr-3 font-medium">Frequency</th>
                      <th className="text-left py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.medical.supplements.map((sup, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 text-[13px] text-foreground font-medium">{sup.supplement}</td>
                        <td className="py-2 pr-3 text-[13px] text-muted-foreground">{sup.dose || "—"}</td>
                        <td className="py-2 pr-3 text-[13px] text-muted-foreground">{sup.frequency || "—"}</td>
                        <td className="py-2 text-[13px] text-muted-foreground italic">{sup.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground italic">No supplements listed</p>
            )}
          </div>

          {/* Comorbid Conditions */}
          <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <SectionHeader title="🩺 Comorbid Conditions" {...sectionProps("comorbid")} />
            <EditableTagList
              items={data.medical.comorbidConditions}
              onChange={(items) => updateMedical("comorbidConditions", items)}
              isEditing={editingSection === "comorbid"}
              placeholder="Add condition..."
            />
          </div>

          {/* Doctors & Specialists */}
          <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <SectionHeader title="👨‍⚕️ Doctors & Specialists" {...sectionProps("doctors")} />
            {editingSection === "doctors" ? (
              <div className="space-y-3">
                {data.medical.doctors.map((doc, i) => (
                  <DoctorEdit
                    key={i}
                    doctor={doc}
                    onChange={(updated) => {
                      const docs = [...data.medical.doctors];
                      docs[i] = updated;
                      updateMedical("doctors", docs);
                    }}
                    onRemove={() =>
                      updateMedical("doctors", data.medical.doctors.filter((_, idx) => idx !== i))
                    }
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => updateMedical("doctors", [...data.medical.doctors, { role: "", name: "", organization: "", phone: "" }])}>
                  <Plus className="size-3.5 mr-1" /> Add Doctor
                </Button>
              </div>
            ) : data.medical.doctors.length > 0 ? (
              <div className="divide-y divide-border">
                {data.medical.doctors.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-[13px] text-foreground font-medium">{doc.name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {doc.role}{doc.organization ? ` · ${doc.organization}` : ""}
                      </p>
                    </div>
                    {doc.phone && (
                      <a href={`tel:${doc.phone}`} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="size-3" /> {doc.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground italic">No doctors listed</p>
            )}
          </div>

          {/* Appointments */}
          <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <SectionHeader title="📅 Appointments" {...sectionProps("appointments")} />
            {editingSection === "appointments" ? (
              <div className="space-y-3">
                {data.medical.appointments.map((apt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      value={apt.date}
                      onChange={(e) => {
                        const apts = [...data.medical.appointments];
                        apts[i] = { ...apts[i], date: (e.target as HTMLInputElement).value };
                        updateMedical("appointments", apts);
                      }}
                      className="h-7 w-32 text-xs shrink-0"
                      placeholder="Date..."
                    />
                    <Input
                      value={apt.description}
                      onChange={(e) => {
                        const apts = [...data.medical.appointments];
                        apts[i] = { ...apts[i], description: (e.target as HTMLInputElement).value };
                        updateMedical("appointments", apts);
                      }}
                      className="h-7 text-sm flex-1"
                      placeholder="Description..."
                    />
                    <button
                      onClick={() => updateMedical("appointments", data.medical.appointments.filter((_, idx) => idx !== i))}
                      className="p-1 rounded hover:bg-muted"
                      aria-label="Remove appointment"
                    >
                      <X className="size-3 text-status-blocked" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => updateMedical("appointments", [...data.medical.appointments, { date: "", description: "" }])}>
                  <Plus className="size-3.5 mr-1" /> Add Appointment
                </Button>
              </div>
            ) : data.medical.appointments.length > 0 ? (
              <div className="divide-y divide-border">
                {data.medical.appointments.map((apt, i) => (
                  <div key={i} className="flex items-baseline gap-3 py-2">
                    <span className="text-[12px] font-medium text-muted-foreground shrink-0">{apt.date}</span>
                    <span className="text-[13px] text-foreground">{apt.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground italic">No upcoming appointments</p>
            )}
          </div>

          {/* ── Journey Partners (from workspace journey-partners.md) ── */}
          {(() => {
            const activeTeam = journeyPartners?.activeTeam ?? [];
            return (
              <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <SectionHeader title="🤝 Journey Partners" {...sectionProps("partners")} />
                {editingSection === "partners" ? (
                  <div className="space-y-4">
                    {data.journeyPartners.map((partner, i) => (
                      <PartnerEdit
                        key={i}
                        partner={partner}
                        onChange={(updated) => {
                          const partners = [...data.journeyPartners];
                          partners[i] = updated;
                          updatePartners(partners);
                        }}
                        onRemove={() => updatePartners(data.journeyPartners.filter((_, idx) => idx !== i))}
                      />
                    ))}
                    <Button variant="outline" size="sm" onClick={() => updatePartners([...data.journeyPartners, { role: "", name: "", organization: "", contact: "", notes: "" }])}>
                      <Plus className="size-3.5 mr-1" /> Add Partner
                    </Button>
                  </div>
                ) : activeTeam.length > 0 ? (
                  <div className="divide-y divide-border">
                    {activeTeam.map((partner, i) => (
                      <div key={i} className="flex items-start gap-3 py-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #a8c0ff, #3f2b96)" }}
                        >
                          {initials(partner.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[13px] text-foreground font-medium">{partner.name}</p>
                              <p className="text-[12px] text-muted-foreground">
                                {partner.role}{partner.organization ? ` · ${partner.organization}` : ""}
                              </p>
                              {partner.services && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{partner.services}</p>
                              )}
                            </div>
                            {partner.contact && (
                              partner.contact.includes("@") ? (
                                <a href={`mailto:${partner.contact}`} className="shrink-0 p-1 rounded hover:bg-muted" aria-label={`Email ${partner.name}`}>
                                  <Mail className="size-4 text-muted-foreground" />
                                </a>
                              ) : (
                                <a href={`tel:${partner.contact}`} className="shrink-0 p-1 rounded hover:bg-muted" aria-label={`Call ${partner.name}`}>
                                  <Phone className="size-4 text-muted-foreground" />
                                </a>
                              )
                            )}
                          </div>
                          {partner.contact && (
                            <p className="text-[12px] text-muted-foreground mt-0.5">{partner.contact}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : data.journeyPartners.length > 0 ? (
                  /* Fallback: show partners from child-profile.md if journey-partners.md is empty */
                  <div className="divide-y divide-border">
                    {data.journeyPartners.map((partner, i) => (
                      <div key={i} className="flex items-start gap-3 py-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #a8c0ff, #3f2b96)" }}
                        >
                          {initials(partner.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[13px] text-foreground font-medium">{partner.name}</p>
                              <p className="text-[12px] text-muted-foreground">
                                {partner.role}{partner.organization ? ` · ${partner.organization}` : ""}
                              </p>
                            </div>
                            {partner.contact && (
                              partner.contact.includes("@") ? (
                                <a href={`mailto:${partner.contact}`} className="shrink-0 p-1 rounded hover:bg-muted" aria-label={`Email ${partner.name}`}>
                                  <Mail className="size-4 text-muted-foreground" />
                                </a>
                              ) : (
                                <a href={`tel:${partner.contact}`} className="shrink-0 p-1 rounded hover:bg-muted" aria-label={`Call ${partner.name}`}>
                                  <Phone className="size-4 text-muted-foreground" />
                                </a>
                              )
                            )}
                          </div>
                          {partner.contact && (
                            <p className="text-[12px] text-muted-foreground mt-0.5">{partner.contact}</p>
                          )}
                          {partner.notes && (
                            <p className="text-[12px] text-muted-foreground italic mt-1">{partner.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground italic">No journey partners listed</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </WorkspaceSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Edit sub-components ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function MedicationEdit({
  medication: med,
  onChange,
  onRemove,
}: {
  medication: Medication;
  onChange: (m: Medication) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={med.medication} onChange={(e) => onChange({ ...med, medication: (e.target as HTMLInputElement).value })} placeholder="Medication name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted" aria-label="Remove medication"><X className="size-3 text-status-blocked" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={med.dose} onChange={(e) => onChange({ ...med, dose: (e.target as HTMLInputElement).value })} placeholder="Dose" className="h-7 text-xs" />
        <Input value={med.frequency} onChange={(e) => onChange({ ...med, frequency: (e.target as HTMLInputElement).value })} placeholder="Frequency" className="h-7 text-xs" />
        <Input value={med.prescriber} onChange={(e) => onChange({ ...med, prescriber: (e.target as HTMLInputElement).value })} placeholder="Prescriber" className="h-7 text-xs" />
        <Input value={med.startDate} onChange={(e) => onChange({ ...med, startDate: (e.target as HTMLInputElement).value })} placeholder="Start date" className="h-7 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={med.status} onChange={(e) => onChange({ ...med, status: (e.target as HTMLInputElement).value })} placeholder="Status (e.g. Active)" className="h-7 text-xs" />
        <Input value={med.notes} onChange={(e) => onChange({ ...med, notes: (e.target as HTMLInputElement).value })} placeholder="Notes" className="h-7 text-xs" />
      </div>
    </div>
  );
}

function SupplementEdit({
  supplement: sup,
  onChange,
  onRemove,
}: {
  supplement: Supplement;
  onChange: (s: Supplement) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={sup.supplement} onChange={(e) => onChange({ ...sup, supplement: (e.target as HTMLInputElement).value })} placeholder="Supplement name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted" aria-label="Remove supplement"><X className="size-3 text-status-blocked" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={sup.dose} onChange={(e) => onChange({ ...sup, dose: (e.target as HTMLInputElement).value })} placeholder="Dose" className="h-7 text-xs" />
        <Input value={sup.frequency} onChange={(e) => onChange({ ...sup, frequency: (e.target as HTMLInputElement).value })} placeholder="Frequency" className="h-7 text-xs" />
      </div>
      <Input value={sup.notes} onChange={(e) => onChange({ ...sup, notes: (e.target as HTMLInputElement).value })} placeholder="Notes" className="h-7 text-xs" />
    </div>
  );
}

function DoctorEdit({
  doctor: doc,
  onChange,
  onRemove,
}: {
  doctor: Doctor;
  onChange: (d: Doctor) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={doc.name} onChange={(e) => onChange({ ...doc, name: (e.target as HTMLInputElement).value })} placeholder="Doctor name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted" aria-label="Remove doctor"><X className="size-3 text-status-blocked" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={doc.role} onChange={(e) => onChange({ ...doc, role: (e.target as HTMLInputElement).value })} placeholder="Role" className="h-7 text-xs" />
        <Input value={doc.organization} onChange={(e) => onChange({ ...doc, organization: (e.target as HTMLInputElement).value })} placeholder="Organization" className="h-7 text-xs" />
      </div>
      <Input value={doc.phone} onChange={(e) => onChange({ ...doc, phone: (e.target as HTMLInputElement).value })} placeholder="Phone" className="h-7 text-xs" />
    </div>
  );
}

function PartnerEdit({
  partner,
  onChange,
  onRemove,
}: {
  partner: JourneyPartner;
  onChange: (p: JourneyPartner) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={partner.name} onChange={(e) => onChange({ ...partner, name: (e.target as HTMLInputElement).value })} placeholder="Name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted" aria-label="Remove partner"><X className="size-3 text-status-blocked" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={partner.role} onChange={(e) => onChange({ ...partner, role: (e.target as HTMLInputElement).value })} placeholder="Role" className="h-7 text-xs" />
        <Input value={partner.organization} onChange={(e) => onChange({ ...partner, organization: (e.target as HTMLInputElement).value })} placeholder="Organization" className="h-7 text-xs" />
      </div>
      <Input value={partner.contact} onChange={(e) => onChange({ ...partner, contact: (e.target as HTMLInputElement).value })} placeholder="Contact (email or phone)" className="h-7 text-xs" />
      <Textarea value={partner.notes} onChange={(e) => onChange({ ...partner, notes: e.target.value })} placeholder="Notes..." rows={2} className="text-xs" />
    </div>
  );
}
