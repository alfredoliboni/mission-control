import { parseBenefits } from "./benefits";
import { loadDemoData } from "./__fixtures__/load-demo-data";

describe("parseBenefits", () => {
  describe("with demo data", () => {
    const md = loadDemoData("benefits.md");
    const result = parseBenefits(md);

    it("parses all status table rows", () => {
      expect(result.statusTable).toHaveLength(6);
    });

    it("extracts benefit names from status table", () => {
      const names = result.statusTable.map((r) => r.benefit);
      expect(names).toContain("Disability Tax Credit (DTC)");
      expect(names).toContain("Ontario Autism Program (OAP)");
      expect(names).toContain("Child Disability Benefit (CDB)");
    });

    it("maps pending status from ⏳ emoji", () => {
      const dtc = result.statusTable.find((r) =>
        r.benefit.includes("DTC")
      );
      expect(dtc).toBeDefined();
      expect(dtc!.status).toBe("pending");
    });

    it("maps registered status from ✅ emoji", () => {
      const oap = result.statusTable.find((r) =>
        r.benefit.includes("OAP")
      );
      expect(oap).toBeDefined();
      expect(oap!.status).toBe("registered");
    });

    it("maps CDB status — ⏳ takes precedence over 'waiting' keyword", () => {
      // The CDB status display is "⏳ Waiting on DTC" which contains ⏳,
      // so parseBenefitStatus matches "pending" before reaching "waiting"
      const cdb = result.statusTable.find((r) =>
        r.benefit.includes("CDB")
      );
      expect(cdb).toBeDefined();
      expect(cdb!.status).toBe("pending");
    });

    it("maps not_started status for items without recognized keywords", () => {
      const acsd = result.statusTable.find((r) =>
        r.benefit.includes("ACSD")
      );
      expect(acsd).toBeDefined();
      expect(acsd!.status).toBe("not_started");
    });

    it("preserves statusDisplay with original text", () => {
      const dtc = result.statusTable.find((r) =>
        r.benefit.includes("DTC")
      );
      expect(dtc!.statusDisplay).toContain("Pending");
    });

    it("extracts amount from status table", () => {
      const oap = result.statusTable.find((r) =>
        r.benefit.includes("OAP")
      );
      expect(oap!.amount).toContain("$20,000");
    });

    it("extracts applied date from status table", () => {
      const dtc = result.statusTable.find((r) =>
        r.benefit.includes("DTC")
      );
      expect(dtc!.applied).toBe("2026-01-20");
    });

    it("extracts notes from status table", () => {
      const dtc = result.statusTable.find((r) =>
        r.benefit.includes("DTC")
      );
      expect(dtc!.notes).toContain("T2201");
    });

    it("parses detailed eligibility sections", () => {
      expect(result.details.length).toBeGreaterThanOrEqual(6);
    });

    it("extracts detail names from H3 headings", () => {
      const names = result.details.map((d) => d.name);
      expect(names).toContain("Disability Tax Credit (DTC)");
      expect(names).toContain("Ontario Autism Program (OAP)");
      expect(names).toContain("Child Disability Benefit (CDB)");
    });

    it("extracts eligibility from detail", () => {
      const dtc = result.details.find((d) =>
        d.name.includes("DTC")
      );
      expect(dtc).toBeDefined();
      expect(dtc!.eligibility).toContain("Likely qualifies");
    });

    it("extracts amount from detail", () => {
      const dtc = result.details.find((d) =>
        d.name.includes("DTC")
      );
      expect(dtc!.amount).toContain("$2,500");
    });

    it("extracts unlocks from detail", () => {
      const dtc = result.details.find((d) =>
        d.name.includes("DTC")
      );
      expect(dtc!.unlocks).toContain("CDB");
      expect(dtc!.unlocks).toContain("RDSP");
    });

    it("extracts howApplied from detail", () => {
      const dtc = result.details.find((d) =>
        d.name.includes("DTC")
      );
      expect(dtc!.howApplied).toContain("T2201");
    });

    it("extracts action items with ⚠️ prefix", () => {
      const dtc = result.details.find((d) =>
        d.name.includes("DTC")
      );
      expect(dtc!.action).toContain("Call CRA");
    });

    it("extracts action items from OAP detail", () => {
      const oap = result.details.find((d) =>
        d.name.includes("Ontario Autism Program")
      );
      expect(oap!.action).toContain("Entry to OAP workshop");
    });

    it("extracts documents needed", () => {
      const dtc = result.details.find((d) =>
        d.name.includes("DTC")
      );
      expect(dtc!.documentsNeeded).toContain("T2201");
    });

    it("extracts renewal info", () => {
      const dtc = result.details.find((d) =>
        d.name.includes("DTC")
      );
      expect(dtc!.renewal).toContain("Annual");
    });

    it("extracts agent monitoring items", () => {
      expect(result.agentMonitoring.length).toBeGreaterThanOrEqual(3);
      expect(result.agentMonitoring[0]).toContain("CRA portal");
      expect(result.agentMonitoring[2]).toContain("OAP Childhood Budget");
    });

    it("extracts last updated date", () => {
      expect(result.lastUpdated).toBe("2026-03-28");
    });
  });

  describe("status mapping", () => {
    it("maps ✅ to registered", () => {
      const md = `## Application Status
| Benefit | Status | Amount | Applied | Approved | Renewal | Notes |
|---------|--------|--------|---------|----------|---------|-------|
| Test | ✅ Registered | $100 | — | — | — | — |`;
      const result = parseBenefits(md);
      expect(result.statusTable[0].status).toBe("registered");
    });

    it("maps ⏳ to pending", () => {
      const md = `## Application Status
| Benefit | Status | Amount | Applied | Approved | Renewal | Notes |
|---------|--------|--------|---------|----------|---------|-------|
| Test | ⏳ Pending | $100 | — | — | — | — |`;
      const result = parseBenefits(md);
      expect(result.statusTable[0].status).toBe("pending");
    });

    it("maps 'waiting' keyword to waiting", () => {
      const md = `## Application Status
| Benefit | Status | Amount | Applied | Approved | Renewal | Notes |
|---------|--------|--------|---------|----------|---------|-------|
| Test | Waiting on something | $100 | — | — | — | — |`;
      const result = parseBenefits(md);
      expect(result.statusTable[0].status).toBe("waiting");
    });

    it("maps 'approved' keyword to approved", () => {
      const md = `## Application Status
| Benefit | Status | Amount | Applied | Approved | Renewal | Notes |
|---------|--------|--------|---------|----------|---------|-------|
| Test | Approved | $100 | — | — | — | — |`;
      const result = parseBenefits(md);
      expect(result.statusTable[0].status).toBe("approved");
    });

    it("maps ❓ to unknown", () => {
      const md = `## Application Status
| Benefit | Status | Amount | Applied | Approved | Renewal | Notes |
|---------|--------|--------|---------|----------|---------|-------|
| Test | ❓ Unknown | $100 | — | — | — | — |`;
      const result = parseBenefits(md);
      expect(result.statusTable[0].status).toBe("unknown");
    });

    it("maps unrecognized text to not_started", () => {
      const md = `## Application Status
| Benefit | Status | Amount | Applied | Approved | Renewal | Notes |
|---------|--------|--------|---------|----------|---------|-------|
| Test | ⬜ Not started | $100 | — | — | — | — |`;
      const result = parseBenefits(md);
      expect(result.statusTable[0].status).toBe("not_started");
    });
  });

  describe("edge cases", () => {
    it("returns safe defaults for empty string", () => {
      const result = parseBenefits("");
      expect(result.statusTable).toEqual([]);
      expect(result.details).toEqual([]);
      expect(result.agentMonitoring).toEqual([]);
      expect(result.lastUpdated).toBe("");
    });
  });
});
