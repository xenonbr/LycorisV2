import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isMasterAdminRequest, unauthorized } from '@/lib/auth';
import { PendingGalleryPost } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUCKET_NAME = 'lycoris-media';
const PENDING_POSTS_PATH = 'settings/pending-gallery-posts.json';
const GALLERY_SETTINGS_PATH = 'settings/gallery-settings.json';

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

let localPendingPosts: PendingGalleryPost[] = [];

// Verifica os bytes iniciais (magic bytes) do buffer para garantir que é realmente uma imagem
function detectImageFormat(buf: Buffer): 'webp' | 'png' | 'jpg' | 'gif' | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  // GIF: GIF87a ou GIF89a
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return 'gif';
  }
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

async function getPendingPosts(): Promise<PendingGalleryPost[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(PENDING_POSTS_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Arquivo ainda não existe
    }
  }
  return localPendingPosts;
}

async function savePendingPosts(posts: PendingGalleryPost[]): Promise<void> {
  localPendingPosts = posts;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(posts, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(PENDING_POSTS_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}

// GET: Apenas Admin Nível 2 pode listar os posts pendentes de aprovação
export async function GET(request: Request) {
  if (!isMasterAdminRequest(request)) return unauthorized();
  const posts = await getPendingPosts();
  return NextResponse.json(posts);
}

// POST: Visitantes enviam uma foto da comunidade para análise do Admin Nível 2
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = String(formData.get('title') || '').trim().slice(0, 80);
    const author = String(formData.get('author') || '').trim().slice(0, 50);
    const vrchat_world =
      String(formData.get('vrchat_world') || '').trim().slice(0, 80) ||
      'Lycoris Garden Sanctuary';

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Título do registro e seu nome/nick no VRChat são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'Selecione um arquivo de foto válido do seu dispositivo.' },
        { status: 400 }
      );
    }

    // 1. Trava rigorosa de MIME type (apenas foto)
    const mimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
      return NextResponse.json(
        {
          error:
            'Formato de arquivo bloqueado. Apenas arquivos de foto (JPG, PNG, WebP ou GIF) são permitidos.',
        },
        { status: 400 }
      );
    }

    // 2. Limite de tamanho (máx 8MB)
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'A foto excede o limite máximo de 8MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Verificação real de assinatura binária (magic bytes) para impedir arquivos renomeados
    const detectedFormat = detectImageFormat(buffer);
    if (!detectedFormat) {
      return NextResponse.json(
        {
          error:
            'Arquivo inválido ou corrompido. Envie exclusivamente um arquivo de imagem autêntico.',
        },
        { status: 400 }
      );
    }

    const contentMime =
      detectedFormat === 'webp'
        ? 'image/webp'
        : detectedFormat === 'png'
        ? 'image/png'
        : detectedFormat === 'gif'
        ? 'image/gif'
        : 'image/jpeg';

    let imageUrl = '';
    let storagePath = '';

    if (isSupabaseConfigured && supabaseAdmin) {
      storagePath = `community-pending/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${detectedFormat}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: contentMime,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      imageUrl = publicUrlData.publicUrl;
    } else {
      imageUrl = `data:${contentMime};base64,${buffer.toString('base64')}`;
    }

    const newPending: PendingGalleryPost = {
      id: crypto.randomUUID(),
      title,
      url: imageUrl,
      storage_path: storagePath || undefined,
      author,
      vrchat_world,
      created_at: new Date().toISOString(),
    };

    const current = await getPendingPosts();
    await savePendingPosts([newPending, ...current]);

    return NextResponse.json(
      {
        success: true,
        message:
          'Foto enviada com sucesso! Ela ficará aguardando análise e aprovação de um administrador.',
        post: newPending,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao enviar foto para análise.' },
      { status: 500 }
    );
  }
}

// PUT: Admin Nível 2 aprova um post pendente e o publica na galeria oficial
export async function PUT(request: Request) {
  if (!isMasterAdminRequest(request)) return unauthorized();

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do post é obrigatório.' }, { status: 400 });
    }

    const current = await getPendingPosts();
    const target = current.find((p) => p.id === id);

    if (!target) {
      return NextResponse.json({ error: 'Post pendente não encontrado.' }, { status: 404 });
    }

    const newGalleryImage = {
      id: crypto.randomUUID(),
      title: target.title,
      url: target.url,
      author: target.author,
      vrchat_world: target.vrchat_world || 'Lycoris Garden Sanctuary',
      likes: 0,
      created_at: new Date().toISOString(),
    };

    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured && client) {
      const { data: inserted, error } = await client
        .from('gallery_images')
        .insert([newGalleryImage])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Coloca no topo da ordem de exibição da galeria
      if (supabaseAdmin) {
        try {
          let order: string[] = [];
          let hiddenIds: string[] = [];
          const { data: settingsData, error: dlErr } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .download(GALLERY_SETTINGS_PATH);
          if (!dlErr && settingsData) {
            const parsed = JSON.parse(await settingsData.text());
            order = Array.isArray(parsed.order) ? parsed.order : [];
            hiddenIds = Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [];
          }
          const nextSettings = {
            order: [inserted.id, ...order.filter((item) => item !== inserted.id)],
            hiddenIds,
          };
          await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(
              GALLERY_SETTINGS_PATH,
              Buffer.from(JSON.stringify(nextSettings, null, 2), 'utf-8'),
              {
                contentType: 'application/json',
                cacheControl: '0',
                upsert: true,
              }
            );
        } catch {
          // Segue normalmente se não houver arquivo de ordem
        }
      }
    }

    // Remove da fila de pendentes
    const remaining = current.filter((p) => p.id !== id);
    await savePendingPosts(remaining);

    return NextResponse.json({
      success: true,
      approved: newGalleryImage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao aprovar postagem.' },
      { status: 500 }
    );
  }
}

// DELETE: Admin Nível 2 recusa/exclui um post pendente e apaga o arquivo do storage
export async function DELETE(request: Request) {
  if (!isMasterAdminRequest(request)) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do post é obrigatório.' }, { status: 400 });
    }

    const current = await getPendingPosts();
    const target = current.find((p) => p.id === id);

    if (target?.storage_path && isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([target.storage_path])
        .catch(() => {});
    }

    const remaining = current.filter((p) => p.id !== id);
    await savePendingPosts(remaining);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao recusar postagem.' },
      { status: 500 }
    );
  }
}
