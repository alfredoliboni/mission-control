import fs from "fs";
import path from "path";
import { parseEmployment } from "./employment";

function loadChenEmployment(): string {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      "openclaw-backup",
      "workspace-chen",
      "memory",
      "employment.md"
    ),
    "utf-8"
  );
}

describe("parseEmployment", () => {
  // ---------------------------------------------------------------------------
  // Real Chen data integration
  // ---------------------------------------------------------------------------
  describe("with Chen employment.md", () => {
    let result: ReturnType<typeof parseEmployment>;

    beforeAll(() => {
      const md = loadChenEmployment();
      result = parseEmployment(md);
    });

    it("extracts the title from the H1 heading", () => {
      expect(result.title).toBe("Emma Chen - Employment Planning");
    });

    it("extracts lastUpdated", () => {
      expect(result.lastUpdated).toBe("2026-04-07");
    });

    it("extracts status", () => {
      expect(result.status).toBe("Active Planning");
    });

    it("extracts strengths list", () => {
      expect(result.strengths.length).toBeGreaterThanOrEqual(5);
      expect(result.strengths).toContain("programming interest");
      expect(result.strengths).toContain("math / logic strengths");
      expect(result.strengths).toContain("pattern recognition");
    });

    it("extracts support needs list", () => {
      expect(result.supportNeeds.length).toBeGreaterThanOrEqual(4);
      expect(result.supportNeeds).toContain("social nuance with peers/supervisors");
      expect(result.supportNeeds).toContain(
        "sensory tolerance in noisy or chaotic workplaces"
      );
    });

    it("extracts near-term goals", () => {
      expect(result.goals.nearTerm.length).toBeGreaterThanOrEqual(2);
      expect(result.goals.nearTerm[0]).toContain(
        "Build employment readiness slowly and positively"
      );
    });

    it("extracts mid-term goals", () => {
      expect(result.goals.midTerm.length).toBeGreaterThanOrEqual(3);
      expect(result.goals.midTerm).toEqual(
        expect.arrayContaining([
          expect.stringContaining("resume"),
        ])
      );
    });

    it("extracts planning areas with title, description, and items", () => {
      expect(result.planningAreas.length).toBeGreaterThanOrEqual(4);

      const vocational = result.planningAreas.find((a) =>
        a.title.includes("Vocational Assessment")
      );
      expect(vocational).toBeDefined();
      expect(vocational!.items.length).toBeGreaterThan(0);
      expect(vocational!.items).toContain("interest clarification");
    });

    it("extracts career hypotheses", () => {
      expect(result.careerHypotheses.length).toBeGreaterThanOrEqual(4);
      expect(result.careerHypotheses).toContain("software / programming");
      expect(result.careerHypotheses).toContain("data analysis");
    });

    it("extracts next actions as numbered items", () => {
      expect(result.nextActions.length).toBeGreaterThanOrEqual(4);
      expect(result.nextActions[0]).toContain(
        "Ask school about co-op options"
      );
      expect(result.nextActions[1]).toContain("Build first draft resume");
    });

    it("planning area descriptions are non-empty where present", () => {
      const vocational = result.planningAreas.find((a) =>
        a.title.includes("Vocational Assessment")
      );
      expect(vocational!.description).toBeTruthy();
      expect(vocational!.description.toLowerCase()).toContain("useful for");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe("edge cases", () => {
    it("returns empty defaults for empty string", () => {
      const result = parseEmployment("");
      expect(result.title).toBe("");
      expect(result.strengths).toEqual([]);
      expect(result.supportNeeds).toEqual([]);
      expect(result.goals.nearTerm).toEqual([]);
      expect(result.goals.midTerm).toEqual([]);
      expect(result.planningAreas).toEqual([]);
      expect(result.careerHypotheses).toEqual([]);
      expect(result.nextActions).toEqual([]);
      expect(result.lastUpdated).toBeUndefined();
      expect(result.status).toBeUndefined();
    });

    it("handles minimal file with only a title", () => {
      const md = "# Employment Plan\n\nSome intro text.";
      const result = parseEmployment(md);
      expect(result.title).toBe("Employment Plan");
      expect(result.strengths).toEqual([]);
      expect(result.nextActions).toEqual([]);
    });

    it("handles goals without sub-headings gracefully", () => {
      const md = [
        "# Test Employment",
        "",
        "## Employment Goals",
        "- Some general goal",
      ].join("\n");
      const result = parseEmployment(md);
      expect(result.goals.nearTerm).toEqual([]);
      expect(result.goals.midTerm).toEqual([]);
    });

    it("handles next actions as bullet items when not numbered", () => {
      const md = [
        "# Test",
        "",
        "## Next Actions",
        "- Do thing A",
        "- Do thing B",
      ].join("\n");
      const result = parseEmployment(md);
      expect(result.nextActions).toEqual(["Do thing A", "Do thing B"]);
    });

    it("parses career hypotheses from alternative heading name", () => {
      const md = [
        "# Test",
        "",
        "## Career Hypotheses",
        "- Engineering",
        "- Teaching",
      ].join("\n");
      const result = parseEmployment(md);
      expect(result.careerHypotheses).toEqual(["Engineering", "Teaching"]);
    });

    it("ignores Source: lines in profile snapshot", () => {
      const md = [
        "# Test",
        "",
        "## Employment Profile Snapshot",
        "Likely strengths:",
        "- coding",
        "Source: USER.md",
        "- this should not appear",
      ].join("\n");
      const result = parseEmployment(md);
      expect(result.strengths).toEqual(["coding"]);
      expect(result.supportNeeds).toEqual([]);
    });
  });
});
