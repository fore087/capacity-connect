CREATE TABLE public.portfolios (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  is_public boolean NOT NULL DEFAULT false,
  headline text CHECK (char_length(headline) <= 120),
  about text CHECK (char_length(about) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own portfolio read" ON public.portfolios FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own portfolio insert" ON public.portfolios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own portfolio update" ON public.portfolios FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own portfolio delete" ON public.portfolios FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_public_portfolio(_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'slug', po.slug, 'headline', po.headline, 'about', po.about,
    'full_name', p.full_name, 'avatar_url', p.avatar_url, 'member_since', p.created_at,
    'skills', tp.skills,
    'certificates', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'code', c.certificate_code, 'course_title', c.course_title, 'trainer_name', c.trainer_name,
        'score', c.score, 'issued_at', c.issued_at) ORDER BY c.issued_at DESC)
      FROM certificates c WHERE c.trainee_id = p.id), '[]'::jsonb)
  )
  FROM portfolios po
  JOIN profiles p ON p.id = po.user_id
  LEFT JOIN trainee_profiles tp ON tp.user_id = p.id
  WHERE po.slug = lower(_slug) AND po.is_public AND p.account_status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'code', c.certificate_code, 'trainee_name', c.trainee_name, 'course_title', c.course_title,
    'trainer_name', c.trainer_name, 'score', c.score, 'issued_at', c.issued_at,
    'portfolio_slug', (SELECT po.slug FROM portfolios po WHERE po.user_id = c.trainee_id AND po.is_public))
  FROM certificates c WHERE upper(c.certificate_code) = upper(trim(_code))
$$;

REVOKE ALL ON FUNCTION public.get_public_portfolio(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;