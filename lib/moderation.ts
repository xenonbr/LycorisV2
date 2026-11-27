export const MAX_COMMENT_LENGTH = 150;
export const MAX_AUTHOR_LENGTH = 40;

// Caracteres permitidos:
// - No comentário: letras (com acentos), números, espaços, pontuação básica e EMOJIS Unicode
const ALLOWED_CONTENT_REGEX =
  /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s,.!?\-'"()\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]+$/u;
// - No nome/nick: letras (com acentos), números, espaços, underline, hífen e ponto
const ALLOWED_AUTHOR_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s_\-.]+$/;

// Detecção de qualquer link, protocolo (http://, https://, opera://, discord://, etc.) ou domínio
const LINK_REGEX =
  /(?:[a-z][a-z0-9+.-]*:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|br|net|org|gg|io|app|me|co|xyz|dev|tv|link|site|online)\b)/i;

// Lista base de palavras ofensivas/sensíveis (PT-BR e EN)
export const DEFAULT_BLOCKED_WORDS: string[] = [
  'pika',
  'pica',
  'piroca',
  'rola',
  'buceta',
  'boceta',
  'xoxota',
  'xota',
  'caralho',
  'karalho',
  'krl',
  'porra',
  'puta',
  'puto',
  'putaria',
  'fdp',
  'filhodaputa',
  'arrombado',
  'arrombada',
  'cuzão',
  'cuzao',
  'babaca',
  'otario',
  'otário',
  'vagabundo',
  'vagabunda',
  'prostituta',
  'vadia',
  'piranha',
  'corno',
  'boquete',
  'punheta',
  'siririca',
  'gozar',
  'gozada',
  'foder',
  'foda',
  'fodase',
  'foda-se',
  'merda',
  'bosta',
  'cacete',
  'viado',
  'viadinho',
  'bicha',
  'boiola',
  'traveco',
  'sapatao',
  'sapatão',
  'macaco',
  'crioulo',
  'nazista',
  'nazismo',
  'hitler',
  'estupro',
  'estuprador',
  'pedofilo',
  'pedófilo',
  'pedofilia',
  'suicidio',
  'suicídio',
  'nigger',
  'nigga',
  'faggot',
  'fuck',
  'bitch',
  'whore',
  'slut',
  'cunt',
  'dick',
  'cock',
  'pussy',
];

// Normaliza texto removendo acentos, leet speak comum (0->o, 1->i, 3->e, 4->a, 5->s, 7->t) e letras repetidas
function normalizeForCheck(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/(.)\1{2,}/g, '$1$1');
}

export function stripForbiddenChars(text: string, isAuthor = false): string {
  if (isAuthor) {
    return text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s_\-.]/g, '').slice(0, MAX_AUTHOR_LENGTH);
  }
  return text
    .replace(
      /[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s,.!?\-'"()\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/gu,
      ''
    )
    .slice(0, MAX_COMMENT_LENGTH);
}

export function containsSensitiveWord(
  text: string,
  extraWords: string[] = []
): string | null {
  const allWords = [...DEFAULT_BLOCKED_WORDS, ...extraWords]
    .map((w) => normalizeForCheck(w.trim()))
    .filter((w) => w.length >= 2);

  const normalized = normalizeForCheck(text);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  for (const blocked of allWords) {
    // Verifica palavra inteira nos tokens
    if (tokens.includes(blocked)) {
      return blocked;
    }
    // Para termos com 4+ letras, também detecta quando colados ou separados por espaços simples
    if (blocked.length >= 4 && normalized.replace(/\s+/g, '').includes(blocked)) {
      return blocked;
    }
  }

  // Palavra "cu" apenas quando isolada como token
  if (tokens.includes('cu')) {
    return 'cu';
  }

  return null;
}

export function validateCommentInput(
  authorName: string,
  content: string,
  extraBlockedWords: string[] = []
): { valid: boolean; error?: string } {
  const author = (authorName || '').trim();
  const msg = (content || '').trim();

  if (!author || !msg) {
    return { valid: false, error: 'Preencha seu nome e a mensagem.' };
  }

  if (author.length > MAX_AUTHOR_LENGTH) {
    return {
      valid: false,
      error: `O nome deve ter no máximo ${MAX_AUTHOR_LENGTH} caracteres.`,
    };
  }

  if (msg.length > MAX_COMMENT_LENGTH) {
    return {
      valid: false,
      error: `O comentário deve ter no máximo ${MAX_COMMENT_LENGTH} caracteres.`,
    };
  }

  if (LINK_REGEX.test(author) || LINK_REGEX.test(msg)) {
    return {
      valid: false,
      error: 'Links e endereços não são permitidos nos comentários.',
    };
  }

  if (!ALLOWED_AUTHOR_REGEX.test(author)) {
    return {
      valid: false,
      error: 'O nome contém emojis ou símbolos especiais não permitidos.',
    };
  }

  if (!ALLOWED_CONTENT_REGEX.test(msg)) {
    return {
      valid: false,
      error: 'Apenas texto e emojis são permitidos (sem links ou símbolos especiais).',
    };
  }

  if (
    containsSensitiveWord(author, extraBlockedWords) ||
    containsSensitiveWord(msg, extraBlockedWords)
  ) {
    return {
      valid: false,
      error: 'Sua mensagem contém termos não permitidos pela comunidade.',
    };
  }

  return { valid: true };
}
