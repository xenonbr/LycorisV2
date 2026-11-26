import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminRequest, isMasterAdminRequest, unauthorized, forbiddenMaster } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const BLOCKED_WORDS_PATH = 'settings/blocked-words.json';

let localCustomWords: string[] = [];

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
  return localCustomWords;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const words = await getCustomBlockedWords();
  return NextResponse.json({ words });
}

export async function PUT(request: Request) {
  if (!isMasterAdminRequest(request)) return forbiddenMaster();
  try {
    const body = await request.json();
    const rawList: string[] = Array.isArray(body.words) ? body.words : [];
    const cleaned = Array.from(
      new Set(
        rawList
          .map((w) => String(w || '').trim().toLowerCase())
          .filter((w) => w.length >= 2 && w.length <= 40)
      )
    );

    localCustomWords = cleaned;

    if (isSupabaseConfigured && supabaseAdmin) {
      const buffer = Buffer.from(JSON.stringify(cleaned, null, 2), 'utf-8');
      const { error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(BLOCKED_WORDS_PATH, buffer, {
          contentType: 'application/json',
          cacheControl: '0',
          upsert: true,
        });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ words: cleaned });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao salvar filtro de palavras' },
      { status: 500 }
    );
  }
}
