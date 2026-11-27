import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { CommentIdentityBinding } from '@/lib/types';

const PRIVATE_BUCKET = 'lycoris-private';
const IDENTITIES_PATH = 'settings/comment-identities.json';

export interface CommentIdentitiesStore {
  // Mapa ipHash -> vínculo do usuário
  byIp: Record<string, CommentIdentityBinding>;
  // Mapa commentId -> ipHash (para exibir a tag #A1B2C3 e status de bloqueio no painel admin)
  commentIpMap: Record<string, string>;
}

let localIdentities: CommentIdentitiesStore = {
  byIp: {},
  commentIpMap: {},
};

export async function getCommentIdentities(): Promise<CommentIdentitiesStore> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(PRIVATE_BUCKET)
        .download(IDENTITIES_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (parsed && typeof parsed === 'object') {
          localIdentities = {
            byIp: parsed.byIp && typeof parsed.byIp === 'object' ? parsed.byIp : {},
            commentIpMap:
              parsed.commentIpMap && typeof parsed.commentIpMap === 'object'
                ? parsed.commentIpMap
                : {},
          };
          return localIdentities;
        }
      }
    } catch {
      // Usa estado inicial se ainda não existir
    }
  }
  return localIdentities;
}

export async function saveCommentIdentities(store: CommentIdentitiesStore): Promise<void> {
  localIdentities = store;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(store, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(PRIVATE_BUCKET)
      .upload(IDENTITIES_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}
