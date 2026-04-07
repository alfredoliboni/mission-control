"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Feather,
  MapPin,
  Heart,
  Sparkles,
  Stethoscope,
  Users,
  Upload,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  CloudUpload,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Add Custom Tag Input
// ---------------------------------------------------------------------------

function AddCustomTag({ onAdd, placeholder }: { onAdd: (value: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full px-3 py-1.5 text-sm font-medium border-2 border-dashed border-warm-200 text-warm-400 hover:border-primary hover:text-primary transition-all flex items-center gap-1"
      >
        <Plus className="h-3.5 w-3.5" /> Add your own
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) {
          onAdd(trimmed);
          setValue("");
          setOpen(false);
        }
      }}
    >
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="rounded-full px-3 py-1.5 text-sm border border-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
        onBlur={() => { if (!value.trim()) setOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setValue(""); setOpen(false); } }}
      />
      <button type="submit" className="rounded-full p-1.5 bg-primary text-white hover:bg-primary/90">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => { setValue(""); setOpen(false); }} className="rounded-full p-1.5 text-warm-400 hover:text-red-500">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  // Step 1
  nickname: string;
  dateOfBirth: string;
  postalCode: string;
  // Step 2
  indigenousIdentity: string;
  connectNavigators: boolean;
  // Step 3
  journeyStage: string;
  // Step 4
  supportNeeds: string[];
  // Step 5
  interests: string[];
  communicationStyle: string;
  sensoryPreferences: string[];
  personalityTraits: string[];
  triggers: string[];
  strengths: string;
  challenges: string;
  // Step 6
  comorbidDiagnoses: string[];
  medications: { name: string; dosage: string; frequency: string }[];
  supplements: { name: string; dosage: string; frequency: string }[];
  // Step 7
  partners: {
    type: string;
    name: string;
    email: string;
    organization: string;
    canViewRecords: boolean;
    canUploadRecords: boolean;
  }[];
  // Step 8
  extraInfo: string;
  uploadedFiles: string[];
}

