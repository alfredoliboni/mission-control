"use client";

import { useState, useRef, useCallback } from "react";
import { useParsedProfile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  MessageCircle,
  Eye,
  Sparkles,
  Heart,
  Brain,
  Zap,
  Shield,
  AlertTriangle,
  Pill,
  Stethoscope,
  Calendar,
  Users,
  Mail,
  Phone,
  MapPin,
  Cake,
  Activity,
  Plus,
  FileText,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "profile-edits";

/** Split leading emoji(s) from label text: "🚂 Trains" -> ["🚂", "Trains"] */
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

/** Strip the "Label — description" pattern to just "Label" for badge text */
function extractBadgeLabel(text: string): { label: string; description: string } {
  const parts = text.split(/\s*[—–-]\s*/);
  if (parts.length >= 2) {
    return { label: parts[0].trim(), description: parts.slice(1).join(" - ").trim() };
  }
  return { label: text.trim(), description: "" };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Merge saved edits from localStorage onto profile data */
function mergeEdits(profile: ParsedProfile, edits: Partial<ParsedProfile>): ParsedProfile {
  return {
    ...profile,
    basicInfo: { ...profile.basicInfo, ...(edits.basicInfo || {}) },
    personalProfile: { ...profile.personalProfile, ...(edits.personalProfile || {}) },
    medical: { ...profile.medical, ...(edits.medical || {}) },
    journeyPartners: edits.journeyPartners || profile.journeyPartners,
  };
}

// ── Role color mapping for journey partners ─────────────────────────────

function getRoleBadgeClasses(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("teacher") || r.includes("educator")) return "bg-blue-100 text-blue-700";
  if (r.includes("ot") || r.includes("occupational")) return "bg-green-100 text-green-700";
  if (r.includes("slp") || r.includes("speech")) return "bg-purple-100 text-purple-700";
  if (r.includes("case") || r.includes("worker") || r.includes("coordinator"))
    return "bg-amber-100 text-amber-700";
  if (r.includes("psych")) return "bg-rose-100 text-rose-700";
  if (r.includes("doctor") || r.includes("pediatric") || r.includes("physician"))
    return "bg-teal-100 text-teal-700";
  return "bg-warm-200 text-warm-500";
}

// ── Stage color mapping ─────────────────────────────────────────────────

function getStageBadgeClasses(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes("1") || s.includes("initial") || s.includes("diagnosis"))
    return "bg-blue-100 text-blue-700";
  if (s.includes("2") || s.includes("assessment")) return "bg-amber-100 text-amber-700";
  if (s.includes("3") || s.includes("intervention")) return "bg-green-100 text-green-700";
  if (s.includes("4") || s.includes("school")) return "bg-purple-100 text-purple-700";
  return "bg-warm-200 text-warm-500";
}

// ── Editable Tag List ────────────────────────────────────────────────────

