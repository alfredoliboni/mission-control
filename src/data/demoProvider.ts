export interface DemoProviderProfile {
  id: string;
  user_id: string;
  organization_name: string;
  type: string;
  tier: string;
  services: string[];
  specialties: string[];
  ages_served: string;
  languages: string[];
  funding_accepted: string[];
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  waitlist_status: string;
  waitlist_estimate: string;
  bio: string;
  claimed_at: string;
  last_updated: string;
  created_at: string;
}

export interface DemoProviderProgram {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  type: string;
  is_gap_filler: boolean;
  ages: string;
  cost: string;
  funding_eligible: boolean;
  active: boolean;
  created_at: string;
}

export interface DemoProviderFamily {
  id: string;
  family_id: string;
  email: string;
  role: string;
  name: string;
  status: string;
  created_at: string;
}

const PROVIDER_ID = "demo-provider-profile";
const PROVIDER_USER_ID = "demo-provider-user";

export const demoProviderProfile: DemoProviderProfile = {
  id: PROVIDER_ID,
  user_id: PROVIDER_USER_ID,
  organization_name: "Pathways Therapy Centre",
  type: "clinic",
  tier: "verified",
  services: ["Occupational Therapy", "Speech-Language Pathology", "ABA Therapy"],
  specialties: ["Autism Spectrum Disorder", "ADHD", "Sensory Processing", "Social Skills"],
  ages_served: "2-18",
  languages: ["English", "French"],
  funding_accepted: ["Ontario Autism Program", "Private Insurance", "Self-Pay"],
  address: "456 Wellness Drive, Suite 200",
  city: "Toronto",
  province: "ON",
  postal_code: "M5V 2H1",
  phone: "(416) 555-0199",
  email: "info@pathwaystherapy.ca",
  website: "https://pathwaystherapy.ca",
  waitlist_status: "waitlist",
  waitlist_estimate: "4-6 weeks",
  bio: "Pathways Therapy Centre provides comprehensive therapeutic services for children and youth with developmental needs. Our multidisciplinary team works collaboratively with families, schools, and other providers to deliver evidence-based interventions.",
  claimed_at: "2026-01-15T10:00:00Z",
  last_updated: "2026-03-28T14:30:00Z",
  created_at: "2026-01-15T10:00:00Z",
};

export const demoProviderPrograms: DemoProviderProgram[] = [
  {
    id: "demo-program-1",
    provider_id: PROVIDER_ID,
    title: "Social Skills Group (Ages 6-10)",
    description:
      "Weekly small-group sessions focused on building social communication, turn-taking, and peer interaction skills through structured play and role-playing activities.",
    type: "Group Therapy",
    is_gap_filler: true,
    ages: "6-10",
    cost: "$85/session",
    funding_eligible: true,
    active: true,
    created_at: "2026-02-01T09:00:00Z",
  },
  {
    id: "demo-program-2",
    provider_id: PROVIDER_ID,
    title: "Individual OT — Sensory Integration",
    description:
      "One-on-one occupational therapy sessions using sensory integration techniques to help children regulate their sensory responses and improve daily functioning.",
    type: "Individual Therapy",
    is_gap_filler: false,
    ages: "3-12",
    cost: "$120/session",
    funding_eligible: true,
    active: true,
    created_at: "2026-02-01T09:00:00Z",
  },
  {
    id: "demo-program-3",
    provider_id: PROVIDER_ID,
    title: "Summer Intensive Camp",
    description:
      "A two-week intensive summer program combining OT, speech, and social skills in a fun camp setting. Ideal for children transitioning between school years.",
    type: "Intensive Program",
    is_gap_filler: true,
    ages: "5-14",
    cost: "$2,400/session",
    funding_eligible: false,
    active: true,
    created_at: "2026-03-01T09:00:00Z",
  },
];

export const demoProviderFamilies: DemoProviderFamily[] = [
  {
    id: "demo-link-1",
    family_id: "demo-family",
    email: "parent@example.com",
    role: "provider",
    name: "Santos Family",
    status: "active",
    created_at: "2026-02-10T14:00:00Z",
  },
  {
    id: "demo-link-2",
    family_id: "demo-family-2",
    email: "jchen@example.com",
    role: "provider",
    name: "Chen Family",
    status: "active",
    created_at: "2026-03-05T10:30:00Z",
  },
];
