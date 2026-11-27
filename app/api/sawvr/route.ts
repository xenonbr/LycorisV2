import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { SawCatalogItem } from '@/lib/types';
import { canAccessPartnerStore, forbiddenMaster } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const SAW_CATALOG_PATH = 'settings/sawvr-catalog.json';

let localCatalog: SawCatalogItem[] = [];

async function getCatalogItems(): Promise<SawCatalogItem[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(SAW_CATALOG_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Caso o arquivo ainda não exista
    }
  }
  return localCatalog;
}

async function saveCatalogItems(items: SawCatalogItem[]): Promise<void> {
  localCatalog = items;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(items, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(SAW_CATALOG_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}

function sanitizeContactUrl(raw?: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return 'https://discord.gg/V5ykbQsBAE';
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return trimmed;
  } catch {
    // URL inválida
  }
  return 'https://discord.gg/V5ykbQsBAE';
}

function sanitizeImageUrl(raw?: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('data:image/')) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return trimmed;
  } catch {
    // URL inválida
  }
  return '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const items = (await getCatalogItems()).map((item) => ({
    ...item,
    store_id: item.store_id || 'sawvr',
  }));
  if (storeId) {
    return NextResponse.json(items.filter((i) => (i.store_id || 'sawvr') === storeId));
  }
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const price = String(body.price || '').trim();
    const store_id = String(body.store_id || 'sawvr').trim() || 'sawvr';

    if (!(await canAccessPartnerStore(request, store_id))) return forbiddenMaster();

    if (!title || !price) {
      return NextResponse.json(
        { error: 'Nome do produto e preço são obrigatórios.' },
        { status: 400 }
      );
    }

    const newItem: SawCatalogItem = {
      id: crypto.randomUUID(),
      store_id,
      title,
      description: String(body.description || '').trim(),
      price,
      category: String(body.category || 'Headset VR').trim(),
      condition: String(body.condition || 'Novo / Lacrado').trim(),
      image_url: sanitizeImageUrl(body.image_url),
      contact_url: sanitizeContactUrl(body.contact_url),
      available: body.available !== false,
      featured: Boolean(body.featured),
      created_at: new Date().toISOString(),
    };

    const current = await getCatalogItems();
    const next = [newItem, ...current];
    await saveCatalogItems(next);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao criar anúncio no catálogo' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID do anúncio é obrigatório.' }, { status: 400 });
    }

    const current = await getCatalogItems();
    const targetItem = current.find((item) => item.id === body.id);
    if (!targetItem) {
      return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 });
    }
    if (!(await canAccessPartnerStore(request, targetItem.store_id || 'sawvr'))) {
      return forbiddenMaster();
    }
    let updatedItem: SawCatalogItem | null = null;

    const next = current.map((item) => {
      if (item.id !== body.id) return item;
      updatedItem = {
        ...item,
        store_id:
          body.store_id !== undefined
            ? String(body.store_id).trim() || 'sawvr'
            : item.store_id || 'sawvr',
        title: body.title !== undefined ? String(body.title).trim() : item.title,
        description:
          body.description !== undefined ? String(body.description).trim() : item.description,
        price: body.price !== undefined ? String(body.price).trim() : item.price,
        category: body.category !== undefined ? String(body.category).trim() : item.category,
        condition: body.condition !== undefined ? String(body.condition).trim() : item.condition,
        image_url:
          body.image_url !== undefined ? sanitizeImageUrl(body.image_url) : item.image_url,
        contact_url:
          body.contact_url !== undefined
            ? sanitizeContactUrl(body.contact_url)
            : item.contact_url,
        available: body.available !== undefined ? Boolean(body.available) : item.available,
        featured: body.featured !== undefined ? Boolean(body.featured) : item.featured,
      };
      return updatedItem;
    });

    await saveCatalogItems(next);
    return NextResponse.json(updatedItem || { success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar anúncio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do anúncio é obrigatório.' }, { status: 400 });
    }

    const current = await getCatalogItems();
    const targetItem = current.find((item) => item.id === id);
    if (!targetItem) {
      return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 });
    }
    if (!(await canAccessPartnerStore(request, targetItem.store_id || 'sawvr'))) {
      return forbiddenMaster();
    }
    const next = current.filter((item) => item.id !== id);
    await saveCatalogItems(next);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao remover anúncio' },
      { status: 500 }
    );
  }
}
