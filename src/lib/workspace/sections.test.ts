import { discoverSections, getSectionGroups } from "./sections";

describe("discoverSections", () => {
  // ---------------------------------------------------------------------------
  // Known filenames map to correct config
  // ---------------------------------------------------------------------------
  // child-profile.md is now hardcoded in Sidebar — filtered out like documents.md
  it("excludes child-profile.md (hardcoded in sidebar)", () => {
    const sections = discoverSections(["child-profile.md"]);
    expect(sections).toHaveLength(0);
  });

  it("maps pathway.md to navigate group", () => {
    const sections = discoverSections(["pathway.md"]);
    expect(sections[0]).toMatchObject({
      label: "Pathway",
      group: "navigate",
      icon: "\u{1F5FA}\uFE0F",
      order: 2,
    });
  });

  // documents.md and messages.md are hardcoded in Sidebar — filtered out entirely
  it("excludes documents.md (hardcoded in sidebar)", () => {
    const sections = discoverSections(["documents.md"]);
    expect(sections).toHaveLength(0);
  });

  it("excludes messages.md (hardcoded in sidebar)", () => {
    const sections = discoverSections(["messages.md"]);
    expect(sections).toHaveLength(0);
  });

  it("maps ontario-system.md correctly", () => {
    const sections = discoverSections(["ontario-system.md"]);
    expect(sections[0]).toMatchObject({
      label: "Ontario System",
      route: "/ontario-system",
      group: "navigate",
      order: 5,
    });
  });

  // ---------------------------------------------------------------------------
  // Sorting by order
  // ---------------------------------------------------------------------------
  it("sorts sections by order", () => {
    const sections = discoverSections([
      "documents.md",
      "child-profile.md",
      "pathway.md",
      "alerts.md",
    ]);
    // documents.md and child-profile.md are hardcoded in sidebar, so filtered out
    const orders = sections.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(sections[0].label).toBe("Pathway");
    expect(sections[1].label).toBe("Alerts");
  });

  // ---------------------------------------------------------------------------
  // Unknown filenames
  // ---------------------------------------------------------------------------
  it('assigns unknown filenames to "dynamic" group with defaults', () => {
    const sections = discoverSections(["custom-thing.md"]);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      filename: "custom-thing.md",
      icon: "\u{1F4CB}",
      label: "Custom Thing",
      order: 99,
      route: "/custom-thing",
      group: "dynamic",
    });
  });

  it("title-cases multi-word unknown filenames", () => {
    const sections = discoverSections(["my-cool-section.md"]);
    expect(sections[0].label).toBe("My Cool Section");
  });

  // ---------------------------------------------------------------------------
  // Empty input
  // ---------------------------------------------------------------------------
  it("returns empty array for empty input", () => {
    const sections = discoverSections([]);
    expect(sections).toEqual([]);
  });
});

describe("getSectionGroups", () => {
  it("groups sections correctly by group field", () => {
    const sections = discoverSections([
      "child-profile.md",
      "pathway.md",
      "providers.md",
      "benefits.md",
      "alerts.md",
      "messages.md",
      "gap-fillers.md",
    ]);
    const groups = getSectionGroups(sections);

    // child-profile.md and messages.md are hardcoded in sidebar — excluded
    expect(groups.overview).toHaveLength(0);

    expect(groups.navigate).toHaveLength(2);
    expect(groups.navigate.map((s) => s.label)).toContain("Pathway");
    expect(groups.navigate.map((s) => s.label)).toContain("Providers");

    expect(groups.organize).toHaveLength(2);
    expect(groups.organize.map((s) => s.label)).toContain("Benefits");
    expect(groups.organize.map((s) => s.label)).toContain("Alerts");

    // messages.md is excluded (hardcoded in sidebar), gap-fillers is dynamic
    expect(groups.dynamic.map((s) => s.label)).toContain("Gap Fillers");
  });

  it("returns empty arrays for groups with no sections", () => {
    const sections = discoverSections(["pathway.md"]);
    const groups = getSectionGroups(sections);
    expect(groups.overview).toEqual([]);
    expect(groups.organize).toEqual([]);
    expect(groups.connect).toEqual([]);
    expect(groups.dynamic).toEqual([]);
  });
});