function EditableTagList({
  items,
  onChange,
  isEditing,
  tagClassName = "bg-secondary text-secondary-foreground",
  placeholder = "Add new...",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  isEditing: boolean;
  tagClassName?: string;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState("");

  if (!isEditing) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => {
          const [emoji, text] = splitEmoji(item);
          return (
            <Badge key={i} variant="secondary" className={tagClassName}>
              {emoji && <span className="mr-0.5">{emoji}</span>}
              {text}
            </Badge>
          );
        })}
        {items.length === 0 && (
          <span className="text-sm text-muted-foreground italic">None listed</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className={`${tagClassName} pr-1`}>
            <span className="mr-1">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="size-3" />
            </button>
          </Badge>
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

// ── Section Edit Wrapper ─────────────────────────────────────────────────

function SectionEditWrapper({
  sectionKey,
  editingSection,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  sectionKey: string;
  editingSection: string | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const isEditing = editingSection === sectionKey;

  return (
    <div
      className={`relative rounded-xl transition-all ${
        isEditing ? "ring-2 ring-primary/20 bg-primary/5 p-4" : ""
      }`}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon-xs" onClick={onSave} title="Save">
              <Check className="size-3.5 text-status-success" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={onCancel} title="Cancel">
              <X className="size-3.5 text-status-blocked" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onEdit}
            title="Edit"
            disabled={editingSection !== null}
          >
            <Pencil className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Profile Page ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { data: profile, isLoading } = useParsedProfile();

  // Track if we've initialized from the hook data
  const initializedRef = useRef(false);

  // Compute the initial profile data from hook + localStorage
  const initialProfile = (() => {
    if (!profile) return null;
    if (initializedRef.current) return null; // already initialized
    let merged = profile;
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        const edits = JSON.parse(saved) as Partial<ParsedProfile>;
        merged = mergeEdits(profile, edits);
      }
    } catch {
      // Ignore parse errors
    }
    initializedRef.current = true;
    return merged;
  })();

  // Working copy of profile data
  const [profileData, setProfileData] = useState<ParsedProfile | null>(null);
  // Snapshot for cancel
  const [snapshot, setSnapshot] = useState<ParsedProfile | null>(null);
  // Which section is being edited
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Initialize on first data load (without useEffect + setState)
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
      } catch {
        // Quota exceeded — silently fail
      }
    }
    setSnapshot(null);
    setEditingSection(null);
  }, [profileData]);

  // Shorthand updaters
  const updateBasicInfo = useCallback(
    (field: keyof ProfileBasicInfo, value: string) => {
      setProfileData((prev) => {
        if (!prev) return prev;
        return { ...prev, basicInfo: { ...prev.basicInfo, [field]: value } };
      });
    },
    []
  );

  const updatePersonal = useCallback(
    (field: keyof ProfilePersonal, value: ProfilePersonal[keyof ProfilePersonal]) => {
      setProfileData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          personalProfile: { ...prev.personalProfile, [field]: value },
        };
      });
    },
    []
  );

  const updateMedical = useCallback(
    (field: keyof ProfileMedical, value: ProfileMedical[keyof ProfileMedical]) => {
      setProfileData((prev) => {
        if (!prev) return prev;
        return { ...prev, medical: { ...prev.medical, [field]: value } };
      });
    },
    []
  );

  const updatePartners = useCallback((partners: JourneyPartner[]) => {
    setProfileData((prev) => {
      if (!prev) return prev;
      return { ...prev, journeyPartners: partners };
    });
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  const data = profileData;

  return (
    <WorkspaceSection
      title={data?.title || "Child Profile"}
      icon="👤"
      isLoading={isLoading}
    >
      {data && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interests">Interests</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          {/* ── TAB 1: OVERVIEW ─────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4">
            <Card className="overflow-hidden">
              {/* ── Hero ── */}
              <SectionEditWrapper
                sectionKey="hero"
                editingSection={editingSection}
                onEdit={() => startEditing("hero")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-5">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-warm-100 text-2xl font-bold text-foreground">
                      {data.basicInfo.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="space-y-1.5">
                      {editingSection === "hero" ? (
                        <Input value={data.basicInfo.name} onChange={(e) => updateBasicInfo("name", (e.target as HTMLInputElement).value)} className="text-xl font-bold h-9" />
                      ) : (
                        <h2 className="text-xl font-bold text-foreground font-heading">{data.basicInfo.name}</h2>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {data.basicInfo.age && <span>Age {data.basicInfo.age}</span>}
                        {data.basicInfo.diagnosis && <span>{data.basicInfo.diagnosis}</span>}
                        {data.basicInfo.currentStage && <span className="capitalize">{data.basicInfo.currentStage.replace(/-/g, " ")}</span>}
                        {data.basicInfo.postalCode && <span>{data.basicInfo.postalCode}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionEditWrapper>

              <Separator />

              {/* ── Communication ── */}
              <SectionEditWrapper
                sectionKey="communication"
                editingSection={editingSection}
                onEdit={() => startEditing("communication")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div className="px-6 py-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <MessageCircle className="size-4 text-muted-foreground" />
                    Communication
                  </h3>
                  {editingSection === "communication" ? (
                    <div className="space-y-3">
                      <Textarea value={data.personalProfile.communication} onChange={(e) => updatePersonal("communication", e.target.value)} className="text-sm" rows={2} />
                      <EditableTagList items={data.personalProfile.communicationStyles} onChange={(items) => updatePersonal("communicationStyles", items)} isEditing={true} tagClassName="bg-warm-100 text-foreground" placeholder="Add style..." />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">{data.personalProfile.communication}</p>
                      {data.personalProfile.communicationStyles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {data.personalProfile.communicationStyles.map((style, i) => (
                            <Badge key={i} variant="secondary" className="bg-warm-100 text-foreground font-normal">{style}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SectionEditWrapper>

              <Separator />

              {/* ── Sensory ── */}
              <SectionEditWrapper
                sectionKey="sensory"
                editingSection={editingSection}
                onEdit={() => startEditing("sensory")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div className="px-6 py-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Eye className="size-4 text-muted-foreground" />
                    Sensory Profile
                  </h3>
                  {editingSection === "sensory" ? (
                    <div className="space-y-4">
                      <Textarea value={data.personalProfile.sensory} onChange={(e) => updatePersonal("sensory", e.target.value)} className="text-sm" rows={2} />
                      {(["seeks", "avoids", "calming"] as const).map((key) => (
                        <div key={key}>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5 capitalize">{key}</p>
                          <EditableTagList items={data.personalProfile.sensoryProfile[key]} onChange={(items) => updatePersonal("sensoryProfile", { ...data.personalProfile.sensoryProfile, [key]: items })} isEditing={true} tagClassName="bg-warm-100 text-foreground" placeholder={`Add ${key}...`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(["seeks", "avoids", "calming"] as const).map((key) => {
                        const items = data.personalProfile.sensoryProfile[key];
                        if (items.length === 0) return null;
                        return (
                          <div key={key}>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5 capitalize">{key}</p>
                            <div className="flex flex-wrap gap-1">
                              {items.map((item, i) => (
                                <Badge key={i} variant="secondary" className="bg-warm-100 text-foreground font-normal text-xs">{item}</Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SectionEditWrapper>

              <Separator />

              {/* ── Personality ── */}
              <SectionEditWrapper
                sectionKey="personality"
                editingSection={editingSection}
                onEdit={() => startEditing("personality")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div className="px-6 py-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Heart className="size-4 text-muted-foreground" />
                    Personality
                  </h3>
                  {editingSection === "personality" ? (
                    <EditableTagList items={data.personalProfile.personalityTraits} onChange={(items) => updatePersonal("personalityTraits", items)} isEditing={true} tagClassName="bg-warm-100 text-foreground" placeholder="Add trait..." />
                  ) : (
                    <div className="space-y-1.5">
                      {data.personalProfile.personalityTraits.map((trait, i) => {
                        const { label, description } = extractBadgeLabel(trait);
                        return (
                          <div key={i} className="flex items-baseline gap-2 text-sm">
                            <span className="font-medium text-foreground">{label}</span>
                            {description && <span className="text-muted-foreground">{description}</span>}
                          </div>
                        );
                      })}
                      {data.personalProfile.personalityTraits.length === 0 && (
                        <span className="text-sm text-muted-foreground italic">None listed</span>
                      )}
                    </div>
                  )}
                </div>
              </SectionEditWrapper>

              <Separator />

              {/* ── Quick Facts ── */}
              <SectionEditWrapper
                sectionKey="quickfacts"
                editingSection={editingSection}
                onEdit={() => startEditing("quickfacts")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div className="px-6 py-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="size-4 text-muted-foreground" />
                    Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <QuickFactRow icon={<MapPin className="size-4 text-muted-foreground" />} label="Postal Code" value={data.basicInfo.postalCode} isEditing={editingSection === "quickfacts"} onChange={(val) => updateBasicInfo("postalCode", val)} />
                    <QuickFactRow icon={<Cake className="size-4 text-muted-foreground" />} label="Date of Birth" value={data.basicInfo.dateOfBirth} isEditing={editingSection === "quickfacts"} onChange={(val) => updateBasicInfo("dateOfBirth", val)} inputType="date" />
                    <QuickFactRow icon={<Activity className="size-4 text-muted-foreground" />} label="Current Stage" value={data.basicInfo.currentStage} isEditing={editingSection === "quickfacts"} onChange={(val) => updateBasicInfo("currentStage", val)} />
                  </div>
                </div>
              </SectionEditWrapper>

              <Separator />

              {/* ── Extra Information ── */}
              <SectionEditWrapper
                sectionKey="extrainfo"
                editingSection={editingSection}
                onEdit={() => startEditing("extrainfo")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div className="px-6 py-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    Extra Information
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Anything else important about your child — daily routine, what works at home, things the navigator should know.
                  </p>
                  {editingSection === "extrainfo" ? (
                    <Textarea
                      value={data.personalProfile.extraInfo || ""}
                      onChange={(e) => updatePersonal("extraInfo", e.target.value)}
                      className="text-sm"
                      rows={4}
                      placeholder="e.g. Alex does well with visual schedules. He needs extra time for transitions..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {data.personalProfile.extraInfo || <span className="italic">No extra information added yet. Click ✏️ to add notes.</span>}
                    </p>
                  )}
                </div>
              </SectionEditWrapper>
            </Card>
          </TabsContent>

          {/* ── TAB 2: INTERESTS & PERSONALITY ──────────────────────── */}
          <TabsContent value="interests" className="mt-4 space-y-6">
            {/* Interests Grid */}
            <SectionEditWrapper
              sectionKey="interests"
              editingSection={editingSection}
              onEdit={() => startEditing("interests")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Interests
                </h3>
                {editingSection === "interests" ? (
                  <EditableTagList
                    items={data.personalProfile.interestsList}
                    onChange={(items) => updatePersonal("interestsList", items)}
                    isEditing={true}
                    tagClassName="bg-primary/10 text-primary"
                    placeholder="Add interest (e.g., 🎵 Music)..."
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {data.personalProfile.interestsList.map((interest, i) => {
                      const [emoji, text] = splitEmoji(interest);
                      return (
                        <Card
                          key={i}
                          size="sm"
                          className="flex flex-col items-center justify-center py-4 px-3 text-center hover:ring-primary/30 hover:ring-2 transition-all cursor-default"
                        >
                          {emoji ? (
                            <span className="text-3xl mb-1.5">{emoji}</span>
                          ) : (
                            <span className="text-3xl mb-1.5">
                              <Sparkles className="size-7 text-primary" />
                            </span>
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {text}
                          </span>
                        </Card>
                      );
                    })}
                    {data.personalProfile.interestsList.length === 0 && (
                      <p className="col-span-full text-sm text-muted-foreground italic">
                        No interests listed yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionEditWrapper>

            {/* Strengths & Challenges Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Strengths */}
              <SectionEditWrapper
                sectionKey="strengths"
                editingSection={editingSection}
                onEdit={() => startEditing("strengths")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="size-5 text-status-success" />
                    Strengths
                  </h3>
                  {editingSection === "strengths" ? (
                    <EditableTagList
                      items={data.personalProfile.strengthsList}
                      onChange={(items) => updatePersonal("strengthsList", items)}
                      isEditing={true}
                      tagClassName="bg-green-50 text-green-700"
                      placeholder="Add strength..."
                    />
                  ) : (
                    <div className="space-y-2">
                      {data.personalProfile.strengthsList.map((item, i) => {
                        const [emoji, text] = splitEmoji(item);
                        return (
                          <Card
                            key={i}
                            size="sm"
                            className="border-l-4 border-l-status-success"
                          >
                            <CardContent className="flex items-start gap-2 py-2">
                              <span className="text-lg shrink-0">
                                {emoji || "💚"}
                              </span>
                              <span className="text-sm text-foreground leading-relaxed">
                                {text}
                              </span>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {data.personalProfile.strengthsList.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          No strengths listed
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </SectionEditWrapper>

              {/* Challenges */}
              <SectionEditWrapper
                sectionKey="challenges"
                editingSection={editingSection}
                onEdit={() => startEditing("challenges")}
                onSave={saveEditing}
                onCancel={cancelEditing}
              >
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Brain className="size-5 text-status-caution" />
                    Challenges
                  </h3>
                  {editingSection === "challenges" ? (
                    <EditableTagList
                      items={data.personalProfile.challengesList}
                      onChange={(items) => updatePersonal("challengesList", items)}
                      isEditing={true}
                      tagClassName="bg-amber-50 text-amber-700"
                      placeholder="Add challenge..."
                    />
                  ) : (
                    <div className="space-y-2">
                      {data.personalProfile.challengesList.map((item, i) => {
                        const [emoji, text] = splitEmoji(item);
                        return (
                          <Card
                            key={i}
                            size="sm"
                            className="border-l-4 border-l-status-caution"
                          >
                            <CardContent className="flex items-start gap-2 py-2">
                              <span className="text-lg shrink-0">
                                {emoji || "🔶"}
                              </span>
                              <span className="text-sm text-foreground leading-relaxed">
                                {text}
                              </span>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {data.personalProfile.challengesList.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          No challenges listed
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </SectionEditWrapper>
            </div>

            {/* Triggers Section */}
            <SectionEditWrapper
              sectionKey="triggers"
              editingSection={editingSection}
              onEdit={() => startEditing("triggers")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-500" />
                  Triggers
                </h3>
                {editingSection === "triggers" ? (
                  <EditableTagList
                    items={data.personalProfile.triggers}
                    onChange={(items) => updatePersonal("triggers", items)}
                    isEditing={true}
                    tagClassName="bg-amber-50 text-amber-800"
                    placeholder="Add trigger..."
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.personalProfile.triggers.map((trigger, i) => {
                      const [emoji, text] = splitEmoji(trigger);
                      return (
                        <Card
                          key={i}
                          size="sm"
                          className="bg-amber-50/50 ring-amber-200/50"
                        >
                          <CardContent className="flex items-start gap-2 py-3">
                            <span className="text-lg shrink-0">{emoji || "⚡"}</span>
                            <span className="text-sm text-amber-900 leading-relaxed">
                              {text}
                            </span>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {data.personalProfile.triggers.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No triggers listed
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionEditWrapper>
          </TabsContent>

          {/* ── TAB 3: MEDICAL ──────────────────────────────────────── */}
          <TabsContent value="medical" className="mt-4 space-y-6">
            {/* Medications */}
            <SectionEditWrapper
              sectionKey="medications"
              editingSection={editingSection}
              onEdit={() => startEditing("medications")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Pill className="size-5 text-primary" />
                  Medications
                </h3>
                {editingSection === "medications" ? (
                  <div className="space-y-3">
                    {data.medical.medications.map((med, i) => (
                      <MedicationCardEdit
                        key={i}
                        medication={med}
                        onChange={(updated) => {
                          const meds = [...data.medical.medications];
                          meds[i] = updated;
                          updateMedical("medications", meds);
                        }}
                        onRemove={() => {
                          updateMedical(
                            "medications",
                            data.medical.medications.filter((_, idx) => idx !== i)
                          );
                        }}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMedical("medications", [
                          ...data.medical.medications,
                          {
                            medication: "",
                            dose: "",
                            frequency: "",
                            prescriber: "",
                            startDate: "",
                            status: "Active",
                            notes: "",
                          },
                        ])
                      }
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add Medication
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.medical.medications.map((med, i) => (
                      <MedicationCard key={i} medication={med} />
                    ))}
                    {data.medical.medications.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No medications listed
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionEditWrapper>

            {/* Supplements */}
            <SectionEditWrapper
              sectionKey="supplements"
              editingSection={editingSection}
              onEdit={() => startEditing("supplements")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="size-5 text-teal-600" />
                  Supplements
                </h3>
                {editingSection === "supplements" ? (
                  <div className="space-y-3">
                    {data.medical.supplements.map((sup, i) => (
                      <SupplementCardEdit
                        key={i}
                        supplement={sup}
                        onChange={(updated) => {
                          const sups = [...data.medical.supplements];
                          sups[i] = updated;
                          updateMedical("supplements", sups);
                        }}
                        onRemove={() => {
                          updateMedical(
                            "supplements",
                            data.medical.supplements.filter((_, idx) => idx !== i)
                          );
                        }}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMedical("supplements", [
                          ...data.medical.supplements,
                          { supplement: "", dose: "", frequency: "", notes: "" },
                        ])
                      }
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add Supplement
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.medical.supplements.map((sup, i) => (
                      <SupplementCard key={i} supplement={sup} />
                    ))}
                    {data.medical.supplements.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No supplements listed
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionEditWrapper>

            {/* Comorbid Conditions */}
            <SectionEditWrapper
              sectionKey="comorbid"
              editingSection={editingSection}
              onEdit={() => startEditing("comorbid")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Activity className="size-5 text-rose-500" />
                  Comorbid Conditions
                </h3>
                <EditableTagList
                  items={data.medical.comorbidConditions}
                  onChange={(items) => updateMedical("comorbidConditions", items)}
                  isEditing={editingSection === "comorbid"}
                  tagClassName="bg-rose-50 text-rose-700"
                  placeholder="Add condition..."
                />
              </div>
            </SectionEditWrapper>

            {/* Doctors */}
            <SectionEditWrapper
              sectionKey="doctors"
              editingSection={editingSection}
              onEdit={() => startEditing("doctors")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Stethoscope className="size-5 text-primary" />
                  Doctors & Specialists
                </h3>
                {editingSection === "doctors" ? (
                  <div className="space-y-3">
                    {data.medical.doctors.map((doc, i) => (
                      <DoctorCardEdit
                        key={i}
                        doctor={doc}
                        onChange={(updated) => {
                          const docs = [...data.medical.doctors];
                          docs[i] = updated;
                          updateMedical("doctors", docs);
                        }}
                        onRemove={() => {
                          updateMedical(
                            "doctors",
                            data.medical.doctors.filter((_, idx) => idx !== i)
                          );
                        }}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMedical("doctors", [
                          ...data.medical.doctors,
                          { role: "", name: "", organization: "", phone: "" },
                        ])
                      }
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add Doctor
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.medical.doctors.map((doc, i) => (
                      <DoctorCard key={i} doctor={doc} />
                    ))}
                    {data.medical.doctors.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No doctors listed
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionEditWrapper>

            {/* Appointments */}
            <SectionEditWrapper
              sectionKey="appointments"
              editingSection={editingSection}
              onEdit={() => startEditing("appointments")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="size-5 text-primary" />
                  Appointments
                </h3>
                {editingSection === "appointments" ? (
                  <div className="space-y-3">
                    {data.medical.appointments.map((apt, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Input
                          value={apt.date}
                          onChange={(e) => {
                            const apts = [...data.medical.appointments];
                            apts[i] = {
                              ...apts[i],
                              date: (e.target as HTMLInputElement).value,
                            };
                            updateMedical("appointments", apts);
                          }}
                          className="h-7 w-32 text-xs shrink-0"
                          placeholder="Date..."
                        />
                        <Input
                          value={apt.description}
                          onChange={(e) => {
                            const apts = [...data.medical.appointments];
                            apts[i] = {
                              ...apts[i],
                              description: (e.target as HTMLInputElement).value,
                            };
                            updateMedical("appointments", apts);
                          }}
                          className="h-7 text-sm flex-1"
                          placeholder="Description..."
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            updateMedical(
                              "appointments",
                              data.medical.appointments.filter(
                                (_, idx) => idx !== i
                              )
                            )
                          }
                        >
                          <X className="size-3 text-status-blocked" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMedical("appointments", [
                          ...data.medical.appointments,
                          { date: "", description: "" },
                        ])
                      }
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="relative space-y-0">
                    {data.medical.appointments.map((apt, i) => (
                      <div key={i} className="flex items-start gap-4 py-3">
                        {/* Timeline dot + line */}
                        <div className="relative flex flex-col items-center">
                          <div className="size-3 rounded-full bg-primary ring-4 ring-primary/10 shrink-0 mt-0.5" />
                          {i < data.medical.appointments.length - 1 && (
                            <div className="w-px flex-1 bg-primary/20 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary mb-1"
                          >
                            {apt.date}
                          </Badge>
                          <p className="text-sm text-foreground">{apt.description}</p>
                        </div>
                      </div>
                    ))}
                    {data.medical.appointments.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No upcoming appointments
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionEditWrapper>
          </TabsContent>

          {/* ── TAB 4: TEAM (Journey Partners) ──────────────────────── */}
          <TabsContent value="team" className="mt-4 space-y-6">
            <SectionEditWrapper
              sectionKey="partners"
              editingSection={editingSection}
              onEdit={() => startEditing("partners")}
              onSave={saveEditing}
              onCancel={cancelEditing}
            >
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  Journey Partners
                </h3>
                {editingSection === "partners" ? (
                  <div className="space-y-4">
                    {data.journeyPartners.map((partner, i) => (
                      <PartnerCardEdit
                        key={i}
                        partner={partner}
                        onChange={(updated) => {
                          const partners = [...data.journeyPartners];
                          partners[i] = updated;
                          updatePartners(partners);
                        }}
                        onRemove={() => {
                          updatePartners(
                            data.journeyPartners.filter((_, idx) => idx !== i)
                          );
                        }}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updatePartners([
                          ...data.journeyPartners,
                          {
                            role: "",
                            name: "",
                            organization: "",
                            contact: "",
                            notes: "",
                          },
                        ])
                      }
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add Partner
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {data.journeyPartners.map((partner, i) => (
                      <PartnerCard key={i} partner={partner} />
                    ))}
                    {data.journeyPartners.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No journey partners listed
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionEditWrapper>
          </TabsContent>
        </Tabs>
      )}
    </WorkspaceSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Sub-components ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// ── Quick Fact Row ────────────────────────────────────────────────────────

function QuickFactRow({
  icon,
  label,
  value,
  isEditing,
  onChange,
  inputType = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (val: string) => void;
  inputType?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isEditing ? (
          <Input
            type={inputType}
            value={value}
            onChange={(e) => onChange((e.target as HTMLInputElement).value)}
            className="h-7 text-sm mt-0.5"
          />
        ) : (
          <p className="text-sm font-medium text-foreground">{value || "—"}</p>
        )}
      </div>
    </div>
  );
}

// ── Medication Card (View) ───────────────────────────────────────────────

function MedicationCard({ medication: med }: { medication: Medication }) {
  const isActive = med.status?.toLowerCase().includes("active");

  return (
    <Card size="sm">
      <CardContent className="space-y-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground text-sm">{med.medication}</p>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`size-2 rounded-full ${
                isActive ? "bg-status-success" : "bg-warm-300"
              }`}
            />
            <span
              className={`text-xs ${
                isActive ? "text-status-success" : "text-warm-400"
              }`}
            >
              {med.status || "Unknown"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {med.dose && (
            <Badge variant="outline" className="text-xs">
              {med.dose}
            </Badge>
          )}
          {med.frequency && (
            <Badge variant="secondary" className="text-xs">
              {med.frequency}
            </Badge>
          )}
        </div>
        {med.prescriber && (
          <p className="text-xs text-muted-foreground">
            Prescribed by {med.prescriber}
          </p>
        )}
        {med.startDate && (
          <p className="text-xs text-muted-foreground">
            Started: {med.startDate}
          </p>
        )}
        {med.notes && (
          <p className="text-xs text-muted-foreground italic">{med.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Medication Card (Edit) ───────────────────────────────────────────────

function MedicationCardEdit({
  medication: med,
  onChange,
  onRemove,
}: {
  medication: Medication;
  onChange: (med: Medication) => void;
  onRemove: () => void;
}) {
  return (
    <Card size="sm" className="bg-primary/5">
      <CardContent className="space-y-2 pt-3">
        <div className="flex items-center gap-2">
          <Input
            value={med.medication}
            onChange={(e) =>
              onChange({ ...med, medication: (e.target as HTMLInputElement).value })
            }
            placeholder="Medication name"
            className="h-7 text-sm flex-1"
          />
          <Button variant="ghost" size="icon-xs" onClick={onRemove}>
            <X className="size-3 text-status-blocked" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={med.dose}
            onChange={(e) =>
              onChange({ ...med, dose: (e.target as HTMLInputElement).value })
            }
            placeholder="Dose"
            className="h-7 text-xs"
          />
          <Input
            value={med.frequency}
            onChange={(e) =>
              onChange({ ...med, frequency: (e.target as HTMLInputElement).value })
            }
            placeholder="Frequency"
            className="h-7 text-xs"
          />
          <Input
            value={med.prescriber}
            onChange={(e) =>
              onChange({ ...med, prescriber: (e.target as HTMLInputElement).value })
            }
            placeholder="Prescriber"
            className="h-7 text-xs"
          />
          <Input
            value={med.startDate}
            onChange={(e) =>
              onChange({ ...med, startDate: (e.target as HTMLInputElement).value })
            }
            placeholder="Start date"
            className="h-7 text-xs"
          />
        </div>
        <Input
          value={med.status}
          onChange={(e) =>
            onChange({ ...med, status: (e.target as HTMLInputElement).value })
          }
          placeholder="Status (e.g., Active)"
          className="h-7 text-xs"
        />
        <Input
          value={med.notes}
          onChange={(e) =>
            onChange({ ...med, notes: (e.target as HTMLInputElement).value })
          }
          placeholder="Notes"
          className="h-7 text-xs"
        />
      </CardContent>
    </Card>
  );
}

// ── Supplement Card (View) ───────────────────────────────────────────────

function SupplementCard({ supplement: sup }: { supplement: Supplement }) {
  return (
    <Card size="sm" className="border-l-4 border-l-teal-400">
      <CardContent className="space-y-2 pt-3">
        <p className="font-medium text-foreground text-sm">{sup.supplement}</p>
        <div className="flex flex-wrap gap-1.5">
          {sup.dose && (
            <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
              {sup.dose}
            </Badge>
          )}
          {sup.frequency && (
            <Badge variant="secondary" className="text-xs">
              {sup.frequency}
            </Badge>
          )}
        </div>
        {sup.notes && (
          <p className="text-xs text-muted-foreground italic">{sup.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Supplement Card (Edit) ───────────────────────────────────────────────

function SupplementCardEdit({
  supplement: sup,
  onChange,
  onRemove,
}: {
  supplement: Supplement;
  onChange: (s: Supplement) => void;
  onRemove: () => void;
}) {
  return (
    <Card size="sm" className="bg-teal-50/50">
      <CardContent className="space-y-2 pt-3">
        <div className="flex items-center gap-2">
          <Input
            value={sup.supplement}
            onChange={(e) =>
              onChange({ ...sup, supplement: (e.target as HTMLInputElement).value })
            }
            placeholder="Supplement name"
            className="h-7 text-sm flex-1"
          />
          <Button variant="ghost" size="icon-xs" onClick={onRemove}>
            <X className="size-3 text-status-blocked" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={sup.dose}
            onChange={(e) =>
              onChange({ ...sup, dose: (e.target as HTMLInputElement).value })
            }
            placeholder="Dose"
            className="h-7 text-xs"
          />
          <Input
            value={sup.frequency}
            onChange={(e) =>
              onChange({ ...sup, frequency: (e.target as HTMLInputElement).value })
            }
            placeholder="Frequency"
            className="h-7 text-xs"
          />
        </div>
        <Input
          value={sup.notes}
          onChange={(e) =>
            onChange({ ...sup, notes: (e.target as HTMLInputElement).value })
          }
          placeholder="Notes"
          className="h-7 text-xs"
        />
      </CardContent>
    </Card>
  );
}

// ── Doctor Card (View) ───────────────────────────────────────────────────

function DoctorCard({ doctor: doc }: { doctor: Doctor }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground text-sm">{doc.name}</p>
            <Badge
              variant="secondary"
              className={`mt-1 text-xs ${getRoleBadgeClasses(doc.role)}`}
            >
              {doc.role}
            </Badge>
          </div>
          {doc.phone && (
            <a
              href={`tel:${doc.phone}`}
              className="shrink-0"
              title="Call"
            >
              <Button variant="ghost" size="icon-xs">
                <Phone className="size-3.5 text-primary" />
              </Button>
            </a>
          )}
        </div>
        {doc.organization && (
          <p className="text-xs text-muted-foreground">{doc.organization}</p>
        )}
        {doc.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="size-3" />
            {doc.phone}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Doctor Card (Edit) ───────────────────────────────────────────────────

function DoctorCardEdit({
  doctor: doc,
  onChange,
  onRemove,
}: {
  doctor: Doctor;
  onChange: (d: Doctor) => void;
  onRemove: () => void;
}) {
  return (
    <Card size="sm" className="bg-primary/5">
      <CardContent className="space-y-2 pt-3">
        <div className="flex items-center gap-2">
          <Input
            value={doc.name}
            onChange={(e) =>
              onChange({ ...doc, name: (e.target as HTMLInputElement).value })
            }
            placeholder="Doctor name"
            className="h-7 text-sm flex-1"
          />
          <Button variant="ghost" size="icon-xs" onClick={onRemove}>
            <X className="size-3 text-status-blocked" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={doc.role}
            onChange={(e) =>
              onChange({ ...doc, role: (e.target as HTMLInputElement).value })
            }
            placeholder="Role"
            className="h-7 text-xs"
          />
          <Input
            value={doc.organization}
            onChange={(e) =>
              onChange({ ...doc, organization: (e.target as HTMLInputElement).value })
            }
            placeholder="Organization"
            className="h-7 text-xs"
          />
        </div>
        <Input
          value={doc.phone}
          onChange={(e) =>
            onChange({ ...doc, phone: (e.target as HTMLInputElement).value })
          }
          placeholder="Phone"
          className="h-7 text-xs"
        />
      </CardContent>
    </Card>
  );
}

// ── Partner Card (View) ──────────────────────────────────────────────────

function PartnerCard({ partner }: { partner: JourneyPartner }) {
  const hasEmail = partner.contact?.includes("@");

  return (
    <Card size="sm">
      <CardContent className="pt-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getRoleBadgeClasses(
              partner.role
            )}`}
          >
            {partner.name ? partner.name.charAt(0).toUpperCase() : (
              <Users className="size-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground text-sm truncate">
                  {partner.name}
                </p>
                <Badge
                  variant="secondary"
                  className={`mt-0.5 text-xs ${getRoleBadgeClasses(partner.role)}`}
                >
                  {partner.role}
                </Badge>
              </div>
              {hasEmail && (
                <a
                  href={`mailto:${partner.contact}`}
                  className="shrink-0"
                  title="Send email"
                >
                  <Button variant="ghost" size="icon-xs">
                    <Mail className="size-3.5 text-primary" />
                  </Button>
                </a>
              )}
            </div>
            {partner.organization && (
              <p className="text-xs text-muted-foreground">
                {partner.organization}
              </p>
            )}
            {partner.contact && (
              <p className="text-xs text-muted-foreground truncate">
                {partner.contact}
              </p>
            )}
            {partner.notes && (
              <p className="text-xs text-muted-foreground italic leading-relaxed mt-1">
                {partner.notes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Partner Card (Edit) ──────────────────────────────────────────────────

function PartnerCardEdit({
  partner,
  onChange,
  onRemove,
}: {
  partner: JourneyPartner;
  onChange: (p: JourneyPartner) => void;
  onRemove: () => void;
}) {
  return (
    <Card size="sm" className="bg-primary/5">
      <CardContent className="space-y-2 pt-3">
        <div className="flex items-center gap-2">
          <Input
            value={partner.name}
            onChange={(e) =>
              onChange({ ...partner, name: (e.target as HTMLInputElement).value })
            }
            placeholder="Name"
            className="h-7 text-sm flex-1"
          />
          <Button variant="ghost" size="icon-xs" onClick={onRemove}>
            <X className="size-3 text-status-blocked" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={partner.role}
            onChange={(e) =>
              onChange({ ...partner, role: (e.target as HTMLInputElement).value })
            }
            placeholder="Role"
            className="h-7 text-xs"
          />
          <Input
            value={partner.organization}
            onChange={(e) =>
              onChange({
                ...partner,
                organization: (e.target as HTMLInputElement).value,
              })
            }
            placeholder="Organization"
            className="h-7 text-xs"
          />
        </div>
        <Input
          value={partner.contact}
          onChange={(e) =>
            onChange({ ...partner, contact: (e.target as HTMLInputElement).value })
          }
          placeholder="Contact (email or phone)"
          className="h-7 text-xs"
        />
        <Textarea
          value={partner.notes}
          onChange={(e) => onChange({ ...partner, notes: e.target.value })}
          placeholder="Notes..."
          rows={2}
          className="text-xs"
        />
      </CardContent>
    </Card>
  );
}
