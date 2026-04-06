import { parsePrograms } from "./programs";
import { loadDemoData } from "./__fixtures__/load-demo-data";

describe("parsePrograms", () => {
  describe("with demo data", () => {
    const md = loadDemoData("programs.md");
    const result = parsePrograms(md);

    it("parses gap filler programs", () => {
      expect(result.gapFillers).toHaveLength(3);
    });

    it("parses government programs", () => {
      expect(result.government).toHaveLength(2);
    });

    it("parses educational programs", () => {
      expect(result.educational).toHaveLength(2);
    });

    it("assigns gap_filler category to gap filler programs", () => {
      for (const program of result.gapFillers) {
        expect(program.category).toBe("gap_filler");
        expect(program.isGapFiller).toBe(true);
      }
    });

    it("assigns government category to government programs", () => {
      for (const program of result.government) {
        expect(program.category).toBe("government");
        expect(program.isGapFiller).toBe(false);
      }
    });

    it("assigns educational category to educational programs", () => {
      for (const program of result.educational) {
        expect(program.category).toBe("educational");
        expect(program.isGapFiller).toBe(false);
      }
    });

    it("extracts program names from H3 headings", () => {
      const gapNames = result.gapFillers.map((p) => p.name);
      expect(gapNames).toContain("Autism Ontario Social Skills Group");
      expect(gapNames).toContain(
        "Fanshawe College — Sensory Play Program"
      );
      expect(gapNames).toContain(
        "Western University — ASD Research Study"
      );
    });

    it("extracts type field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.type).toBe("Nonprofit program");
    });

    it("extracts cost field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.cost).toBe("Free");
    });

    it("extracts ages field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.ages).toBe("3-6");
    });

    it("extracts schedule field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.schedule).toContain("Saturdays");
    });

    it("extracts location field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.location).toContain("London");
    });

    it("extracts why_gap_filler field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.whyGapFiller).toContain("social skills");
    });

    it("extracts register field from register key", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.register).toContain("autismontario.com");
    });

    it("extracts register field from contact key", () => {
      const fanshawe = result.gapFillers.find((p) =>
        p.name.includes("Fanshawe")
      );
      expect(fanshawe!.register).toContain("ECE department");
    });

    it("extracts register field from portal key", () => {
      const oap = result.government.find((p) =>
        p.name.includes("Ontario Autism Program")
      );
      expect(oap!.register).toContain("accessoap.ca");
    });

    it("extracts url field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.url).toContain("autismontario.com");
    });

    it("extracts phone field", () => {
      const fanshawe = result.gapFillers.find((p) =>
        p.name.includes("Fanshawe")
      );
      expect(fanshawe!.phone).toBe("519-452-4430");
    });

    it("extracts status field", () => {
      const autismOnt = result.gapFillers.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt!.status).toContain("Next session starts");
    });

    it("extracts email from email key", () => {
      const western = result.gapFillers.find((p) =>
        p.name.includes("Western University")
      );
      expect(western!.email).toBe("asd.study@uwo.ca");
    });

    it("detects email from contact field containing @", () => {
      const md = `## Other Programs
### Test Program
- **Contact:** someone@example.com`;
      const r = parsePrograms(md);
      expect(r.educational).toHaveLength(1);
      expect(r.educational[0].email).toBe("someone@example.com");
    });

    it("extracts lastUpdated", () => {
      expect(result.lastUpdated).toBe("2026-03-28");
    });
  });

  describe("category detection", () => {
    it("detects gap_filler from text", () => {
      const md = `## Gap Filler Programs
### Test
- **Type:** Test`;
      const result = parsePrograms(md);
      expect(result.gapFillers).toHaveLength(1);
      expect(result.gapFillers[0].category).toBe("gap_filler");
    });

    it("detects gap_filler from emoji 🏷️", () => {
      const md = `## 🏷️ Programs
### Test
- **Type:** Test`;
      const result = parsePrograms(md);
      expect(result.gapFillers).toHaveLength(1);
    });

    it("detects government from text", () => {
      const md = `## Government Programs
### Test
- **Type:** Test`;
      const result = parsePrograms(md);
      expect(result.government).toHaveLength(1);
      expect(result.government[0].category).toBe("government");
    });

    it("detects government from emoji 📘", () => {
      const md = `## 📘 Programs
### Test
- **Type:** Test`;
      const result = parsePrograms(md);
      expect(result.government).toHaveLength(1);
    });

    it("detects educational from text", () => {
      const md = `## Educational Programs
### Test
- **Type:** Test`;
      const result = parsePrograms(md);
      expect(result.educational).toHaveLength(1);
      expect(result.educational[0].category).toBe("educational");
    });

    it("detects educational from emoji 📗", () => {
      const md = `## 📗 Programs
### Test
- **Type:** Test`;
      const result = parsePrograms(md);
      expect(result.educational).toHaveLength(1);
    });

    it("defaults to educational for unknown categories", () => {
      const md = `## Other Programs
### Test
- **Type:** Test`;
      const result = parsePrograms(md);
      expect(result.educational).toHaveLength(1);
      expect(result.educational[0].category).toBe("educational");
    });
  });

  describe("edge cases", () => {
    it("returns safe defaults for empty string", () => {
      const result = parsePrograms("");
      expect(result.gapFillers).toEqual([]);
      expect(result.government).toEqual([]);
      expect(result.educational).toEqual([]);
      expect(result.lastUpdated).toBe("");
    });

    it("handles programs with minimal fields", () => {
      const md = `## Government Programs
### Bare Program`;
      const result = parsePrograms(md);
      expect(result.government).toHaveLength(1);
      expect(result.government[0].name).toBe("Bare Program");
      expect(result.government[0].type).toBe("");
      expect(result.government[0].cost).toBe("");
      expect(result.government[0].email).toBe("");
    });
  });
});
