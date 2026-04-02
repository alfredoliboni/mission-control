"use client";

import { useState, useRef, useCallback } from "react";
import { useParsedProfile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import {
  Pencil,
  Check,
  X,
  Plus,
  AlertTriangle,
  FileText,
  Users,
  Mail,
  Phone,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "profile-edits";

const PILL = "bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full inline-block";

function splitEmoji(text: string): [string, string] {
  const emojiRegex =
    /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})+/u;
  const match = text.match(emojiRegex);
  if (match) {
    const emoji = match[0];
    const rest = text.slice(emoji.length).trim();
    return [emoji, rest || text];
  }
  return ["", text];
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function mergeEdits(profile: ParsedProfile, edits: Partial<ParsedProfile>): ParsedProfile {
  return {
    ...profile,
    basicInfo: { ...profile.basicInfo, ...(edits.basicInfo || {}) },
    personalProfile: { ...profile.personalProfile, ...(edits.personalProfile || {}) },
    medical: { ...profile.medical, ...(edits.medical || {}) },
    journeyPartners: edits.journeyPartners || profile.journeyPartners,
  };
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

// ── Editable Tag List ────────────────────────────────────────────────────

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
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => {
          const [emoji, text] = splitEmoji(item);
          return (
            <span key={i} className={PILL}>
              {emoji && <span className="mr-0.5">{emoji}</span>}
              {text}
            </span>
          );
        })}
        {items.length === 0 && (
          <span className="text-sm text-gray-400 italic">None listed</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className={`${PILL} pr-1 flex items-center gap-1`}>
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="rounded-full p-0.5 hover:bg-gray-200"
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
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <button onClick={onSave} className="p-1 rounded hover:bg-gray-100" aria-label="Save">
              <Check className="size-4 text-green-600" />
            </button>
            <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100" aria-label="Cancel">
              <X className="size-4 text-red-500" />
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            disabled={editingSection !== null}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            aria-label={`Edit ${title}`}
          >
            <Pencil className="size-3.5 text-gray-400 hover:text-gray-600" />
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
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      {isEditing && onChange ? (
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          className="h-7 text-sm mt-0.5"
        />
      ) : (
        <dd className="text-sm text-gray-800">{value || "—"}</dd>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Profile Page ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { data: profile, isLoading } = useParsedProfile();

  const initializedRef = useRef(false);
  const initialProfile = (() => {
    if (!profile) return null;
    if (initializedRef.current) return null;
    let merged = profile;
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        merged = mergeEdits(profile, JSON.parse(saved) as Partial<ParsedProfile>);
      }
    } catch { /* ignore */ }
    initializedRef.current = true;
    return merged;
  })();

  const [profileData, setProfileData] = useState<ParsedProfile | null>(null);
  const [snapshot, setSnapshot] = useState<ParsedProfile | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  if (initialProfile && !profileData) {
    setProfileData(initialProfile);
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

  const saveEditing = useCallback(() => {
    if (profileData) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
      } catch { /* quota */ }
    }
    setSnapshot(null);
    setEditingSection(null);
  }, [profileData]);

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

  // Shared edit-section props factory
  const sectionProps = (key: string) => ({
    sectionKey: key,
    editingSection,
    onEdit: () => startEditing(key),
    onSave: saveEditing,
    onCancel: cancelEditing,
  });

  const data = profileData;

  return (
    <WorkspaceSection title={data?.title || "Child Profile"} icon="👤" isLoading={isLoading}>
      {data && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full sm:w-auto" aria-label="Profile sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="extra">Extra Info</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              {/* Left column */}
              <div className="space-y-6">
                {/* Hero + Basic Info */}
                <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
                  <SectionHeader title="Basic Information" {...sectionProps("basic")} />

                  {/* Hero row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-700">
                      {initials(data.basicInfo.name)}
                    </div>
                    <div>
                      {editingSection === "basic" ? (
                        <Input
                          value={data.basicInfo.name}
                          onChange={(e) => updateBasicInfo("name", (e.target as HTMLInputElement).value)}
                          className="text-lg font-semibold h-9"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold text-gray-900">{data.basicInfo.name}</h3>
                      )}
                      <p className="text-sm text-gray-500">
                        {[data.basicInfo.age && `Age ${data.basicInfo.age}`, data.basicInfo.diagnosis]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                    <LabelValue label="Date of Birth" value={data.basicInfo.dateOfBirth} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("dateOfBirth", v)} inputType="date" />
                    <LabelValue label="Postal Code" value={data.basicInfo.postalCode} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("postalCode", v)} />
                    <LabelValue label="Location" value={data.basicInfo.location} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("location", v)} />
                    <LabelValue label="Family Language" value={data.basicInfo.familyLanguage} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("familyLanguage", v)} />
                    <LabelValue label="Current Stage" value={data.basicInfo.currentStage} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("currentStage", v)} />
                    <LabelValue label="Diagnosis" value={data.basicInfo.diagnosis} isEditing={editingSection === "basic"} onChange={(v) => updateBasicInfo("diagnosis", v)} />
                  </dl>
                </section>

                {/* Personal Profile */}
                <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
                  <SectionHeader title="Personal Profile" {...sectionProps("personal")} />

                  {/* Communication */}
                  <div className="mb-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Communication</h3>
                    {editingSection === "personal" ? (
                      <div className="space-y-2">
                        <Textarea value={data.personalProfile.communication} onChange={(e) => updatePersonal("communication", e.target.value)} className="text-sm" rows={2} />
                        <EditableTagList items={data.personalProfile.communicationStyles} onChange={(items) => updatePersonal("communicationStyles", items)} isEditing placeholder="Add style..." />
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-800 mb-1.5">{data.personalProfile.communication || "—"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.personalProfile.communicationStyles.map((s, i) => (
                            <span key={i} className={PILL}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interests */}
                  <div className="mb-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Interests</h3>
                    <EditableTagList items={data.personalProfile.interestsList} onChange={(items) => updatePersonal("interestsList", items)} isEditing={editingSection === "personal"} placeholder="Add interest..." />
                  </div>

                  {/* Sensory Profile */}
                  <div className="mb-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sensory Profile</h3>
                    {editingSection === "personal" ? (
                      <div className="space-y-3">
                        <Textarea value={data.personalProfile.sensory} onChange={(e) => updatePersonal("sensory", e.target.value)} className="text-sm" rows={2} />
                        {(["seeks", "avoids", "calming"] as const).map((key) => (
                          <div key={key}>
                            <p className="text-xs text-gray-500 capitalize mb-1">{key}</p>
                            <EditableTagList items={data.personalProfile.sensoryProfile[key]} onChange={(items) => updatePersonal("sensoryProfile", { ...data.personalProfile.sensoryProfile, [key]: items })} isEditing placeholder={`Add ${key}...`} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.personalProfile.sensory && (
                          <p className="text-sm text-gray-800">{data.personalProfile.sensory}</p>
                        )}
                        {(["seeks", "avoids", "calming"] as const).map((key) => {
                          const items = data.personalProfile.sensoryProfile[key];
                          if (items.length === 0) return null;
                          return (
                            <div key={key}>
                              <span className="text-xs text-gray-500 capitalize mr-2">{key}:</span>
                              {items.map((item, i) => (
                                <span key={i} className={`${PILL} mr-1 mb-1`}>{item}</span>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Personality */}
                  <div className="mb-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Personality</h3>
                    <EditableTagList items={data.personalProfile.personalityTraits} onChange={(items) => updatePersonal("personalityTraits", items)} isEditing={editingSection === "personal"} placeholder="Add trait..." />
                  </div>

                  {/* Strengths */}
                  <div className="mb-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Strengths</h3>
                    <EditableTagList items={data.personalProfile.strengthsList} onChange={(items) => updatePersonal("strengthsList", items)} isEditing={editingSection === "personal"} placeholder="Add strength..." />
                  </div>

                  {/* Challenges */}
                  <div className="mb-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Challenges</h3>
                    <EditableTagList items={data.personalProfile.challengesList} onChange={(items) => updatePersonal("challengesList", items)} isEditing={editingSection === "personal"} placeholder="Add challenge..." />
                  </div>

                  {/* Triggers */}
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Triggers</h3>
                    <EditableTagList items={data.personalProfile.triggers} onChange={(items) => updatePersonal("triggers", items)} isEditing={editingSection === "personal"} placeholder="Add trigger..." />
                  </div>
                </section>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Stats</h2>
                  <div className="space-y-3">
                    {data.basicInfo.age && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Age</span>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">{data.basicInfo.age}</Badge>
                      </div>
                    )}
                    {data.basicInfo.diagnosis && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Diagnosis</span>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">{data.basicInfo.diagnosis}</Badge>
                      </div>
                    )}
                    {data.basicInfo.currentStage && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Stage</span>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 capitalize">
                          {data.basicInfo.currentStage.replace(/-/g, " ")}
                        </Badge>
                      </div>
                    )}
                  </div>
                </section>

                {/* Journey Partners (compact) */}
                <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Journey Partners</h2>
                  {data.journeyPartners.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {data.journeyPartners.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                            {initials(p.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500 truncate">{p.role}{p.organization ? ` · ${p.organization}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No partners listed</p>
                  )}
                </section>
              </div>
            </div>
          </TabsContent>

          {/* ── MEDICAL ──────────────────────────────────────────────── */}
          <TabsContent value="medical" className="mt-4 space-y-6">
            {/* Unconfirmed Medications Warning */}
            {data.medical.unconfirmedMedications?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-amber-800">Unconfirmed Medications</h2>
                </div>
                <ul className="space-y-1">
                  {data.medical.unconfirmedMedications.map((med, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-amber-700">
                      <span aria-hidden="true">&#x26A0;&#xFE0F;</span> {med}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medications */}
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
              <SectionHeader title="Medications" {...sectionProps("medications")} />
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
                      <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="text-left py-2 pr-3 font-medium">Medication</th>
                        <th className="text-left py-2 pr-3 font-medium">Dose</th>
                        <th className="text-left py-2 pr-3 font-medium">Frequency</th>
                        <th className="text-left py-2 pr-3 font-medium">Status</th>
                        <th className="text-left py-2 font-medium">Prescriber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.medical.medications.map((med, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 text-gray-800 font-medium">{med.medication}</td>
                          <td className="py-2 pr-3 text-gray-600">{med.dose || "—"}</td>
                          <td className="py-2 pr-3 text-gray-600">{med.frequency || "—"}</td>
                          <td className="py-2 pr-3">
                            <span className={`${PILL} ${med.status?.toLowerCase().includes("active") ? "bg-green-50 text-green-700" : ""}`}>
                              {med.status || "Unknown"}
                            </span>
                          </td>
                          <td className="py-2 text-gray-600">{med.prescriber || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No medications listed</p>
              )}
            </section>

            {/* Supplements */}
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
              <SectionHeader title="Supplements" {...sectionProps("supplements")} />
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
                      <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="text-left py-2 pr-3 font-medium">Supplement</th>
                        <th className="text-left py-2 pr-3 font-medium">Dose</th>
                        <th className="text-left py-2 pr-3 font-medium">Frequency</th>
                        <th className="text-left py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.medical.supplements.map((sup, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 text-gray-800 font-medium">{sup.supplement}</td>
                          <td className="py-2 pr-3 text-gray-600">{sup.dose || "—"}</td>
                          <td className="py-2 pr-3 text-gray-600">{sup.frequency || "—"}</td>
                          <td className="py-2 text-gray-500 italic">{sup.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No supplements listed</p>
              )}
            </section>

            {/* Comorbid Conditions */}
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
              <SectionHeader title="Comorbid Conditions" {...sectionProps("comorbid")} />
              <EditableTagList
                items={data.medical.comorbidConditions}
                onChange={(items) => updateMedical("comorbidConditions", items)}
                isEditing={editingSection === "comorbid"}
                placeholder="Add condition..."
              />
            </section>

            {/* Doctors */}
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
              <SectionHeader title="Doctors & Specialists" {...sectionProps("doctors")} />
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
                <div className="divide-y divide-gray-50">
                  {data.medical.doctors.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm text-gray-800 font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.role}{doc.organization ? ` · ${doc.organization}` : ""}
                        </p>
                      </div>
                      {doc.phone && (
                        <a href={`tel:${doc.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          <Phone className="size-3" /> {doc.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No doctors listed</p>
              )}
            </section>

            {/* Appointments */}
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
              <SectionHeader title="Appointments" {...sectionProps("appointments")} />
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
                        className="p-1 rounded hover:bg-gray-100"
                        aria-label="Remove appointment"
                      >
                        <X className="size-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateMedical("appointments", [...data.medical.appointments, { date: "", description: "" }])}>
                    <Plus className="size-3.5 mr-1" /> Add Appointment
                  </Button>
                </div>
              ) : data.medical.appointments.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {data.medical.appointments.map((apt, i) => (
                    <div key={i} className="flex items-baseline gap-3 py-2">
                      <span className={PILL}>{apt.date}</span>
                      <span className="text-sm text-gray-800">{apt.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No upcoming appointments</p>
              )}
            </section>
          </TabsContent>

          {/* ── TEAM ─────────────────────────────────────────────────── */}
          <TabsContent value="team" className="mt-4">
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
              <SectionHeader title="Journey Partners" {...sectionProps("partners")} />
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
              ) : data.journeyPartners.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {data.journeyPartners.map((partner, i) => (
                    <div key={i} className="flex items-start gap-4 py-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                        {initials(partner.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-gray-800 font-medium">{partner.name}</p>
                            <p className="text-xs text-gray-500">
                              {partner.role}{partner.organization ? ` · ${partner.organization}` : ""}
                            </p>
                          </div>
                          {partner.contact && (
                            partner.contact.includes("@") ? (
                              <a href={`mailto:${partner.contact}`} className="shrink-0 p-1 rounded hover:bg-gray-100" aria-label={`Email ${partner.name}`}>
                                <Mail className="size-4 text-gray-400" />
                              </a>
                            ) : (
                              <a href={`tel:${partner.contact}`} className="shrink-0 p-1 rounded hover:bg-gray-100" aria-label={`Call ${partner.name}`}>
                                <Phone className="size-4 text-gray-400" />
                              </a>
                            )
                          )}
                        </div>
                        {partner.contact && (
                          <p className="text-xs text-gray-500 mt-0.5">{partner.contact}</p>
                        )}
                        {partner.notes && (
                          <p className="text-xs text-gray-500 italic mt-1">{partner.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No journey partners listed</p>
              )}
            </section>
          </TabsContent>

          {/* ── EXTRA INFO ───────────────────────────────────────────── */}
          <TabsContent value="extra" className="mt-4">
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
              <SectionHeader title="Extra Information" {...sectionProps("extrainfo")} />
              <p className="text-xs text-gray-500 mb-3">
                Anything else important about your child — daily routine, what works at home, things the navigator should know.
              </p>
              {editingSection === "extrainfo" ? (
                <Textarea
                  value={data.personalProfile.extraInfo || ""}
                  onChange={(e) => updatePersonal("extraInfo", e.target.value)}
                  className="text-sm"
                  rows={6}
                  placeholder="e.g. Alex does well with visual schedules. He needs extra time for transitions..."
                />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                  {data.personalProfile.extraInfo || (
                    <span className="text-gray-400 italic">No extra information added yet.</span>
                  )}
                </p>
              )}
            </section>
          </TabsContent>
        </Tabs>
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
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={med.medication} onChange={(e) => onChange({ ...med, medication: (e.target as HTMLInputElement).value })} placeholder="Medication name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200" aria-label="Remove medication"><X className="size-3 text-red-400" /></button>
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
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={sup.supplement} onChange={(e) => onChange({ ...sup, supplement: (e.target as HTMLInputElement).value })} placeholder="Supplement name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200" aria-label="Remove supplement"><X className="size-3 text-red-400" /></button>
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
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={doc.name} onChange={(e) => onChange({ ...doc, name: (e.target as HTMLInputElement).value })} placeholder="Doctor name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200" aria-label="Remove doctor"><X className="size-3 text-red-400" /></button>
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
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={partner.name} onChange={(e) => onChange({ ...partner, name: (e.target as HTMLInputElement).value })} placeholder="Name" className="h-7 text-sm flex-1" />
        <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200" aria-label="Remove partner"><X className="size-3 text-red-400" /></button>
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
