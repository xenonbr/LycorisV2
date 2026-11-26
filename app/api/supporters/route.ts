import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SUPPORTERS } from '@/lib/mockData';
import { isMasterAdminRequest, forbiddenMaster } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const SUPPORTER_BANNERS_PATH = 'settings/supporter-banners.json';

let localSupporters = INITIAL_SUPPORTERS.map((s, i) => ({
  ...s,
  id: s.id || `local-${i}`,
  sort_order: i,
}));
let localBanners: Record<string, string> = {};

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getSupporterBanners(): Promise<Record<string, string>> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(SUPPORTER_BANNERS_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignora caso ainda não exista
    }
  }
  return localBanners;
}

async function saveSupporterBanners(map: Record<string, string>): Promise<void> {
  localBanners = map;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(map, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(SUPPORTER_BANNERS_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}

function resolveSortOrder(body: any): number {
  if (body.crystal_style === 'crimson' || body.is_owner) return -2;
  if (body.crystal_style === 'gold' || body.is_gold_crystal) return -1;
  return Number(body.sort_order) >= 0 ? Number(body.sort_order) : 0;
}

function enrichSupporter(s: any, banners: Record<string, string>) {
  const order = Number(s.sort_order ?? 0);
  const style: 'none' | 'crimson' | 'gold' =
    order <= -2 ? 'crimson' : order === -1 ? 'gold' : 'none';
  return {
    ...s,
    banner_url: banners[s.id] || null,
    is_owner: style === 'crimson',
    is_gold_crystal: style === 'gold',
    crystal_style: style,
  };
}

export async function GET() {
  const banners = await getSupporterBanners();
  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    const { data, error } = await client
      .from('supporters')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error && data) {
      return NextResponse.json(data.map((s) => enrichSupporter(s, banners)));
    }
  }
  return NextResponse.json(localSupporters.map((s) => enrichSupporter(s, banners)));
}

export async function POST(request: Request) {
  if (!isMasterAdminRequest(request)) return forbiddenMaster();
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const url = String(body.url || '').trim();
    if (!name || !isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Nome e uma URL válida (http/https) são obrigatórios.' },
        { status: 400 }
      );
    }

    const bannerUrl =
      body.banner_url && isValidUrl(String(body.banner_url))
        ? String(body.banner_url).trim()
        : null;

    const supporter = {
      id: crypto.randomUUID(),
      name,
      url,
      tagline: String(body.tagline || '').trim(),
      role: String(body.role || 'Apoiador').trim(),
      avatar: body.avatar && isValidUrl(String(body.avatar)) ? String(body.avatar).trim() : null,
      sort_order: resolveSortOrder(body),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('supporters')
        .insert([supporter])
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (bannerUrl && data?.id) {
        const banners = await getSupporterBanners();
        banners[data.id] = bannerUrl;
        await saveSupporterBanners(banners);
      }

      return NextResponse.json({ ...data, banner_url: bannerUrl }, { status: 201 });
    }

    if (bannerUrl) {
      const banners = await getSupporterBanners();
      banners[supporter.id] = bannerUrl;
      await saveSupporterBanners(banners);
    }
    localSupporters.push(supporter as any);
    return NextResponse.json({ ...supporter, banner_url: bannerUrl }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar apoiador' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isMasterAdminRequest(request)) return forbiddenMaster();
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    const url = String(body.url || '').trim();
    if (!String(body.name || '').trim() || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Nome e uma URL válida são obrigatórios.' }, { status: 400 });
    }
    const bannerUrl =
      body.banner_url && isValidUrl(String(body.banner_url))
        ? String(body.banner_url).trim()
        : null;

    const patch = {
      name: String(body.name).trim(),
      url,
      tagline: String(body.tagline || '').trim(),
      role: String(body.role || 'Apoiador').trim(),
      avatar: body.avatar && isValidUrl(String(body.avatar)) ? String(body.avatar).trim() : null,
      sort_order: resolveSortOrder(body),
    };

    const banners = await getSupporterBanners();
    if (bannerUrl) {
      banners[body.id] = bannerUrl;
    } else {
      delete banners[body.id];
    }
    await saveSupporterBanners(banners);

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('supporters')
        .update(patch)
        .eq('id', body.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ...data, banner_url: bannerUrl });
    }

    localSupporters = localSupporters.map((s) =>
      s.id === body.id ? ({ ...s, ...patch } as any) : s
    );
    return NextResponse.json({ success: true, banner_url: bannerUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar apoiador' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isMasterAdminRequest(request)) return forbiddenMaster();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

  const banners = await getSupporterBanners();
  if (banners[id]) {
    delete banners[id];
    await saveSupporterBanners(banners);
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin.from('supporters').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  localSupporters = localSupporters.filter((s) => s.id !== id);
  return NextResponse.json({ success: true });
}
