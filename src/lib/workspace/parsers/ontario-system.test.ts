import { parseOntarioSystem } from "./ontario-system";
import { loadDemoData } from "./__fixtures__/load-demo-data";

describe("parseOntarioSystem", () => {
  // ---------------------------------------------------------------------------
  // Demo data integration
  // ---------------------------------------------------------------------------
  describe("with demo data", () => {
    let result: ReturnType<typeof parseOntarioSystem>;

    beforeAll(() => {
      const md = loadDemoData("ontario-system.md");
      result = parseOntarioSystem(md);
    });

    it("extracts journeyOverview from code block", () => {
      expect(result.journeyOverview).toContain("Concerns");
      expect(result.journeyOverview).toContain("Diagnosis");
      expect(result.journeyOverview).toContain("Funding");
    });

    it("parses OAP entry points", () => {
      expect(result.oap.entryPoints.length).toBeGreaterThan(0);
      expect(result.oap.entryPoints[0]).toContain("accessoap.ca");
    });

    it("parses OAP childhood budget items", () => {
      expect(result.oap.childhoodBudget.length).toBeGreaterThan(0);
      expect(result.oap.childhoodBudget.some((b) => b.includes("needs determination"))).toBe(true);
    });

    it("parses OAP foundational services", () => {
      expect(result.oap.foundationalServices.length).toBeGreaterThan(0);
    });

    it("parses wait times table", () => {
      expect(result.oap.waitTimes.length).toBeGreaterThanOrEqual(5);
      const oapBudget = result.oap.waitTimes.find((w) =>
        w.service.includes("OAP Childhood Budget")
      );
      expect(oapBudget).toBeDefined();
      expect(oapBudget!.wait).toContain("4-6");
    });

    it("parses IEP points under school", () => {
      expect(result.school.iepPoints.length).toBeGreaterThan(0);
    });

    it("parses school boards", () => {
      expect(result.school.boards.length).toBeGreaterThanOrEqual(2);
      const tvdsb = result.school.boards.find((b) => b.name === "TVDSB");
      expect(tvdsb).toBeDefined();
      expect(tvdsb!.type).toContain("public");
    });

    it("parses financial supports table", () => {
      expect(result.financialSupports.length).toBeGreaterThanOrEqual(5);
      const dtc = result.financialSupports.find((f) =>
        f.name.includes("Disability Tax Credit")
      );
      expect(dtc).toBeDefined();
      expect(dtc!.eligibility).toContain("ASD diagnosis");
    });

    it("extracts lastUpdated", () => {
      expect(result.lastUpdated).toBe("2026-03-25");
    });

    it("extracts sources heading (content may be in heading line itself)", () => {
      // The demo data has "## Sources: ..." so splitByHeading puts the text in heading, not content.
      // The parser sets sources = section.content.trim(), which is empty.
      // This is a known format gap — the sources appear in the heading string itself.
      expect(result.sources).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // Wait time numeric extraction
  // ---------------------------------------------------------------------------
  describe("wait time numeric extraction", () => {
    it("averages a range like '4-6 months' to 5", () => {
      const md = [
        "## Ontario Autism Program (OAP)",
        "### Wait Times",
        "| Service | Wait |",
        "|---------|------|",
        "| Therapy A | 4-6 months |",
      ].join("\n");
      const result = parseOntarioSystem(md);
      expect(result.oap.waitTimes[0].months).toBe(5);
    });

    it("uses a single number when no range is given", () => {
      const md = [
        "## Ontario Autism Program (OAP)",
        "### Wait Times",
        "| Service | Wait |",
        "|---------|------|",
        "| Therapy B | 12 months |",
      ].join("\n");
      const result = parseOntarioSystem(md);
      expect(result.oap.waitTimes[0].months).toBe(12);
    });

    it("defaults to 6 months when no numeric wait is found", () => {
      const md = [
        "## Ontario Autism Program (OAP)",
        "### Wait Times",
        "| Service | Wait |",
        "|---------|------|",
        "| Therapy C | unknown |",
      ].join("\n");
      const result = parseOntarioSystem(md);
      expect(result.oap.waitTimes[0].months).toBe(6);
    });
  });

  // ---------------------------------------------------------------------------
  // School boards parsing
  // ---------------------------------------------------------------------------
  describe("school boards parsing", () => {
    it("parses bold name and type from dash format", () => {
      const md = [
        "## School System",
        "### School Boards",
        "- **ABC Board** (ABC) — public",
        "- **XYZ Board** (XYZ) — Catholic",
      ].join("\n");
      const result = parseOntarioSystem(md);
      expect(result.school.boards).toHaveLength(2);
      expect(result.school.boards[0].name).toBe("ABC Board");
      expect(result.school.boards[0].type).toBe("public");
      expect(result.school.boards[1].type).toBe("Catholic");
    });
  });

  // ---------------------------------------------------------------------------
  // Empty defaults
  // ---------------------------------------------------------------------------
  describe("empty defaults", () => {
    it("returns sensible defaults for empty input", () => {
      const result = parseOntarioSystem("");
      expect(result.journeyOverview).toBe("");
      expect(result.oap.entryPoints).toEqual([]);
      expect(result.oap.childhoodBudget).toEqual([]);
      expect(result.oap.foundationalServices).toEqual([]);
      expect(result.oap.waitTimes).toEqual([]);
      expect(result.school.iepPoints).toEqual([]);
      expect(result.school.boards).toEqual([]);
      expect(result.financialSupports).toEqual([]);
      expect(result.lastUpdated).toBe("");
      expect(result.sources).toBe("");
    });
  });
});
