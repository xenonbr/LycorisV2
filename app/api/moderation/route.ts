import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  isAdminRequest,
  canAccessAdminModule,
  unauthorized,
  forbiddenMaster,
} from '@/lib/auth';
import {
  getCommentIdentities,
  saveCommentIdentities,
} from '@/app/api/comments/route';

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
  const [words, identitiesStore] = await Promise.all([
    getCustomBlockedWords(),
    getCommentIdentities(),
  ]);

  return NextResponse.json({
    words,
    identities: Object.values(identitiesStore.byIp),
  });
}

export async function PUT(request: Request) {
  if (!(await canAccessAdminModule(request, 'comments'))) return forbiddenMaster();
  try {
    const body = await request.json();

    // Ação 1: Bloquear / Desbloquear um IP ou liberar vínculo de Nick
    if (body.action === 'toggle_block_ip' && body.ipTag) {
      const store = await getCommentIdentities();
      const entry = Object.values(store.byIp).find((b) => b.ipTag === body.ipTag);
      if (!entry) {
        return NextResponse.json({ error: 'Vínculo de IP não encontrado.' }, { status: 404 });
      }
      store.byIp[entry.ipHash] = {
        ...entry,
        blocked: !entry.blocked,
        updatedAt: new Date().toISOString(),
      };
      await saveCommentIdentities(store);
      return NextResponse.json({
        success: true,
        identities: Object.values(store.byIp),
      });
    }

    if (body.action === 'release_nick' && body.ipTag) {
      const store = await getCommentIdentities();
      const entry = Object.values(store.byIp).find((b) => b.ipTag === body.ipTag);
      if (entry) {
        delete store.byIp[entry.ipHash];
        await saveCommentIdentities(store);
      }
      return NextResponse.json({
        success: true,
        identities: Object.values(store.byIp),
      });
    }

    // Ação 2: Atualizar lista de palavras bloqueadas
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
      { error: err.message || 'Erro ao salvar configuração de moderação' },
      { status: 500 }
    );
  }
}
