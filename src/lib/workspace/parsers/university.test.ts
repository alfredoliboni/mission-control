import fs from "fs";
import path from "path";
import { parseUniversity } from "./university";

function loadChenUniversity(): string {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      "openclaw-backup",
      "workspace-chen",
      "memory",
      "university.md"
    ),
    "utf-8"
  );
}

describe("parseUniversity", () => {
  // ---------------------------------------------------------------------------
  // Real Chen data integration
  // ---------------------------------------------------------------------------
  describe("with Chen university.md", () => {
    let result: ReturnType<typeof parseUniversity>;

    beforeAll(() => {
      const md = loadChenUniversity();
      result = parseUniversity(md);
    });

    it("extracts the title from the H1 heading", () => {
      expect(result.title).toBe("Emma Chen - Post-Secondary Planning");
    });

    it("extracts lastUpdated", () => {
      expect(result.lastUpdated).toBe("2026-04-07");
    });

    it("extracts status", () => {
      expect(result.status).toBe("Active Planning");
    });

    it("extracts the snapshot paragraph", () => {
      expect(result.snapshot).toContain("strong candidate for post-secondary");
      expect(result.snapshot).toContain("transition support");
      // Should not contain Source: line
      expect(result.snapshot).not.toContain("Source:");
    });

    it("extracts academic themes as a list", () => {
      expect(result.academicThemes.length).toBeGreaterThanOrEqual(4);
      expect(result.academicThemes).toContain("computer science");
      expect(result.academicThemes).toContain("mathematics");
      expect(result.academicThemes).toContain(
        "data / analytics-related programs"
      );
    });

    it("extracts planning priorities with title and items", () => {
      expect(result.planningPriorities.length).toBeGreaterThanOrEqual(4);

      const accessibility = result.planningPriorities.find((p) =>
        p.title.includes("Accessibility Services")
      );
      expect(accessibility).toBeDefined();
      expect(accessibility!.items.length).toBeGreaterThanOrEqual(5);
      expect(accessibility!.items).toContain(
        "registration process with accessibility office"
      );
    });

    it("extracts Application Accommodations priority", () => {
      const appAccom = result.planningPriorities.find((p) =>
        p.title.includes("Application Accommodations")
      );
      expect(appAccom).toBeDefined();
      expect(appAccom!.items.length).toBeGreaterThanOrEqual(3);
      expect(appAccom!.items).toContain(
        "standardized testing, if applicable"
      );
    });

    it("extracts Program Fit priority with items", () => {
      const fit = result.planningPriorities.find((p) =>
        p.title.includes("Program Fit")
      );
      expect(fit).toBeDefined();
      expect(fit!.items.length).toBeGreaterThanOrEqual(5);
      expect(fit!.items).toContain("predictable structure");
      expect(fit!.items).toContain("manageable sensory environment");
    });

    it("extracts documentation needed items", () => {
      expect(result.documentationNeeded.length).toBeGreaterThanOrEqual(3);
      expect(result.documentationNeeded).toContain("diagnostic report");
    });

    it("extracts campus transition considerations", () => {
      expect(result.campusConsiderations.length).toBeGreaterThanOrEqual(3);
      expect(result.campusConsiderations[0]).toContain(
        "living at home during first year"
      );
    });

    it("extracts caution notes", () => {
      expect(result.cautionNotes.length).toBeGreaterThanOrEqual(1);
      expect(result.cautionNotes[0]).toContain("best program on paper");
      expect(result.cautionNotes[0]).toContain("transition fit");
    });

    it("extracts Accommodation Areas as a planning priority", () => {
      const accom = result.planningPriorities.find((p) =>
        p.title.includes("Accommodation Areas")
      );
      expect(accom).toBeDefined();
      expect(accom!.items.length).toBeGreaterThanOrEqual(4);
      expect(accom!.items).toContain("reduced-distraction testing");
    });

    it("extracts Next Actions as a planning priority", () => {
      const actions = result.planningPriorities.find((p) =>
        p.title.includes("Next Actions")
      );
      expect(actions).toBeDefined();
      expect(actions!.items.length).toBeGreaterThanOrEqual(4);
      expect(actions!.items[0]).toContain(
        "Confirm academic performance"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe("edge cases", () => {
    it("returns empty defaults for empty string", () => {
      const result = parseUniversity("");
      expect(result.title).toBe("");
      expect(result.lastUpdated).toBe("");
      expect(result.status).toBe("");
      expect(result.snapshot).toBe("");
      expect(result.academicThemes).toEqual([]);
      expect(result.planningPriorities).toEqual([]);
      expect(result.documentationNeeded).toEqual([]);
      expect(result.campusConsiderations).toEqual([]);
      expect(result.cautionNotes).toEqual([]);
    });

    it("handles minimal file with only a title", () => {
      const md = "# University Planning\n\nSome intro text.";
      const result = parseUniversity(md);
      expect(result.title).toBe("University Planning");
      expect(result.academicThemes).toEqual([]);
    });

    it("parses academic themes from bullet list", () => {
      const md = [
        "# Test",
        "",
        "## Likely Good-Fit Academic Themes",
        "Based on interests:",
        "- science",
        "- engineering",
        "- arts",
      ].join("\n");
      const result = parseUniversity(md);
      expect(result.academicThemes).toEqual(["science", "engineering", "arts"]);
    });

    it("parses caution from paragraph when no bullets", () => {
      const md = [
        "# Test",
        "",
        "## Caution",
        "This is a warning about choosing programs.",
      ].join("\n");
      const result = parseUniversity(md);
      expect(result.cautionNotes).toEqual([
        "This is a warning about choosing programs.",
      ]);
    });

    it("parses caution from bullets when present", () => {
      const md = [
        "# Test",
        "",
        "## Caution",
        "- Warning one",
        "- Warning two",
      ].join("\n");
      const result = parseUniversity(md);
      expect(result.cautionNotes).toEqual(["Warning one", "Warning two"]);
    });

    it("extracts campus considerations from alternate heading", () => {
      const md = [
        "# Test",
        "",
        "## Campus Considerations",
        "- Question one?",
        "- Question two?",
      ].join("\n");
      const result = parseUniversity(md);
      expect(result.campusConsiderations).toEqual([
        "Question one?",
        "Question two?",
      ]);
    });
  });
});
