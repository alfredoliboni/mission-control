import { parseDocuments } from "./documents";
import { loadDemoData } from "./__fixtures__/load-demo-data";

describe("parseDocuments", () => {
  // ---------------------------------------------------------------------------
  // Demo data integration
  // ---------------------------------------------------------------------------
  describe("with demo data", () => {
    let result: ReturnType<typeof parseDocuments>;

    beforeAll(() => {
      const md = loadDemoData("documents.md");
      result = parseDocuments(md);
    });

    it("parses all document rows from the demo file", () => {
      expect(result.documents.length).toBeGreaterThanOrEqual(4);
    });

    it("extracts date, title, from, type and storageLink for each row", () => {
      const first = result.documents[0];
      expect(first.date).toBe("2025-11-20");
      expect(first.title).toBe("ASD Diagnostic Report");
      expect(first.from).toBe("Dr. Patel (TVCC)");
      expect(first.type).toBe("Diagnosis");
      expect(first.storageLink).toBe("/docs/alex/diagnosis-2025-11-20.pdf");
    });

    it("extracts summaries from H3 sections", () => {
      expect(result.summaries.length).toBeGreaterThanOrEqual(2);
      expect(result.summaries[0].title).toContain("ASD Diagnostic Report");
      expect(result.summaries[0].findings.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Placeholder filtering
  // ---------------------------------------------------------------------------
  describe("placeholder filtering", () => {
    it("filters out rows where both date and title are empty", () => {
      const md = [
        "## All Documents",
        "| Date | Title | From | Type | Storage Link |",
        "|------|-------|------|------|--------------|",
        "|  |  | Someone | Type | /link |",
        "| 2026-01-01 | Valid | Author | Report | /valid |",
      ].join("\n");

      const result = parseDocuments(md);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe("Valid");
    });

    it("keeps rows with empty date but non-empty title (date falls through to title)", () => {
      const md = [
        "## All Documents",
        "| Date | Title | From | Type | Storage Link |",
        "|------|-------|------|------|--------------|",
        "|  | Has title | Someone | Type | /link |",
      ].join("\n");

      const result = parseDocuments(md);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe("Has title");
    });

    it('filters out rows matching "(no documents..."', () => {
      const md = [
        "## All Documents",
        "| Date | Title | From | Type | Storage Link |",
        "|------|-------|------|------|--------------|",
        "| (no documents uploaded yet) | | | | |",
        "| 2026-01-01 | Valid | Author | Report | /valid |",
      ].join("\n");

      const result = parseDocuments(md);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe("Valid");
    });
  });

  // ---------------------------------------------------------------------------
  // Summaries extraction
  // ---------------------------------------------------------------------------
  describe("summaries extraction", () => {
    it("parses bullet findings in H3 sections under ## Summaries", () => {
      const md = [
        "## Summaries",
        "### Report Alpha",
        "- Finding one",
        "- Finding two",
        "### Report Beta",
        "1. First numbered",
        "2. Second numbered",
      ].join("\n");

      const result = parseDocuments(md);
      expect(result.summaries).toHaveLength(2);
      expect(result.summaries[0].title).toBe("Report Alpha");
      expect(result.summaries[0].findings).toEqual(["Finding one", "Finding two"]);
      expect(result.summaries[1].title).toBe("Report Beta");
      expect(result.summaries[1].findings).toEqual(["First numbered", "Second numbered"]);
    });

    it("ignores non-bullet/numbered lines in summaries", () => {
      const md = [
        "## Summaries",
        "### A Doc",
        "Some intro text",
        "- Actual finding",
        "More text",
      ].join("\n");

      const result = parseDocuments(md);
      expect(result.summaries[0].findings).toEqual(["Actual finding"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty / defaults
  // ---------------------------------------------------------------------------
  describe("empty string defaults", () => {
    it("returns empty documents and summaries for empty input", () => {
      const result = parseDocuments("");
      expect(result.documents).toEqual([]);
      expect(result.summaries).toEqual([]);
    });

    it("defaults missing fields to empty strings", () => {
      const md = [
        "## All Documents",
        "| Date | Title | From | Type | Storage Link |",
        "|------|-------|------|------|--------------|",
        "| 2026-01-01 | | | | |",
      ].join("\n");

      const result = parseDocuments(md);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe("");
      expect(result.documents[0].from).toBe("");
      expect(result.documents[0].type).toBe("");
      expect(result.documents[0].storageLink).toBe("");
    });
  });
});
