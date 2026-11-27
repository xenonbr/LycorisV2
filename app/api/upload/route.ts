import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminRequest, canAccessAdminModule, unauthorized, forbiddenMaster } from '@/lib/auth';
import { AdminModuleKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const ALLOWED_FOLDERS = new Set(['events', 'gallery', 'supporters', 'sawvr', 'homepage']);
// Cada pasta de upload só pode ser usada por quem tem o módulo correspondente liberado
const FOLDER_MODULE: Record<string, AdminModuleKey> = {
  events: 'events',
  gallery: 'gallery',
  supporters: 'supporters',
  sawvr: 'sawvr',
  homepage: 'homepage',
};

function detectImageFormat(buf: Buffer): 'webp' | 'png' | 'jpg' | 'gif' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
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

async function ensureBucket() {
  if (!supabaseAdmin) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: [
        'image/webp',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/json',
      ],
    });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = String(formData.get('folder') || 'gallery').toLowerCase().trim();
    // Whitelist estrita de pastas para impedir escrita em settings/ ou path traversal
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : 'gallery';

    if (!(await canAccessAdminModule(request, FOLDER_MODULE[folder]))) {
      return forbiddenMaster();
    }

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'O arquivo excede o tamanho máximo de 10MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validação real de magic bytes para impedir upload de scripts/HTML/SVG disfarçados
    const ext = detectImageFormat(buffer);
    if (!ext) {
      return NextResponse.json(
        { error: 'Arquivo inválido. Apenas imagens reais (WebP, PNG, JPG, GIF) são aceitas.' },
        { status: 400 }
      );
    }

    const mimeType =
      ext === 'webp'
        ? 'image/webp'
        : ext === 'png'
        ? 'image/png'
        : ext === 'gif'
        ? 'image/gif'
        : 'image/jpeg';

    if (isSupabaseConfigured && supabaseAdmin) {
      await ensureBucket();

      const filePath = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: mimeType,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: 'Falha ao salvar imagem no armazenamento.' }, { status: 400 });
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return NextResponse.json({
        url: publicUrlData.publicUrl,
        size: buffer.length,
        path: filePath,
      });
    }

    const base64 = buffer.toString('base64');
    return NextResponse.json({
      url: `data:${mimeType};base64,${base64}`,
      size: buffer.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao fazer upload da imagem.' },
      { status: 500 }
    );
  }
}
