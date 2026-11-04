BEGIN;

INSERT INTO public.linkedin_campaigns (id, name, created_by) VALUES
    ('00000000-0000-4000-8000-000000000011', 'Campanha sintética A', '00000000-0000-4000-8000-000000000001'),
    ('00000000-0000-4000-8000-000000000022', 'Campanha sintética B', '00000000-0000-4000-8000-000000000002');
INSERT INTO public.linkedin_profiles (campaign_id, name, profile_url) VALUES
    ('00000000-0000-4000-8000-000000000011', 'Perfil sintético A', 'https://example.invalid/a'),
    ('00000000-0000-4000-8000-000000000022', 'Perfil sintético B', 'https://example.invalid/b');

DO $$
BEGIN
    IF has_table_privilege('anon', 'public.linkedin_campaigns', 'SELECT')
       OR has_table_privilege('anon', 'public.linkedin_profiles', 'SELECT') THEN
        RAISE EXCEPTION 'anon recebeu permissão de leitura';
    END IF;
END
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
    IF (SELECT count(*) FROM public.linkedin_campaigns) <> 1
       OR (SELECT count(*) FROM public.linkedin_profiles) <> 1
       OR NOT EXISTS (SELECT 1 FROM public.linkedin_profiles WHERE name = 'Perfil sintético A') THEN
        RAISE EXCEPTION 'visibilidade incorreta para o proprietário';
    END IF;

    UPDATE public.linkedin_campaigns SET name = 'Indevido'
    WHERE id = '00000000-0000-4000-8000-000000000022';
    IF FOUND THEN
        RAISE EXCEPTION 'campanha de outro usuário alterada';
    END IF;

    BEGIN
        UPDATE public.linkedin_campaigns SET created_by = '00000000-0000-4000-8000-000000000002'
        WHERE id = '00000000-0000-4000-8000-000000000011';
        RAISE EXCEPTION 'campanha transferida sem autorização';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        INSERT INTO public.linkedin_profiles (campaign_id, name, profile_url)
        VALUES ('00000000-0000-4000-8000-000000000022', 'Inserção indevida', 'https://example.invalid/');
        RAISE EXCEPTION 'perfil inserido na campanha de outro usuário';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    INSERT INTO public.linkedin_profiles (campaign_id, name, profile_url)
    VALUES ('00000000-0000-4000-8000-000000000011', 'Inserção legítima', 'https://example.invalid/');
END
$$;
ROLLBACK;
