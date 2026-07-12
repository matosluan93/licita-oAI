CREATE TYPE public.linkedin_campaign_status AS ENUM (
  'draft',
  'ready',
  'running',
  'completed',
  'failed'
);

CREATE TABLE IF NOT EXISTS public.linkedin_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  edital_text TEXT,
  requirements_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  companies_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  max_profiles INTEGER NOT NULL DEFAULT 25,
  status public.linkedin_campaign_status NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.linkedin_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  headline TEXT,
  location TEXT,
  company TEXT,
  profile_url TEXT NOT NULL,
  resume_url TEXT,
  resume_downloaded BOOLEAN DEFAULT FALSE,
  about TEXT,
  experience_json JSONB DEFAULT '[]'::JSONB,
  skills_json JSONB DEFAULT '[]'::JSONB,
  match_score INTEGER DEFAULT 0,
  match_evidence_json JSONB DEFAULT '[]'::JSONB,
  gaps_json JSONB DEFAULT '[]'::JSONB,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_linkedin_profiles_campaign ON public.linkedin_profiles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_profiles_score ON public.linkedin_profiles(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_status ON public.linkedin_campaigns(status);
