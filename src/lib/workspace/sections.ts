import type { SectionConfig, WorkspaceSection } from "@/types/workspace";

const knownSections: Record<string, SectionConfig> = {
  "child-profile.md": {
    icon: "👤",
    label: "Profile",
    order: 1,
    route: "/profile",
    group: "overview",
  },
  "pathway.md": {
    icon: "🗺️",
    label: "Pathway",
    order: 2,
    route: "/pathway",
    group: "navigate",
  },
  "providers.md": {
    icon: "🏥",
    label: "Providers",
    order: 3,
    route: "/providers",
    group: "navigate",
  },
  "programs.md": {
    icon: "📚",
    label: "Programs",
    order: 4,
    route: "/programs",
    group: "navigate",
  },
  "ontario-system.md": {
    icon: "🏛️",
    label: "Ontario System",
    order: 5,
    route: "/ontario-system",
    group: "navigate",
  },
  "benefits.md": {
    icon: "💰",
    label: "Benefits",
    order: 6,
    route: "/benefits",
    group: "organize",
  },
  "alerts.md": {
    icon: "🚨",
    label: "Alerts",
    order: 7,
    route: "/alerts",
    group: "organize",
  },
  "documents.md": {
    icon: "📄",
    label: "Documents",
    order: 8,
    route: "/documents",
    group: "organize",
  },
  "messages.md": {
    icon: "💬",
    label: "Messages",
    order: 9,
    route: "/messages",
    group: "connect",
  },
  "gap-fillers.md": {
    icon: "🔍",
    label: "Gap Fillers",
    order: 10,
    route: "/gap-fillers",
    group: "dynamic",
  },
  "transition-plan.md": {
    icon: "🔄",
    label: "Transition",
    order: 10,
    route: "/transition-plan",
    group: "dynamic",
  },
  "employment.md": {
    icon: "💼",
    label: "Employment",
    order: 11,
    route: "/employment",
    group: "dynamic",
  },
  "university.md": {
    icon: "🎓",
    label: "University",
    order: 12,
    route: "/university",
    group: "dynamic",
  },
  "housing.md": {
    icon: "🏠",
    label: "Housing",
    order: 13,
    route: "/housing",
    group: "dynamic",
  },
  "school-support.md": {
    icon: "🏫",
    label: "School",
    order: 10,
    route: "/school-support",
    group: "dynamic",
  },
  "community": {
    icon: "👥",
    label: "Community",
    order: 20,
    route: "/community",
    group: "connect",
  },
};

function titleCase(str: string): string {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function discoverSections(filenames: string[]): WorkspaceSection[] {
  return filenames
    .map((filename) => {
      const known = knownSections[filename];
      if (known) {
        return { filename, ...known };
      }
      const slug = filename.replace(".md", "");
      const label = titleCase(slug.replace(/-/g, " "));
      return {
        filename,
        icon: "📋",
        label,
        order: 99,
        route: `/${slug}`,
        group: "dynamic" as const,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function getSectionGroups(sections: WorkspaceSection[]) {
  const groups = {
    overview: sections.filter((s) => s.group === "overview"),
    navigate: sections.filter((s) => s.group === "navigate"),
    organize: sections.filter((s) => s.group === "organize"),
    connect: sections.filter((s) => s.group === "connect"),
    dynamic: sections.filter((s) => s.group === "dynamic"),
  };
  return groups;
}
