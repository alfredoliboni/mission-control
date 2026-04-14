import { parseProfile } from "./profile";
import { loadDemoData } from "./__fixtures__/load-demo-data";

// ---------------------------------------------------------------------------
// Demo data integration
// ---------------------------------------------------------------------------
describe("parseProfile — demo data", () => {
  const result = parseProfile(loadDemoData("child-profile.md"));

  it("parses title from h1", () => {
    expect(result.title).toBe("Child Profile — Alex Santos");
  });

  it("parses basic info fields", () => {
    expect(result.basicInfo.name).toBe("Alex Santos");
    expect(result.basicInfo.dateOfBirth).toBe("2022-03-15");
    expect(result.basicInfo.age).toBe("4");
    expect(result.basicInfo.diagnosis).toBe("ASD Level 2 (diagnosed 2025-11-20)");
    expect(result.basicInfo.currentStage).toBe("seeking-services");
    expect(result.basicInfo.postalCode).toBe("N6A 3K7");
  });

  it("parses personal profile KV summaries", () => {
    expect(result.personalProfile.communication).toContain("Verbal");
    expect(result.personalProfile.sensory).toContain("Sensitive to loud noises");
    expect(result.personalProfile.interests).toContain("Trains");
    expect(result.personalProfile.strengths).toContain("visual memory");
    expect(result.personalProfile.challenges).toContain("Transitions");
  });

  it("parses interests list from h3 subsection", () => {
    expect(result.personalProfile.interestsList.length).toBeGreaterThanOrEqual(5);
    expect(result.personalProfile.interestsList.some((i) => i.includes("Trains"))).toBe(true);
  });

  it("parses sensory profile from h3 subsection", () => {
    const sp = result.personalProfile.sensoryProfile;
    expect(sp.seeks.length).toBeGreaterThan(0);
    expect(sp.avoids.length).toBeGreaterThan(0);
    expect(sp.calming.length).toBeGreaterThan(0);
    expect(sp.seeks.some((s) => s.includes("Deep pressure"))).toBe(true);
  });

  it("parses communication styles from h3 subsection", () => {
    expect(result.personalProfile.communicationStyles.length).toBeGreaterThan(0);
    expect(result.personalProfile.communicationStyles.some((c) => c.includes("verbal"))).toBe(true);
  });

  it("parses personality traits from h3 subsection", () => {
    expect(result.personalProfile.personalityTraits.length).toBeGreaterThan(0);
  });

  it("parses triggers from h3 subsection", () => {
    expect(result.personalProfile.triggers.length).toBeGreaterThan(0);
  });

  it("parses strengths list from h3 subsection", () => {
    expect(result.personalProfile.strengthsList.length).toBeGreaterThan(0);
  });

  it("parses challenges list from h3 subsection", () => {
    expect(result.personalProfile.challengesList.length).toBeGreaterThan(0);
  });

  it("parses medications from table", () => {
    expect(result.medical.medications).toHaveLength(1);
    expect(result.medical.medications[0].medication).toBe("Melatonin");
    expect(result.medical.medications[0].dose).toBe("3mg");
    expect(result.medical.medications[0].frequency).toBe("Nightly");
    expect(result.medical.medications[0].prescriber).toBe("Dr. Patel");
  });

  it("parses supplements from table", () => {
    expect(result.medical.supplements.length).toBeGreaterThanOrEqual(3);
    expect(result.medical.supplements[0].supplement).toBe("Vitamin D");
  });

  it("parses comorbid conditions", () => {
    expect(result.medical.comorbidConditions.length).toBeGreaterThanOrEqual(2);
    expect(result.medical.comorbidConditions.some((c) => c.includes("Sleep"))).toBe(true);
  });

  it("parses doctors", () => {
    expect(result.medical.doctors.length).toBeGreaterThanOrEqual(2);
    expect(result.medical.doctors[0].role).toBe("Pediatrician");
    expect(result.medical.doctors[0].name).toBe("Dr. Sarah Chen");
  });

  it("parses upcoming appointments", () => {
    expect(result.medical.appointments.length).toBeGreaterThanOrEqual(2);
    expect(result.medical.appointments[0].date).toBe("2026-04-15");
  });

  it("parses journey partners from table", () => {
    expect(result.journeyPartners.length).toBeGreaterThanOrEqual(3);
    expect(result.journeyPartners[0].role).toBe("Teacher");
    expect(result.journeyPartners[0].name).toBe("Ms. Rodriguez");
  });

  it("parses extra information section", () => {
    expect(result.personalProfile.extraInfo).toContain("visual schedules");
    expect(result.personalProfile.extraInfo).toContain("OAP waitlist");
  });
});

