import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminRequest, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';

async function ensureBucket() {
  if (!supabaseAdmin) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/gif'],
    });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = String(formData.get('folder') || 'gallery').replace(/[^a-z0-9_-]/gi, '');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'image/webp';
    const ext = mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('png')
      ? 'png'
      : mimeType.includes('gif')
      ? 'gif'
      : 'jpg';

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
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
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

    // Fallback em Data URL caso Supabase não esteja configurado
    const base64 = buffer.toString('base64');
    return NextResponse.json({
      url: `data:${mimeType};base64,${base64}`,
      size: buffer.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao fazer upload da imagem' },
      { status: 500 }
    );
  }
}
