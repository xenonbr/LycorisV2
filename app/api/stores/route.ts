import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_PARTNER_STORES } from '@/lib/mockData';
import { PartnerStore, SupporterCrystalStyle } from '@/lib/types';
import { canAccessAdminModule, forbiddenMaster } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const STORES_PATH = 'settings/partner-stores.json';

const VALID_STYLES = new Set<SupporterCrystalStyle>([
  'none',
  'crimson',
  'gold',
  'purple',
  'blue',
  'pink',
]);

let localStores: PartnerStore[] = [...INITIAL_PARTNER_STORES];

function slugify(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'loja';
}

function sanitizeUrl(raw?: string, fallback = ''): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return trimmed;
  } catch {
    // URL inválida
  }
  return fallback;
}

function normalizeStore(raw: any, index: number): PartnerStore {
  const def = INITIAL_PARTNER_STORES[0];
  const id = String(raw?.id || slugify(raw?.name || `loja-${index + 1}`));
  const name = String(raw?.name || 'Loja Parceira').trim().slice(0, 80);
  const slug = slugify(raw?.slug || id || name);
  const styleRaw = String(raw?.crystal_style || 'gold').toLowerCase() as SupporterCrystalStyle;
  const crystal_style: SupporterCrystalStyle = VALID_STYLES.has(styleRaw) ? styleRaw : 'gold';

  return {
    id,
    slug,
    name,
    badge:
      String(raw?.badge || 'Parceiro Oficial • Loja Verificada').trim().slice(0, 100),
    tagline:
      String(raw?.tagline || '').trim().slice(0, 160),
    description:
      String(raw?.description || '').trim().slice(0, 800),
    logo_url: sanitizeUrl(raw?.logo_url, id === 'sawvr' ? def.logo_url : ''),
    banner_url: sanitizeUrl(raw?.banner_url, ''),
    contact_url: sanitizeUrl(raw?.contact_url, def.contact_url),
    contact_label:
      String(raw?.contact_label || `Falar com ${name}`).trim().slice(0, 70),
    item_contact_label:
      String(raw?.item_contact_label || `Negociar com ${name}`).trim().slice(0, 70),
    crystal_style,
    sort_order: typeof raw?.sort_order === 'number' ? raw.sort_order : index,
    created_at: raw?.created_at || new Date().toISOString(),
  };
}

async function getPartnerStoresList(): Promise<PartnerStore[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(STORES_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed
            .map((s, idx) => normalizeStore(s, idx))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          localStores = normalized;
          return normalized;
        }
      }
    } catch {
      // Usa INITIAL_PARTNER_STORES se ainda não existir
    }
  }
  return localStores;
}

async function savePartnerStoresList(stores: PartnerStore[]): Promise<void> {
  localStores = stores;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(stores, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(STORES_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}

export async function GET() {
  const stores = await getPartnerStoresList();
  return NextResponse.json(stores);
}

export async function POST(request: Request) {
  if (!(await canAccessAdminModule(request, 'sawvr'))) return forbiddenMaster();
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'O nome da loja é obrigatório.' }, { status: 400 });
    }

    const current = await getPartnerStoresList();
    let baseSlug = slugify(body.slug || name);
    let slug = baseSlug;
    let counter = 2;
    while (current.some((s) => s.slug === slug || s.id === slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const newStore = normalizeStore(
      {
        ...body,
        id: slug,
        slug,
        name,
        sort_order: current.length,
        created_at: new Date().toISOString(),
      },
      current.length
    );

    const next = [...current, newStore];
    await savePartnerStoresList(next);
    return NextResponse.json(newStore, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao criar nova loja parceira' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await canAccessAdminModule(request, 'sawvr'))) return forbiddenMaster();
  try {
    const body = await request.json();
    const current = await getPartnerStoresList();

    // Modo 1: Reordenar lojas
    if (Array.isArray(body.order)) {
      const orderIds: string[] = body.order.map((id: any) => String(id));
      const reordered = [...current]
        .map((s) => {
          const idx = orderIds.indexOf(s.id);
          return idx >= 0 ? { ...s, sort_order: idx } : s;
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      await savePartnerStoresList(reordered);
      return NextResponse.json(reordered);
    }

    // Modo 2: Editar informações do bloco de uma loja
    if (!body.id) {
      return NextResponse.json({ error: 'ID da loja é obrigatório.' }, { status: 400 });
    }

    let updatedStore: PartnerStore | null = null;
    const next = current.map((store, idx) => {
      if (store.id !== body.id) return store;
      const desiredSlug = body.slug ? slugify(body.slug) : store.slug;
      const slugTaken = current.some((other) => other.id !== store.id && other.slug === desiredSlug);
      updatedStore = normalizeStore(
        {
          ...store,
          ...body,
          id: store.id,
          slug: slugTaken ? store.slug : desiredSlug,
          sort_order: store.sort_order ?? idx,
        },
        idx
      );
      return updatedStore;
    });

    if (!updatedStore) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }

    await savePartnerStoresList(next);
    return NextResponse.json(updatedStore);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar informações da loja' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await canAccessAdminModule(request, 'sawvr'))) return forbiddenMaster();
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID da loja é obrigatório.' }, { status: 400 });
    }
    const current = await getPartnerStoresList();
    if (current.length <= 1) {
      return NextResponse.json(
        { error: 'Mantenha pelo menos uma loja ativa no sistema.' },
        { status: 400 }
      );
    }
    const next = current.filter((s) => s.id !== id);
    await savePartnerStoresList(next);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao excluir loja' },
      { status: 500 }
    );
  }
}