// ---------------------------------------------------------------------------
// Empty / malformed input
// ---------------------------------------------------------------------------
describe("parseProfile — edge cases", () => {
  it("returns safe defaults for empty string", () => {
    const result = parseProfile("");
    expect(result.title).toBe("Child Profile");
    expect(result.basicInfo.name).toBe("");
    expect(result.basicInfo.dateOfBirth).toBe("");
    expect(result.basicInfo.diagnosis).toBe("");
    expect(result.personalProfile.interestsList).toEqual([]);
    expect(result.personalProfile.sensoryProfile).toEqual({ seeks: [], avoids: [], calming: [] });
    expect(result.medical.medications).toEqual([]);
    expect(result.medical.unconfirmedMedications).toEqual([]);
    expect(result.journeyPartners).toEqual([]);
  });

  it("returns safe defaults for malformed markdown", () => {
    const md = "|||broken|table\n\nrandom garbage *** ## # ###";
    const result = parseProfile(md);
    expect(result.title).toBe("Child Profile");
    expect(result.basicInfo.name).toBe("");
    expect(result.medical.medications).toEqual([]);
    expect(result.journeyPartners).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// FORMAT GAP TESTS
// ---------------------------------------------------------------------------

// Gap 1: Diagnosis format with parenthetical note
describe("parseProfile — diagnosis format gap", () => {
  it("stores raw diagnosis string including parenthetical notes", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Name:** Test Child",
      "- **Diagnosis:** ASD (recently diagnosed)",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.diagnosis).toBe("ASD (recently diagnosed)");
  });

  it("stores complex diagnosis with level and date", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Diagnosis:** ASD Level 2 (diagnosed 2025-11-20)",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.diagnosis).toBe("ASD Level 2 (diagnosed 2025-11-20)");
  });
});

// Gap 2: Unconfirmed medications
describe("parseProfile — unconfirmed medications gap", () => {
  it("populates unconfirmedMedications from bullet list under Unconfirmed Medications heading", () => {
    const md = [
      "# Child Profile",
      "## Medical Info",
      "### Unconfirmed Medications",
      "- Risperidone (mentioned by family, not verified)",
      "- Vitamin B12 injections",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.unconfirmedMedications).toEqual([
      "Risperidone (mentioned by family, not verified)",
      "Vitamin B12 injections",
    ]);
  });

  it("returns empty unconfirmedMedications when the section is absent", () => {
    const md = [
      "# Child Profile",
      "## Medical Info",
      "### Current Medications",
      "| Medication | Dose | Frequency | Prescriber | Start Date | Status | Notes |",
      "|------------|------|-----------|------------|------------|--------|-------|",
      "| Melatonin | 3mg | Nightly | Dr. Patel | 2026-01-15 | Active | Sleep |",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.unconfirmedMedications).toEqual([]);
  });
});

// Gap 3: Personal Profile with KV pairs only (no H3 subsections)
describe("parseProfile — personal profile KV-only gap", () => {
  it("populates KV fields but leaves lists empty when no h3 subsections exist", () => {
    const md = [
      "# Child Profile",
      "## Personal Profile",
      "- **Communication:** Nonverbal",
      "- **Sensory:** Seeks deep pressure",
      "- **Interests:** Blocks, trains",
      "- **Strengths:** Visual learner",
      "- **Challenges:** Transitions",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.personalProfile.communication).toBe("Nonverbal");
    expect(result.personalProfile.sensory).toBe("Seeks deep pressure");
    expect(result.personalProfile.interests).toBe("Blocks, trains");
    expect(result.personalProfile.strengths).toBe("Visual learner");
    expect(result.personalProfile.challenges).toBe("Transitions");
    expect(result.personalProfile.interestsList).toEqual([]);
    expect(result.personalProfile.communicationStyles).toEqual([]);
    expect(result.personalProfile.personalityTraits).toEqual([]);
    expect(result.personalProfile.triggers).toEqual([]);
    expect(result.personalProfile.strengthsList).toEqual([]);
    expect(result.personalProfile.challengesList).toEqual([]);
  });
});

// Gap 4: Extra fields — Location and Family Language map to basicInfo
describe("parseProfile — extra basicInfo fields gap", () => {
  it("maps Location to basicInfo.location", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Name:** Test Child",
      "- **Location:** London, Ontario",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.location).toBe("London, Ontario");
  });

  it("maps Family Language to basicInfo.familyLanguage", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Name:** Test Child",
      "- **Family Language:** Portuguese, English",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.familyLanguage).toBe("Portuguese, English");
  });

  it("handles both Location and Family Language together", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Name:** Test Child",
      "- **Location:** Toronto, Ontario",
      "- **Family Language:** French",
      "- **Postal Code:** M5V 1A1",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.location).toBe("Toronto, Ontario");
    expect(result.basicInfo.familyLanguage).toBe("French");
    expect(result.basicInfo.postalCode).toBe("M5V 1A1");
  });

  it("defaults to empty string when Location and Family Language are absent", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Name:** Test Child",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.location).toBe("");
    expect(result.basicInfo.familyLanguage).toBe("");
  });

  it("maps City/Region to basicInfo.location", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Name:** Test Child",
      "- **City/Region:** London, Ontario",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.location).toBe("London, Ontario");
  });

  it("maps Languages at home to basicInfo.familyLanguage", () => {
    const md = [
      "# Child Profile",
      "## Basic Info",
      "- **Name:** Test Child",
      "- **Languages at home:** Portuguese and English",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.basicInfo.familyLanguage).toBe("Portuguese and English");
  });
});

