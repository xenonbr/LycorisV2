-- ==============================================================================
-- MIGRAÇÃO: Inscrições em eventos + Apoiadores gerenciáveis
-- Execute no SQL Editor do Supabase (seguro rodar mais de uma vez).
-- ==============================================================================

-- Inscrições em eventos (visíveis somente para administradores via service_role)
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    notes VARCHAR(300),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.event_registrations(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_event_user
    ON public.event_registrations(event_id, lower(username));

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
-- Sem política pública: dados pessoais só são acessíveis pelo backend (service_role).
DROP POLICY IF EXISTS "registrations service_role" ON public.event_registrations;
CREATE POLICY "registrations service_role"
    ON public.event_registrations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Apoiadores
CREATE TABLE IF NOT EXISTS public.supporters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tagline VARCHAR(300) DEFAULT '' NOT NULL,
    role VARCHAR(100) DEFAULT 'Apoiador' NOT NULL,
    avatar VARCHAR(500),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.supporters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supporters leitura publica" ON public.supporters;
CREATE POLICY "supporters leitura publica" ON public.supporters FOR SELECT USING (true);
DROP POLICY IF EXISTS "supporters service_role" ON public.supporters;
CREATE POLICY "supporters service_role"
    ON public.supporters FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.supporters (name, url, tagline, role, sort_order)
SELECT * FROM (VALUES
    ('LupratuVR', 'https://lupratuvr.vercel.app/', 'Vtuber & Streamer.', 'Parceira Criativa', 0),
    ('Ph4nt0m', 'https://ph4nt0m.carrd.co/', 'Direção de arte, avatar maker.', 'Apoiador Místico', 1)
) AS v(name, url, tagline, role, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.supporters);
