-- ==============================================================================
-- LYCORIS GARDEN - SETUP COMPLETO (banco novo, do zero)
-- Cole tudo no Supabase -> SQL Editor -> Run. Pode ser executado mais de uma vez.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eventos
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(50) NOT NULL,
    vrchat_world VARCHAR(255) NOT NULL,
    world_url VARCHAR(500),
    image_url VARCHAR(500),
    category VARCHAR(100) DEFAULT 'Encontro Oficial',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Galeria
CREATE TABLE IF NOT EXISTS public.gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    author VARCHAR(150) NOT NULL,
    vrchat_world VARCHAR(255),
    likes INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comentários
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Inscrições em eventos
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    notes VARCHAR(300),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Apoiadores
CREATE TABLE IF NOT EXISTS public.supporters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tagline VARCHAR(300) DEFAULT '' NOT NULL,
    role VARCHAR(100) DEFAULT 'Apoiador' NOT NULL,
    avatar VARCHAR(500),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date ASC);
CREATE INDEX IF NOT EXISTS idx_gallery_created_at ON public.gallery_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_image_id ON public.comments(image_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.event_registrations(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_event_user
    ON public.event_registrations(event_id, lower(username));

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events leitura" ON public.events;
CREATE POLICY "events leitura" ON public.events FOR SELECT USING (true);
DROP POLICY IF EXISTS "events service" ON public.events;
CREATE POLICY "events service" ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "gallery leitura" ON public.gallery_images;
CREATE POLICY "gallery leitura" ON public.gallery_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "gallery service" ON public.gallery_images;
CREATE POLICY "gallery service" ON public.gallery_images FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "comments leitura" ON public.comments;
CREATE POLICY "comments leitura" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "comments insert" ON public.comments;
CREATE POLICY "comments insert" ON public.comments FOR INSERT
    WITH CHECK (length(trim(author_name)) > 0 AND length(trim(content)) > 0);
DROP POLICY IF EXISTS "comments service" ON public.comments;
CREATE POLICY "comments service" ON public.comments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Inscrições: sem acesso público (dados pessoais)
DROP POLICY IF EXISTS "registrations service_role" ON public.event_registrations;
CREATE POLICY "registrations service_role" ON public.event_registrations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "supporters leitura publica" ON public.supporters;
CREATE POLICY "supporters leitura publica" ON public.supporters FOR SELECT USING (true);
DROP POLICY IF EXISTS "supporters service_role" ON public.supporters;
CREATE POLICY "supporters service_role" ON public.supporters FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Apoiadores iniciais (só se a tabela estiver vazia)
INSERT INTO public.supporters (name, url, tagline, role, sort_order)
SELECT * FROM (VALUES
    ('LupratuVR', 'https://lupratuvr.vercel.app/', 'Vtuber & Streamer.', 'Parceira Criativa', 0),
    ('Ph4nt0m', 'https://ph4nt0m.carrd.co/', 'Direção de arte, avatar maker.', 'Apoiador Místico', 1)
) AS v(name, url, tagline, role, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.supporters);

-- Permissões de acesso à API (necessárias em projetos novos do Supabase)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.events, public.gallery_images, public.comments, public.supporters TO anon, authenticated;
GRANT INSERT ON public.comments TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
