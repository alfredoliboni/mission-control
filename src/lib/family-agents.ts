/**
 * Maps family accounts to their OpenClaw agent IDs.
 * Each family has a dedicated Navigator agent on the Orgo.ai VM.
 *
 * In production, this would come from Supabase (user profile → agent assignment).
 * For MVP, it's hardcoded for the 5 test families.
 */

export interface FamilyAgent {
  agentId: string;
  childName: string;
  familyName: string;
}

const FAMILY_AGENT_MAP: Record<string, FamilyAgent> = {
  "luisa.liboni.ai+santos@gmail.com": {
    agentId: "navigator-santos",
    childName: "Alex Santos",
    familyName: "Santos",
  },
  "luisa.liboni.ai+chen@gmail.com": {
    agentId: "navigator-chen",
    childName: "Emma Chen",
    familyName: "Chen",
  },
  "luisa.liboni.ai+okafor@gmail.com": {
    agentId: "navigator-okafor",
    childName: "Liam Okafor",
    familyName: "Okafor",
  },
  "luisa.liboni.ai+tremblay@gmail.com": {
    agentId: "navigator-tremblay",
    childName: "Mia Tremblay",
    familyName: "Tremblay",
  },
  "luisa.liboni.ai+rivera@gmail.com": {
    agentId: "navigator-rivera",
    childName: "Mateus Rivera",
    familyName: "Rivera",
  },
};

// Default agent for demo mode or unknown users
const DEFAULT_AGENT: FamilyAgent = {
  agentId: "navigator-santos",
  childName: "Alex Santos",
  familyName: "Santos",
};

export function getFamilyAgent(email: string | undefined): FamilyAgent {
  if (!email) return DEFAULT_AGENT;
  return FAMILY_AGENT_MAP[email.toLowerCase()] || DEFAULT_AGENT;
}

export function getAllFamilies(): Array<FamilyAgent & { email: string }> {
  return Object.entries(FAMILY_AGENT_MAP).map(([email, agent]) => ({
    email,
    ...agent,
  }));
}
