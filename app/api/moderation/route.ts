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
import { stripForbiddenChars } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const BLOCKED_WORDS_PATH = 'settings/blocked-words.json';

function normalizeNick(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

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
  const hasCommentsAccess = await canAccessAdminModule(request, 'comments');
  const hasUsersAccess = await canAccessAdminModule(request, 'users');
  if (!hasCommentsAccess && !hasUsersAccess) return forbiddenMaster();

  try {
    const body = await request.json();

    // Ação 1: Bloquear / Desbloquear um IP
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

    // Ação 2: Desvincular um Nome de um IP (libera o IP para escolher outro nome)
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

    // Ação 3: Editar o Nome vinculado a um IP (atualiza também os comentários anteriores daquele IP)
    if (body.action === 'edit_nick' && body.ipTag && body.newAuthorName) {
      const cleanName = stripForbiddenChars(String(body.newAuthorName), true).trim();
      if (cleanName.length < 2) {
        return NextResponse.json(
          { error: 'Informe um nome válido com pelo menos 2 caracteres.' },
          { status: 400 }
        );
      }

      const store = await getCommentIdentities();
      const entry = Object.values(store.byIp).find((b) => b.ipTag === body.ipTag);
      if (!entry) {
        return NextResponse.json({ error: 'Vínculo de IP não encontrado.' }, { status: 404 });
      }

      const normNew = normalizeNick(cleanName);
      const conflict = Object.values(store.byIp).find(
        (b) => b.ipHash !== entry.ipHash && b.normalizedName === normNew
      );
      if (conflict) {
        return NextResponse.json(
          { error: `O nome "${cleanName}" já está vinculado a outro IP (${conflict.ipTag}).` },
          { status: 409 }
        );
      }

      const oldName = entry.authorName;
      store.byIp[entry.ipHash] = {
        ...entry,
        authorName: cleanName,
        normalizedName: normNew,
        updatedAt: new Date().toISOString(),
      };
      await saveCommentIdentities(store);

      // Atualiza também o nome nos comentários já feitos por esse IP no Supabase
      if (isSupabaseConfigured && supabaseAdmin) {
        const commentIds = Object.entries(store.commentIpMap)
          .filter(([, hash]) => hash === entry.ipHash)
          .map(([cid]) => cid);

        if (commentIds.length > 0) {
          await supabaseAdmin
            .from('comments')
            .update({ author_name: cleanName })
            .in('id', commentIds);
        } else if (oldName) {
          await supabaseAdmin
            .from('comments')
            .update({ author_name: cleanName })
            .eq('author_name', oldName);
        }
      }

      return NextResponse.json({
        success: true,
        identities: Object.values(store.byIp),
      });
    }

    // Ação 4: Atualizar lista de palavras bloqueadas
    if (!hasCommentsAccess) return forbiddenMaster();
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
