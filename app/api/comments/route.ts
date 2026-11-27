import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  canAccessAdminModule,
  forbiddenMaster,
  checkRateLimit,
  tooManyRequests,
  getClientIp,
  computeIpHash,
  computeIpTag,
  createSignedNickCookieValue,
  verifySignedNickCookieValue,
  parseCookieHeader,
} from '@/lib/auth';
import { INITIAL_GALLERY, INITIAL_SUPPORTERS } from '@/lib/mockData';
import { validateCommentInput } from '@/lib/moderation';
import { CommentIdentityBinding } from '@/lib/types';
import { getCommentIdentities, saveCommentIdentities } from '@/lib/commentIdentities';

export const dynamic = 'force-dynamic';

const PUBLIC_BUCKET = 'lycoris-media';
const BLOCKED_WORDS_PATH = 'settings/blocked-words.json';
const NICK_COOKIE_NAME = 'lycoris_member_nick';

function normalizeNick(nick: string): string {
  return String(nick || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

async function getCustomBlockedWords(): Promise<string[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(PUBLIC_BUCKET)
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

async function getReservedSupporterNames(): Promise<Set<string>> {
  const reserved = new Set<string>();
  INITIAL_SUPPORTERS.forEach((s) => reserved.add(normalizeNick(s.name)));

  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    try {
      const { data } = await client.from('supporters').select('name');
      if (Array.isArray(data)) {
        data.forEach((s) => {
          if (s?.name) reserved.add(normalizeNick(s.name));
        });
      }
    } catch {
      // ignora
    }
  }
  return reserved;
}

let localComments = INITIAL_GALLERY.flatMap((img) => img.comments || []);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('imageId');
  const myIdentity = searchParams.get('myIdentity') === 'true';

  // Endpoint leve para a Galeria descobrir se este IP/dispositivo já possui um nick vinculado
  if (myIdentity) {
    const ip = getClientIp(request);
    const ipHash = computeIpHash(ip);
    const store = await getCommentIdentities();
    const binding = store.byIp[ipHash];

    // Se o vínculo existe no servidor, ele é a fonte oficial (inclusive quando o admin edita o nick).
    // Se o vínculo foi removido/desvinculado pelo admin, ignora e limpa qualquer cookie antigo do navegador.
    const lockedName = binding?.authorName || null;
    const res = NextResponse.json({
      lockedName,
      ipTag: computeIpTag(ipHash),
      blocked: Boolean(binding?.blocked),
    });

    if (!binding) {
      res.cookies.delete(NICK_COOKIE_NAME);
    }
    return res;
  }

  const isAdminMod = await canAccessAdminModule(request, 'comments');
  const store = isAdminMod ? await getCommentIdentities() : null;

  const client = supabaseAdmin || supabase;
  let items: any[] = localComments;

  if (isSupabaseConfigured && client) {
    let query = client.from('comments').select('*').order('created_at', { ascending: false });
    if (imageId) {
      query = query.eq('image_id', imageId);
    }
    const { data, error } = await query;
    if (!error && data) {
      items = data;
    }
  } else if (imageId) {
    items = localComments.filter((c) => c.image_id === imageId);
  }

  // Se for o painel de moderação, anexa a tag do IP (#A1B2C3) e se o IP está banido
  if (isAdminMod && store) {
    const enriched = items.map((c) => {
      const ipHash = store.commentIpMap[c.id];
      const binding = ipHash ? store.byIp[ipHash] : undefined;
      return {
        ...c,
        ip_tag: ipHash ? computeIpTag(ipHash) : undefined,
        ip_blocked: Boolean(binding?.blocked),
      };
    });
    return NextResponse.json(enriched);
  }

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, 'gallery-comment', 8, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { image_id, author_name, content } = body;

    if (!image_id) {
      return NextResponse.json({ error: 'ID da imagem é obrigatório.' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipHash = computeIpHash(ip);
    const ipTag = computeIpTag(ipHash);
    const store = await getCommentIdentities();

    // 1. Verifica se o IP foi bloqueado pela moderação
    const existingBinding = store.byIp[ipHash];
    if (existingBinding?.blocked) {
      return NextResponse.json(
        {
          error:
            'Seu acesso aos comentários foi suspenso pela moderação da comunidade.',
        },
        { status: 403 }
      );
    }

    // 2. Verifica identidade vinculada por IP no servidor (fonte oficial)
    const lockedAuthorName = existingBinding?.authorName || null;
    const requestedName = String(author_name || '').trim();

    if (
      lockedAuthorName &&
      normalizeNick(requestedName) !== normalizeNick(lockedAuthorName)
    ) {
      return NextResponse.json(
        {
          error: `Seu dispositivo/IP já está vinculado ao nick "${lockedAuthorName}". Não é permitido trocar de nome para comentar.`,
          lockedName: lockedAuthorName,
        },
        { status: 403 }
      );
    }

    const finalAuthorName = lockedAuthorName || requestedName;
    const normalizedFinal = normalizeNick(finalAuthorName);

    // 3. Verifica se outro IP já registrou esse nick (impede se passar por outro membro)
    const otherOwner = Object.values(store.byIp).find(
      (b) => b.ipHash !== ipHash && b.normalizedName === normalizedFinal
    );
    if (otherOwner) {
      return NextResponse.json(
        {
          error: `O nick "${finalAuthorName}" já pertence a outro membro da comunidade. Escolha seu próprio nick.`,
        },
        { status: 409 }
      );
    }

    // 4. Se for um novo vínculo, protege também os nomes oficiais de apoiadores/fundadores que ainda não tenham vínculo
    if (!lockedAuthorName) {
      const reservedSupporters = await getReservedSupporterNames();
      if (reservedSupporters.has(normalizedFinal)) {
        return NextResponse.json(
          {
            error: `O nome "${finalAuthorName}" pertence a um Fundador/Apoiador oficial e é protegido contra uso por terceiros.`,
          },
          { status: 403 }
        );
      }
    }

    // 5. Validação de conteúdo (palavrões, links, símbolos, tamanho)
    const extraWords = await getCustomBlockedWords();
    const check = validateCommentInput(finalAuthorName, content, extraWords);
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    // 6. Evita flood de comentários idênticos/repetidos pelo mesmo usuário na mesma foto
    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured && client) {
      const { data: existingInPhoto } = await client
        .from('comments')
        .select('id, content')
        .eq('image_id', image_id)
        .ilike('author_name', finalAuthorName);

      if (Array.isArray(existingInPhoto) && existingInPhoto.length >= 2) {
        return NextResponse.json(
          {
            error: 'Você já deixou o limite máximo de 2 comentários nesta foto.',
          },
          { status: 429 }
        );
      }
    }

    const newComment = {
      id: crypto.randomUUID(),
      image_id,
      author_name: finalAuthorName,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    let savedComment: any = newComment;

    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('comments')
        .insert([newComment])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      savedComment = data;
    } else {
      localComments.unshift(newComment);
    }

    // 7. Salva o vínculo permanente IP <-> Nick e registra o IP do comentário
    store.byIp[ipHash] = {
      ipHash,
      ipTag,
      authorName: finalAuthorName,
      normalizedName: normalizedFinal,
      updatedAt: new Date().toISOString(),
      blocked: Boolean(existingBinding?.blocked),
    };
    store.commentIpMap[savedComment.id] = ipHash;
    await saveCommentIdentities(store);

    const response = NextResponse.json(
      {
        ...savedComment,
        lockedName: finalAuthorName,
      },
      { status: 201 }
    );

    // Grava Cookie HttpOnly assinado por 1 ano para travar também o navegador
    response.cookies.set(
      NICK_COOKIE_NAME,
      createSignedNickCookieValue(finalAuthorName),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      }
    );

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao postar comentário' },
      { status: 500 }
    );
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
