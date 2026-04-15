"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
  Mail,
  Loader2,
  Mic,
  MicOff,
  Square,
  RotateCcw,
  AudioLines,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

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
  // Onboarding mode
  onboardingMode: "wizard" | "audio" | "";
  audioUrl: string;
  // Step 1
  fullName: string;
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
  onboardingMode: "",
  audioUrl: "",
  fullName: "",
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

const TOTAL_ONBOARDING_STEPS = 9;

const INDIGENOUS_OPTIONS = [
  { id: "first-nations", label: "First Nations" },
  { id: "inuit", label: "Inuit" },
  { id: "metis", label: "M\u00e9tis" },
  { id: "urban-indigenous", label: "Urban Indigenous" },
  { id: "non-indigenous", label: "Non-Indigenous" },
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
  {
    id: "other",
    title: "Other",
    description: "My situation is different",
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
  { emoji: "🚂", label: "Trains" },
  { emoji: "🎵", label: "Music" },
  { emoji: "🧱", label: "Building" },
  { emoji: "🐾", label: "Animals" },
  { emoji: "💧", label: "Water" },
  { emoji: "🎨", label: "Art" },
  { emoji: "📚", label: "Books" },
  { emoji: "🏃", label: "Movement" },
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

const AUDIO_PROMPTS = [
  "Tell us your child's name and age",
  "What was the diagnosis? When was it?",
  "What therapies or services are you currently receiving?",
  "What are your child's strengths? What do they love?",
  "What are the biggest challenges day to day?",
  "Do they take any medications?",
  "What sensory things do they like or avoid?",
  "Who is on your care team? (doctors, therapists, school)",
  "Where are you in the journey? Just diagnosed? In therapy?",
  "Is there anything else you'd like us to know?",
];

const MAX_RECORDING_SECONDS = 600; // 10 minutes

// ---------------------------------------------------------------------------
// Helper: generate profile markdown
// ---------------------------------------------------------------------------

function generateProfileMarkdown(data: FormData): string {
  const today = new Date().toLocaleDateString("en-CA");
  const lines: string[] = [];

  // Title — parser reads via h1 match
  lines.push("# Child Profile");
  lines.push("");
  lines.push(`Last Updated: ${today}`);
  lines.push("");

  // ## Basic Info — parser key: heading.includes("basic info")
  lines.push("## Basic Info");
  lines.push(`- Name: ${data.fullName || data.nickname}`);
  if (data.nickname && data.nickname !== data.fullName) lines.push(`- Nickname: ${data.nickname}`);
  if (data.dateOfBirth) lines.push(`- DOB: ${data.dateOfBirth}`);
  if (data.comorbidDiagnoses.length > 0) {
    lines.push(`- Diagnosis: ${data.comorbidDiagnoses.join(", ")}`);
  }
  if (data.journeyStage) {
    const stage = JOURNEY_STAGES.find((s) => s.id === data.journeyStage);
    lines.push(`- Stage: ${stage?.title || data.journeyStage}`);
  }
  if (data.postalCode) lines.push(`- Postal Code: ${data.postalCode}`);
  if (data.indigenousIdentity && data.indigenousIdentity !== "prefer-not-to-say" && data.indigenousIdentity !== "non-indigenous") {
    const label = INDIGENOUS_OPTIONS.find((o) => o.id === data.indigenousIdentity)?.label;
    if (label) lines.push(`- Indigenous Identity: ${label}`);
  }
  lines.push("");

  // ## Personal Profile — parser key: heading.includes("personal profile")
  lines.push("## Personal Profile");
  lines.push(`- Communication: ${data.communicationStyle || "Not documented"}`);
  lines.push(`- Sensory: ${data.sensoryPreferences.length > 0 ? data.sensoryPreferences.join(", ") : "Not documented"}`);
  lines.push(`- Interests: ${data.interests.length > 0 ? data.interests.join(", ") : "Not documented"}`);
  lines.push(`- Strengths: ${data.strengths || "Not documented"}`);
  lines.push(`- Challenges: ${data.challenges || "Not documented"}`);
  if (data.personalityTraits.length > 0) lines.push(`- Personality: ${data.personalityTraits.join(", ")}`);
  if (data.triggers.length > 0) lines.push(`- Triggers: ${data.triggers.join(", ")}`);
  if (data.supportNeeds.length > 0) lines.push(`- Support Needs: ${data.supportNeeds.join(", ")}`);
  lines.push("");

  // ## Medical — parser key: heading.includes("medical")
  lines.push("## Medical");
  if (data.medications.length > 0) {
    lines.push("- Medications:");
    data.medications.forEach((m) => lines.push(`  - ${m.name} — ${m.dosage}, ${m.frequency}`));
  } else {
    lines.push("- Medications: None documented");
  }
  if (data.supplements.length > 0) {
    lines.push("- Supplements:");
    data.supplements.forEach((s) => lines.push(`  - ${s.name} — ${s.dosage}, ${s.frequency}`));
  }
  if (data.comorbidDiagnoses.length > 0) {
    lines.push("- Diagnoses:");
    data.comorbidDiagnoses.forEach((d) => lines.push(`  - ${d}`));
  }
  lines.push("");

  // ## Notes
  if (data.extraInfo) {
    lines.push("## Notes");
    lines.push(data.extraInfo);
    lines.push("");
  }

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

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddChild = searchParams.get("mode") === "add-child";
  const [step, setStep] = useState(0); // Start at 0 until auth check completes
  const [transitioning, setTransitioning] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [completing, setCompleting] = useState(false);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(isAddChild);
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Check if already logged in on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user || isAddChild) {
        setIsLoggedIn(true);
        setStep(1); // Skip account creation step
      } else {
        setStep(0); // Show account creation step
      }
      setAuthChecked(true);
    });
  }, [isAddChild]);

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

  // Audio recording state
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused" | "done" | "uploading" | "uploaded" | "error">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const firstStep = isLoggedIn ? 1 : 0;
  const audioModeSteps = isLoggedIn ? 2 : 3; // choice + audio recording (+ signup if not logged in)
  const wizardSteps = isLoggedIn ? TOTAL_ONBOARDING_STEPS : TOTAL_ONBOARDING_STEPS + 1;
  const totalSteps = formData.onboardingMode === "audio" ? audioModeSteps : wizardSteps;
  const currentStepIndex = isLoggedIn ? step : step + 1; // 1-based for display
  const progress = Math.round((Math.min(currentStepIndex, totalSteps) / totalSteps) * 100);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goTo = useCallback(
    (target: number) => {
      if (target < firstStep || target > TOTAL_ONBOARDING_STEPS) return;
      setTransitioning(true);
      setTimeout(() => {
        setStep(target);
        setTransitioning(false);
      }, 200);
    },
    [firstStep]
  );

  const canProceed = useCallback(() => {
    switch (step) {
      case 0:
        return (
          authEmail.trim().length > 0 &&
          authPassword.length >= 6 &&
          authPassword === authConfirmPassword
        );
      case 1: // choice step — mode must be selected (handled by card click navigation)
        return formData.onboardingMode !== "";
      case 2: // child info (was step 1)
        return formData.fullName.trim().length > 0;
      case 4: // journey stage (was step 3)
        return formData.journeyStage !== "";
      case 5: // support needs (was step 4)
        return formData.supportNeeds.length > 0;
      default:
        return true;
    }
  }, [step, authEmail, authPassword, authConfirmPassword, formData.onboardingMode, formData.fullName, formData.journeyStage, formData.supportNeeds]);

  const isOptionalStep = step === 3 || step === 6 || step === 7 || step === 8 || step === 9;

  // ---------------------------------------------------------------------------
  // Completion
  // ---------------------------------------------------------------------------

  const handleComplete = useCallback(async () => {
    setCompleting(true);

    try {
      const isAudioMode = formData.onboardingMode === "audio";
      const childName = formData.fullName || formData.nickname || "";
      const profile = isAudioMode
        ? `# Audio Onboarding\n\nChild name: ${childName || "Not provided"}\nAudio URL: ${formData.audioUrl || "Not provided"}\n\nPlease process the audio recording to build the child's profile.`
        : generateProfileMarkdown(formData);

      // ── Add-child mode: user is already logged in, just call the onboarding API ──
      if (isAddChild) {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileMarkdown: profile,
            childName,
            ...(isAudioMode && formData.audioUrl ? { audioUrl: formData.audioUrl } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Failed to add child. Please try again.");
          setCompleting(false);
          return;
        }

        toast.success(`${childName || "New child"} has been added!`);
        router.push("/profile");
        router.refresh();
        return;
      }

      // ── New account mode: create Supabase account ──
      const supabase = createClient();

      // Sign out any existing session first (prevents overwriting another user's metadata)
      await supabase.auth.signOut();

      const familyName = authEmail.split("@")[0].split("+").pop() || "family";

      const { error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          data: {
            role: "parent",
            full_name: childName || familyName,
            child_name: childName || undefined,
            family_name: familyName,
            onboarding_profile: isAudioMode ? undefined : profile,
            onboarding_completed: true,
            onboarding_mode: formData.onboardingMode,
            ...(isAudioMode && formData.audioUrl ? { onboarding_audio_url: formData.audioUrl } : {}),
          },
        },
      });

      if (signUpError) {
        toast.error(signUpError.message || "Failed to create account");
        setCompleting(false);
        return;
      }

      toast.success("Account created! Check your email to confirm, then sign in.");

      // Redirect to login — onboarding data is in user_metadata (not localStorage)
      router.push("/login");
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      setCompleting(false);
      console.error("Onboarding complete error:", err);
    }
  }, [formData, router, isLoggedIn, isAddChild, authEmail, authPassword]);

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
  // Audio recording helpers
  // ---------------------------------------------------------------------------

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        clearTimer();
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
        setRecordingState("done");
        stopAllTracks();
      };

      recorder.start(1000); // collect data every second
      setRecordingState("recording");
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            recorder.stop();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setMicError(
        "Microphone access was denied. Please allow microphone access in your browser settings, or choose the form option instead."
      );
      setRecordingState("error");
    }
  }, [clearTimer, stopAllTracks]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    clearTimer();
    stopAllTracks();
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingState("idle");
    setRecordingSeconds(0);
    setFormData((p) => ({ ...p, audioUrl: "" }));
  }, [clearTimer, stopAllTracks, audioPreviewUrl]);

  const uploadAudio = useCallback(async () => {
    if (!audioBlob) return;
    setRecordingState("uploading");
    try {
      const supabase = createClient();
      const filename = `onboarding-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("onboarding-audio")
        .upload(filename, audioBlob, { contentType: audioBlob.type });

      if (uploadError) {
        toast.error("Upload failed: " + uploadError.message);
        setRecordingState("done");
        return;
      }

      const { data } = supabase.storage
        .from("onboarding-audio")
        .getPublicUrl(filename);

      setFormData((p) => ({ ...p, audioUrl: data.publicUrl }));
      setRecordingState("uploaded");
      toast.success("Audio uploaded successfully!");
    } catch {
      toast.error("Upload failed. Please try again.");
      setRecordingState("done");
    }
  }, [audioBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      stopAllTracks();
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Scroll to top on step change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  function renderStep0() {
    return (
      <>
        <StepIcon icon={Mail} bgClass="bg-primary/10 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Create Your Account
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          First, let us set up your account. This keeps your family&apos;s
          information secure and lets you access it anytime.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email address <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={authEmail}
              onChange={(e) => {
                setAuthEmail(e.target.value);
                setAuthError("");
              }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Password <span className="text-destructive">*</span>
            </label>
            <PasswordInput
              placeholder="At least 6 characters"
              value={authPassword}
              onChange={(e) => {
                setAuthPassword(e.target.value);
                setAuthError("");
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Confirm password <span className="text-destructive">*</span>
            </label>
            <PasswordInput
              placeholder="Re-enter your password"
              value={authConfirmPassword}
              onChange={(e) => {
                setAuthConfirmPassword(e.target.value);
                setAuthError("");
              }}
            />
            {authConfirmPassword && authPassword !== authConfirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
          {authError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {authError}
            </p>
          )}
          <p className="text-xs text-warm-400 text-center mt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </>
    );
  }

  function renderStep1() {
    return (
      <>
        <StepIcon icon={AudioLines} bgClass="bg-primary/10 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          {isAddChild
            ? "Add another child"
            : "How would you like to tell us about your child?"}
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          {isAddChild
            ? "Tell us about your other child. Choose the option that\u2019s easiest for you."
            : "Choose the option that\u2019s easiest for you."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: Form wizard */}
          <button
            type="button"
            onClick={() => {
              setFormData((p) => ({ ...p, onboardingMode: "wizard" }));
              goTo(2);
            }}
            className={`group relative rounded-2xl border-2 px-6 py-8 text-left transition-all hover:shadow-md ${
              formData.onboardingMode === "wizard"
                ? "border-primary bg-primary/5"
                : "border-warm-200 bg-white hover:border-primary/40"
            }`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-1">
              Fill out the form
            </h3>
            <p className="text-sm text-warm-400 leading-relaxed">
              Answer a few questions step by step. Takes about 5-10 minutes.
            </p>
          </button>

          {/* Option B: Audio recording */}
          <button
            type="button"
            onClick={() => {
              setFormData((p) => ({ ...p, onboardingMode: "audio" }));
              goTo(2);
            }}
            className={`group relative rounded-2xl border-2 px-6 py-8 text-left transition-all hover:shadow-md ${
              formData.onboardingMode === "audio"
                ? "border-primary bg-primary/5"
                : "border-warm-200 bg-white hover:border-primary/40"
            }`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Mic className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-1">
              Record an audio
            </h3>
            <p className="text-sm text-warm-400 leading-relaxed">
              Tell us about your child in your own words. Up to 10 minutes. We&apos;ll do the rest.
            </p>
          </button>
        </div>

        <p className="text-center text-xs text-warm-400 mt-6 leading-relaxed max-w-sm mx-auto">
          We know forms are exhausting. If you&apos;d rather just talk to us, pick the audio option &mdash; our Navigator will handle the rest.
        </p>
      </>
    );
  }

  function renderAudioStep() {
    return (
      <>
        <StepIcon icon={Mic} bgClass="bg-primary/10 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Tell us about your child
        </h2>
        <p className="text-center text-warm-400 mt-1 mb-6 leading-relaxed max-w-md mx-auto">
          Just talk naturally. Use the prompts below as a guide &mdash; you don&apos;t
          need to answer every one.
        </p>

        {/* Mic error state */}
        {micError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <MicOff className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>{micError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((p) => ({ ...p, onboardingMode: "wizard" }));
                    setMicError(null);
                    goTo(2);
                  }}
                  className="mt-2 text-primary font-medium hover:underline"
                >
                  Switch to form instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Child name — required before recording */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-medium text-foreground">
            What is your child&apos;s name? <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.fullName}
            onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
            placeholder="e.g. Gustavo"
            className="max-w-sm"
          />
          <label className="text-sm font-medium text-warm-400">
            Nickname (optional)
          </label>
          <Input
            value={formData.nickname}
            onChange={(e) => setFormData(p => ({ ...p, nickname: e.target.value }))}
            placeholder="e.g. Gugu"
            className="max-w-sm"
          />
        </div>

        {/* Recording UI */}
        <div className="rounded-2xl border-2 border-warm-200 bg-white p-6 mb-6">
          {/* Timer */}
          <div className="text-center mb-4">
            <p className="font-mono text-3xl font-bold text-foreground tabular-nums">
              {formatTime(recordingSeconds)}
            </p>
            <p className="text-xs text-warm-400 mt-1">
              {recordingState === "recording"
                ? `Recording... (max ${formatTime(MAX_RECORDING_SECONDS)})`
                : recordingState === "done" || recordingState === "uploaded"
                  ? "Recording complete"
                  : recordingState === "uploading"
                    ? "Uploading..."
                    : `Tap to start (max ${formatTime(MAX_RECORDING_SECONDS)})`}
            </p>
          </div>

          {/* Pulse animation while recording */}
          {recordingState === "recording" && (
            <div className="flex items-center justify-center gap-1 mb-4 h-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  style={{
                    height: `${12 + Math.random() * 20}px`,
                    animation: `pulse 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-4">
            {recordingState === "idle" || recordingState === "error" ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl transition-all active:scale-95"
                aria-label="Start recording"
              >
                <Mic className="h-7 w-7" />
              </button>
            ) : recordingState === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl transition-all animate-pulse active:scale-95"
                aria-label="Stop recording"
              >
                <Square className="h-6 w-6" />
              </button>
            ) : recordingState === "done" ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetRecording}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-warm-200 text-warm-400 hover:border-primary hover:text-primary transition-all"
                  aria-label="Record again"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={uploadAudio}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-primary/90 hover:shadow-lg transition-all"
                >
                  <Check className="h-4 w-4" />
                  Use this recording
                </button>
              </div>
            ) : recordingState === "uploading" ? (
              <div className="flex items-center gap-2 text-warm-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Uploading audio...</span>
              </div>
            ) : null}
          </div>

          {/* Audio playback preview */}
          {(recordingState === "done" || recordingState === "uploaded") && audioPreviewUrl && (
            <div className="mt-4 flex justify-center">
              <audio controls src={audioPreviewUrl} className="w-full max-w-sm" />
            </div>
          )}
        </div>

        {/* Success message after upload */}
        {recordingState === "uploaded" && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 mb-6 text-center">
            <p className="text-sm font-medium text-green-800 mb-1">
              Thank you! Your Navigator will process this and set up your profile.
            </p>
            <p className="text-xs text-green-600">
              This may take a few minutes after you complete sign up.
            </p>
          </div>
        )}

        {/* Teleprompter-style prompts — always visible */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">
            Talk about any of these topics:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {AUDIO_PROMPTS.map((prompt, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-warm-50 px-4 py-3 text-sm text-foreground"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{prompt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CSS for pulse animation */}
        <style jsx>{`
          @keyframes pulse {
            0% { transform: scaleY(0.4); }
            100% { transform: scaleY(1); }
          }
        `}</style>
      </>
    );
  }

  function renderStep2() {
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
              Child&apos;s full name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Jamie Smith"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, fullName: e.target.value }))
              }
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Nickname (what do you call them?)
            </label>
            <Input
              placeholder="e.g. Dani"
              value={formData.nickname}
              onChange={(e) =>
                setFormData((p) => ({ ...p, nickname: e.target.value }))
              }
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

  function renderStep3() {
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

  function renderStep4() {
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

  function renderStep5() {
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

  function renderStep6() {
    return (
      <>
        <StepIcon icon={Sparkles} bgClass="bg-amber-50 text-amber-500" />
        <h2 className="font-heading text-2xl font-bold text-center text-foreground">
          Tell us about{" "}
          {formData.fullName || formData.nickname || "your child"}
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

  function renderStep7() {
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

  function renderStep8() {
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

  function renderStep9() {
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
          placeholder="e.g. My child does really well with visual schedules. They need extra time for transitions. They love going to the park but get overwhelmed if it's too crowded. We've been on the OAP waitlist since last year..."
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
    0: renderStep0,
    1: renderStep1,
    2: formData.onboardingMode === "audio" ? renderAudioStep : renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
    6: renderStep6,
    7: renderStep7,
    8: renderStep8,
    9: renderStep9,
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
        {!authChecked ? (
          <div className="flex items-center justify-center py-20 text-warm-400">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <>
            {/* Progress area */}
            <div className="w-full max-w-2xl mb-8">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-foreground">
                  Step {currentStepIndex} of {totalSteps}
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
            {(() => {
              // Audio mode at step 2: show back + complete (after upload)
              const isAudioComplete = formData.onboardingMode === "audio" && step === 2;
              // Choice step: cards auto-navigate, only show back
              const isChoiceStep = step === 1;
              // Last wizard step
              const isLastWizardStep = step === TOTAL_ONBOARDING_STEPS;

              return (
                <div className="w-full max-w-2xl mt-6 flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={step === firstStep}
                    onClick={() => {
                      if (step === 2 && formData.onboardingMode !== "") {
                        // Going back from step 2 should go to choice step
                        resetRecording();
                        goTo(1);
                      } else {
                        goTo(step - 1);
                      }
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back
                  </Button>

                  <div className="flex items-center gap-3">
                    {isChoiceStep ? null : isAudioComplete ? (
                      <Button
                        onClick={handleComplete}
                        disabled={completing || recordingState !== "uploaded" || !formData.fullName.trim()}
                      >
                        {completing ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1.5" />
                        )}
                        {completing ? "Setting up..." : "Complete Setup"}
                      </Button>
                    ) : isLastWizardStep ? (
                      <Button onClick={handleComplete} disabled={completing}>
                        {completing ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1.5" />
                        )}
                        {completing ? "Setting up..." : "Complete Setup"}
                      </Button>
                    ) : (
                      <>
                        {isOptionalStep && step < TOTAL_ONBOARDING_STEPS && (
                          <Button variant="ghost" onClick={() => goTo(step + 1)}>
                            Skip this step
                          </Button>
                        )}
                        <Button
                          disabled={!canProceed()}
                          onClick={() => goTo(step + 1)}
                        >
                          Continue
                          <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-warm-400">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  );
}
