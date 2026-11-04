ALTER TABLE public.linkedin_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.linkedin_campaigns, public.linkedin_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_campaigns, public.linkedin_profiles TO authenticated;

CREATE POLICY linkedin_campaigns_owner
ON public.linkedin_campaigns
FOR ALL TO authenticated
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY linkedin_profiles_campaign_owner
ON public.linkedin_profiles
FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.linkedin_campaigns campaign
    WHERE campaign.id = linkedin_profiles.campaign_id
      AND campaign.created_by = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.linkedin_campaigns campaign
    WHERE campaign.id = linkedin_profiles.campaign_id
      AND campaign.created_by = (SELECT auth.uid())
));
