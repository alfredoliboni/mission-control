/**
 * Maps family accounts to their OpenClaw agent IDs.
 * Each family has a dedicated Navigator agent on the Orgo.ai VM.
 * Families can have multiple children, each with their own agent.
 *
 * In production, this would come from Supabase (user profile → agent assignment).
 * For MVP, it's hardcoded for the 5 test families.
 */

export interface FamilyChild {
  childName: string;
  agentId: string;
}

export interface FamilyAgent {
  familyName: string;
  children: FamilyChild[];
}

/**
 * @deprecated Use FamilyAgent with children array instead.
 * Kept for backward compatibility with consumers that expect flat shape.
 */
export interface FamilyAgentFlat {
  agentId: string;
  childName: string;
  familyName: string;
}

const FAMILY_AGENT_MAP: Record<string, FamilyAgent> = {
  "luisa.liboni.ai+santos@gmail.com": {
    familyName: "Santos",
    children: [
      { childName: "Alex Santos", agentId: "navigator-santos" },
      { childName: "Sofia Santos", agentId: "navigator-santos-sofia" },
    ],
  },
  "luisa.liboni.ai+chen@gmail.com": {
    familyName: "Chen",
    children: [
      { childName: "Emma Chen", agentId: "navigator-chen" },
    ],
  },
  "luisa.liboni.ai+okafor@gmail.com": {
    familyName: "Okafor",
    children: [
      { childName: "Liam Okafor", agentId: "navigator-okafor" },
    ],
  },
  "luisa.liboni.ai+tremblay@gmail.com": {
    familyName: "Tremblay",
    children: [
      { childName: "Mia Tremblay", agentId: "navigator-tremblay" },
    ],
  },
  "luisa.liboni.ai+rivera@gmail.com": {
    familyName: "Rivera",
    children: [
      { childName: "Mateus Rivera", agentId: "navigator-rivera" },
    ],
  },
};

// Default agent for users not in hardcoded map (resolved via user_metadata instead)
const DEFAULT_AGENT: FamilyAgent = {
  familyName: "Family",
  children: [
    { childName: "Child", agentId: "navigator" },
  ],
};

/**
 * Returns the full family with all children.
 */
export function getFamilyAgent(email: string | undefined): FamilyAgent {
  if (!email) return DEFAULT_AGENT;
  return FAMILY_AGENT_MAP[email.toLowerCase()] || DEFAULT_AGENT;
}

/**
 * Returns a specific child from a family by index.
 * Falls back to first child if index is out of bounds.
 */
export function getActiveChild(email: string | undefined, childIndex: number): FamilyChild & { familyName: string } {
  const family = getFamilyAgent(email);
  const safeIndex = childIndex >= 0 && childIndex < family.children.length ? childIndex : 0;
  const child = family.children[safeIndex];
  return { ...child, familyName: family.familyName };
}

/**
 * Returns a flat FamilyAgentFlat for backward compatibility.
 * Uses the first child (index 0) by default.
 */
export function getFamilyAgentFlat(email: string | undefined, childIndex: number = 0): FamilyAgentFlat {
  const result = getActiveChild(email, childIndex);
  return {
    agentId: result.agentId,
    childName: result.childName,
    familyName: result.familyName,
  };
}

/**
 * Resolves the workspace directory path on the Orgo VM for a given agent.
 * navigator-santos → /root/.openclaw/workspace-santos/memory
 * navigator-santos-sofia → /root/.openclaw/workspace-santos-sofia/memory
 */
export function getAgentWorkspacePath(agentId: string): string {
  // Strip "navigator-" prefix to get workspace suffix
  const suffix = agentId.replace(/^navigator-/, "");
  const home = process.env.HOME || process.env.USERPROFILE || "/root";
  return `${home}/.openclaw/workspace-${suffix}/memory`;
}

/**
 * Returns true if the email belongs to a known family in the agent map.
 * Used to distinguish existing test families from brand-new signups.
 */
export function isKnownFamilyEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() in FAMILY_AGENT_MAP;
}

/**
 * Creates a FamilyAgent from user metadata (for dynamically created agents).
 * Supports both:
 *   - New format: metadata.children array of {childName, agentId}
 *   - Legacy format: single metadata.agent_id + metadata.child_name
 */
export function getFamilyAgentFromMetadata(metadata: {
  agent_id?: string;
  child_name?: string;
  full_name?: string;
  children?: Array<{ childName: string; agentId: string }>;
}): FamilyAgent | null {
  // New multi-child format
  if (metadata.children && metadata.children.length > 0) {
    return {
      familyName: metadata.full_name || "Family",
      children: metadata.children,
    };
  }
  // Legacy single-child format
  if (!metadata.agent_id) return null;
  return {
    familyName: metadata.full_name || "Family",
    children: [
      {
        childName: metadata.child_name || "Child",
        agentId: metadata.agent_id,
      },
    ],
  };
}

export function getAllFamilies(): Array<FamilyAgent & { email: string }> {
  return Object.entries(FAMILY_AGENT_MAP).map(([email, agent]) => ({
    email,
    ...agent,
  }));
}
