"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useParsedOntarioSystem,
  useParsedProfile,
} from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import {
  Check,
  ExternalLink,
  FileText,
  Lightbulb,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Timeline step data (static — the Ontario system is always these steps) ── */

interface TimelineStep {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  requiredDocuments: string[];
  insights: string[];
  tips: string[];
  resources: { label: string; url: string }[];
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: "initial-concerns",
    number: 1,
    title: "Initial Concerns & Primary Care Screening",
    subtitle: "Can be identified from infancy through school age",
    description:
      "The journey begins when parents, caregivers, or educators notice developmental differences. A visit to the family doctor or pediatrician starts the formal screening process. Early identification leads to better outcomes.",
    requiredDocuments: [
      "Family medical history",
      "Developmental milestone notes",
      "Daycare/school observations (if available)",
    ],
    insights: [
      "Average age of ASD diagnosis in Ontario is 4-5 years, but signs can appear as early as 12-18 months",
      "The Modified Checklist for Autism in Toddlers (M-CHAT) is commonly used at 18-month well-baby visits",
    ],
    tips: [
      "Keep a written log of developmental concerns with specific examples and dates",
      "Video examples of behaviours can be very helpful for the doctor",
    ],
    resources: [
      { label: "Ontario 18-Month Well-Baby Visit", url: "https://www.ontario.ca/page/baby-child-health" },
    ],
  },
  {
    id: "diagnostic-referral",
    number: 2,
    title: "Diagnostic Assessment Referral",
    subtitle:
      "Wait times vary: 6 months to 2+ years depending on region",
    description:
      "Your pediatrician or family doctor refers your child to a qualified professional for a comprehensive diagnostic assessment. This can be a developmental pediatrician, psychologist, or a multidisciplinary team.",
    requiredDocuments: [
      "Referral letter from physician",
      "Completed screening forms (e.g., M-CHAT-R/F)",
      "Previous assessments or reports",
    ],
    insights: [
      "Ontario accepts solo clinician diagnosis (e.g., a single psychologist)",
      "Some provinces require team-based diagnosis — Ontario does not",
      "Private assessments can reduce wait times significantly ($2,000-$4,000+)",
    ],
    tips: [
      "Ask your doctor to refer to multiple clinics simultaneously to reduce wait time",
      "Look into university training clinics — they sometimes have shorter waitlists",
    ],
    resources: [
      { label: "Ontario Autism Assessment Centres", url: "https://www.ontario.ca/page/ontario-autism-program" },
    ],
  },
  {
    id: "diagnostic-assessment",
    number: 3,
    title: "Comprehensive Diagnostic Assessment",
    subtitle:
      "Assessment process: typically 2-4 appointments over several weeks",
    description:
      "A qualified diagnostician conducts standardized assessments (ADOS-2, ADI-R, cognitive testing) to determine whether your child meets criteria for ASD. The result is a formal written report with diagnosis and recommendations.",
    requiredDocuments: [
      "Child health records",
      "School/daycare reports",
      "Previous speech, OT, or developmental assessments",
      "Completed parent questionnaires (provided by assessor)",
    ],
    insights: [
      "A Level 1, 2, or 3 diagnosis does not determine OAP funding — needs determination does",
      "The written report is essential for OAP registration",
    ],
    tips: [
      "Request extra copies of the diagnostic report — you will need them for OAP, school, and benefits applications",
      "Ask the diagnostician to include specific therapy recommendations in the report",
    ],
    resources: [
      { label: "Understanding ASD Diagnosis", url: "https://www.autismontario.com/diagnosis" },
    ],
  },
  {
    id: "oap-registration",
    number: 4,
    title: "Register with Ontario Autism Program (OAP)",
    subtitle: "Registration typically processed within 4-6 weeks",
    description:
      "With a formal ASD diagnosis in hand, families register with the Ontario Autism Program through AccessOAP. This is the gateway to publicly funded autism services in Ontario, including the Childhood Budget and Core Clinical Services.",
    requiredDocuments: [
      "Completed AccessOAP registration form",
      "Copy of diagnostic report confirming ASD",
      "Child's birth certificate or proof of age",
      "Ontario Health Insurance Plan (OHIP) card",
      "Proof of Ontario residency",
    ],
    insights: [
      "Registration opens access to Foundational Family Services immediately — no wait",
      "The needs determination process happens after registration, not before",
    ],
    tips: [
      "Register online at accessoap.ca as soon as you have the diagnosis — do not wait",
      "Call AccessOAP if you have not heard back within 6 weeks",
    ],
    resources: [
      { label: "AccessOAP Registration", url: "https://www.accessoap.ca" },
      { label: "Ontario Autism Program", url: "https://www.ontario.ca/page/ontario-autism-program" },
    ],
  },
  {
    id: "childhood-budget",
    number: 5,
    title: "Childhood Budget & Core Clinical Services",
    subtitle:
      "Budget allocation can take several months after registration",
    description:
      "After needs determination, families receive a Childhood Budget ($20,000-$55,000/year based on needs) to purchase approved therapies from registered providers. This includes ABA/IBI, occupational therapy, speech therapy, and other evidence-based services.",
    requiredDocuments: [
      "Needs Determination results",
      "Chosen provider agreements",
      "Invoices from registered OAP service providers",
    ],
    insights: [
      "Budget amount is based on needs determination — not the level of diagnosis",
      "Families choose their own providers from the registered provider list",
      "Unused budget does not carry over between funding periods",
    ],
    tips: [
      "Research and shortlist providers before your budget is approved so you can start immediately",
      "Join parent Facebook groups for your region — families share provider reviews and tips",
    ],
    resources: [
      { label: "OAP Childhood Budget", url: "https://www.ontario.ca/page/ontario-autism-program" },
    ],
  },
  {
    id: "foundational-services",
    number: 6,
    title: "Foundational Family Services",
    subtitle:
      "Available immediately upon OAP registration; ongoing support throughout childhood",
    description:
      "These no-waitlist services provide families with workshops, caregiver coaching, and online learning modules. Available to all OAP-registered families regardless of Childhood Budget status. As your child grows, planning for transition to adult services begins at age 14-16.",
    requiredDocuments: [
      "OAP registration confirmation",
    ],
    insights: [
      "These services are free and have no waitlist — start them immediately",
      "Transition planning to adult services (ODSP, adult programs) should begin around age 14-16",
    ],
    tips: [
      "Take the caregiver coaching workshops — parents report they are one of the most valuable parts of OAP",
      "Connect with your local Family Service Provider for additional community resources",
    ],
    resources: [
      { label: "Foundational Family Services", url: "https://www.ontario.ca/page/ontario-autism-program" },
      { label: "Autism Ontario", url: "https://www.autismontario.com" },
    ],
  },
];

