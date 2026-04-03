-- Phase 6: Provider Portal Schema
-- Run against Supabase project: atkrfpkbneoymmngxkew (ca-central-1)

-- Provider profiles
CREATE TABLE provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  organization_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('clinic', 'hospital', 'nonprofit', 'private_practice', 'university', 'school', 'employer')),
  tier TEXT DEFAULT 'claimed' CHECK (tier IN ('scraped', 'claimed', 'verified')),
  services TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  ages_served TEXT,
  languages TEXT[] DEFAULT '{}',
  funding_accepted TEXT[] DEFAULT '{}',
  address TEXT,
  city TEXT,
  province TEXT DEFAULT 'ON',
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  waitlist_status TEXT CHECK (waitlist_status IN ('open', 'closed', 'waitlist')),
  waitlist_estimate TEXT,
  bio TEXT,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Provider programs
CREATE TABLE provider_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  is_gap_filler BOOLEAN DEFAULT false,
  ages TEXT,
  cost TEXT,
  funding_eligible BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_programs ENABLE ROW LEVEL SECURITY;

-- Providers can CRUD their own profile
CREATE POLICY provider_profiles_own ON provider_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can read provider profiles (public directory)
CREATE POLICY provider_profiles_read ON provider_profiles
  FOR SELECT USING (true);

-- Providers can CRUD their own programs
CREATE POLICY provider_programs_own ON provider_programs
  FOR ALL USING (
    provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
  );

-- Anyone can read active programs
CREATE POLICY provider_programs_read ON provider_programs
  FOR SELECT USING (active = true);
