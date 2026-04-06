import { discoverSections, getSectionGroups } from "./sections";

describe("discoverSections", () => {
  // ---------------------------------------------------------------------------
  // Known filenames map to correct config
  // ---------------------------------------------------------------------------
  it("maps child-profile.md to overview group with correct config", () => {
    const sections = discoverSections(["child-profile.md"]);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      filename: "child-profile.md",
      icon: "\u{1F464}",
      label: "Profile",
      route: "/profile",
      group: "overview",
      order: 1,
    });
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

  it("maps documents.md to organize group", () => {
    const sections = discoverSections(["documents.md"]);
    expect(sections[0]).toMatchObject({
      label: "Documents",
      group: "organize",
      icon: "\u{1F4C4}",
      order: 8,
    });
  });

  it("maps messages.md to connect group", () => {
    const sections = discoverSections(["messages.md"]);
    expect(sections[0]).toMatchObject({
      label: "Messages",
      group: "connect",
      order: 9,
    });
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
    const orders = sections.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(sections[0].label).toBe("Profile");
    expect(sections[1].label).toBe("Pathway");
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

    expect(groups.overview).toHaveLength(1);
    expect(groups.overview[0].label).toBe("Profile");

    expect(groups.navigate).toHaveLength(2);
    expect(groups.navigate.map((s) => s.label)).toContain("Pathway");
    expect(groups.navigate.map((s) => s.label)).toContain("Providers");

    expect(groups.organize).toHaveLength(2);
    expect(groups.organize.map((s) => s.label)).toContain("Benefits");
    expect(groups.organize.map((s) => s.label)).toContain("Alerts");

    expect(groups.connect).toHaveLength(1);
    expect(groups.connect[0].label).toBe("Messages");

    expect(groups.dynamic).toHaveLength(1);
    expect(groups.dynamic[0].label).toBe("Gap Fillers");
  });

  it("returns empty arrays for groups with no sections", () => {
    const sections = discoverSections(["child-profile.md"]);
    const groups = getSectionGroups(sections);
    expect(groups.navigate).toEqual([]);
    expect(groups.organize).toEqual([]);
    expect(groups.connect).toEqual([]);
    expect(groups.dynamic).toEqual([]);
  });
});
