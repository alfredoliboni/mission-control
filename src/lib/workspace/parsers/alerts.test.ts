import { parseAlerts } from "./alerts";
import { loadDemoData } from "./__fixtures__/load-demo-data";

// ---------------------------------------------------------------------------
// Demo data integration
// ---------------------------------------------------------------------------
describe("parseAlerts — demo data", () => {
  const alerts = parseAlerts(loadDemoData("alerts.md"));

  it("parses all active alerts", () => {
    const active = alerts.filter((a) => a.status === "active");
    expect(active.length).toBeGreaterThanOrEqual(4);
  });

  it("parses dismissed alerts", () => {
    const dismissed = alerts.filter((a) => a.status === "dismissed");
    expect(dismissed.length).toBeGreaterThanOrEqual(1);
  });

  it("parses HIGH severity alert correctly", () => {
    const high = alerts.find((a) => a.severity === "HIGH");
    expect(high).toBeDefined();
    expect(high!.title).toBe("Melatonin Dose Review Required");
    expect(high!.date).toBe("2026-04-01");
    expect(high!.action).toContain("Profile");
    expect(high!.status).toBe("active");
  });

  it("parses MEDIUM severity alert correctly", () => {
    const medium = alerts.find((a) => a.severity === "MEDIUM");
    expect(medium).toBeDefined();
    expect(medium!.title).toBe("DTC Response Overdue");
    expect(medium!.date).toBe("2026-03-28");
    expect(medium!.action).toContain("CRA");
  });

  it("parses INFO severity alerts", () => {
    const infos = alerts.filter((a) => a.severity === "INFO" && a.status === "active");
    expect(infos.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts action text from **Action:** line", () => {
    const high = alerts.find((a) => a.severity === "HIGH");
    expect(high!.action).toContain("confirm with Dr. Patel");
  });

  it("extracts description without the action line", () => {
    const high = alerts.find((a) => a.severity === "HIGH");
    expect(high!.description).toContain("Melatonin 3mg nightly");
    expect(high!.description).not.toContain("**Action:**");
  });

  it("parses dismissed alert with INFO severity (no emoji)", () => {
    const dismissed = alerts.find((a) => a.status === "dismissed");
    expect(dismissed).toBeDefined();
    expect(dismissed!.severity).toBe("INFO");
    expect(dismissed!.title).toBe("Autism Ontario Spring Registration Open");
    expect(dismissed!.date).toBe("2026-03-15");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("parseAlerts — edge cases", () => {
  it("returns empty array for empty string", () => {
    expect(parseAlerts("")).toEqual([]);
  });

  it("returns empty array for markdown with no Active/Dismissed sections", () => {
    const md = "# Alerts\n## Other Section\nSome content";
    expect(parseAlerts(md)).toEqual([]);
  });

  it("returns empty array for malformed markdown", () => {
    const md = "random|||broken stuff\n###\n##";
    expect(parseAlerts(md)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Dismissed alerts parsing
// ---------------------------------------------------------------------------
describe("parseAlerts — dismissed alerts", () => {
  it("parses dismissed alerts with correct status", () => {
    const md = [
      "# Alerts",
      "## Dismissed",
      "### 2026-03-10 | Old Alert Title",
      "This was resolved.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe("dismissed");
    expect(alerts[0].title).toBe("Old Alert Title");
    expect(alerts[0].date).toBe("2026-03-10");
  });

  it("parses multiple dismissed alerts", () => {
    const md = [
      "# Alerts",
      "## Dismissed",
      "### 2026-03-10 | First Dismissed",
      "Resolved.",
      "### 2026-03-05 | Second Dismissed",
      "Also resolved.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].title).toBe("First Dismissed");
    expect(alerts[1].title).toBe("Second Dismissed");
    expect(alerts.every((a) => a.status === "dismissed")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Severity parsing
// ---------------------------------------------------------------------------
describe("parseAlerts — severity parsing", () => {
  it("maps red circle emoji to HIGH", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | 🔴 HIGH | Critical Alert",
      "Details here.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].severity).toBe("HIGH");
  });

  it("maps yellow circle emoji to MEDIUM", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | 🟡 MEDIUM | Warning Alert",
      "Details here.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].severity).toBe("MEDIUM");
  });

  it("maps green circle emoji to INFO", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | 🟢 INFO | Info Alert",
      "Details here.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].severity).toBe("INFO");
  });

  it("defaults to INFO when severity text only (no emoji match)", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | UNKNOWN | Some Alert",
      "Details here.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].severity).toBe("INFO");
  });
});

// ---------------------------------------------------------------------------
// FORMAT GAP TEST — Gap 6: Missing severity emoji
// ---------------------------------------------------------------------------
describe("parseAlerts — missing severity emoji gap", () => {
  it("defaults to INFO when heading has only 2 parts (date | title)", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | Alert Title Without Severity",
      "Some description text.",
      "**Action:** Do something",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("INFO");
    expect(alerts[0].title).toBe("Alert Title Without Severity");
    expect(alerts[0].date).toBe("2026-04-01");
    expect(alerts[0].action).toBe("Do something");
    expect(alerts[0].description).toContain("Some description text");
  });

  it("still extracts action correctly when severity is missing", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | Simple Alert",
      "**Action:** Call the doctor at 519-555-0000",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].action).toBe("Call the doctor at 519-555-0000");
    expect(alerts[0].severity).toBe("INFO");
  });
});

// ---------------------------------------------------------------------------
// Action extraction
// ---------------------------------------------------------------------------
describe("parseAlerts — action extraction", () => {
  it("extracts action from **Action:** line", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | 🔴 HIGH | Test Alert",
      "Description line.",
      "**Action:** Take this action immediately",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].action).toBe("Take this action immediately");
  });

  it("returns empty action when **Action:** line is missing", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | 🔴 HIGH | No Action Alert",
      "Just a description, no action line.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].action).toBe("");
    expect(alerts[0].description).toContain("Just a description");
  });

  it("separates description from action correctly", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | 🟡 MEDIUM | Mixed Alert",
      "First line of description.",
      "Second line of description.",
      "**Action:** Do the thing",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts[0].description).toContain("First line of description");
    expect(alerts[0].description).toContain("Second line of description");
    expect(alerts[0].description).not.toContain("Do the thing");
    expect(alerts[0].action).toBe("Do the thing");
  });
});

// ---------------------------------------------------------------------------
// Mixed active and dismissed
// ---------------------------------------------------------------------------
describe("parseAlerts — mixed sections", () => {
  it("correctly separates active and dismissed alerts", () => {
    const md = [
      "# Alerts",
      "## Active",
      "### 2026-04-01 | 🔴 HIGH | Active One",
      "Active description.",
      "### 2026-03-28 | 🟡 MEDIUM | Active Two",
      "Another active.",
      "## Dismissed",
      "### 2026-03-15 | Dismissed One",
      "Was resolved.",
      "### 2026-03-10 | Dismissed Two",
      "Also resolved.",
    ].join("\n");
    const alerts = parseAlerts(md);
    const active = alerts.filter((a) => a.status === "active");
    const dismissed = alerts.filter((a) => a.status === "dismissed");
    expect(active).toHaveLength(2);
    expect(dismissed).toHaveLength(2);
    expect(active[0].severity).toBe("HIGH");
    expect(active[1].severity).toBe("MEDIUM");
    expect(dismissed[0].severity).toBe("INFO");
    expect(dismissed[1].severity).toBe("INFO");
  });

  it("skips h3 items with empty headings", () => {
    const md = [
      "# Alerts",
      "## Active",
      "Some preamble text without h3 heading",
      "### 2026-04-01 | 🔴 HIGH | Real Alert",
      "Real content.",
    ].join("\n");
    const alerts = parseAlerts(md);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe("Real Alert");
  });
});