const initialFormData: FormData = {
  nickname: "",
  dateOfBirth: "",
  postalCode: "",
  indigenousIdentity: "",
  connectNavigators: false,
  journeyStage: "",
  supportNeeds: [],
  interests: [],
  communicationStyle: "",
  sensoryPreferences: [],
  personalityTraits: [],
  triggers: [],
  strengths: "",
  challenges: "",
  comorbidDiagnoses: [],
  medications: [],
  supplements: [],
  partners: [],
  extraInfo: "",
  uploadedFiles: [],
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 8;

const INDIGENOUS_OPTIONS = [
  { id: "first-nations", label: "First Nations" },
  { id: "inuit", label: "Inuit" },
  { id: "metis", label: "M\u00e9tis" },
  { id: "urban-indigenous", label: "Urban Indigenous" },
  { id: "prefer-not-to-say", label: "Prefer not to say" },
];

const JOURNEY_STAGES = [
  {
    id: "suspected",
    title: "Suspected",
    description: "Concerns noticed, not yet assessed",
  },
  {
    id: "awaiting-assessment",
    title: "Awaiting Assessment",
    description: "Referral made, waiting for evaluation",
  },
  {
    id: "diagnosed",
    title: "Diagnosed",
    description: "Diagnosis received",
  },
  {
    id: "seeking-services",
    title: "Seeking Services",
    description: "Looking for therapy and support",
  },
  {
    id: "in-therapy",
    title: "In Therapy",
    description: "Currently receiving services",
  },
  {
    id: "stable-support",
    title: "Stable Support",
    description: "Established care in place",
  },
];

const SUPPORT_NEEDS = [
  "Speech Therapy",
  "OT",
  "ABA/Behavior",
  "Sensory Support",
  "School Support",
  "Social Skills",
  "Communication",
  "Daily Living",
  "Motor Skills",
  "Regulation",
];

const INTEREST_PRESETS = [
  { emoji: "\ud83d\ude82", label: "Trains" },
  { emoji: "\ud83c\udfb5", label: "Music" },
  { emoji: "\ud83e\uddf1", label: "Building" },
  { emoji: "\ud83d\udc3e", label: "Animals" },
  { emoji: "\ud83d\udca7", label: "Water" },
  { emoji: "\ud83c\udfa8", label: "Art" },
  { emoji: "\ud83d\udcda", label: "Books" },
  { emoji: "\ud83c\udfc3", label: "Movement" },
];

const COMMUNICATION_STYLES = [
  "Verbal",
  "Non-verbal",
  "Limited verbal",
  "AAC device",
  "Sign language",
  "Picture-based",
];

const SENSORY_PREFERENCES = [
  "Noise sensitive",
  "Light sensitive",
  "Seeks deep pressure",
  "Oral seeking",
  "Water lover",
  "Texture sensitive",
  "Movement seeker",
];

const PERSONALITY_TRAITS = [
  "Affectionate",
  "Persistent",
  "Creative",
  "Detail-oriented",
  "Routine-loving",
  "Musical",
  "Observant",
];

const TRIGGERS = [
  "Transitions",
  "Loud noises",
  "Waiting",
  "Changes in routine",
  "Crowded spaces",
  "Unexpected touch",
  "Hunger",
];

const COMORBID_DIAGNOSES = [
  "ADHD",
  "Anxiety",
  "Epilepsy",
  "Sleep Disorder",
  "Sensory Processing",
  "Learning Disability",
  "Depression",
  "OCD",
];

const MEDICATION_SUGGESTIONS = [
  "Risperidone",
  "Aripiprazole",
  "Methylphenidate",
  "Sertraline",
  "Fluoxetine",
  "Guanfacine",
  "Melatonin",
];

const SUPPLEMENT_SUGGESTIONS = [
  "Vitamin D",
  "Omega-3",
  "Probiotics",
  "Magnesium",
  "Melatonin",
];

// ---------------------------------------------------------------------------
// Helper: generate profile markdown
// ---------------------------------------------------------------------------

function generateProfileMarkdown(data: FormData): string {
  const lines: string[] = [];
  lines.push(`# Child Profile: ${data.nickname}`);
  lines.push("");
  lines.push("## Basic Information");
  lines.push(`- **Nickname:** ${data.nickname}`);
  if (data.dateOfBirth) lines.push(`- **Date of Birth:** ${data.dateOfBirth}`);
  if (data.postalCode) lines.push(`- **Postal Code:** ${data.postalCode}`);
  lines.push("");

  if (data.indigenousIdentity && data.indigenousIdentity !== "prefer-not-to-say") {
    lines.push("## Cultural Background");
    const label = INDIGENOUS_OPTIONS.find((o) => o.id === data.indigenousIdentity)?.label;
    lines.push(`- **Indigenous Identity:** ${label}`);
    if (data.connectNavigators)
      lines.push("- **Connect with Indigenous community navigators:** Yes");
    lines.push("");
  }

  if (data.journeyStage) {
    lines.push("## Journey Stage");
    const stage = JOURNEY_STAGES.find((s) => s.id === data.journeyStage);
    lines.push(`- **Current Stage:** ${stage?.title} \u2014 ${stage?.description}`);
    lines.push("");
  }

  if (data.supportNeeds.length > 0) {
    lines.push("## Support Needs");
    data.supportNeeds.forEach((n) => lines.push(`- ${n}`));
    lines.push("");
  }

  lines.push("## About the Child");
  if (data.interests.length > 0) {
    lines.push("### Interests");
    data.interests.forEach((i) => lines.push(`- ${i}`));
    lines.push("");
  }
  if (data.communicationStyle) {
    lines.push(`### Communication Style`);
    lines.push(`- ${data.communicationStyle}`);
    lines.push("");
  }
  if (data.sensoryPreferences.length > 0) {
    lines.push("### Sensory Preferences");
    data.sensoryPreferences.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
  }
  if (data.personalityTraits.length > 0) {
    lines.push("### Personality Traits");
    data.personalityTraits.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }
  if (data.triggers.length > 0) {
    lines.push("### Triggers");
    data.triggers.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }
  if (data.strengths) {
    lines.push("### Strengths");
    lines.push(data.strengths);
    lines.push("");
  }
  if (data.challenges) {
    lines.push("### Challenges");
    lines.push(data.challenges);
    lines.push("");
  }

  if (data.comorbidDiagnoses.length > 0 || data.medications.length > 0 || data.supplements.length > 0) {
    lines.push("## Medical Information");
    if (data.comorbidDiagnoses.length > 0) {
      lines.push("### Comorbid Diagnoses");
      data.comorbidDiagnoses.forEach((d) => lines.push(`- ${d}`));
      lines.push("");
    }
    if (data.medications.length > 0) {
      lines.push("### Medications");
      data.medications.forEach((m) =>
        lines.push(`- **${m.name}** \u2014 ${m.dosage}, ${m.frequency}`)
      );
      lines.push("");
    }
    if (data.supplements.length > 0) {
      lines.push("### Supplements");
      data.supplements.forEach((s) =>
        lines.push(`- **${s.name}** \u2014 ${s.dosage}, ${s.frequency}`)
      );
      lines.push("");
    }
  }

  if (data.partners.length > 0) {
    lines.push("## Care Team");
    data.partners.forEach((p) => {
      lines.push(`- **${p.name}** (${p.type}${p.organization ? `, ${p.organization}` : ""})`);
      if (p.email) lines.push(`  - Email: ${p.email}`);
      const perms: string[] = [];
      if (p.canViewRecords) perms.push("View records");
      if (p.canUploadRecords) perms.push("Upload records");
      if (perms.length > 0) lines.push(`  - Permissions: ${perms.join(", ")}`);
    });
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`*Generated on ${new Date().toLocaleDateString("en-CA")}*`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Step icon component
// ---------------------------------------------------------------------------

function StepIcon({
  icon: Icon,
  bgClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  bgClass: string;
}) {
  return (
    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${bgClass}`}>
      <Icon className="h-7 w-7" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Medication / Supplement add forms
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "" });
  const [suppForm, setSuppForm] = useState({ name: "", dosage: "", frequency: "" });

  // Partner add form
  const [partnerForm, setPartnerForm] = useState({
    type: "Clinician",
    name: "",
    email: "",
    organization: "",
    canViewRecords: false,
    canUploadRecords: false,
  });

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goTo = useCallback(
    (target: number) => {
      if (target < 1 || target > TOTAL_STEPS) return;
      setTransitioning(true);
      setTimeout(() => {
        setStep(target);
        setTransitioning(false);
      }, 200);
    },
    []
  );

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return formData.nickname.trim().length > 0;
      case 3:
        return formData.journeyStage !== "";
      case 4:
        return formData.supportNeeds.length > 0;
      default:
        return true;
    }
  }, [step, formData.nickname, formData.journeyStage, formData.supportNeeds]);

  const isOptionalStep = step === 2 || step === 5 || step === 6 || step === 7 || step === 8;

  // ---------------------------------------------------------------------------
  // Completion
  // ---------------------------------------------------------------------------

  const handleComplete = useCallback(async () => {
    const profile = generateProfileMarkdown(formData);
    localStorage.setItem("onboarding-profile", profile);

    // Send profile to agent workspace
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileMarkdown: profile }),
      });
    } catch {
      // Continue even if agent write fails — profile is in localStorage
    }

    router.push("/dashboard");
  }, [formData, router]);

  // ---------------------------------------------------------------------------
  // Multi-select helper
  // ---------------------------------------------------------------------------

  function toggleMulti(
    field: keyof FormData,
    value: string
  ) {
    setFormData((prev) => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Scroll to top on step change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  function renderStep1() {
    return (
      <>
        <StepIcon icon={User} bgClass="bg-primary/10 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Welcome to The Companion
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          We are glad you are here. Let us start by getting to know your child
          a little. Everything you share helps us tailor the experience.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Child&apos;s nickname <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="What do you call them?"
              value={formData.nickname}
              onChange={(e) =>
                setFormData((p) => ({ ...p, nickname: e.target.value }))
              }
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Date of birth
            </label>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData((p) => ({ ...p, dateOfBirth: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Postal code
            </label>
            <Input
              placeholder="e.g. M5V 2T6"
              value={formData.postalCode}
              onChange={(e) =>
                setFormData((p) => ({ ...p, postalCode: e.target.value }))
              }
            />
          </div>
        </div>
      </>
    );
  }

  function renderStep2() {
    const showNavigator =
      formData.indigenousIdentity !== "" &&
      formData.indigenousIdentity !== "prefer-not-to-say";
    return (
      <>
        <StepIcon
          icon={Feather}
          bgClass="bg-gradient-to-br from-purple-100 to-amber-100 text-purple-600"
        />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Cultural Background
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          Indigenous families may access additional funding (Jordan&apos;s Principle,
          Inuit Child First). This is completely optional.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INDIGENOUS_OPTIONS.map((opt) => {
            const selected = formData.indigenousIdentity === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    indigenousIdentity: selected ? "" : opt.id,
                    connectNavigators: selected ? false : p.connectNavigators,
                  }))
                }
                className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-warm-200 bg-white text-foreground hover:border-warm-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {showNavigator && (
          <label className="mt-5 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.connectNavigators}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  connectNavigators: e.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 rounded border-warm-300 text-primary accent-primary"
            />
            <span className="text-sm text-foreground leading-snug">
              Connect me with Indigenous community navigators
            </span>
          </label>
        )}
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <StepIcon icon={MapPin} bgClass="bg-primary/10 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Where are you in the journey?
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          This helps us show the most relevant resources and next steps for your
          family.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {JOURNEY_STAGES.map((stage) => {
            const selected = formData.journeyStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() =>
                  setFormData((p) => ({ ...p, journeyStage: stage.id }))
                }
                className={`relative rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-warm-200 bg-white hover:border-warm-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        selected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {stage.title}
                    </p>
                    <p className="text-xs text-warm-400 mt-0.5">
                      {stage.description}
                    </p>
                  </div>
                  {selected && (
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderStep4() {
    return (
      <>
        <StepIcon icon={Heart} bgClass="bg-rose-50 text-rose-500" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          What support does your child need?
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-4 leading-relaxed max-w-md mx-auto">
          Select all that apply. We will use this to find relevant programs and
          services.
        </p>
        <div className="mx-auto max-w-md mb-6 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 text-center">
          💡 Not sure? Don&apos;t worry — once you upload your child&apos;s documents
          (diagnosis reports, assessments, IEPs), our navigator will analyze them
          and identify the right support areas automatically. You can always
          update this later.
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {SUPPORT_NEEDS.map((need) => {
            const selected = formData.supportNeeds.includes(need);
            return (
              <button
                key={need}
                type="button"
                onClick={() => toggleMulti("supportNeeds", need)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selected
                    ? "bg-primary text-white shadow-sm"
                    : "bg-warm-100 text-foreground hover:bg-warm-200"
                }`}
              >
                {need}
              </button>
            );
          })}
          {formData.supportNeeds
            .filter((n) => !SUPPORT_NEEDS.includes(n))
            .map((custom) => (
              <button
                key={custom}
                type="button"
                onClick={() => toggleMulti("supportNeeds", custom)}
                className="rounded-full px-4 py-2 text-sm font-medium bg-primary text-white shadow-sm transition-all"
              >
                {custom}
              </button>
            ))}
          <AddCustomTag
            placeholder="e.g. Music therapy"
            onAdd={(val) => {
              if (!formData.supportNeeds.includes(val)) {
                setFormData((p) => ({ ...p, supportNeeds: [...p.supportNeeds, val] }));
              }
            }}
          />
        </div>

        {formData.supportNeeds.length > 0 && (
          <p className="text-center text-sm text-warm-400 mt-4">
            {formData.supportNeeds.length} selected
          </p>
        )}
      </>
    );
  }

  function renderStep5() {
    return (
      <>
        <StepIcon icon={Sparkles} bgClass="bg-amber-50 text-amber-500" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Tell us about{" "}
          {formData.nickname ? formData.nickname : "your child"}
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          The more we know, the better we can personalize recommendations.
          Everything here is optional.
        </p>

        {/* Interests */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Interests
          </label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_PRESETS.map((item) => {
              const selected = formData.interests.includes(item.label);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => toggleMulti("interests", item.label)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    selected
                      ? "bg-primary text-white shadow-sm"
                      : "bg-warm-100 text-foreground hover:bg-warm-200"
                  }`}
                >
                  {item.emoji} {item.label}
                </button>
              );
            })}
            {/* Custom interests added by user */}
            {formData.interests
              .filter((i) => !INTEREST_PRESETS.some((p) => p.label === i))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => toggleMulti("interests", custom)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium bg-primary text-white shadow-sm transition-all"
                >
                  ✨ {custom}
                </button>
              ))}
            <AddCustomTag
              placeholder="e.g. Dinosaurs"
              onAdd={(val) => {
                if (!formData.interests.includes(val)) {
                  setFormData((p) => ({ ...p, interests: [...p.interests, val] }));
                }
              }}
            />
          </div>
        </div>

        <Separator className="my-5" />

        {/* Communication style */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Communication Style
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMUNICATION_STYLES.map((style) => {
              const selected = formData.communicationStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      communicationStyle: selected ? "" : style,
                    }))
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    selected
                      ? "bg-primary text-white shadow-sm"
                      : "bg-warm-100 text-foreground hover:bg-warm-200"
                  }`}
                >
                  {style}
                </button>
              );
            })}
            {formData.communicationStyle && !COMMUNICATION_STYLES.includes(formData.communicationStyle) && (
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, communicationStyle: "" }))}
                className="rounded-full px-3 py-1.5 text-sm font-medium bg-primary text-white shadow-sm transition-all"
              >
                {formData.communicationStyle}
              </button>
            )}
            <AddCustomTag
              placeholder="e.g. Sign language"
              onAdd={(val) => {
                setFormData((p) => ({ ...p, communicationStyle: val }));
              }}
            />
          </div>
        </div>

        <Separator className="my-5" />

        {/* Sensory preferences */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Sensory Preferences
          </label>
          <div className="flex flex-wrap gap-2">
            {SENSORY_PREFERENCES.map((pref) => {
              const selected = formData.sensoryPreferences.includes(pref);
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => toggleMulti("sensoryPreferences", pref)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    selected
                      ? "bg-status-gap-filler text-white shadow-sm"
                      : "bg-warm-100 text-foreground hover:bg-warm-200"
                  }`}
                >
                  {pref}
                </button>
              );
            })}
            {formData.sensoryPreferences
              .filter((s) => !SENSORY_PREFERENCES.includes(s))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => toggleMulti("sensoryPreferences", custom)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium bg-status-gap-filler text-white shadow-sm transition-all"
                >
                  {custom}
                </button>
              ))}
            <AddCustomTag
              placeholder="e.g. Avoids sand"
              onAdd={(val) => {
                if (!formData.sensoryPreferences.includes(val)) {
                  setFormData((p) => ({ ...p, sensoryPreferences: [...p.sensoryPreferences, val] }));
                }
              }}
            />
          </div>
        </div>

        <Separator className="my-5" />

        {/* Personality traits */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Personality Traits
          </label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map((trait) => {
              const selected = formData.personalityTraits.includes(trait);
              return (
                <button
                  key={trait}
                  type="button"
                  onClick={() => toggleMulti("personalityTraits", trait)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    selected
                      ? "bg-status-success text-white shadow-sm"
                      : "bg-warm-100 text-foreground hover:bg-warm-200"
                  }`}
                >
                  {trait}
                </button>
              );
            })}
            {formData.personalityTraits
              .filter((t) => !PERSONALITY_TRAITS.includes(t))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => toggleMulti("personalityTraits", custom)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium bg-status-success text-white shadow-sm transition-all"
                >
                  {custom}
                </button>
              ))}
            <AddCustomTag
              placeholder="e.g. Empathetic"
              onAdd={(val) => {
                if (!formData.personalityTraits.includes(val)) {
                  setFormData((p) => ({ ...p, personalityTraits: [...p.personalityTraits, val] }));
                }
              }}
            />
          </div>
        </div>

        <Separator className="my-5" />

        {/* Triggers */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Triggers
          </label>
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map((trigger) => {
              const selected = formData.triggers.includes(trigger);
              return (
                <button
                  key={trigger}
                  type="button"
                  onClick={() => toggleMulti("triggers", trigger)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    selected
                      ? "bg-status-caution text-warm-500 shadow-sm"
                      : "bg-warm-100 text-foreground hover:bg-warm-200"
                  }`}
                >
                  {trigger}
                </button>
              );
            })}
            {formData.triggers
              .filter((t) => !TRIGGERS.includes(t))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => toggleMulti("triggers", custom)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium bg-status-caution text-warm-500 shadow-sm transition-all"
                >
                  {custom}
                </button>
              ))}
            <AddCustomTag
              placeholder="e.g. Hunger"
              onAdd={(val) => {
                if (!formData.triggers.includes(val)) {
                  setFormData((p) => ({ ...p, triggers: [...p.triggers, val] }));
                }
              }}
            />
          </div>
        </div>

        <Separator className="my-5" />

        {/* Strengths */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Strengths
          </label>
          <Textarea
            placeholder="What is your child really good at? What makes them shine? e.g. Amazing memory, loves patterns, great with animals..."
            value={formData.strengths}
            onChange={(e) =>
              setFormData((p) => ({ ...p, strengths: e.target.value }))
            }
            rows={3}
          />
        </div>

        <Separator className="my-5" />

        {/* Challenges */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Challenges
          </label>
          <Textarea
            placeholder="What are the biggest day-to-day challenges? e.g. Meltdowns during transitions, difficulty with sleep, limited diet..."
            value={formData.challenges}
            onChange={(e) =>
              setFormData((p) => ({ ...p, challenges: e.target.value }))
            }
            rows={3}
          />
        </div>
      </>
    );
  }

  function renderStep6() {
    return (
      <>
        <StepIcon icon={Stethoscope} bgClass="bg-teal-50 text-teal-600" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Medical Information
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          This helps us track appointments and flag relevant supports. Completely
          optional.
        </p>

        {/* Comorbid diagnoses */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Comorbid Diagnoses
          </label>
          <div className="flex flex-wrap gap-2">
            {COMORBID_DIAGNOSES.map((diag) => {
              const selected = formData.comorbidDiagnoses.includes(diag);
              return (
                <button
                  key={diag}
                  type="button"
                  onClick={() => toggleMulti("comorbidDiagnoses", diag)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selected
                      ? "bg-primary text-white shadow-sm"
                      : "bg-warm-100 text-foreground hover:bg-warm-200"
                  }`}
                >
                  {diag}
                </button>
              );
            })}
            {formData.comorbidDiagnoses
              .filter((d) => !COMORBID_DIAGNOSES.includes(d))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => toggleMulti("comorbidDiagnoses", custom)}
                  className="rounded-full px-4 py-2 text-sm font-medium bg-primary text-white shadow-sm transition-all"
                >
                  {custom}
                </button>
              ))}
            <AddCustomTag
              placeholder="e.g. OCD"
              onAdd={(val) => {
                if (!formData.comorbidDiagnoses.includes(val)) {
                  setFormData((p) => ({ ...p, comorbidDiagnoses: [...p.comorbidDiagnoses, val] }));
                }
              }}
            />
          </div>
        </div>

        <Separator className="my-5" />

        {/* Medications */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Current Medications
          </label>

          {formData.medications.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.medications.map((med, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {med.name} ({med.dosage}, {med.frequency})
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        medications: p.medications.filter((_, i) => i !== idx),
                      }))
                    }
                    className="hover:text-destructive transition-colors"
                    aria-label={`Remove ${med.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Medication name"
                list="med-suggestions"
                value={medForm.name}
                onChange={(e) =>
                  setMedForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <datalist id="med-suggestions">
                {MEDICATION_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <Input
              placeholder="Dosage"
              value={medForm.dosage}
              onChange={(e) =>
                setMedForm((p) => ({ ...p, dosage: e.target.value }))
              }
              className="sm:w-28"
            />
            <Input
              placeholder="Frequency"
              value={medForm.frequency}
              onChange={(e) =>
                setMedForm((p) => ({ ...p, frequency: e.target.value }))
              }
              className="sm:w-28"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!medForm.name.trim()}
              onClick={() => {
                setFormData((p) => ({
                  ...p,
                  medications: [...p.medications, { ...medForm }],
                }));
                setMedForm({ name: "", dosage: "", frequency: "" });
              }}
              aria-label="Add medication"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        {/* Supplements */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Supplements
          </label>

          {formData.supplements.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.supplements.map((supp, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-3 py-1 text-xs font-medium text-status-success"
                >
                  {supp.name} ({supp.dosage}, {supp.frequency})
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        supplements: p.supplements.filter((_, i) => i !== idx),
                      }))
                    }
                    className="hover:text-destructive transition-colors"
                    aria-label={`Remove ${supp.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Supplement name"
                list="supp-suggestions"
                value={suppForm.name}
                onChange={(e) =>
                  setSuppForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <datalist id="supp-suggestions">
                {SUPPLEMENT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <Input
              placeholder="Dosage"
              value={suppForm.dosage}
              onChange={(e) =>
                setSuppForm((p) => ({ ...p, dosage: e.target.value }))
              }
              className="sm:w-28"
            />
            <Input
              placeholder="Frequency"
              value={suppForm.frequency}
              onChange={(e) =>
                setSuppForm((p) => ({ ...p, frequency: e.target.value }))
              }
              className="sm:w-28"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!suppForm.name.trim()}
              onClick={() => {
                setFormData((p) => ({
                  ...p,
                  supplements: [...p.supplements, { ...suppForm }],
                }));
                setSuppForm({ name: "", dosage: "", frequency: "" });
              }}
              aria-label="Add supplement"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </>
    );
  }

  function renderStep7() {
    return (
      <>
        <StepIcon icon={Users} bgClass="bg-indigo-50 text-indigo-600" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Your Care Team
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          Add the people who support your child. They can be invited to
          collaborate later.
        </p>

        {/* Existing partners list */}
        {formData.partners.length > 0 && (
          <div className="space-y-2 mb-5">
            {formData.partners.map((partner, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-warm-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {partner.name}{" "}
                    <span className="text-warm-400 font-normal">
                      ({partner.type})
                    </span>
                  </p>
                  {partner.organization && (
                    <p className="text-xs text-warm-400">{partner.organization}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      partners: p.partners.filter((_, i) => i !== idx),
                    }))
                  }
                  className="text-warm-400 hover:text-destructive transition-colors"
                  aria-label={`Remove ${partner.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add partner form */}
        <div className="space-y-3 rounded-xl border border-warm-200 bg-warm-50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Type
              </label>
              <select
                value={partnerForm.type}
                onChange={(e) =>
                  setPartnerForm((p) => ({ ...p, type: e.target.value }))
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="School">School</option>
                <option value="Clinician">Clinician</option>
                <option value="Clinic">Clinic</option>
                <option value="Provider">Provider</option>
                <option value="Therapist">Therapist</option>
                <option value="Family Member">Family Member</option>
                <option value="Support Worker">Support Worker</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Name
              </label>
              <Input
                placeholder="e.g. Dr. Smith"
                value={partnerForm.name}
                onChange={(e) =>
                  setPartnerForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={partnerForm.email}
                onChange={(e) =>
                  setPartnerForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Organization
              </label>
              <Input
                placeholder="e.g. ABC Clinic"
                value={partnerForm.organization}
                onChange={(e) =>
                  setPartnerForm((p) => ({
                    ...p,
                    organization: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={partnerForm.canViewRecords}
                onChange={(e) =>
                  setPartnerForm((p) => ({
                    ...p,
                    canViewRecords: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-warm-300 accent-primary"
              />
              <span className="text-sm text-foreground">Can view records</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={partnerForm.canUploadRecords}
                onChange={(e) =>
                  setPartnerForm((p) => ({
                    ...p,
                    canUploadRecords: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-warm-300 accent-primary"
              />
              <span className="text-sm text-foreground">
                Can upload records
              </span>
            </label>
          </div>

          <Button
            variant="outline"
            disabled={!partnerForm.name.trim()}
            onClick={() => {
              setFormData((p) => ({
                ...p,
                partners: [...p.partners, { ...partnerForm }],
              }));
              setPartnerForm({
                type: "Clinician",
                name: "",
                email: "",
                organization: "",
                canViewRecords: false,
                canUploadRecords: false,
              });
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Partner
          </Button>
        </div>
      </>
    );
  }

  function renderStep8() {
    return (
      <>
        <StepIcon icon={Upload} bgClass="bg-sky-50 text-sky-600" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Anything Else?
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          Tell us anything else about your child that you think is important.
          Their daily routine, what works at home, what they struggle with — anything helps our navigator build a better plan.
        </p>

        {/* Free-form extra info */}
        <Textarea
          placeholder="e.g. Alex does really well with visual schedules. He needs extra time for transitions. He loves going to the park but gets overwhelmed if it's too crowded. We've been on the OAP waitlist since 2024..."
          value={formData.extraInfo}
          onChange={(e) =>
            setFormData((p) => ({ ...p, extraInfo: e.target.value }))
          }
          rows={5}
          className="mb-6"
        />

        <Separator className="my-6" />

        <h3 className="font-heading text-lg font-semibold text-center text-foreground mb-2">
          Upload Documents
        </h3>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto text-sm">
          Got a diagnosis report, school IEP, or therapy assessment? Drop it here.
          Our navigator will analyze them to build your child&apos;s profile.
        </p>

        {/* Drop zone */}
        <label
          htmlFor="file-upload"
          className="rounded-2xl border-2 border-dashed border-warm-300 bg-warm-50 p-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer block"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary", "bg-primary/5");
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              setFormData((p) => ({ ...p, uploadedFiles: [...p.uploadedFiles, ...files.map((f) => f.name)] }));
            }
          }}
        >
          <CloudUpload className="mx-auto h-12 w-12 text-warm-300 mb-4" />
          <p className="text-sm font-medium text-foreground mb-1">
            Drag and drop files here
          </p>
          <p className="text-xs text-warm-400">
            or click to browse your files
          </p>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                setFormData((p) => ({ ...p, uploadedFiles: [...p.uploadedFiles, ...files.map((f) => f.name)] }));
              }
              e.target.value = "";
            }}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Diagnosis Report", "School IEP", "Therapy Assessment"].map(
              (type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-warm-400 ring-1 ring-warm-200"
                >
                  <FileText className="h-3 w-3" />
                  {type}
                </span>
              )
            )}
          </div>
        </label>

        <p className="text-center text-xs text-warm-400 mt-3">
          Supported formats: PDF, JPG, PNG, DOCX (max 10 MB)
        </p>

        {/* Show uploaded files */}
        {formData.uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {formData.uploadedFiles.length} file{formData.uploadedFiles.length > 1 ? "s" : ""} selected:
            </p>
            <div className="flex flex-wrap gap-2">
              {formData.uploadedFiles.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  <FileText className="h-3 w-3" />
                  {name}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        uploadedFiles: p.uploadedFiles.filter((_, i) => i !== idx),
                      }))
                    }
                    className="hover:text-destructive transition-colors"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  const stepRenderers: Record<number, () => React.ReactNode> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
    6: renderStep6,
    7: renderStep7,
    8: renderStep8,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            🧭
          </span>
          <span className="font-heading font-bold text-sm">
            The Companion
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {/* Progress area */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-warm-400">{progress}% Complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-warm-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step card */}
        <Card className="w-full max-w-2xl">
          <CardContent>
            <div
              className={`transition-opacity duration-300 ${
                transitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              {stepRenderers[step]?.()}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="w-full max-w-2xl mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => goTo(step - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {isOptionalStep && step < TOTAL_STEPS && (
              <Button variant="ghost" onClick={() => goTo(step + 1)}>
                Skip this step
              </Button>
            )}

            {step < TOTAL_STEPS ? (
              <Button
                disabled={!canProceed()}
                onClick={() => goTo(step + 1)}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                <Check className="h-4 w-4 mr-1.5" />
                Complete Setup
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
