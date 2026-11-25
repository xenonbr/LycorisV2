import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_HERO_STATS } from '@/lib/mockData';
import { HeroStat } from '@/lib/types';
import { isAdminRequest, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const SETTINGS_PATH = 'settings/hero-stats.json';

let localStats: HeroStat[] = [...INITIAL_HERO_STATS];

async function ensureBucket() {
  if (!supabaseAdmin) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });
  }
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json(parsed);
        }
      }
    } catch {
      // Usa padrão caso ainda não tenha sido salvo
    }
  }
  return NextResponse.json(localStats);
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const body = await request.json();
    const items: HeroStat[] = Array.isArray(body) ? body : body.stats;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Lista de caixas inválida.' }, { status: 400 });
    }

    const sanitized: HeroStat[] = items.slice(0, 8).map((item, idx) => ({
      id: item.id || `stat-${idx + 1}`,
      value: String(item.value || '').trim().slice(0, 40) || '—',
      label: String(item.label || '').trim().slice(0, 60) || 'Destaque',
      color: item.color || (['lycoris-400', 'gothic-gold', 'white', 'lycoris-500'][idx % 4] as HeroStat['color']),
    }));

    localStats = sanitized;

    if (isSupabaseConfigured && supabaseAdmin) {
      await ensureBucket();
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
      { error: err.message || 'Erro ao salvar destaques' },
      { status: 500 }
    );
  }
}
