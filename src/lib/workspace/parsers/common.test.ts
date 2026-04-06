import {
  splitByHeading,
  extractTable,
  extractLastUpdated,
  extractAgentMonitoring,
  extractCheckboxItems,
  extractKeyValuePairs,
} from "./common";

// ---------------------------------------------------------------------------
// splitByHeading
// ---------------------------------------------------------------------------
describe("splitByHeading", () => {
  it("splits markdown by h2 headings", () => {
    const md = `## First\nContent A\n## Second\nContent B`;
    const result = splitByHeading(md, 2);
    expect(result).toEqual([
      { heading: "First", content: "Content A" },
      { heading: "Second", content: "Content B" },
    ]);
  });

  it("splits markdown by h3 headings", () => {
    const md = `### Alpha\nOne\n### Beta\nTwo`;
    const result = splitByHeading(md, 3);
    expect(result).toEqual([
      { heading: "Alpha", content: "One" },
      { heading: "Beta", content: "Two" },
    ]);
  });

  it("does not split on deeper headings when splitting by h2", () => {
    const md = `## Section\nIntro\n### Subsection\nDetails`;
    const result = splitByHeading(md, 2);
    expect(result).toHaveLength(1);
    expect(result[0].heading).toBe("Section");
    expect(result[0].content).toContain("### Subsection");
    expect(result[0].content).toContain("Details");
  });

  it("captures content before the first heading as an empty-heading section", () => {
    const md = `Preamble text\n## Heading\nBody`;
    const result = splitByHeading(md, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ heading: "", content: "Preamble text" });
    expect(result[1]).toEqual({ heading: "Heading", content: "Body" });
  });

  it("returns a section with empty content when heading has no body", () => {
    const md = `## Empty`;
    const result = splitByHeading(md, 2);
    expect(result).toEqual([{ heading: "Empty", content: "" }]);
  });

  it("returns the whole document as one section when there are no headings", () => {
    const md = `Just some plain text\nwith multiple lines`;
    const result = splitByHeading(md, 2);
    expect(result).toHaveLength(1);
    expect(result[0].heading).toBe("");
    expect(result[0].content).toBe("Just some plain text\nwith multiple lines");
  });

  it("returns an empty array for empty string", () => {
    const result = splitByHeading("", 2);
    // Empty string produces one section with empty heading and empty content
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ heading: "", content: "" });
  });

  it("trims content around headings", () => {
    const md = `## Heading\n\nContent with surrounding newlines\n\n## Next\n\nMore`;
    const result = splitByHeading(md, 2);
    expect(result[0].content).toBe("Content with surrounding newlines");
    expect(result[1].content).toBe("More");
  });
});

// ---------------------------------------------------------------------------
// extractTable
// ---------------------------------------------------------------------------
describe("extractTable", () => {
  it("extracts a standard markdown table", () => {
    const md = [
      "| Name | Age |",
      "|------|-----|",
      "| Alice | 30 |",
      "| Bob | 25 |",
    ].join("\n");
    const result = extractTable(md);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Alice", age: "30" });
    expect(result[1]).toEqual({ name: "Bob", age: "25" });
  });

  it("lowercases and underscores multi-word headers", () => {
    const md = [
      "| First Name | Start Date |",
      "|------------|------------|",
      "| Jane | 2026-01-01 |",
    ].join("\n");
    const result = extractTable(md);
    expect(result[0]).toEqual({ first_name: "Jane", start_date: "2026-01-01" });
  });

  it("returns empty array when there is no table", () => {
    const md = "No table here\nJust text";
    expect(extractTable(md)).toEqual([]);
  });

  it("returns empty array when table has only header (no data rows)", () => {
    const md = "| H1 | H2 |\n|----|----|";
    expect(extractTable(md)).toEqual([]);
  });

  it("handles cells with extra whitespace", () => {
    const md = [
      "|  Name  |  Value  |",
      "|--------|---------|",
      "|  hello  |  world  |",
    ].join("\n");
    const result = extractTable(md);
    expect(result[0]).toEqual({ name: "hello", value: "world" });
  });

  it("handles missing trailing cells gracefully", () => {
    const md = [
      "| A | B | C |",
      "|---|---|---|",
      "| 1 |",
    ].join("\n");
    const result = extractTable(md);
    expect(result[0].a).toBe("1");
    expect(result[0].b).toBe("");
    expect(result[0].c).toBe("");
  });
});

