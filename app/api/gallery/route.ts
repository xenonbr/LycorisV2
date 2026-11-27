import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_GALLERY } from '@/lib/mockData';
import {
  isAdminRequest,
  canAccessAdminModule,
  isWebhookRequest,
  unauthorized,
  forbiddenMaster,
  checkRateLimit,
  tooManyRequests,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUCKET_NAME = 'lycoris-media';
const GALLERY_SETTINGS_PATH = 'settings/gallery-settings.json';

interface GallerySettings {
  order: string[];
  hiddenIds: string[];
}

let localGallery = [...INITIAL_GALLERY];
let localSettings: GallerySettings = { order: [], hiddenIds: [] };

async function getGallerySettings(): Promise<GallerySettings> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(GALLERY_SETTINGS_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        return {
          order: Array.isArray(parsed.order) ? parsed.order : [],
          hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [],
        };
      }
    } catch {
      // Usa padrão se arquivo ainda não existir
    }
  }
  return localSettings;
}

async function saveGallerySettings(settings: GallerySettings): Promise<void> {
  localSettings = settings;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(settings, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(GALLERY_SETTINGS_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeHidden =
    searchParams.get('includeHidden') === 'true' && isAdminRequest(request);

  const settings = await getGallerySettings();
  const hiddenSet = new Set(settings.hiddenIds);
  const orderMap = new Map<string, number>();
  settings.order.forEach((id, idx) => orderMap.set(id, idx));

  const client = supabaseAdmin || supabase;
  let items: any[] = localGallery;

  if (isSupabaseConfigured && client) {
    const { data, error } = await client
      .from('gallery_images')
      .select('*, comments(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      items = data;
    }
  }

  const enriched = items.map((img, fallbackIdx) => ({
    ...img,
    hidden: hiddenSet.has(img.id),
    sort_order: orderMap.has(img.id) ? orderMap.get(img.id)! : 10000 + fallbackIdx,
  }));

  enriched.sort((a, b) => a.sort_order - b.sort_order);

  const visible = includeHidden ? enriched : enriched.filter((img) => !img.hidden);
  return NextResponse.json(visible);
}

export async function POST(request: Request) {
  // Admin com permissão no módulo gallery ou webhook externo com header x-webhook-secret
  if (!(await canAccessAdminModule(request, 'gallery')) && !isWebhookRequest(request)) {
    return forbiddenMaster();
  }
  try {
    const body = await request.json();
    const payload = body.data || body;

    const title = String(payload.title || '').trim().slice(0, 120);
    const url = String(payload.url || '').trim();
    const author = String(payload.author || 'Membro do Lycoris').trim().slice(0, 80);
    const vrchat_world = String(payload.vrchat_world || 'Lycoris Garden Sanctuary')
      .trim()
      .slice(0, 100);

    if (!url || !title) {
      return NextResponse.json({ error: 'URL e Título são obrigatórios' }, { status: 400 });
    }
    if (!url.startsWith('/') && !/^https?:\/\//i.test(url) && !url.startsWith('data:image/')) {
      return NextResponse.json({ error: 'URL de imagem inválida.' }, { status: 400 });
    }

    const newImage = {
      id: crypto.randomUUID(),
      title,
      url,
      author,
      vrchat_world,
      likes: 0,
      created_at: new Date().toISOString(),
    };

    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('gallery_images')
        .insert([newImage])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Coloca a nova imagem no início da ordem personalizada
      const settings = await getGallerySettings();
      await saveGallerySettings({
        ...settings,
        order: [data.id, ...settings.order.filter((id) => id !== data.id)],
      });

      return NextResponse.json({ ...data, hidden: false }, { status: 201 });
    }

    localGallery.unshift({ ...newImage, comments: [] });
    return NextResponse.json({ ...newImage, hidden: false }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao adicionar imagem' }, { status: 500 });
  }
}

// Rota PUT para o admin salvar ordem de exibição e ocultar/exibir fotos sem apagar
export async function PUT(request: Request) {
  if (!(await canAccessAdminModule(request, 'gallery'))) return forbiddenMaster();
  try {
    const body = await request.json();
    const current = await getGallerySettings();

    let nextOrder = [...current.order];
    let nextHidden = [...current.hiddenIds];

    if (Array.isArray(body.order)) {
      nextOrder = body.order.map((id: any) => String(id));
    }

    if (Array.isArray(body.hiddenIds)) {
      nextHidden = body.hiddenIds.map((id: any) => String(id));
    } else if (body.toggleHiddenId) {
      const targetId = String(body.toggleHiddenId);
      if (nextHidden.includes(targetId)) {
        nextHidden = nextHidden.filter((id) => id !== targetId);
      } else {
        nextHidden.push(targetId);
      }
    }

    await saveGallerySettings({ order: nextOrder, hiddenIds: nextHidden });
    return NextResponse.json({ success: true, order: nextOrder, hiddenIds: nextHidden });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar ordem/visibilidade da galeria' },
      { status: 500 }
    );
  }
}

// Rota PATCH para persistir as curtidas no banco de dados (com rate limit por IP)
export async function PATCH(request: Request) {
  const rl = checkRateLimit(request, 'gallery-like', 30, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da foto é obrigatório' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured && client) {
      const { data: current, error: fetchErr } = await client
        .from('gallery_images')
        .select('likes')
        .eq('id', id)
        .single();

      if (!fetchErr && current) {
        const currentLikes = current.likes || 0;
        const newLikes = action === 'unlike' ? Math.max(0, currentLikes - 1) : currentLikes + 1;

        const { data, error } = await client
          .from('gallery_images')
          .update({ likes: newLikes })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ success: true, likes: data.likes });
        }
      }
    }

    const item = localGallery.find((g) => g.id === id);
    if (item) {
      item.likes = action === 'unlike' ? Math.max(0, item.likes - 1) : item.likes + 1;
      return NextResponse.json({ success: true, likes: item.likes });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar curtidas' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await canAccessAdminModule(request, 'gallery'))) return forbiddenMaster();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da foto é obrigatório' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured && client) {
      await client.from('comments').delete().eq('image_id', id);

      const { error } = await client.from('gallery_images').delete().eq('id', id);
      if (error) {
        console.error('Erro Supabase ao excluir foto:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const settings = await getGallerySettings();
      await saveGallerySettings({
        order: settings.order.filter((item) => item !== id),
        hiddenIds: settings.hiddenIds.filter((item) => item !== id),
      });

      return NextResponse.json({ success: true });
    }

    localGallery = localGallery.filter((img) => img.id !== id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao excluir imagem' }, { status: 500 });
  }
}
