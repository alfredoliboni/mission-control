import { describe, it, expect } from "vitest";
import { extractNeeds, buildRecommendationSummary } from "./needs";
import type { ParsedProfile } from "@/types/workspace";

function makeProfile(overrides: Partial<{
  communication: string;
  sensory: string;
  challenges: string;
  challengesList: string[];
  diagnosis: string;
  comorbidConditions: string[];
}>): ParsedProfile {
  return {
    basicInfo: {
      name: "Test Child",
      age: "4 years",
      dob: "2022-01-01",
      diagnosis: overrides.diagnosis || "ASD Level 2",
      diagnosisDate: "2024-01-01",
      stage: "Seeking Services",
      postalCode: "N6A 1B2",
      location: "London, Ontario",
      languages: "English",
    },
    personalProfile: {
      communication: overrides.communication || "",
      sensory: overrides.sensory || "",
      interests: "",
      strengths: "",
      challenges: overrides.challenges || "",
      challengesList: overrides.challengesList || [],
    },
    medical: {
      medications: "",
      supplements: "",
      diagnoses: [],
      allergies: "",
      sleepConcerns: "",
      feedingConcerns: "",
      comorbidConditions: overrides.comorbidConditions || [],
    },
    journeyPartners: {
      family: [],
      careTeam: [],
      systemContacts: [],
    },
    notes: "",
    lastUpdated: "2024-01-01",
  };
}

describe("extractNeeds", () => {
  it("extracts OT need from sensory profile", () => {
    const profile = makeProfile({
      sensory: "Sensitive to noise and fluorescent lights; seeks proprioceptive input",
    });
    const needs = extractNeeds(profile);
    const ot = needs.find((n) => n.label === "OT");
    expect(ot).toBeDefined();
    expect(ot!.detail).toContain("sensory integration");
  });

  it("extracts OT need from fine motor challenges", () => {
    const profile = makeProfile({
      challenges: "fine motor tasks, transitions",
    });
    const needs = extractNeeds(profile);
    const ot = needs.find((n) => n.label === "OT");
    expect(ot).toBeDefined();
    expect(ot!.detail).toContain("fine motor");
  });

  it("extracts SLP need from limited verbal communication", () => {
    const profile = makeProfile({
      communication: "Verbal limited, usually 2-3 word phrases; uses signs",
    });
    const needs = extractNeeds(profile);
    const slp = needs.find((n) => n.label === "SLP");
    expect(slp).toBeDefined();
    expect(slp!.detail).toContain("limited verbal");
  });

  it("extracts ABA/IBI from ASD Level 2 diagnosis", () => {
    const profile = makeProfile({ diagnosis: "Autism Spectrum Disorder (ASD) Level 2" });
    const needs = extractNeeds(profile);
    const aba = needs.find((n) => n.label === "ABA/IBI");
    expect(aba).toBeDefined();
  });

  it("extracts ABA/IBI for all ASD levels", () => {
    const profile = makeProfile({ diagnosis: "ASD Level 1" });
    const needs = extractNeeds(profile);
    const aba = needs.find((n) => n.label === "ABA/IBI");
    expect(aba).toBeDefined(); // ABA suggested for all ASD diagnoses
  });

  it("extracts multiple needs from Alex Santos profile", () => {
    const profile = makeProfile({
      communication: "Verbal limited, usually 2-3 word phrases; uses signs",
      sensory: "Sensitive to noise and fluorescent lights; seeks proprioceptive input",
      challenges: "Transitions, waiting, crowded spaces, fine motor tasks",
      diagnosis: "Autism Spectrum Disorder (ASD) Level 2",
    });
    const needs = extractNeeds(profile);
    const labels = needs.map((n) => n.label);
    expect(labels).toContain("OT");
    expect(labels).toContain("SLP");
    expect(labels).toContain("ABA/IBI");
  });

  it("returns empty for minimal profile", () => {
    const profile = makeProfile({
      diagnosis: "Under assessment",
      communication: "",
      sensory: "",
      challenges: "",
    });
    const needs = extractNeeds(profile);
    expect(needs.length).toBe(0);
  });

  it("extracts feeding need from OT", () => {
    const profile = makeProfile({
      challenges: "food selectivity, texture aversion",
      challengesList: ["food selectivity"],
    });
    const needs = extractNeeds(profile);
    const ot = needs.find((n) => n.label === "OT");
    expect(ot).toBeDefined();
    expect(ot!.detail).toContain("feeding");
  });
});

describe("buildRecommendationSummary", () => {
  it("builds summary from multiple needs", () => {
    const needs = [
      { label: "OT", detail: "sensory integration, fine motor" },
      { label: "SLP", detail: "limited verbal" },
      { label: "ABA/IBI", detail: "behavioral therapy" },
    ];
    const summary = buildRecommendationSummary(needs);
    expect(summary).toContain("sensory integration, fine motor support");
    expect(summary).toContain("speech-language therapy");
    expect(summary).toContain("behavioral intervention");
  });

  it("returns empty string for no needs", () => {
    expect(buildRecommendationSummary([])).toBe("");
  });

  it("returns single item without 'and'", () => {
    const needs = [{ label: "OT", detail: "sensory integration" }];
    const summary = buildRecommendationSummary(needs);
    expect(summary).toBe("sensory integration support");
    expect(summary).not.toContain("and");
  });
});