// Gap 5: Placeholder rows in medications table are filtered out
describe("parseProfile — medication placeholder filtering gap", () => {
  it("filters out '(none confirmed)' rows from medications table", () => {
    const md = [
      "# Child Profile",
      "## Medical Info",
      "### Current Medications",
      "| Medication | Dose | Frequency | Prescriber | Start Date | Status | Notes |",
      "|------------|------|-----------|------------|------------|--------|-------|",
      "| (none confirmed) | | | | | | |",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.medications).toEqual([]);
  });

  it("filters out '(to be added)' rows from medications table", () => {
    const md = [
      "# Child Profile",
      "## Medical Info",
      "### Current Medications",
      "| Medication | Dose | Frequency | Prescriber | Start Date | Status | Notes |",
      "|------------|------|-----------|------------|------------|--------|-------|",
      "| (to be added) | | | | | | |",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.medications).toEqual([]);
  });

  it("filters out '(no medications)' rows from medications table", () => {
    const md = [
      "# Child Profile",
      "## Medical Info",
      "### Current Medications",
      "| Medication | Dose | Frequency | Prescriber | Start Date | Status | Notes |",
      "|------------|------|-----------|------------|------------|--------|-------|",
      "| (no medications) | | | | | | |",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.medications).toEqual([]);
  });

  it("keeps real medications while filtering placeholders", () => {
    const md = [
      "# Child Profile",
      "## Medical Info",
      "### Current Medications",
      "| Medication | Dose | Frequency | Prescriber | Start Date | Status | Notes |",
      "|------------|------|-----------|------------|------------|--------|-------|",
      "| Melatonin | 3mg | Nightly | Dr. Patel | 2026-01-15 | Active | Sleep |",
      "| (none confirmed) | | | | | | |",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.medications).toHaveLength(1);
    expect(result.medical.medications[0].medication).toBe("Melatonin");
  });
});

// ---------------------------------------------------------------------------
// Additional structural tests
// ---------------------------------------------------------------------------
describe("parseProfile — structural", () => {
  it("uses 'Child Profile' as default title when h1 is missing", () => {
    const md = "## Basic Info\n- **Name:** No Title Child";
    const result = parseProfile(md);
    expect(result.title).toBe("Child Profile");
    expect(result.basicInfo.name).toBe("No Title Child");
  });

  it("parses journey partners from table", () => {
    const md = [
      "# Profile",
      "## Journey Partners",
      "| Role | Name | Organization | Contact | Notes |",
      "|------|------|-------------|---------|-------|",
      "| Teacher | Ms. Smith | School ABC | smith@abc.ca | Morning class |",
      "| OT | Dr. Jones | Clinic XYZ | jones@xyz.ca | Weekly |",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.journeyPartners).toHaveLength(2);
    expect(result.journeyPartners[0].role).toBe("Teacher");
    expect(result.journeyPartners[0].name).toBe("Ms. Smith");
    expect(result.journeyPartners[0].organization).toBe("School ABC");
    expect(result.journeyPartners[0].contact).toBe("smith@abc.ca");
    expect(result.journeyPartners[0].notes).toBe("Morning class");
  });

  it("parses doctors with role/name/org/phone format", () => {
    const md = [
      "# Profile",
      "## Medical Info",
      "### Doctors",
      "- **Pediatrician:** Dr. Chen — London HSC — 519-555-0123",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.doctors).toHaveLength(1);
    expect(result.medical.doctors[0].role).toBe("Pediatrician");
    expect(result.medical.doctors[0].name).toBe("Dr. Chen");
    expect(result.medical.doctors[0].organization).toBe("London HSC");
    expect(result.medical.doctors[0].phone).toBe("519-555-0123");
  });

  it("parses appointments with date: description format", () => {
    const md = [
      "# Profile",
      "## Medical Info",
      "### Upcoming Appointments",
      "- 2026-04-15: Follow-up with Dr. Patel",
      "- 2026-05-01: OT assessment",
    ].join("\n");
    const result = parseProfile(md);
    expect(result.medical.appointments).toHaveLength(2);
    expect(result.medical.appointments[0].date).toBe("2026-04-15");
    expect(result.medical.appointments[0].description).toBe("Follow-up with Dr. Patel");
    expect(result.medical.appointments[1].date).toBe("2026-05-01");
  });
});
