import type { ParsedProfile } from "@/types/workspace";

/**
 * Represents a child's extracted support need.
 */
export interface ExtractedNeed {
  /** Short label, e.g. "OT", "SLP", "ABA" */
  label: string;
  /** Longer description, e.g. "sensory integration, fine motor" */
  detail: string;
}

/**
 * Extracts structured support needs from a parsed child profile.
 *
 * Logic:
 * 1. Parse communication text for speech/language indicators -> SLP
 * 2. Parse sensory text for sensory processing indicators -> OT (sensory)
 * 3. Parse challenges for fine motor -> OT (fine motor)
 * 4. Parse diagnosis for ASD indicators -> ABA/IBI
 * 5. Parse challenges for social skills -> Social Skills
 * 6. Parse comorbid conditions for additional needs
 */
export function extractNeeds(profile: ParsedProfile): ExtractedNeed[] {
  const needs: ExtractedNeed[] = [];
  const comm = profile.personalProfile.communication.toLowerCase();
  const sensory = profile.personalProfile.sensory.toLowerCase();
  const challenges = profile.personalProfile.challenges.toLowerCase();
  const challengesList = profile.personalProfile.challengesList.map((c) =>
    c.toLowerCase()
  );
  const diagnosis = profile.basicInfo.diagnosis.toLowerCase();
  const comorbid = profile.medical.comorbidConditions.map((c) =>
    c.toLowerCase()
  );

  // OT needs — sensory integration + fine motor
  const otDetails: string[] = [];
  if (
    sensory.includes("sensory") ||
    sensory.includes("proprioceptive") ||
    sensory.includes("sensitive") ||
    comorbid.some((c) => c.includes("sensory processing"))
  ) {
    otDetails.push("sensory integration");
  }
  if (
    challenges.includes("fine motor") ||
    challengesList.some((c) => c.includes("fine motor"))
  ) {
    otDetails.push("fine motor");
  }
  if (
    challenges.includes("food") ||
    challenges.includes("eating") ||
    challengesList.some(
      (c) => c.includes("food") || c.includes("eating") || c.includes("texture")
    )
  ) {
    otDetails.push("feeding");
  }
  if (otDetails.length > 0) {
    needs.push({ label: "OT", detail: otDetails.join(", ") });
  }

  // SLP needs — speech/language
  const slpDetails: string[] = [];
  if (
    comm.includes("limited verbal") ||
    comm.includes("non-verbal") ||
    comm.includes("nonverbal") ||
    comm.includes("few words") ||
    comm.includes("word phrases")
  ) {
    // Extract phrase detail
    const phraseMatch = comm.match(/(\d[-\u2013]\d+\s*word\s*phrases?)/i);
    slpDetails.push(
      phraseMatch ? `limited verbal, ${phraseMatch[1]}` : "limited verbal"
    );
  }
  if (
    comm.includes("pecs") ||
    comm.includes("aac") ||
    comm.includes("sign") ||
    comm.includes("makaton")
  ) {
    slpDetails.push("AAC support");
  }
  if (
    comm.includes("receptive") &&
    (comm.includes("more than express") || comm.includes("understands"))
  ) {
    slpDetails.push("expressive language gap");
  }
  if (slpDetails.length > 0) {
    needs.push({ label: "SLP", detail: slpDetails.join(", ") });
  } else if (
    comm.includes("speech") ||
    comm.includes("language") ||
    comm.includes("verbal")
  ) {
    needs.push({ label: "SLP", detail: "speech-language support" });
  }

  // ABA/IBI needs — from diagnosis
  if (
    diagnosis.includes("asd") ||
    diagnosis.includes("autism") ||
    diagnosis.includes("level 2") ||
    diagnosis.includes("level 3")
  ) {
    needs.push({ label: "ABA/IBI", detail: "behavioral therapy" });
  }

  // Social skills
  if (
    challenges.includes("social") ||
    challenges.includes("peer") ||
    challengesList.some(
      (c) => c.includes("social") || c.includes("peer")
    )
  ) {
    needs.push({ label: "Social Skills", detail: "peer interaction support" });
  }

  // Self-regulation
  if (
    challenges.includes("self-regulation") ||
    challenges.includes("regulation") ||
    challenges.includes("overstimulation") ||
    challengesList.some(
      (c) =>
        c.includes("regulation") ||
        c.includes("overstimulation") ||
        c.includes("meltdown")
    )
  ) {
    needs.push({
      label: "Sensory Support",
      detail: "self-regulation strategies",
    });
  }

  return needs;
}

/**
 * Builds a human-readable recommendation summary from extracted needs.
 */
export function buildRecommendationSummary(needs: ExtractedNeed[]): string {
  if (needs.length === 0) return "";
  const otNeed = needs.find((n) => n.label === "OT");
  const slpNeed = needs.find((n) => n.label === "SLP");

  const parts: string[] = [];
  if (otNeed) parts.push(`${otNeed.detail} support`);
  if (slpNeed) parts.push(`speech-language therapy`);
  if (needs.some((n) => n.label === "ABA/IBI")) parts.push("behavioral intervention");
  if (needs.some((n) => n.label === "Social Skills")) parts.push("social skills programming");
  if (needs.some((n) => n.label === "Sensory Support")) parts.push("sensory regulation strategies");

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}
