import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SUPPORTERS } from '@/lib/mockData';
import { canAccessAdminModule, forbiddenMaster } from '@/lib/auth';
import { SupporterBadgeIcon, SupporterCrystalStyle } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const SUPPORTER_META_PATH = 'settings/supporter-banners.json';

interface SupporterMetaEntry {
  banner_url?: string | null;
  crystal_style?: SupporterCrystalStyle;
  badge_icon?: SupporterBadgeIcon;
  display_order?: number;
}

type SupporterMetaMap = Record<string, string | SupporterMetaEntry>;

const VALID_STYLES = new Set<SupporterCrystalStyle>([
  'none',
  'crimson',
  'gold',
  'purple',
  'blue',
  'pink',
]);

const VALID_ICONS = new Set<SupporterBadgeIcon>([
  'none',
  'crown',
  'sparkles',
  'flame',
  'heart',
  'gem',
  'palette',
  'video',
  'music',
  'shield',
  'shopping',
  'users',
]);

let localSupporters = INITIAL_SUPPORTERS.map((s, i) => ({
  ...s,
  id: s.id || `local-${i}`,
  sort_order: i,
}));
let localMeta: SupporterMetaMap = {};

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getSupporterMetaMap(): Promise<SupporterMetaMap> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(SUPPORTER_META_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (parsed && typeof parsed === 'object') {
          localMeta = parsed;
          return parsed;
        }
      }
    } catch {
      // ignora caso ainda não exista
    }
  }
  return localMeta;
}

async function saveSupporterMetaMap(map: SupporterMetaMap): Promise<void> {
  localMeta = map;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(map, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(SUPPORTER_META_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}

function readMetaEntry(raw: string | SupporterMetaEntry | undefined): SupporterMetaEntry {
  if (!raw) return {};
  if (typeof raw === 'string') {
    return { banner_url: raw };
  }
  if (typeof raw === 'object') {
    return { ...raw };
  }
  return {};
}

function inferLegacyStyleFromSortOrder(order: number): SupporterCrystalStyle {
  if (order === -2 || order <= -6) return 'crimson';
  if (order === -1) return 'gold';
  if (order === -3) return 'purple';
  if (order === -4) return 'blue';
  if (order === -5) return 'pink';
  return 'none';
}

function sanitizeStyle(body: any, fallback: SupporterCrystalStyle = 'none'): SupporterCrystalStyle {
  const raw = String(body?.crystal_style || '').toLowerCase() as SupporterCrystalStyle;
  if (VALID_STYLES.has(raw)) return raw;
  if (body?.is_owner) return 'crimson';
  if (body?.is_gold_crystal) return 'gold';
  return fallback;
}

function sanitizeIcon(body: any, fallback: SupporterBadgeIcon = 'none'): SupporterBadgeIcon {
  const raw = String(body?.badge_icon || '').toLowerCase() as SupporterBadgeIcon;
  if (VALID_ICONS.has(raw)) return raw;
  return fallback;
}

function enrichSupporter(s: any, metaMap: SupporterMetaMap, fallbackIndex: number) {
  const entry = readMetaEntry(metaMap[s.id]);
  const dbOrder = Number(s.sort_order ?? 0);

  // Se já existe crystal_style salvo nos metadados, usa ele; senão migra do sort_order negativo antigo
  const style: SupporterCrystalStyle =
    entry.crystal_style && VALID_STYLES.has(entry.crystal_style)
      ? entry.crystal_style
      : inferLegacyStyleFromSortOrder(dbOrder);

  const badgeIcon: SupporterBadgeIcon =
    entry.badge_icon && VALID_ICONS.has(entry.badge_icon)
      ? entry.badge_icon
      : 'none';

  const displayOrder =
    typeof entry.display_order === 'number'
      ? entry.display_order
      : dbOrder >= 0
      ? dbOrder
      : fallbackIndex;

  return {
    ...s,
    sort_order: displayOrder,
    banner_url: entry.banner_url || null,
    is_owner: style === 'crimson',
    is_gold_crystal: style === 'gold',
    crystal_style: style,
    badge_icon: badgeIcon,
  };
}

function sortSupportersByDisplayOrder(list: any[]) {
  return [...list].sort((a, b) => {
    const oa = Number(a.sort_order ?? 0);
    const ob = Number(b.sort_order ?? 0);
    if (oa !== ob) return oa - ob;
    return 0;
  });
}

export async function GET() {
  const metaMap = await getSupporterMetaMap();
  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    const { data, error } = await client
      .from('supporters')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error && data) {
      const enriched = data.map((s, idx) => enrichSupporter(s, metaMap, idx));
      return NextResponse.json(sortSupportersByDisplayOrder(enriched));
    }
  }
  const enriched = localSupporters.map((s, idx) => enrichSupporter(s, metaMap, idx));
  return NextResponse.json(sortSupportersByDisplayOrder(enriched));
}

