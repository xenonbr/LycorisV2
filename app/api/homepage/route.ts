import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_HOME_CONTENT } from '@/lib/mockData';
import { HomePageContent } from '@/lib/types';
import { canAccessAdminModule, forbiddenMaster } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const SETTINGS_PATH = 'settings/homepage-content.json';

let localHomeContent: HomePageContent = { ...INITIAL_HOME_CONTENT };

function sanitizeString(value: unknown, fallback: string, maxLen: number): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

function sanitizeOptionalString(value: unknown, fallback: string, maxLen: number): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLen);
}

function sanitizeHomeContent(raw: any): HomePageContent {
  const d = INITIAL_HOME_CONTENT;
  let bullets: string[] = d.heroBullets;
  if (Array.isArray(raw?.heroBullets)) {
    const cleaned = raw.heroBullets
      .map((item: unknown) => String(item || '').trim().slice(0, 140))
      .filter((item: string) => item.length > 0)
      .slice(0, 8);
    if (cleaned.length > 0) bullets = cleaned;
  }

  let ctaUrl = sanitizeString(raw?.heroCtaUrl, d.heroCtaUrl, 300);
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl) && !ctaUrl.startsWith('/')) {
    ctaUrl = d.heroCtaUrl;
  }

  let brandImageUrl = sanitizeString(raw?.brandImageUrl, d.brandImageUrl, 500);
  if (brandImageUrl && !/^https?:\/\//i.test(brandImageUrl) && !brandImageUrl.startsWith('/')) {
    brandImageUrl = d.brandImageUrl;
  }

  return {
    heroBadge: sanitizeString(raw?.heroBadge, d.heroBadge, 90),
    heroQuote: sanitizeString(raw?.heroQuote, d.heroQuote, 180),
    heroBullets: bullets,
    heroInviteQuote: sanitizeString(raw?.heroInviteQuote, d.heroInviteQuote, 160),
    heroCtaText: sanitizeString(raw?.heroCtaText, d.heroCtaText, 70),
    heroCtaUrl: ctaUrl,
    aboutBadge: sanitizeString(raw?.aboutBadge, d.aboutBadge, 70),
    aboutTitleStart: sanitizeString(raw?.aboutTitleStart, d.aboutTitleStart, 100),
    aboutTitleHighlight: sanitizeOptionalString(raw?.aboutTitleHighlight, d.aboutTitleHighlight, 100),
    aboutTitleEnd: sanitizeOptionalString(raw?.aboutTitleEnd, d.aboutTitleEnd, 100),
    aboutDescription: sanitizeString(raw?.aboutDescription, d.aboutDescription, 700),
    block1Title: sanitizeString(raw?.block1Title, d.block1Title, 50),
    block1Description: sanitizeString(raw?.block1Description, d.block1Description, 240),
    block2Title: sanitizeString(raw?.block2Title, d.block2Title, 50),
    block2Description: sanitizeString(raw?.block2Description, d.block2Description, 240),
    brandImageUrl,
    brandEyebrow: sanitizeString(raw?.brandEyebrow, d.brandEyebrow, 60),
    brandTitle: sanitizeString(raw?.brandTitle, d.brandTitle, 80),
    brandSubtitle: sanitizeString(raw?.brandSubtitle, d.brandSubtitle, 120),
  };
}

export async function GET() {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(SETTINGS_PATH);
      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          const normalized = sanitizeHomeContent(parsed);
          localHomeContent = normalized;
          return NextResponse.json(normalized);
        }
      }
    } catch {
      // Usa padrão caso ainda não exista no bucket
    }
  }
  return NextResponse.json(localHomeContent);
}

export async function PUT(request: Request) {
  if (!(await canAccessAdminModule(request, 'homepage'))) return forbiddenMaster();

  try {
    const body = await request.json();
    const sanitized = sanitizeHomeContent(body);
    localHomeContent = sanitized;

    if (isSupabaseConfigured && supabaseAdmin) {
      const buffer = Buffer.from(JSON.stringify(sanitized, null, 2), 'utf-8');
      const { error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(SETTINGS_PATH, buffer, {
          contentType: 'application/json',
          cacheControl: '0',
          upsert: true,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(sanitized);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao salvar blocos da página inicial' },
      { status: 500 }
    );
  }
}