// ---------------------------------------------------------------------------
// extractLastUpdated
// ---------------------------------------------------------------------------
describe("extractLastUpdated", () => {
  it("extracts from h2 format", () => {
    const md = "Some text\n## Last Updated: 2026-04-01\nMore text";
    expect(extractLastUpdated(md)).toBe("2026-04-01");
  });

  it("extracts from h1 format", () => {
    const md = "# Last Updated: 2025-12-25";
    expect(extractLastUpdated(md)).toBe("2025-12-25");
  });

  it("is case-insensitive", () => {
    const md = "## last updated: March 2026";
    expect(extractLastUpdated(md)).toBe("March 2026");
  });

  it("returns empty string when missing", () => {
    const md = "No date info here";
    expect(extractLastUpdated(md)).toBe("");
  });

  it("trims surrounding whitespace from the value", () => {
    const md = "## Last Updated:   2026-04-01   ";
    expect(extractLastUpdated(md)).toBe("2026-04-01");
  });
});

// ---------------------------------------------------------------------------
// extractAgentMonitoring
// ---------------------------------------------------------------------------
describe("extractAgentMonitoring", () => {
  it("extracts monitoring items from an Agent Monitoring section", () => {
    const md = [
      "## Agent Monitoring",
      "- Watch for OAP updates",
      "- Track DTC status",
      "",
      "## Other Section",
    ].join("\n");
    const result = extractAgentMonitoring(md);
    expect(result).toEqual(["Watch for OAP updates", "Track DTC status"]);
  });

  it("strips bullet prefixes", () => {
    const md = "## Agent Monitoring\n- Item one\n- Item two\n";
    const result = extractAgentMonitoring(md);
    expect(result).toEqual(["Item one", "Item two"]);
  });

  it("returns empty array when section is missing", () => {
    const md = "## Other\nStuff";
    expect(extractAgentMonitoring(md)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(extractAgentMonitoring("")).toEqual([]);
  });

  it("handles items without bullet dashes", () => {
    const md = "## Agent Monitoring\nPlain line\n";
    const result = extractAgentMonitoring(md);
    expect(result).toEqual(["Plain line"]);
  });
});

// ---------------------------------------------------------------------------
// extractCheckboxItems
// ---------------------------------------------------------------------------
describe("extractCheckboxItems", () => {
  it("extracts checked and unchecked items", () => {
    const md = "- [x] Done task\n- [ ] Open task";
    const result = extractCheckboxItems(md);
    expect(result).toEqual([
      { text: "Done task", checked: true },
      { text: "Open task", checked: false },
    ]);
  });

  it("treats uppercase X as checked", () => {
    const md = "- [X] Also done";
    const result = extractCheckboxItems(md);
    expect(result).toHaveLength(1);
    expect(result[0].checked).toBe(true);
    expect(result[0].text).toBe("Also done");
  });

  it("returns empty array when there are no checkboxes", () => {
    const md = "- Regular bullet\n- Another bullet";
    expect(extractCheckboxItems(md)).toEqual([]);
  });

  it("handles multiple checkboxes with mixed states", () => {
    const md = [
      "- [ ] First",
      "- [x] Second",
      "- [ ] Third",
      "- [X] Fourth",
    ].join("\n");
    const result = extractCheckboxItems(md);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.checked)).toEqual([false, true, false, true]);
  });

  it("trims text content", () => {
    const md = "- [x]   Spaced out text   ";
    const result = extractCheckboxItems(md);
    expect(result[0].text).toBe("Spaced out text");
  });
});

// ---------------------------------------------------------------------------
// extractKeyValuePairs
// ---------------------------------------------------------------------------
describe("extractKeyValuePairs", () => {
  it("extracts standard bold-key bullet pairs", () => {
    const md = "- **Name:** Alice\n- **Age:** 30";
    const result = extractKeyValuePairs(md);
    expect(result).toEqual({ name: "Alice", age: "30" });
  });

  it("lowercases and underscores keys with spaces", () => {
    const md = "- **Date of Birth:** 2022-03-15\n- **Current Stage:** active";
    const result = extractKeyValuePairs(md);
    expect(result.date_of_birth).toBe("2022-03-15");
    expect(result.current_stage).toBe("active");
  });

  it("returns empty object when there are no key-value pairs", () => {
    const md = "No bold keys here\nJust plain text";
    expect(extractKeyValuePairs(md)).toEqual({});
  });

  it("handles values with colons and special characters", () => {
    const md = "- **Note:** Check this: important — urgent";
    const result = extractKeyValuePairs(md);
    expect(result.note).toBe("Check this: important — urgent");
  });

  it("trims whitespace from keys and values", () => {
    const md = "- ** Spaced Key :**  Spaced Value  ";
    const result = extractKeyValuePairs(md);
    expect(result.spaced_key).toBe("Spaced Value");
  });
});
