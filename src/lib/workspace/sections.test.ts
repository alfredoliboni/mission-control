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

  // All standard routes are hardcoded in Sidebar — excluded from discovery.
  // Uniform per-child rendering requires every child to see every standard
  // route, not gated on workspace .md file presence.
  it.each([
    ["pathway.md"],
    ["documents.md"],
    ["messages.md"],
    ["ontario-system.md"],
    ["providers.md"],
    ["programs.md"],
    ["benefits.md"],
    ["alerts.md"],
    ["journey-partners.md"],
  ])("excludes %s (hardcoded in sidebar)", (filename) => {
    const sections = discoverSections([filename]);
    expect(sections).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Sorting by order (using stage-specific files only, since standard routes
  // are hardcoded and filtered out)
  // ---------------------------------------------------------------------------
  it("sorts sections by order", () => {
    const sections = discoverSections([
      "university.md",
      "employment.md",
      "gap-fillers.md",
    ]);
    const orders = sections.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(sections[0].label).toBe("Gap Fillers");
    expect(sections[1].label).toBe("Employment");
    expect(sections[2].label).toBe("University");
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
  it("standard route filenames produce no groups (all hardcoded in sidebar)", () => {
    const sections = discoverSections([
      "child-profile.md",
      "pathway.md",
      "providers.md",
      "benefits.md",
      "alerts.md",
      "messages.md",
    ]);
    const groups = getSectionGroups(sections);

    expect(groups.overview).toHaveLength(0);
    expect(groups.navigate).toHaveLength(0);
    expect(groups.organize).toHaveLength(0);
    expect(groups.connect).toHaveLength(0);
    expect(groups.dynamic).toHaveLength(0);
  });

  it("groups stage-specific sections under dynamic", () => {
    const sections = discoverSections([
      "gap-fillers.md",
      "employment.md",
      "university.md",
    ]);
    const groups = getSectionGroups(sections);

    expect(groups.dynamic).toHaveLength(3);
    expect(groups.dynamic.map((s) => s.label)).toEqual([
      "Gap Fillers",
      "Employment",
      "University",
    ]);
    expect(groups.overview).toEqual([]);
    expect(groups.navigate).toEqual([]);
    expect(groups.organize).toEqual([]);
    expect(groups.connect).toEqual([]);
  });

  it("returns empty arrays for all groups on empty input", () => {
    const groups = getSectionGroups(discoverSections([]));
    expect(groups.overview).toEqual([]);
    expect(groups.navigate).toEqual([]);
    expect(groups.organize).toEqual([]);
    expect(groups.connect).toEqual([]);
    expect(groups.dynamic).toEqual([]);
  });
});
