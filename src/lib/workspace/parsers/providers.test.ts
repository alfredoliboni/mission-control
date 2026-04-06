import { parseProviders } from "./providers";
import { loadDemoData } from "./__fixtures__/load-demo-data";

describe("parseProviders", () => {
  describe("with demo data", () => {
    const md = loadDemoData("providers.md");
    const result = parseProviders(md);

    it("parses highest priority providers", () => {
      expect(result.highestPriority.length).toBeGreaterThanOrEqual(3);
    });

    it("extracts highest priority provider names", () => {
      const names = result.highestPriority.map((p) => p.name);
      expect(names).toContain(
        "Thames Valley Children's Centre (TVCC)"
      );
      expect(names).toContain(
        "Pathways Health Centre for Children"
      );
      expect(names).toContain(
        "Autism Ontario — London Chapter"
      );
    });

    it("assigns highest priority to highest priority providers", () => {
      for (const provider of result.highestPriority) {
        expect(provider.priority).toBe("highest");
      }
    });

    it("parses relevant providers", () => {
      expect(result.relevant.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts relevant provider names", () => {
      const names = result.relevant.map((p) => p.name);
      expect(names).toContain("Kerry's Place Autism Services");
    });

    it("assigns relevant priority to relevant providers", () => {
      for (const provider of result.relevant) {
        expect(provider.priority).toBe("relevant");
      }
    });

    it("extracts provider type", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.type).toContain("Public");
    });

    it("extracts provider services", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.services).toContain("SLP");
      expect(tvcc!.services).toContain("OT");
    });

    it("extracts provider relevance", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.relevance).toContain("SLP");
    });

    it("extracts provider waitlist", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.waitlist).toContain("8 months");
    });

    it("extracts provider contact", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.contact).toContain("519-685-8680");
    });

    it("extracts provider funding", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.funding).toContain("OAP");
    });

    it("extracts provider notes", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.notes).toContain("Primary service hub");
    });

    it("detects GAP FILLER from content", () => {
      const autismOnt = result.highestPriority.find((p) =>
        p.name.includes("Autism Ontario")
      );
      expect(autismOnt).toBeDefined();
      expect(autismOnt!.isGapFiller).toBe(true);
    });

    it("marks non-gap-filler providers correctly", () => {
      const tvcc = result.highestPriority.find((p) =>
        p.name.includes("TVCC")
      );
      expect(tvcc!.isGapFiller).toBe(false);
    });

    it("demo data uses fallback path — tables not extracted from fallback", () => {
      // The demo data has H2 > H3 (priority headers) > H4 (providers) structure.
      // The primary H3/H4 path hits "continue" on priority headers, finding 0 providers,
      // then the fallback H2→H3→H4 path runs. The fallback doesn't call extractTable,
      // so tables remain empty.
      expect(result.tables).toEqual([]);
    });

    it("extracts tables when using primary parsing path", () => {
      const md = `### Some Section
| Provider | Hourly Rate | Waitlist | Specialties |
|----------|-------------|----------|-------------|
| Test OT | $150/hr | 2 weeks | Sensory |
| Another OT | $130/hr | 1 month | Motor |`;
      const r = parseProviders(md);
      expect(r.tables).toHaveLength(2);
      expect(r.tables[0].provider).toBe("Test OT");
      expect(r.tables[0].hourlyRate).toBe("$150/hr");
      expect(r.tables[0].waitlist).toBe("2 weeks");
      expect(r.tables[0].specialties).toBe("Sensory");
      expect(r.tables[1].provider).toBe("Another OT");
    });

    it("extracts lastUpdated", () => {
      expect(result.lastUpdated).toBe("2026-03-28");
    });
  });

  describe("priority group detection", () => {
    it("detects highest priority from heading text", () => {
      const md = `### Highest Priority
#### Provider A
- **Type:** Public
- **Services:** OT`;
      const result = parseProviders(md);
      expect(result.highestPriority).toHaveLength(1);
      expect(result.highestPriority[0].name).toBe("Provider A");
      expect(result.highestPriority[0].priority).toBe("highest");
    });

    it("detects relevant from heading text", () => {
      const md = `### Relevant Providers
#### Provider B
- **Type:** Private
- **Services:** ABA`;
      const result = parseProviders(md);
      expect(result.relevant).toHaveLength(1);
      expect(result.relevant[0].name).toBe("Provider B");
      expect(result.relevant[0].priority).toBe("relevant");
    });

    it("detects relevant from 🔸 emoji", () => {
      const md = `### 🔸 Secondary
#### Provider C
- **Type:** Nonprofit`;
      const result = parseProviders(md);
      expect(result.relevant).toHaveLength(1);
      expect(result.relevant[0].name).toBe("Provider C");
    });

    it("detects relevant from community keyword", () => {
      const md = `### Community Resources
#### Provider D
- **Type:** Community`;
      const result = parseProviders(md);
      expect(result.relevant).toHaveLength(1);
      expect(result.relevant[0].priority).toBe("relevant");
    });
  });

  describe("fallback parsing", () => {
    it("falls back to H2→H3→H4 nesting when H3/H4 finds nothing", () => {
      const md = `## Providers
### Highest Priority
#### Fallback Provider
- **Type:** Private
- **Services:** Speech therapy
- **Contact:** 555-1234`;
      const result = parseProviders(md);
      expect(result.highestPriority).toHaveLength(1);
      expect(result.highestPriority[0].name).toBe("Fallback Provider");
      expect(result.highestPriority[0].type).toBe("Private");
      expect(result.highestPriority[0].services).toBe("Speech therapy");
    });

    it("handles multiple priority groups in fallback mode", () => {
      const md = `## Service Providers
### Highest Priority
#### Provider X
- **Type:** Public
### Relevant Providers
#### Provider Y
- **Type:** Nonprofit`;
      const result = parseProviders(md);
      expect(result.highestPriority).toHaveLength(1);
      expect(result.highestPriority[0].name).toBe("Provider X");
      expect(result.relevant).toHaveLength(1);
      expect(result.relevant[0].name).toBe("Provider Y");
    });
  });

  describe("GAP FILLER detection", () => {
    it("detects GAP FILLER text in content", () => {
      const md = `### Priority
#### Test Provider
- **Type:** Nonprofit
- **Relevance:** GAP FILLER for therapy`;
      const result = parseProviders(md);
      // Depending on which parsing path is hit
      const allProviders = [
        ...result.highestPriority,
        ...result.relevant,
        ...result.other,
      ];
      const gapFillers = allProviders.filter((p) => p.isGapFiller);
      expect(gapFillers.length).toBeGreaterThanOrEqual(1);
    });

    it("detects 🏷️ emoji as gap filler indicator", () => {
      const md = `### Priority
#### Tagged Provider
- **Type:** Nonprofit
- **Relevance:** 🏷️ Use while waiting`;
      const result = parseProviders(md);
      const allProviders = [
        ...result.highestPriority,
        ...result.relevant,
        ...result.other,
      ];
      const gapFillers = allProviders.filter((p) => p.isGapFiller);
      expect(gapFillers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("edge cases", () => {
    it("returns safe defaults for empty string", () => {
      const result = parseProviders("");
      expect(result.highestPriority).toEqual([]);
      expect(result.relevant).toEqual([]);
      expect(result.other).toEqual([]);
      expect(result.tables).toEqual([]);
      expect(result.lastUpdated).toBe("");
    });

    it("handles provider with no KV pairs", () => {
      const md = `### Highest Priority
#### Empty Provider
Some free text about this provider.`;
      const result = parseProviders(md);
      expect(result.highestPriority).toHaveLength(1);
      expect(result.highestPriority[0].name).toBe("Empty Provider");
      expect(result.highestPriority[0].type).toBe("");
      expect(result.highestPriority[0].services).toBe("");
    });
  });
});
