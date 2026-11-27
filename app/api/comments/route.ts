import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  canAccessAdminModule,
  forbiddenMaster,
  checkRateLimit,
  tooManyRequests,
} from '@/lib/auth';
import { INITIAL_GALLERY } from '@/lib/mockData';
import { validateCommentInput } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const BLOCKED_WORDS_PATH = 'settings/blocked-words.json';

async function getCustomBlockedWords(): Promise<string[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(BLOCKED_WORDS_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignora se arquivo ainda não existir
    }
  }
  return [];
}

let localComments = INITIAL_GALLERY.flatMap((img) => img.comments || []);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('imageId');

  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    let query = client.from('comments').select('*').order('created_at', { ascending: false });
    if (imageId) {
      query = query.eq('image_id', imageId);
    }
    const { data, error } = await query;
    if (!error && data) {
      return NextResponse.json(data);
    }
  }

  if (imageId) {
    return NextResponse.json(localComments.filter((c) => c.image_id === imageId));
  }
  return NextResponse.json(localComments);
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, 'gallery-comment', 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { image_id, author_name, content } = body;

    if (!image_id) {
      return NextResponse.json({ error: 'ID da imagem é obrigatório.' }, { status: 400 });
    }

    const extraWords = await getCustomBlockedWords();
    const check = validateCommentInput(author_name, content, extraWords);
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const newComment = {
      id: crypto.randomUUID(),
      image_id,
      author_name: author_name.trim(),
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('comments')
        .insert([newComment])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json(data, { status: 201 });
    }

    localComments.unshift(newComment);
    return NextResponse.json(newComment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao postar comentário' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await canAccessAdminModule(request, 'comments'))) return forbiddenMaster();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do comentário é obrigatório' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('comments').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    localComments = localComments.filter((c) => c.id !== id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao moderar comentário' }, { status: 500 });
  }
}