/* ── Summary bar milestones ──────────────────────────────────────────────── */

const MILESTONES = [
  { time: "3-6 mo", label: "Referral to Assessment", color: "text-status-success" },
  { time: "1-3+ yrs", label: "Concern to Care", color: "text-status-caution" },
  { time: "4-6 wks", label: "OAP Registration", color: "text-status-current" },
  { time: "Age 16", label: "Start Transition", color: "text-status-gap-filler" },
];

/* ── Stage mapping — maps currentStage strings to step IDs ───────────────── */

function resolveCurrentStep(currentStage: string): string {
  const stage = currentStage.toLowerCase().replace(/[_\-\s]+/g, " ").trim();

  if (stage.includes("concern") || stage.includes("screening") || stage.includes("pre diagnosis") || stage.includes("pre-diagnosis")) {
    return "initial-concerns";
  }
  if (stage.includes("referral") || stage.includes("referred") || stage.includes("recently diagnosed")) {
    return "diagnostic-referral";
  }
  if (stage.includes("assessment") || stage.includes("diagnosed") || stage.includes("diagnosis")) {
    return "diagnostic-assessment";
  }
  if (stage.includes("seeking") || stage.includes("registration") || stage.includes("oap") || stage.includes("registered")) {
    return "oap-registration";
  }
  if (stage.includes("budget") || stage.includes("funding") || stage.includes("services") || stage.includes("therapy")) {
    return "childhood-budget";
  }
  if (stage.includes("transition") || stage.includes("employment") || stage.includes("foundational") || stage.includes("adolescent")) {
    return "foundational-services";
  }

  // Default: OAP registration step
  return "oap-registration";
}