export async function POST(request: Request) {
  if (!(await canAccessAdminModule(request, 'supporters'))) return forbiddenMaster();
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
    const style = sanitizeStyle(body, 'none');
    const badgeIcon = sanitizeIcon(body, 'none');

    const metaMap = await getSupporterMetaMap();
    const nextOrder = Object.keys(metaMap).length;

    const supporter = {
      id: crypto.randomUUID(),
      name,
      url,
      tagline: String(body.tagline || '').trim(),
      role: String(body.role || 'Apoiador').trim(),
      avatar: body.avatar && isValidUrl(String(body.avatar)) ? String(body.avatar).trim() : null,
      sort_order: nextOrder,
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('supporters')
        .insert([supporter])
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (data?.id) {
        metaMap[data.id] = {
          banner_url: bannerUrl,
          crystal_style: style,
          badge_icon: badgeIcon,
          display_order: nextOrder,
        };
        await saveSupporterMetaMap(metaMap);
      }

      return NextResponse.json(
        enrichSupporter(data, metaMap, nextOrder),
        { status: 201 }
      );
    }

    metaMap[supporter.id] = {
      banner_url: bannerUrl,
      crystal_style: style,
      badge_icon: badgeIcon,
      display_order: nextOrder,
    };
    await saveSupporterMetaMap(metaMap);
    localSupporters.push(supporter as any);
    return NextResponse.json(enrichSupporter(supporter, metaMap, nextOrder), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar apoiador' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await canAccessAdminModule(request, 'supporters'))) return forbiddenMaster();
  try {
    const body = await request.json();
    const metaMap = await getSupporterMetaMap();

    // Modo 1: Reordenação da lista de apoiadores ({ order: ['id1', 'id2', ...] })
    if (Array.isArray(body.order)) {
      const orderIds: string[] = body.order.map((id: any) => String(id));

      // Se algum apoiador ainda tinha estilo apenas no sort_order negativo do banco, preserva o estilo no metaMap antes de atualizar sort_order
      if (isSupabaseConfigured && supabaseAdmin) {
        const { data: existingRows } = await supabaseAdmin
          .from('supporters')
          .select('id, sort_order');
        if (Array.isArray(existingRows)) {
          for (const row of existingRows) {
            const current = readMetaEntry(metaMap[row.id]);
            if (!current.crystal_style) {
              current.crystal_style = inferLegacyStyleFromSortOrder(Number(row.sort_order ?? 0));
            }
            metaMap[row.id] = current;
          }
        }
      }

      orderIds.forEach((id, index) => {
        const current = readMetaEntry(metaMap[id]);
        metaMap[id] = {
          ...current,
          display_order: index,
        };
      });
      await saveSupporterMetaMap(metaMap);

      if (isSupabaseConfigured && supabaseAdmin) {
        const adminClient = supabaseAdmin;
        await Promise.all(
          orderIds.map((id, index) =>
            adminClient
              .from('supporters')
              .update({ sort_order: index })
              .eq('id', id)
          )
        );
      } else {
        localSupporters = localSupporters.map((s) => {
          const idx = orderIds.indexOf(s.id);
          return idx >= 0 ? { ...s, sort_order: idx } : s;
        });
      }

      return NextResponse.json({ success: true });
    }

    // Modo 2: Edição de um apoiador específico
    if (!body.id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    const url = String(body.url || '').trim();
    if (!String(body.name || '').trim() || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Nome e uma URL válida são obrigatórios.' }, { status: 400 });
    }
    const bannerUrl =
      body.banner_url && isValidUrl(String(body.banner_url))
        ? String(body.banner_url).trim()
        : null;

    const currentMeta = readMetaEntry(metaMap[body.id]);
    const style = sanitizeStyle(body, currentMeta.crystal_style || 'none');
    const badgeIcon = sanitizeIcon(body, currentMeta.badge_icon || 'none');
    const displayOrder =
      typeof currentMeta.display_order === 'number'
        ? currentMeta.display_order
        : Number(body.sort_order) >= 0
        ? Number(body.sort_order)
        : 0;

    metaMap[body.id] = {
      banner_url: bannerUrl,
      crystal_style: style,
      badge_icon: badgeIcon,
      display_order: displayOrder,
    };
    await saveSupporterMetaMap(metaMap);

    const patch = {
      name: String(body.name).trim(),
      url,
      tagline: String(body.tagline || '').trim(),
      role: String(body.role || 'Apoiador').trim(),
      avatar: body.avatar && isValidUrl(String(body.avatar)) ? String(body.avatar).trim() : null,
      sort_order: displayOrder,
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('supporters')
        .update(patch)
        .eq('id', body.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(enrichSupporter(data, metaMap, displayOrder));
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
  if (!(await canAccessAdminModule(request, 'supporters'))) return forbiddenMaster();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

  const metaMap = await getSupporterMetaMap();
  if (metaMap[id]) {
    delete metaMap[id];
    await saveSupporterMetaMap(metaMap);
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin.from('supporters').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  localSupporters = localSupporters.filter((s) => s.id !== id);
  return NextResponse.json({ success: true });
}
