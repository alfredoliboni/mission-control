import { parseJourneyPartners } from "./journey-partners";
import { loadDemoData } from "./__fixtures__/load-demo-data";

describe("parseJourneyPartners", () => {
  describe("with demo data", () => {
    const md = loadDemoData("journey-partners.md");
    const result = parseJourneyPartners(md);

    it("parses active team members", () => {
      expect(result.activeTeam).toHaveLength(3);
    });

    it("parses former team members", () => {
      expect(result.formerTeam).toHaveLength(1);
    });

    it("extracts active team names", () => {
      const names = result.activeTeam.map((p) => p.name);
      expect(names).toContain("Dana William");
      expect(names).toContain("Dr. Smith");
      expect(names).toContain("Sarah Thompson");
    });

    it("extracts former team name", () => {
      expect(result.formerTeam[0].name).toBe("Previous OT");
    });

    it("marks active team as active", () => {
      for (const partner of result.activeTeam) {
        expect(partner.active).toBe(true);
      }
    });

    it("marks former team as not active", () => {
      for (const partner of result.formerTeam) {
        expect(partner.active).toBe(false);
      }
    });

    it("extracts role", () => {
      const dana = result.activeTeam.find((p) => p.name === "Dana William");
      expect(dana!.role).toBe("Occupational Therapist");
    });

    it("extracts organization", () => {
      const dana = result.activeTeam.find((p) => p.name === "Dana William");
      expect(dana!.organization).toBe("Dana William Clinic");
    });

    it("extracts services", () => {
      const dana = result.activeTeam.find((p) => p.name === "Dana William");
      expect(dana!.services).toBe("OT, Sensory Integration");
    });

    it("extracts contact", () => {
      const dana = result.activeTeam.find((p) => p.name === "Dana William");
      expect(dana!.contact).toContain("5196979760");
      expect(dana!.contact).toContain("dana@example.com");
    });

    it("extracts status", () => {
      const dana = result.activeTeam.find((p) => p.name === "Dana William");
      expect(dana!.status).toContain("Active since 2026-04-10");
    });

    it("extracts source", () => {
      const dana = result.activeTeam.find((p) => p.name === "Dana William");
      expect(dana!.source).toContain("Invited by family");
    });

    it("handles partner with minimal fields", () => {
      const smith = result.activeTeam.find((p) => p.name === "Dr. Smith");
      expect(smith!.role).toBe("Pediatrician");
      expect(smith!.organization).toBe("London Medical Centre");
      expect(smith!.services).toBe("");
    });

    it("extracts former team status and source", () => {
      const former = result.formerTeam[0];
      expect(former.status).toContain("Removed 2026-03-01");
      expect(former.source).toContain("Switched to Dana William");
    });

    it("extracts lastUpdated", () => {
      expect(result.lastUpdated).toBe("2026-04-14");
    });
  });

  describe("edge cases", () => {
    it("returns safe defaults for empty string", () => {
      const result = parseJourneyPartners("");
      expect(result.activeTeam).toEqual([]);
      expect(result.formerTeam).toEqual([]);
      expect(result.lastUpdated).toBe("");
    });

    it("handles markdown with no recognized sections", () => {
      const md = `# Journey Partners\n\n## Some Other Section\n\n### Person\n- Role: Test`;
      const result = parseJourneyPartners(md);
      expect(result.activeTeam).toEqual([]);
      expect(result.formerTeam).toEqual([]);
    });

    it("handles active team only (no former)", () => {
      const md = `# Journey Partners

Last Updated: 2026-04-14

## Active Team

### Test Person
- Role: Doctor
- Organization: Test Clinic
- Status: Active since 2026-01-01`;
      const result = parseJourneyPartners(md);
      expect(result.activeTeam).toHaveLength(1);
      expect(result.formerTeam).toEqual([]);
      expect(result.activeTeam[0].name).toBe("Test Person");
      expect(result.activeTeam[0].active).toBe(true);
    });

    it("handles former team only (no active)", () => {
      const md = `# Journey Partners

## Former Team

### Old Partner
- Role: Therapist
- Status: Removed 2026-01-01`;
      const result = parseJourneyPartners(md);
      expect(result.activeTeam).toEqual([]);
      expect(result.formerTeam).toHaveLength(1);
      expect(result.formerTeam[0].active).toBe(false);
    });

    it("handles partner with no KV pairs", () => {
      const md = `# Journey Partners

## Active Team

### Mystery Partner
Some free text about this partner.`;
      const result = parseJourneyPartners(md);
      expect(result.activeTeam).toHaveLength(1);
      expect(result.activeTeam[0].name).toBe("Mystery Partner");
      expect(result.activeTeam[0].role).toBe("");
      expect(result.activeTeam[0].organization).toBe("");
    });
  });
});