function getStepStatus(
  stepIndex: number,
  currentStepIndex: number
): "completed" | "current" | "upcoming" {
  if (stepIndex < currentStepIndex) return "completed";
  if (stepIndex === currentStepIndex) return "current";
  return "upcoming";
}

/* ── Detail popup ────────────────────────────────────────────────────────── */

function StepDetailPanel({
  step,
  status,
  onClose,
}: {
  step: TimelineStep;
  status: "completed" | "current" | "upcoming";
  onClose: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StepNode number={step.number} status={status} size="sm" />
          <h3 className="text-[15px] font-semibold text-foreground leading-tight">
            {step.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close details"
        >
          <X className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Description */}
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        {step.description}
      </p>

      {/* Required Documents */}
      {step.requiredDocuments.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="size-3.5 text-primary" />
            <h4 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">
              Required Documents
            </h4>
          </div>
          <ul className="space-y-1">
            {step.requiredDocuments.map((doc, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed"
              >
                <span className="text-primary/60 shrink-0 mt-0.5">&#8226;</span>
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Insights */}
      {step.insights.length > 0 && (
        <div className="bg-status-caution/8 border border-status-caution/20 rounded-lg p-3.5">
          <h4 className="text-[12px] font-semibold text-status-caution uppercase tracking-wide mb-2">
            Key Insights
          </h4>
          <ul className="space-y-1.5">
            {step.insights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12px] text-foreground leading-relaxed"
              >
                <span className="text-status-caution shrink-0 mt-0.5">&#9679;</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {step.tips.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="size-3.5 text-status-caution" />
            <h4 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">
              Tips
            </h4>
          </div>
          <ul className="space-y-1.5">
            {step.tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed"
              >
                <span className="text-status-caution shrink-0">&#128161;</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Official Resources */}
      {step.resources.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-2">
            Official Resources
          </h4>
          <div className="flex flex-wrap gap-2">
            {step.resources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline font-medium transition-colors"
              >
                {res.label}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Timeline node (circle on the line) ──────────────────────────────────── */

function StepNode({
  number,
  status,
  size = "md",
}: {
  number: number;
  status: "completed" | "current" | "upcoming";
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const fontSize = size === "sm" ? "text-[12px]" : "text-[14px]";

  if (status === "completed") {
    return (
      <div
        className={cn(
          dim,
          "rounded-full bg-status-success flex items-center justify-center shrink-0"
        )}
      >
        <Check className={cn(size === "sm" ? "size-3.5" : "size-4", "text-white")} strokeWidth={3} />
      </div>
    );
  }

  if (status === "current") {
    return (
      <div
        className={cn(
          dim,
          "rounded-full bg-status-current flex items-center justify-center shrink-0",
          "shadow-[0_0_0_4px_rgba(59,125,216,0.20)] animate-pulse"
        )}
      >
        <span className={cn(fontSize, "font-bold text-white")}>{number}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        dim,
        "rounded-full bg-muted flex items-center justify-center shrink-0"
      )}
    >
      <span className={cn(fontSize, "font-bold text-muted-foreground")}>{number}</span>
    </div>
  );
}

/* ── Timeline card (alternating left/right) ──────────────────────────────── */

function TimelineCard({
  step,
  status,
  side,
  isSelected,
  onSelect,
}: {
  step: TimelineStep;
  status: "completed" | "current" | "upcoming";
  side: "left" | "right";
  isSelected: boolean;
  onSelect: () => void;
}) {
  const borderColor =
    status === "completed"
      ? "border-status-success/40"
      : status === "current"
        ? "border-status-current"
        : "border-border";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "bg-card border rounded-xl p-4 text-left w-full transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "min-h-[44px]",
        borderColor,
        isSelected && status === "current" && "shadow-[0_0_0_2px_rgba(59,125,216,0.20)]",
        isSelected && status === "completed" && "shadow-[0_0_0_2px_rgba(45,138,78,0.15)]",
        isSelected && status === "upcoming" && "shadow-[0_0_0_2px_rgba(0,0,0,0.06)]"
      )}
      aria-label={`Step ${step.number}: ${step.title}`}
    >
      {/* Mobile: show node inline */}
      <div className="flex items-start gap-3 md:hidden mb-2">
        <StepNode number={step.number} status={status} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[13px] font-semibold text-foreground leading-tight">
              {step.title}
            </h3>
            {status === "current" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-status-current/10 text-status-current">
                Current
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: title + badge only (node is on the line) */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">
            {step.title}
          </h3>
          {status === "current" && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-status-current/10 text-status-current">
              Current
            </span>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <p
        className={cn(
          "text-[11px] leading-relaxed mt-1.5",
          status === "upcoming" ? "text-muted-foreground/60" : "text-muted-foreground"
        )}
      >
        {step.subtitle}
      </p>
    </button>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function OntarioSystemPage() {
  const { data: ontarioData, isLoading: ontarioLoading } = useParsedOntarioSystem();
  const { data: profile, isLoading: profileLoading } = useParsedProfile();

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const isLoading = ontarioLoading || profileLoading;

  // Resolve which step the child is currently at
  const currentStepId = useMemo(() => {
    if (!profile?.basicInfo.currentStage) return "oap-registration";
    return resolveCurrentStep(profile.basicInfo.currentStage);
  }, [profile]);

  const currentStepIndex = TIMELINE_STEPS.findIndex((s) => s.id === currentStepId);

  const handleSelectStep = useCallback(
    (stepId: string) => {
      setSelectedStepId((prev) => (prev === stepId ? null : stepId));
    },
    []
  );

  const selectedStep = TIMELINE_STEPS.find((s) => s.id === selectedStepId);
  const selectedStepStatus = selectedStep
    ? getStepStatus(
        TIMELINE_STEPS.indexOf(selectedStep),
        currentStepIndex
      )
    : null;

  return (
    <WorkspaceSection
      title="Ontario System"
      icon="🏛️"
      isLoading={isLoading}
      lastUpdated={ontarioData?.lastUpdated}
    >
      <div className="space-y-6">
        {/* ── Top: Timeline Summary Bar ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MILESTONES.map((m, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className={cn("text-[18px] font-bold", m.color)}>{m.time}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.label}</p>
            </div>
          ))}
        </div>

        {/* ── Mobile: stacked timeline ──────────────────────────────────── */}
        <div className="md:hidden space-y-0">
          <div className="bg-card border border-border rounded-xl p-4">
            {TIMELINE_STEPS.map((step, i) => {
              const status = getStepStatus(i, currentStepIndex);
              const isLast = i === TIMELINE_STEPS.length - 1;
              const isSelected = selectedStepId === step.id;

              return (
                <div key={step.id} className="relative">
                  {/* Connector */}
                  {!isLast && (
                    <div
                      className={cn(
                        "absolute left-[17px] top-[44px] bottom-0 w-[2px]",
                        status === "completed"
                          ? "bg-status-success/30"
                          : status === "current"
                            ? "bg-gradient-to-b from-status-current/30 to-border"
                            : "bg-border"
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <div className="py-1.5">
                    <TimelineCard
                      step={step}
                      status={status}
                      side="left"
                      isSelected={isSelected}
                      onSelect={() => handleSelectStep(step.id)}
                    />
                  </div>

                  {/* Inline detail panel (mobile) */}
                  {isSelected && selectedStep && selectedStepStatus && (
                    <div className="relative z-10 mt-1 mb-2">
                      <StepDetailPanel
                        step={selectedStep}
                        status={selectedStepStatus}
                        onClose={() => setSelectedStepId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Desktop: alternating visual timeline ─────────────────────── */}
        <div className="hidden md:block relative">
          {/* Central timeline line */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(to bottom, var(--color-status-success) 0%, var(--color-status-current) 50%, var(--color-warm-300) 100%)",
            }}
            aria-hidden="true"
          />

          <div className="space-y-8 relative">
            {TIMELINE_STEPS.map((step, i) => {
              const status = getStepStatus(i, currentStepIndex);
              const side = i % 2 === 0 ? "left" : "right";
              const isSelected = selectedStepId === step.id;

              return (
                <div key={step.id} className="relative">
                  {/* Row: card + node + card-space */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-6">
                    {/* Left column */}
                    <div
                      className={cn(
                        side === "left" ? "block" : "invisible"
                      )}
                    >
                      {side === "left" && (
                        <TimelineCard
                          step={step}
                          status={status}
                          side="left"
                          isSelected={isSelected}
                          onSelect={() => handleSelectStep(step.id)}
                        />
                      )}
                    </div>

                    {/* Center node */}
                    <div className="flex flex-col items-center pt-3">
                      <StepNode number={step.number} status={status} />
                    </div>

                    {/* Right column */}
                    <div
                      className={cn(
                        side === "right" ? "block" : "invisible"
                      )}
                    >
                      {side === "right" && (
                        <TimelineCard
                          step={step}
                          status={status}
                          side="right"
                          isSelected={isSelected}
                          onSelect={() => handleSelectStep(step.id)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Detail panel (desktop) */}
                  {isSelected && selectedStep && selectedStepStatus && (
                    <div className="mt-4 max-w-2xl mx-auto relative z-10">
                      <StepDetailPanel
                        step={selectedStep}
                        status={selectedStepStatus}
                        onClose={() => setSelectedStepId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Supporting data from workspace ────────────────────────────── */}
        {ontarioData && (
          <div className="space-y-4 mt-2">
            {/* Wait Times */}
            {ontarioData.oap.waitTimes.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <h2 className="text-[15px] font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span aria-hidden="true">&#9202;</span> Current Wait Times (London region)
                </h2>
                <div className="space-y-3">
                  {ontarioData.oap.waitTimes.map((wt, i) => (
                    <WaitTimeBar
                      key={i}
                      service={wt.service}
                      wait={wt.wait}
                      months={wt.months}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 italic">
                  Estimates based on community reports. Actual times may vary.
                </p>
              </div>
            )}

            {/* Financial Supports */}
            {ontarioData.financialSupports.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 transition-all">
                <h2 className="text-[15px] font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span aria-hidden="true">&#128176;</span> Financial Supports
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ontarioData.financialSupports.map((b, i) => (
                    <div
                      key={i}
                      className="bg-card border border-border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-[13px] font-semibold text-foreground">
                          {b.name}
                        </h4>
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-success/8 text-status-success shrink-0">
                          {b.amount}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {b.eligibility}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {ontarioData?.sources && (
          <div className="text-[11px] text-muted-foreground px-1">
            Sources: {ontarioData.sources}
          </div>
        )}
      </div>
    </WorkspaceSection>
  );
}

/* ── Wait-time bar (re-used from original) ───────────────────────────────── */

function WaitTimeBar({
  service,
  wait,
  months,
}: {
  service: string;
  wait: string;
  months: number;
}) {
  const maxMonths = 18;
  const pct = Math.min((months / maxMonths) * 100, 100);
  const color =
    months <= 4
      ? "bg-status-success"
      : months <= 8
        ? "bg-status-caution"
        : "bg-status-blocked";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{service}</span>
        <span className="text-[11px] text-muted-foreground">{wait}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
